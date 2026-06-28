import type { PgBoss } from "pg-boss";
import { Q } from "@/lib/jobs/queues";
import type {
  FlakyProbePayload,
  IngestPayload,
  ListingStagePayload,
} from "@/lib/jobs/queues";

/**
 * Pipeline wiring: queue definitions (with retry + backoff) and typed enqueue
 * helpers. Every stage retries transient failures with exponential backoff;
 * permanent failures are handled in-handler by marking the listing 'failed'.
 */

interface QueueDef {
  name: string;
  retryLimit: number;
  retryDelay: number; // seconds
  retryBackoff: boolean;
  expireInSeconds: number;
}

export const QUEUE_DEFS: QueueDef[] = [
  { name: Q.ingest, retryLimit: 5, retryDelay: 2, retryBackoff: true, expireInSeconds: 60 },
  { name: Q.geocode, retryLimit: 5, retryDelay: 2, retryBackoff: true, expireInSeconds: 60 },
  { name: Q.embedText, retryLimit: 3, retryDelay: 2, retryBackoff: true, expireInSeconds: 300 },
  { name: Q.embedImage, retryLimit: 3, retryDelay: 2, retryBackoff: true, expireInSeconds: 300 },
  { name: Q.enrich, retryLimit: 5, retryDelay: 2, retryBackoff: true, expireInSeconds: 60 },
  { name: Q.flakyProbe, retryLimit: 5, retryDelay: 1, retryBackoff: true, expireInSeconds: 60 },
];

/** Create all queues with their retry policy. Idempotent. */
export async function setupQueues(boss: PgBoss): Promise<void> {
  for (const q of QUEUE_DEFS) {
    await boss.createQueue(q.name, {
      retryLimit: q.retryLimit,
      retryDelay: q.retryDelay,
      retryBackoff: q.retryBackoff,
      expireInSeconds: q.expireInSeconds,
    });
  }
}

export async function enqueueIngest(boss: PgBoss, p: IngestPayload) {
  // singletonKey makes re-enqueue of the same record a no-op while queued.
  return boss.send(Q.ingest, p, {
    singletonKey: `${p.agencyId}:${p.record.source}:${p.record.externalId}`,
  });
}

const stageKey = (p: ListingStagePayload) => `${p.agencyId}:${p.listingId}`;

export async function enqueueGeocode(boss: PgBoss, p: ListingStagePayload) {
  return boss.send(Q.geocode, p, { singletonKey: stageKey(p) });
}
export async function enqueueEmbedText(boss: PgBoss, p: ListingStagePayload) {
  return boss.send(Q.embedText, p, { singletonKey: stageKey(p) });
}
export async function enqueueEmbedImage(boss: PgBoss, p: ListingStagePayload) {
  return boss.send(Q.embedImage, p, { singletonKey: stageKey(p) });
}
export async function enqueueEnrich(boss: PgBoss, p: ListingStagePayload) {
  return boss.send(Q.enrich, p, { singletonKey: stageKey(p) });
}

export async function enqueueFlakyProbe(boss: PgBoss, p: FlakyProbePayload) {
  return boss.send(Q.flakyProbe, p);
}
