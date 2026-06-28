import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RawListing } from "@/lib/jobs/queues";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = join(__dirname, "..", "..", "..", "..", "db", "seed", "data", "price-paid.csv");

const PTYPE: Record<string, string> = {
  D: "detached house",
  S: "semi-detached house",
  T: "terraced house",
  F: "flat",
  O: "property",
};
const DURATION: Record<string, string> = { F: "freehold", L: "leasehold" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Land Registry Price Paid adapter. Yields up to `limit` real transactions with
 * postcodes. Descriptions are synthesized from real fields (type, tenure,
 * location, price) — prose templated, downstream embeddings are real.
 */
export function loadLandRegistry(limit: number): RawListing[] {
  const lines = readFileSync(CSV, "utf8").split("\n");
  const out: RawListing[] = [];
  for (const line of lines) {
    if (out.length >= limit) break;
    if (!line.trim()) continue;
    const f = line.replace(/^"|"$/g, "").split('","');
    if (f.length < 14) continue;
    const postcode = f[3]?.trim();
    if (!postcode) continue;

    const ptype = PTYPE[f[4]] ?? "property";
    const tenure = DURATION[f[6]] ?? "";
    const year = f[2].slice(0, 4);
    const price = Number(f[1]) || null;
    const loc = [f[7], f[9]].filter(Boolean).join(" ");
    const address = [f[7], f[9], f[11]].filter(Boolean).join(", ");
    const description =
      `${cap(ptype)}${tenure ? `, ${tenure},` : ""} at ${loc}, ${f[11]}, ${f[13]} ${postcode}. ` +
      `Last sold for £${(price ?? 0).toLocaleString()} in ${year}.`;

    out.push({
      externalId: f[0],
      source: "land_registry",
      address,
      postcode,
      price,
      propertyType: ptype,
      description,
      imageUrl: null,
    });
  }
  return out;
}
