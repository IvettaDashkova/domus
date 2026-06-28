import type { Job } from "pg-boss";

export interface NoopGeocodePayload {
  address: string;
}

/**
 * Trivial idempotent smoke handler. Proves the queue path end-to-end in
 * Phase 0. Real geocoding (postcode -> lat/lng) lands in Phase 1.
 */
export async function handleNoopGeocode(
  jobs: Job<NoopGeocodePayload>[],
): Promise<void> {
  for (const job of jobs) {
    console.log(
      `[noop-geocode] job=${job.id} address="${job.data.address}" -> ok`,
    );
  }
}
