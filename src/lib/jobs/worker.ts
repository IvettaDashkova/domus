import { getBoss, QUEUES, stopBoss } from "@/lib/jobs/boss";
import { handleNoopGeocode } from "@/lib/jobs/handlers/noop-geocode";

/**
 * Worker entrypoint. Registers all queue handlers and keeps running.
 * Run with: `pnpm worker`.
 */
async function main() {
  const boss = await getBoss();

  await boss.createQueue(QUEUES.noopGeocode);
  await boss.work(QUEUES.noopGeocode, handleNoopGeocode);

  console.log("[worker] ready — listening on:", Object.values(QUEUES).join(", "));
}

async function shutdown() {
  console.log("[worker] shutting down…");
  await stopBoss();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
