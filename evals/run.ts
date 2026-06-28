import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";
import { knnByTextEmbedding } from "@/lib/retrieval/vector";
import { embedText } from "@/lib/embeddings/text";
import { mean, precisionAtK, recallAtK, reciprocalRank } from "./metrics";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

interface EvalItem {
  id: string;
  brief: string;
  relevanceKeyword: string;
}

const K = 10;

async function main() {
  const items: EvalItem[] = JSON.parse(
    readFileSync(join(__dirname, "datasets", "brief-to-listing.json"), "utf8"),
  );

  const admin = getAdminDb();
  const [agency] = await admin<{ id: string }[]>`
    select id from agencies where slug = 'domus-demo'`;
  if (!agency) throw new Error("seed first: agency 'domus-demo' not found");

  const p5: number[] = [];
  const pK: number[] = [];
  const rK: number[] = [];
  const rr: number[] = [];

  console.log(`\nbrief→listing eval · k=${K} · ${items.length} queries\n`);
  console.log("id   p@5    p@10   r@10   RR     brief");
  console.log("--   ----   ----   ----   ----   -----");

  for (const item of items) {
    const vec = await embedText(item.brief);
    const kw = `%${item.relevanceKeyword}%`;

    const { flags, total } = await withTenant(agency.id, async (sql) => {
      const matches = await knnByTextEmbedding(sql, vec, K);
      const ids = matches.map((m) => m.id);
      const descs = await sql<{ id: string; description: string }[]>`
        select id, description from listings where id in ${sql(ids)}`;
      const byId = new Map(descs.map((d) => [d.id, d.description ?? ""]));
      const flags = matches.map((m) =>
        byId.get(m.id)!.toLowerCase().includes(item.relevanceKeyword),
      );
      const [{ total }] = await sql<{ total: number }[]>`
        select count(*)::int as total from listings where description ilike ${kw}`;
      return { flags, total };
    });

    const _p5 = precisionAtK(flags, 5);
    const _pK = precisionAtK(flags, K);
    const _rK = recallAtK(flags, total, K);
    const _rr = reciprocalRank(flags);
    p5.push(_p5);
    pK.push(_pK);
    rK.push(_rK);
    rr.push(_rr);

    console.log(
      `${item.id}   ${fmt(_p5)}   ${fmt(_pK)}   ${fmt(_rK)}   ${fmt(_rr)}   ${item.brief}`,
    );
  }

  console.log("--   ----   ----   ----   ----");
  console.log(
    `MEAN ${fmt(mean(p5))}   ${fmt(mean(pK))}   ${fmt(mean(rK))}   ${fmt(mean(rr))}`,
  );
  console.log("\n(low numbers are fine — Phase 0 proves the harness runs.)\n");

  await closeDb();
}

const fmt = (n: number) => n.toFixed(2);

main().catch((err) => {
  console.error("evals failed:", err);
  process.exit(1);
});
