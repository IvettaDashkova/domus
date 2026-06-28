import { IMAGE_EMBED_DIM, IMAGE_EMBED_MODEL } from "@/lib/env";

/**
 * Local image embeddings via Transformers.js CLIP.
 * Model: clip-vit-base-patch32 -> 512-d, L2-normalized. Similarity-searchable
 * against listing photos. Phase 0 only needs to prove one image -> 1 vector.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import("@huggingface/transformers");
    extractor = await pipeline("image-feature-extraction", IMAGE_EMBED_MODEL);
  }
  return extractor;
}

/** Embed an image from a file path or URL. */
export async function embedImage(src: string): Promise<number[]> {
  const pipe = await getExtractor();
  const output = await pipe(src, { pooling: "mean", normalize: true });
  const vec = Array.from(output.data as Float32Array);
  if (vec.length !== IMAGE_EMBED_DIM) {
    throw new Error(
      `Image embedding dim ${vec.length} != expected ${IMAGE_EMBED_DIM}`,
    );
  }
  return vec;
}
