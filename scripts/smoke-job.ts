import { config } from "dotenv";
import { getBoss, QUEUES, stopBoss } from "@/lib/jobs/boss";
import { handleNoopGeocode } from "@/lib/jobs/handlers/noop-geocode";

config({ path: ".env.local" });
config();

/** Enqueue one noop-geocode job, process it, and read back its final state. */
async function main() {
  const boss = await getBoss();
  await boss.createQueue(QUEUES.noopGeocode);
  await boss.work(QUEUES.noopGeocode, handleNoopGeocode);

  const jobId = await boss.send(QUEUES.noopGeocode, {
    address: "10 Downing Street, London",
  });
  console.log(`enqueued job ${jobId}`);

  // Poll for completion.
  let state = "created";
  for (let i = 0; i < 40; i++) {
    const job = await boss.getJobById(QUEUES.noopGeocode, jobId!);
    if (job?.state) state = job.state;
    if (state === "completed" || state === "failed") break;
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`job ${jobId} final state: ${state}`);
  await stopBoss();
  if (state !== "completed") process.exit(1);
  console.log("PG-BOSS SMOKE: PASS ✅");
}

main().catch((err) => {
  console.error("smoke-job failed:", err);
  process.exit(1);
});
