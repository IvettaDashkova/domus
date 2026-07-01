import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";
import { knnByTextEmbedding } from "@/lib/retrieval/vector";
import { hybridMatch } from "@/lib/retrieval/hybrid";
import { embedText } from "@/lib/embeddings/text";
import { findComps } from "@/lib/valuation/comps";
import { valuate } from "@/lib/valuation/avm";
import { mean, precisionAtK, reciprocalRank } from "./metrics";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const K = 10;

// Regression thresholds — CI fails if a metric drops below these.
const THRESH = { hybridP5: 0.5, hybridMRR: 0.5, avmCoverage: 0.7, avmEvaluated: 20 };

interface EvalItem {
  brief: string;
  relevanceKeyword: string;
}

async function main() {
  const items: EvalItem[] = JSON.parse(
    readFileSync(join(__dirname, "datasets", "brief-to-listing.json"), "utf8"),
  );
  const admin = getAdminDb();
  const [agency] = await admin<{ id: string }[]>`
    select id from agencies where slug = 'domus-demo'`;
  if (!agency) throw new Error("seed first");

  // ── Retrieval: dense baseline vs hybrid (precision@5, MRR) ────────────────
  const dP: number[] = [], dR: number[] = [], hP: number[] = [], hR: number[] = [];
  for (const item of items) {
    const vec = await embedText(item.brief);
    const kw = item.relevanceKeyword;
    const r = await withTenant(agency.id, async (sql) => {
      const dense = await knnByTextEmbedding(sql, vec, K);
      const hybrid = await hybridMatch(sql, { brief: item.brief, queryVec: vec, limit: K });
      const ids = [...new Set([...dense.map((d) => d.id), ...hybrid.map((h) => h.id)])];
      const descs = ids.length
        ? await sql<{ id: string; description: string }[]>`
            select id, description from listings where id in ${sql(ids)}`
        : [];
      const byId = new Map(descs.map((d) => [d.id, (d.description ?? "").toLowerCase()]));
      const rel = (id: string) => (byId.get(id) ?? "").includes(kw);
      return { d: dense.map((x) => rel(x.id)), h: hybrid.map((x) => rel(x.id)) };
    });
    dP.push(precisionAtK(r.d, 5)); dR.push(reciprocalRank(r.d));
    hP.push(precisionAtK(r.h, 5)); hR.push(reciprocalRank(r.h));
  }

  // ── Valuation: leave-one-out MAPE ─────────────────────────────────────────
  const sample = await admin<
    { id: string; price: number; bedrooms: number | null; property_type: string | null; lng: number; lat: number }[]
  >`select id, price, bedrooms, property_type, st_x(geom::geometry) lng, st_y(geom::geometry) lat
    from listings where status='enriched' and price is not null and geom is not null order by id limit 150`;
  const apes: number[] = [];
  for (const s of sample) {
    const { comps, radiusM } = await findComps(
      admin,
      { id: s.id, lng: s.lng, lat: s.lat, propertyType: s.property_type, bedrooms: s.bedrooms },
      { minComps: 5 },
    );
    if (comps.length < 3) continue;
    const v = valuate(comps, s, radiusM, s.price);
    if (v.errorPct != null) apes.push(v.errorPct);
  }
  apes.sort((a, b) => a - b);
  const avmCoverage = apes.length / sample.length;
  const medianAPE = apes.length ? apes[Math.floor(apes.length / 2)] : 0;

  // ── Report ────────────────────────────────────────────────────────────────
  const m = {
    denseP5: mean(dP), denseMRR: mean(dR), hybridP5: mean(hP), hybridMRR: mean(hR),
    avmMedianAPE: medianAPE, avmCoverage, avmEvaluated: apes.length,
  };
  console.log("\n══ Domus evals ══\n");
  console.log("Retrieval (brief→listing, k=10):");
  console.log(`  dense   p@5=${m.denseP5.toFixed(2)}  MRR=${m.denseMRR.toFixed(2)}`);
  console.log(`  hybrid  p@5=${m.hybridP5.toFixed(2)}  MRR=${m.hybridMRR.toFixed(2)}`);
  console.log(`  lift    p@5=${(m.hybridP5 - m.denseP5 >= 0 ? "+" : "") + (m.hybridP5 - m.denseP5).toFixed(2)}`);
  console.log("\nValuation (AVM, leave-one-out):");
  console.log(`  median APE=${m.avmMedianAPE.toFixed(1)}%  coverage=${(m.avmCoverage * 100).toFixed(0)}%  evaluated=${m.avmEvaluated}`);

  const fails: string[] = [];
  if (m.hybridP5 < THRESH.hybridP5) fails.push(`hybrid p@5 ${m.hybridP5.toFixed(2)} < ${THRESH.hybridP5}`);
  if (m.hybridMRR < THRESH.hybridMRR) fails.push(`hybrid MRR ${m.hybridMRR.toFixed(2)} < ${THRESH.hybridMRR}`);
  if (m.avmCoverage < THRESH.avmCoverage) fails.push(`AVM coverage ${(m.avmCoverage * 100).toFixed(0)}% < ${THRESH.avmCoverage * 100}%`);
  if (m.avmEvaluated < THRESH.avmEvaluated) fails.push(`AVM evaluated ${m.avmEvaluated} < ${THRESH.avmEvaluated}`);

  await closeDb();
  if (fails.length) {
    console.log("\nEVALS: FAIL ❌");
    for (const f of fails) console.log("  - " + f);
    process.exit(1);
  }
  console.log("\nEVALS: PASS ✅ (all metrics above threshold)\n");
}

main().catch((err) => {
  console.error("evals:all failed:", err);
  process.exit(1);
});
