import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";
import { embedText, toVectorLiteral } from "@/lib/embeddings/text";
import { embedImage } from "@/lib/embeddings/image";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
const CSV = join(DATA, "price-paid.csv");
const TARGET = 200;

const PTYPE: Record<string, string> = {
  D: "detached house",
  S: "semi-detached house",
  T: "terraced house",
  F: "flat",
  O: "property",
};
const DURATION: Record<string, string> = { F: "freehold", L: "leasehold" };

interface Raw {
  externalId: string;
  price: number;
  date: string;
  postcode: string;
  ptype: string;
  duration: string;
  paon: string;
  street: string;
  town: string;
  county: string;
}

function parseCsv(): Raw[] {
  const lines = readFileSync(CSV, "utf8").split("\n");
  const out: Raw[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const f = line.replace(/^"|"$/g, "").split('","');
    if (f.length < 14) continue;
    const postcode = f[3]?.trim();
    if (!postcode) continue;
    out.push({
      externalId: f[0],
      price: Number(f[1]) || 0,
      date: f[2],
      postcode,
      ptype: f[4],
      duration: f[6],
      paon: f[7],
      street: f[9],
      town: f[11],
      county: f[13],
    });
  }
  return out;
}

/** Bulk-geocode postcodes via postcodes.io (free, no key, 100 per request). */
async function geocode(
  postcodes: string[],
): Promise<Map<string, { lat: number; lng: number }>> {
  const result = new Map<string, { lat: number; lng: number }>();
  for (let i = 0; i < postcodes.length; i += 100) {
    const batch = postcodes.slice(i, i + 100);
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    const json = await res.json();
    for (const r of json.result ?? []) {
      if (r.result?.latitude != null) {
        result.set(r.query, {
          lat: r.result.latitude,
          lng: r.result.longitude,
        });
      }
    }
  }
  return result;
}

function describe(r: Raw): string {
  const type = PTYPE[r.ptype] ?? "property";
  const tenure = DURATION[r.duration] ?? "";
  const year = r.date.slice(0, 4);
  const loc = [r.paon, r.street].filter(Boolean).join(" ");
  return (
    `${capitalize(type)}${tenure ? `, ${tenure},` : ""} at ${loc}, ` +
    `${r.town}, ${r.county} ${r.postcode}. ` +
    `Last sold for £${r.price.toLocaleString()} in ${year}.`
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Generate a deterministic 256x256 "house" PNG to prove the CLIP path. */
async function sampleImagePath(): Promise<string> {
  const out = join(DATA, "sample-house.png");
  if (existsSync(out)) return out;
  const sharp = (await import("sharp")).default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="256" height="256" fill="#bcd4e6"/>
    <rect x="48" y="120" width="160" height="110" fill="#c98a5e"/>
    <polygon points="40,120 128,50 216,120" fill="#8a3b2e"/>
    <rect x="110" y="170" width="36" height="60" fill="#5b3a29"/>
    <rect x="70" y="140" width="34" height="34" fill="#f2e9d8"/>
    <rect x="152" y="140" width="34" height="34" fill="#f2e9d8"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { max: 1 }); // superuser bypasses RLS for seeding

  // Tenant
  const [agency] = await sql<{ id: string }[]>`
    insert into agencies (name, slug) values ('Domus Demo Agency', 'domus-demo')
    on conflict (slug) do update set name = excluded.name
    returning id
  `;
  console.log(`agency: ${agency.id}`);
  await sql`delete from listings where agency_id = ${agency.id}`;

  // Source rows + geocoding
  const raw = parseCsv();
  console.log(`parsed ${raw.length} rows with postcodes`);
  const uniquePostcodes = [...new Set(raw.slice(0, 1500).map((r) => r.postcode))];
  console.log(`geocoding ${uniquePostcodes.length} unique postcodes…`);
  const geo = await geocode(uniquePostcodes);
  console.log(`geocoded ${geo.size} postcodes`);

  const usable = raw.filter((r) => geo.has(r.postcode)).slice(0, TARGET);
  console.log(`embedding + inserting ${usable.length} listings…`);

  let n = 0;
  for (const r of usable) {
    const g = geo.get(r.postcode)!;
    const description = describe(r);
    const vec = await embedText(description);
    await sql`
      insert into listings
        (agency_id, source, external_id, address, postcode, geom,
         price, bedrooms, property_type, description, text_embedding)
      values
        (${agency.id}, 'land_registry', ${r.externalId},
         ${[r.paon, r.street, r.town].filter(Boolean).join(", ")},
         ${r.postcode},
         ST_SetSRID(ST_MakePoint(${g.lng}, ${g.lat}), 4326)::geography,
         ${r.price || null}, null, ${PTYPE[r.ptype] ?? "property"},
         ${description}, ${toVectorLiteral(vec)}::vector)
      on conflict (agency_id, source, external_id) do nothing
    `;
    if (++n % 50 === 0) console.log(`  …${n}/${usable.length}`);
  }

  // CLIP image path — embed one image, attach to the first listing.
  console.log("embedding one image via CLIP…");
  const imgPath = await sampleImagePath();
  const imgVec = await embedImage(imgPath);
  const [first] = await sql<{ id: string }[]>`
    select id from listings where agency_id = ${agency.id}
    order by created_at limit 1
  `;
  await sql`
    update listings set image_embedding = ${toVectorLiteral(imgVec)}::vector
    where id = ${first.id}
  `;
  console.log(`image_embedding (${imgVec.length}-d) attached to ${first.id}`);

  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from listings where agency_id = ${agency.id}
  `;
  console.log(`done — ${count} listings seeded`);
  await sql.end();
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
