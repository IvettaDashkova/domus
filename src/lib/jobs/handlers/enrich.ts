import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import type { ListingStagePayload } from "@/lib/jobs/queues";

/**
 * Stage 5 — enrichment. Normalizes the property type label and derives an
 * ESTIMATED bedroom count (Land Registry has none) from type + price, then
 * marks the listing 'enriched'. Estimate only fills a null `bedrooms`, so a
 * future source with real counts is never overwritten. Real attribute
 * extraction / vision tags / valuation come in later phases.
 */
export async function handleEnrich(jobs: Job<ListingStagePayload>[]): Promise<void> {
  for (const job of jobs) {
    const { agencyId, listingId } = job.data;
    await withTenant(agencyId, (sql) =>
      sql`update listings
            set property_type = lower(trim(property_type)),
                bedrooms = coalesce(bedrooms, case
                  when lower(property_type) like '%flat%'
                    then case when coalesce(price,0) < 150000 then 1 else 2 end
                  when lower(property_type) like '%terraced%'
                    then case when coalesce(price,0) < 150000 then 2
                              when price < 300000 then 3 else 4 end
                  when lower(property_type) like '%semi%'
                    then case when coalesce(price,0) < 300000 then 3 else 4 end
                  when lower(property_type) like '%detached%'
                    then case when coalesce(price,0) < 250000 then 3
                              when price < 500000 then 4 else 5 end
                  else 3 end),
                status = 'enriched', enriched_at = now()
          where id = ${listingId} and status <> 'failed'`,
    );
  }
}
