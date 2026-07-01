import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { embedImage } from "@/lib/embeddings/image";
import { toVectorLiteral } from "@/lib/embeddings/text";
import { autoTag } from "@/lib/embeddings/clip";
import { TAG_VOCAB } from "@/lib/vision/vocab";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, "..", "public", "images");

interface ManifestEntry {
  file: string;
  kind: string;
}

/**
 * Assign the open photo pool to listings (round-robin), then for each distinct
 * photo compute its CLIP image embedding + zero-shot tags ONCE and write them to
 * every listing using it.
 */
async function main() {
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(join(IMG_DIR, "manifest.json"), "utf8"),
  );
  if (manifest.length === 0) throw new Error("no photos — run fetch-photos first");

  const sql = getAdminDb();
  const listings = await sql<{ id: string }[]>`
    select id from listings where status = 'enriched' order by id`;
  console.log(`pool: ${manifest.length} photos · listings: ${listings.length}`);

  for (let k = 0; k < manifest.length; k++) {
    const m = manifest[k];
    const path = join(IMG_DIR, m.file);
    const emb = await embedImage(path);
    const tags = (await autoTag(path, TAG_VOCAB)).map((t) => t.label);

    const ids = listings.filter((_, i) => i % manifest.length === k).map((l) => l.id);
    if (ids.length === 0) continue;
    await sql`
      update listings
         set image_url = ${"/images/" + m.file},
             image_embedding = ${toVectorLiteral(emb)}::vector,
             tags = ${tags}
       where id in ${sql(ids)}`;
    console.log(`  ${m.file} -> ${ids.length} listings · tags: ${tags.join(", ") || "(none)"}`);
  }

  const [{ n }] = await sql<{ n: number }[]>`
    select count(image_embedding)::int n from listings where status = 'enriched'`;
  console.log(`\ndone — ${n} listings with image embeddings + tags`);
  await closeDb();
}

main().catch((err) => {
  console.error("enrich-images failed:", err);
  process.exit(1);
});
