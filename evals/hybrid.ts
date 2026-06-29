import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";
import { knnByTextEmbedding } from "@/lib/retrieval/vector";
import { hybridMatch } from "@/lib/retrieval/hybrid";
import { embedText } from "@/lib/embeddings/text";
import { mean, precisionAtK, reciprocalRank } from "./metrics";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const K = 10;

interface EvalItem {
  id: string;
  brief: string;
  relevanceKeyword: string;
}

async function descMap(sql: Parameters<Parameters<typeof withTenant>[1]>[0], ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await sql<{ id: string; description: string }[]>`
    select id, description from listings where id in ${sql(ids)}`;
  return new Map(rows.map((r) => [r.id, (r.description ?? "").toLowerCase()]));
}

async function main() {
  const items: EvalItem[] = JSON.parse(
    readFileSync(join(__dirname, "datasets", "brief-to-listing.json"), "utf8"),
  );
  const admin = getAdminDb();
  const [agency] = await admin<{ id: string }[]>`
    select id from agencies where slug = 'domus-demo'`;
  if (!agency) throw new Error("seed first");

  const denseP: number[] = [], denseR: number[] = [];
  const hybP: number[] = [], hybR: number[] = [];

  console.log(`\nhybrid vs dense · k=${K} · ${items.length} queries\n`);
  console.log("id    dense_p@k  dense_RR   hybrid_p@k  hybrid_RR  brief");
  console.log("--    ---------  --------   ----------  ---------  -----");

  for (const item of items) {
    const vec = await embedText(item.brief);
    const kw = item.relevanceKeyword;

    const r = await withTenant(agency.id, async (sql) => {
      const dense = await knnByTextEmbedding(sql, vec, K);
      const hybrid = await hybridMatch(sql, { brief: item.brief, queryVec: vec, limit: K });
      const ids = [...new Set([...dense.map((d) => d.id), ...hybrid.map((h) => h.id)])];
      const dm = await descMap(sql, ids);
      const rel = (id: string) => (dm.get(id) ?? "").includes(kw);
      return {
        denseFlags: dense.map((d) => rel(d.id)),
        hybFlags: hybrid.map((h) => rel(h.id)),
      };
    });

    const dP = precisionAtK(r.denseFlags, K);
    const dR = reciprocalRank(r.denseFlags);
    const hP = precisionAtK(r.hybFlags, K);
    const hR = reciprocalRank(r.hybFlags);
    denseP.push(dP); denseR.push(dR); hybP.push(hP); hybR.push(hR);

    console.log(
      `${item.id}    ${dP.toFixed(2)}       ${dR.toFixed(2)}       ${hP.toFixed(2)}        ${hR.toFixed(2)}       ${item.brief.slice(0, 38)}`,
    );
  }

  console.log("--    ---------  --------   ----------  ---------");
  console.log(
    `MEAN  ${mean(denseP).toFixed(2)}       ${mean(denseR).toFixed(2)}       ${mean(hybP).toFixed(2)}        ${mean(hybR).toFixed(2)}`,
  );
  const lift = mean(hybP) - mean(denseP);
  console.log(`\nhybrid p@k lift over dense: ${lift >= 0 ? "+" : ""}${lift.toFixed(3)}\n`);

  await closeDb();
}

main().catch((err) => {
  console.error("hybrid eval failed:", err);
  process.exit(1);
});
