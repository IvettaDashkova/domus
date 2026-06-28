import type { Job } from "pg-boss";
import { withTenant } from "@/lib/db/tenant";
import { getBoss } from "@/lib/jobs/boss";
import { enqueueEmbedImage } from "@/lib/jobs/pipeline";
import { embedText, toVectorLiteral } from "@/lib/embeddings/text";
import type { ListingStagePayload } from "@/lib/jobs/queues";

/**
 * Stage 3 — bge-small text embedding (384-d) from the description.
 * Idempotent: skips if already embedded. Advances to the image stage.
 */
export async function handleEmbedText(jobs: Job<ListingStagePayload>[]): Promise<void> {
  const boss = await getBoss();
  for (const job of jobs) {
    const { agencyId, listingId } = job.data;

    const listing = await withTenant(agencyId, async (sql) => {
      const [row] = await sql<{ description: string | null; has_emb: boolean }[]>`
        select description, text_embedding is not null as has_emb
        from listings where id = ${listingId}`;
      return row;
    });
    if (!listing) continue;

    if (!listing.has_emb && listing.description) {
      const vec = await embedText(listing.description);
      await withTenant(agencyId, (sql) =>
        sql`update listings
              set text_embedding = ${toVectorLiteral(vec)}::vector,
                  status = 'embedded', embedded_at = now()
            where id = ${listingId}`,
      );
    }
    await enqueueEmbedImage(boss, { agencyId, listingId });
  }
}
