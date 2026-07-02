import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { embedText, toVectorLiteral } from "@/lib/embeddings/text";
import { embedImage } from "@/lib/embeddings/image";
import { autoTag } from "@/lib/embeddings/clip";
import { TAG_VOCAB } from "@/lib/vision/vocab";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, "..", "public", "images");
const TARGET = 300;

/** Polish cities: [name, lat, lng, price multiplier]. */
const CITIES: [string, number, number, number, string[]][] = [
  ["Warszawa", 52.2297, 21.0122, 1.35, ["Śródmieście", "Mokotów", "Wola", "Praga-Południe", "Żoliborz", "Ochota"]],
  ["Kraków", 50.0647, 19.945, 1.15, ["Stare Miasto", "Kazimierz", "Podgórze", "Krowodrza", "Nowa Huta"]],
  ["Wrocław", 51.1079, 17.0385, 1.05, ["Stare Miasto", "Krzyki", "Śródmieście", "Fabryczna"]],
  ["Gdańsk", 54.352, 18.6466, 1.08, ["Śródmieście", "Wrzeszcz", "Oliwa", "Przymorze"]],
  ["Poznań", 52.4064, 16.9252, 1.0, ["Stare Miasto", "Jeżyce", "Grunwald", "Wilda"]],
  ["Łódź", 51.7592, 19.456, 0.78, ["Śródmieście", "Bałuty", "Polesie", "Górna"]],
];

const STREETS = [
  "Marszałkowska", "Piękna", "Nowy Świat", "Krucza", "Wilcza", "Hoża", "Mokotowska",
  "Puławska", "Grzybowska", "Długa", "Floriańska", "Grodzka", "Sławkowska", "Świętojańska",
  "Piotrkowska", "Półwiejska", "Święty Marcin", "Oławska", "Świdnicka", "Ruska", "Lipowa",
];
const FLAVOURS = [
  "bright and recently renovated", "steps from tram and metro", "quiet courtyard, high floor",
  "period tenement with high ceilings", "new development with underground parking",
  "south-facing balcony and fitted kitchen", "close to the old town and river",
];

// type -> [weight, [minBeds,maxBeds], basePriceLow, basePriceHigh]
const TYPES: [string, number, [number, number], number, number][] = [
  ["apartment", 58, [1, 3], 480000, 1300000],
  ["house", 18, [3, 5], 900000, 2600000],
  ["studio", 12, [1, 1], 300000, 520000],
  ["townhouse", 12, [2, 4], 780000, 1900000],
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function pickType(): [string, number, number, number] {
  const total = TYPES.reduce((s, t) => s + t[1], 0);
  let r = Math.random() * total;
  for (const [name, w, [bl, bh], pl, ph] of TYPES) {
    if ((r -= w) <= 0) {
      const beds = Math.round(rnd(bl, bh));
      return [name, beds, pl, ph];
    }
  }
  return ["apartment", 2, 480000, 1300000];
}

async function main() {
  const sql = getAdminDb();
  const [agency] = await sql<{ id: string }[]>`
    insert into agencies (name, slug) values ('Domus PL — demo', 'domus-demo')
    on conflict (slug) do update set name = excluded.name returning id`;
  console.log(`agency: ${agency.id} — replacing listings with Polish data`);
  await sql`delete from listings where agency_id = ${agency.id}`;

  // Precompute per-photo CLIP image embedding + tags (once).
  const manifest: { file: string }[] = JSON.parse(
    readFileSync(join(IMG_DIR, "manifest.json"), "utf8"),
  );
  const photos: { url: string; emb: string; tags: string[] }[] = [];
  for (const m of manifest) {
    const p = join(IMG_DIR, m.file);
    photos.push({
      url: `/images/${m.file}`,
      emb: toVectorLiteral(await embedImage(p)),
      tags: (await autoTag(p, TAG_VOCAB)).map((t) => t.label),
    });
  }
  console.log(`photos ready: ${photos.length}`);

  let n = 0;
  for (let i = 0; i < TARGET; i++) {
    const [cityName, clat, clng, mult, districts] = pick(CITIES);
    const [ptype, beds, pl, ph] = pickType();
    const district = pick(districts);
    const street = pick(STREETS);
    const houseNo = Math.floor(rnd(1, 120));
    const price = Math.round((rnd(pl, ph) * mult) / 1000) * 1000;
    const lat = clat + rnd(-0.035, 0.035);
    const lng = clng + rnd(-0.05, 0.05);
    const address = `ul. ${street} ${houseNo}, ${district}, ${cityName}`;
    const bedsText = ptype === "studio" ? "studio" : `${beds}-bedroom`;
    const description =
      `${cap(ptype)} (${bedsText}) on ul. ${street} in ${district}, ${cityName}. ` +
      `${cap(pick(FLAVOURS))}. Asking ${price.toLocaleString("pl-PL")} zł.`;
    const photo = photos[i % photos.length];
    const vec = await embedText(description);

    await sql`
      insert into listings
        (agency_id, source, external_id, address, postcode, geom, price, bedrooms,
         property_type, description, text_embedding, image_url, image_embedding, tags, status)
      values
        (${agency.id}, 'synthetic_pl', ${"pl-" + i}, ${address}, null,
         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
         ${price}, ${beds}, ${ptype}, ${description}, ${toVectorLiteral(vec)}::vector,
         ${photo.url}, ${photo.emb}::vector, ${photo.tags}, 'enriched')
      on conflict (agency_id, source, external_id) do nothing`;
    if (++n % 50 === 0) console.log(`  …${n}/${TARGET}`);
  }

  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int count from listings where agency_id = ${agency.id}`;
  console.log(`done — ${count} Polish listings seeded`);
  await closeDb();
}

main().catch((err) => {
  console.error("seed-poland failed:", err);
  process.exit(1);
});
