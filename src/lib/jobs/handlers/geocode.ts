import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import { getBoss } from "@/lib/jobs/boss";
import { enqueueEmbedText } from "@/lib/jobs/pipeline";
import { lookup } from "@/lib/geocode/postcodes";
import type { ListingStagePayload } from "@/lib/jobs/queues";

/**
 * Stage 2 — postcode -> lat/lng (cached). A missing/invalid postcode is a
 * PERMANENT data error: mark the listing 'failed' and stop (no throw, no
 * retry). Transient errors (network) throw and let pg-boss retry with backoff.
 */
export async function handleGeocode(jobs: Job<ListingStagePayload>[]): Promise<void> {
  const boss = await getBoss();
  for (const job of jobs) {
    const { agencyId, listingId } = job.data;

    const listing = await withTenant(agencyId, async (sql) => {
      const [row] = await sql<{ postcode: string | null; has_geom: boolean }[]>`
        select postcode, geom is not null as has_geom
        from listings where id = ${listingId}`;
      return row;
    });
    if (!listing) continue;
    if (listing.has_geom) {
      await enqueueEmbedText(boss, { agencyId, listingId });
      continue; // idempotent: already geocoded
    }

    const ll = await lookup(listing.postcode ?? ""); // throws only on transient fetch errors
    if (!ll) {
      await withTenant(agencyId, (sql) =>
        sql`update listings set status = 'failed',
              failure_reason = ${`postcode not found: ${listing.postcode}`}
            where id = ${listingId}`,
      );
      continue;
    }

    await withTenant(agencyId, (sql) =>
      sql`update listings
            set geom = ST_SetSRID(ST_MakePoint(${ll.lng}, ${ll.lat}), 4326)::geography,
                status = 'geocoded', geocoded_at = now()
          where id = ${listingId}`,
    );
    await enqueueEmbedText(boss, { agencyId, listingId });
  }
}
