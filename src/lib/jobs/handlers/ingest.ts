import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import { getBoss } from "@/lib/jobs/boss";
import { enqueueGeocode } from "@/lib/jobs/pipeline";
import type { IngestPayload } from "@/lib/jobs/queues";

/**
 * Stage 1 — upsert a source record into a listing (idempotent on
 * agency+source+external_id). Already-enriched listings are skipped; new/
 * incomplete ones advance to geocoding.
 */
export async function handleIngest(jobs: Job<IngestPayload>[]): Promise<void> {
  const boss = await getBoss();
  for (const job of jobs) {
    const { agencyId, runId, record: r } = job.data;
    const row = await withTenant(agencyId, async (sql) => {
      const [row] = await sql<{ id: string; status: string }[]>`
        insert into listings
          (agency_id, source, external_id, address, postcode, price,
           property_type, description, image_url, ingest_run_id, status)
        values
          (${agencyId}, ${r.source}, ${r.externalId}, ${r.address}, ${r.postcode},
           ${r.price}, ${r.propertyType}, ${r.description}, ${r.imageUrl ?? null},
           ${runId}, 'ingested')
        on conflict (agency_id, source, external_id) do update
          set address = excluded.address, price = excluded.price,
              property_type = excluded.property_type, description = excluded.description,
              image_url = excluded.image_url
        returning id, status`;
      return row;
    });

    if (row.status === "enriched") continue; // idempotent: nothing to do
    await enqueueGeocode(boss, { agencyId, listingId: row.id });
  }
}
