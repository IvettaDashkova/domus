import { IMAGE_EMBED_MODEL } from "@/lib/env";

/**
 * CLIP text encoder + zero-shot tagging. CLIP text and image embeddings live in
 * the SAME 512-d space, so a text query can be kNN-matched against listing image
 * embeddings (text→image visual search).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let tokenizer: any = null;
let textModel: any = null;
let tagger: any = null;

async function configureEnv() {
  const { env } = await import("@huggingface/transformers");
  if (process.env.VERCEL) {
    env.cacheDir = "/tmp/hf-cache";
    env.allowLocalModels = false;
  }
}

/** Embed text into CLIP space (512-d, L2-normalized). */
export async function embedClipText(text: string): Promise<number[]> {
  if (!textModel) {
    const { AutoTokenizer, CLIPTextModelWithProjection } = await import("@huggingface/transformers");
    await configureEnv();
    tokenizer = await AutoTokenizer.from_pretrained(IMAGE_EMBED_MODEL);
    textModel = await CLIPTextModelWithProjection.from_pretrained(IMAGE_EMBED_MODEL);
  }
  const inputs = tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  const vec = Array.from(text_embeds.data as Float32Array);
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

export interface Tag {
  label: string;
  score: number;
}

/** Zero-shot tags for an image against a candidate vocabulary. */
export async function autoTag(
  imageSrc: string,
  labels: string[],
  topK = 6,
  threshold = 0.18,
): Promise<Tag[]> {
  if (!tagger) {
    const { pipeline } = await import("@huggingface/transformers");
    await configureEnv();
    tagger = await pipeline("zero-shot-image-classification", IMAGE_EMBED_MODEL);
  }
  const out = (await tagger(imageSrc, labels)) as Tag[];
  return out.filter((t) => t.score >= threshold).slice(0, topK);
}
