import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { getBoss, stopBoss } from "@/lib/jobs/boss";
import { setupQueues, enqueueIngest } from "@/lib/jobs/pipeline";
import { loadLandRegistry } from "@/lib/ingest/sources/landRegistry";
import { warmCache } from "@/lib/geocode/postcodes";
import type { RawListing } from "@/lib/jobs/queues";

config({ path: ".env.local" });
config();

/**
 * Enqueue an ingest run. Usage: pnpm ingest [limit] [--poison]
 *   limit    number of source records (default 1000)
 *   --poison append a record with a bogus postcode to exercise the failure path
 */
async function main() {
  const limit = Number(process.argv.find((a) => /^\d+$/.test(a))) || 1000;
  const poison = process.argv.includes("--poison");

  const sql = getAdminDb();
  const [agency] = await sql<{ id: string }[]>`
    insert into agencies (name, slug) values ('Domus Demo Agency', 'domus-demo')
    on conflict (slug) do update set name = excluded.name returning id`;

  const records: RawListing[] = loadLandRegistry(limit);
  if (poison) {
    records.push({
      externalId: `poison-${limit}`,
      source: "land_registry",
      address: "Nowhere House, Imaginary Lane",
      postcode: "ZZ99 9ZZ", // not a real postcode -> permanent failure
      price: 1,
      propertyType: "property",
      description: "Deliberately ungeocodable record for the failure-path gate.",
      imageUrl: null,
    });
  }

  console.log(`pre-warming postcode cache for ${records.length} records…`);
  const warmed = await warmCache(records.map((r) => r.postcode));
  console.log(`cached ${warmed} new postcodes`);

  const [run] = await sql<{ id: string }[]>`
    insert into ingest_runs (agency_id, source, requested)
    values (${agency.id}, 'land_registry', ${records.length}) returning id`;

  const boss = await getBoss();
  await setupQueues(boss);
  for (const record of records) {
    await enqueueIngest(boss, { agencyId: agency.id, runId: run.id, record });
  }

  console.log(`run ${run.id}: enqueued ${records.length} ingest jobs`);
  await stopBoss();
  await closeDb();
}

main().catch((err) => {
  console.error("ingest failed:", err);
  process.exit(1);
});
