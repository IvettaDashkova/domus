import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import type { ListingStagePayload } from "@/lib/jobs/queues";

/**
 * Stage 5 — enrichment (structured stub). Normalizes the property type label
 * and marks the listing 'enriched' (terminal success). Real enrichment
 * (derived attributes, vision tags, valuation hints) lands in later phases.
 */
export async function handleEnrich(jobs: Job<ListingStagePayload>[]): Promise<void> {
  for (const job of jobs) {
    const { agencyId, listingId } = job.data;
    await withTenant(agencyId, (sql) =>
      sql`update listings
            set property_type = lower(trim(property_type)),
                status = 'enriched', enriched_at = now()
          where id = ${listingId} and status <> 'failed'`,
    );
  }
}
