import { config } from "dotenv";
import { getBoss, QUEUES, stopBoss } from "@/lib/jobs/boss";
import { setupQueues } from "@/lib/jobs/pipeline";
import { Q } from "@/lib/jobs/queues";
import { handleNoopGeocode } from "@/lib/jobs/handlers/noop-geocode";
import { handleIngest } from "@/lib/jobs/handlers/ingest";
import { handleGeocode } from "@/lib/jobs/handlers/geocode";
import { handleEmbedText } from "@/lib/jobs/handlers/embed-text";
import { handleEmbedImage } from "@/lib/jobs/handlers/embed-image";
import { handleEnrich } from "@/lib/jobs/handlers/enrich";
import { handleFlakyProbe } from "@/lib/jobs/handlers/flaky-probe";

config({ path: ".env.local" });
config();

/**
 * Worker entrypoint — registers all queue handlers and keeps running.
 * Run with: `pnpm worker`.
 */
async function main() {
  const boss = await getBoss();
  await setupQueues(boss);
  await boss.createQueue(QUEUES.noopGeocode);

  await boss.work(QUEUES.noopGeocode, handleNoopGeocode);
  await boss.work(Q.ingest, { batchSize: 25 }, handleIngest);
  await boss.work(Q.geocode, { batchSize: 25 }, handleGeocode);
  await boss.work(Q.embedText, { batchSize: 5 }, handleEmbedText);
  await boss.work(Q.embedImage, { batchSize: 25 }, handleEmbedImage);
  await boss.work(Q.enrich, { batchSize: 25 }, handleEnrich);
  await boss.work(Q.flakyProbe, { batchSize: 1 }, handleFlakyProbe);

  console.log("[worker] ready — pipeline queues registered");
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
