import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import { getBoss } from "@/lib/jobs/boss";
import { enqueueEnrich } from "@/lib/jobs/pipeline";
import { embedImage } from "@/lib/embeddings/image";
import { toVectorLiteral } from "@/lib/embeddings/text";
import type { ListingStagePayload } from "@/lib/jobs/queues";

/**
 * Stage 4 — CLIP image embedding (512-d), when the listing has an image_url.
 * Land Registry rows have none, so this is a no-op pass-through for them; it
 * still proves the queue runs for every listing. Idempotent.
 */
export async function handleEmbedImage(jobs: Job<ListingStagePayload>[]): Promise<void> {
  const boss = await getBoss();
  for (const job of jobs) {
    const { agencyId, listingId } = job.data;

    const listing = await withTenant(agencyId, async (sql) => {
      const [row] = await sql<{ image_url: string | null; has_img: boolean }[]>`
        select image_url, image_embedding is not null as has_img
        from listings where id = ${listingId}`;
      return row;
    });
    if (!listing) continue;

    if (listing.image_url && !listing.has_img) {
      const vec = await embedImage(listing.image_url);
      await withTenant(agencyId, (sql) =>
        sql`update listings set image_embedding = ${toVectorLiteral(vec)}::vector
            where id = ${listingId}`,
      );
    }
    await enqueueEnrich(boss, { agencyId, listingId });
  }
}
