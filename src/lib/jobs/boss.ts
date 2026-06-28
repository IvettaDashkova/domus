import { PgBoss } from "pg-boss";
import { databaseUrl } from "@/lib/env";

/**
 * pg-boss singleton (Postgres-backed queue, no Redis). Owns its own `pgboss`
 * schema. Started lazily. All ingest/geocode/embed/enrich/route work will run
 * as idempotent jobs with retries — Phase 0 wires the queue + one smoke job.
 */

let boss: PgBoss | null = null;
let started: Promise<PgBoss> | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!started) {
    boss = new PgBoss({ connectionString: databaseUrl() });
    boss.on("error", (err) => console.error("[pg-boss]", err));
    started = boss.start().then(() => boss!);
  }
  return started;
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
    started = null;
  }
}

/** Queue names. */
export const QUEUES = {
  noopGeocode: "noop-geocode",
} as const;
