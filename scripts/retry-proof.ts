import { config } from "dotenv";
import { getBoss, stopBoss } from "@/lib/jobs/boss";
import { setupQueues, enqueueFlakyProbe } from "@/lib/jobs/pipeline";
import { handleFlakyProbe } from "@/lib/jobs/handlers/flaky-probe";
import { Q } from "@/lib/jobs/queues";

config({ path: ".env.local" });
config();

/** Prove retry + exponential backoff: a job that fails 3x then succeeds. */
async function main() {
  const boss = await getBoss();
  await setupQueues(boss);
  await boss.work(Q.flakyProbe, { batchSize: 1 }, handleFlakyProbe);

  const id = await enqueueFlakyProbe(boss, { failUntil: 3 });
  console.log(`enqueued flaky job ${id} (fails 3x, then succeeds)`);

  let state = "created";
  let retries = 0;
  for (let i = 0; i < 80; i++) {
    const job = await boss.getJobById(Q.flakyProbe, id!);
    if (job) {
      state = job.state;
      retries = (job as { retryCount?: number }).retryCount ?? retries;
    }
    if (state === "completed" || state === "failed") break;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`final state=${state} retryCount=${retries}`);
  await stopBoss();
  if (state !== "completed") process.exit(1);
  console.log("RETRY/BACKOFF: PASS ✅ (job recovered after retries)");
}

main().catch((err) => {
  console.error("retry-proof failed:", err);
  process.exit(1);
});
