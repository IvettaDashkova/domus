import { TEXT_EMBED_DIM, TEXT_EMBED_MODEL } from "@/lib/env";

/**
 * Local text embeddings via Transformers.js.
 * Model LOCKED: bge-small-en-v1.5 -> 384-d, mean-pooled + L2-normalized.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline, env } = await import("@huggingface/transformers");
    if (process.env.VERCEL) {
      // Serverless fs is read-only except /tmp.
      env.cacheDir = "/tmp/hf-cache";
      env.allowLocalModels = false;
    }
    extractor = await pipeline("feature-extraction", TEXT_EMBED_MODEL);
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const pipe = await getExtractor();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  const vec = Array.from(output.data as Float32Array);
  if (vec.length !== TEXT_EMBED_DIM) {
    throw new Error(
      `Text embedding dim ${vec.length} != locked ${TEXT_EMBED_DIM}`,
    );
  }
  return vec;
}

/** Format a number[] as a pgvector literal: "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
