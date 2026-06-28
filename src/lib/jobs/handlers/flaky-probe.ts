import type { Job } from "pg-boss";
import type { FlakyProbePayload } from "@/lib/jobs/queues";

/**
 * Retry/backoff demonstration only. Throws (transient failure) until the job
 * has been attempted `failUntil` times, then succeeds — proving pg-boss
 * retries with exponential backoff. The same retry policy applies to every
 * pipeline queue (see QUEUE_DEFS).
 */
const attempts = new Map<string, number>();

export async function handleFlakyProbe(jobs: Job<FlakyProbePayload>[]): Promise<void> {
  for (const job of jobs) {
    const n = (attempts.get(job.id) ?? 0) + 1;
    attempts.set(job.id, n);
    if (n <= job.data.failUntil) {
      console.log(`[flaky-probe] job=${job.id} attempt ${n} — throwing (transient)`);
      throw new Error(`transient failure (attempt ${n})`);
    }
    console.log(`[flaky-probe] job=${job.id} attempt ${n} — success ✅`);
    attempts.delete(job.id);
  }
}
