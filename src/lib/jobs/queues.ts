/** Queue names + job payload types for the ingest pipeline. */

export const Q = {
  ingest: "ingest.listing",
  geocode: "geocode.listing",
  embedText: "embed.listing.text",
  embedImage: "embed.listing.image",
  enrich: "enrich.listing",
  flakyProbe: "flaky.probe", // retry/backoff demonstration only
} as const;

export type QueueName = (typeof Q)[keyof typeof Q];

/** Raw record produced by a source adapter (one property transaction). */
export interface RawListing {
  externalId: string;
  source: string;
  address: string;
  postcode: string;
  price: number | null;
  propertyType: string; // human label, e.g. "detached house"
  description: string;
  imageUrl?: string | null;
}

export interface IngestPayload {
  agencyId: string;
  runId: string;
  record: RawListing;
}

/** Downstream stages operate on a listing already persisted by ingest. */
export interface ListingStagePayload {
  agencyId: string;
  listingId: string;
}

export interface FlakyProbePayload {
  /** Throw on attempts before this index; succeed once retrycount >= failUntil. */
  failUntil: number;
}
