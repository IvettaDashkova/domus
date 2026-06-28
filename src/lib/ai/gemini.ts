import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Gemini provider (free tier) via the Vercel AI SDK. Wired now, used from
 * Phase 3 (lead-triage extraction). Created lazily so a missing key never
 * breaks the build.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let provider: any = null;

export function gemini() {
  if (!provider) {
    provider = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
    });
  }
  return provider;
}

export const DEFAULT_MODEL = "gemini-1.5-flash";
