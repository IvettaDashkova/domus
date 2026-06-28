import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";

config({ path: ".env.local" });
config();

/** Print ingest-pipeline progress: status breakdown, failures, cache, runs. */
async function main() {
  const sql = getAdminDb();
  const [agency] = await sql<{ id: string }[]>`
    select id from agencies where slug = 'domus-demo'`;
  if (!agency) {
    console.log("no demo agency yet");
    await closeDb();
    return;
  }

  const status = await sql<{ status: string; n: number }[]>`
    select status, count(*)::int n from listings where agency_id = ${agency.id}
    group by status order by status`;
  const totals = await sql<{ total: number; geom: number; txt: number; img: number }[]>`
    select count(*)::int total,
           count(geom)::int geom,
           count(text_embedding)::int txt,
           count(image_embedding)::int img
    from listings where agency_id = ${agency.id}`;
  const failed = await sql<{ address: string; failure_reason: string }[]>`
    select address, failure_reason from listings
    where agency_id = ${agency.id} and status = 'failed' limit 10`;
  const [cache] = await sql<{ n: number; found: number }[]>`
    select count(*)::int n, count(*) filter (where found)::int found from postcode_cache`;

  console.log("\n── pipeline status ──");
  console.log("by status:", status.map((s) => `${s.status}=${s.n}`).join("  "));
  console.log(
    `totals: ${totals[0].total} listings · geom=${totals[0].geom} · text_emb=${totals[0].txt} · image_emb=${totals[0].img}`,
  );
  console.log(`postcode_cache: ${cache.n} (found=${cache.found})`);
  if (failed.length) {
    console.log("failed:");
    for (const f of failed) console.log(`  - ${f.address} :: ${f.failure_reason}`);
  }
  console.log("");
  await closeDb();
}

main().catch((err) => {
  console.error("status failed:", err);
  process.exit(1);
});
