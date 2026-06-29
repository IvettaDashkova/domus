import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";

/**
 * Gemini provider (free tier) via the Vercel AI SDK. Created lazily so a
 * missing key never breaks the build.
 */

let provider: GoogleGenerativeAIProvider | null = null;

/** Accept either the AI-SDK default name or a plain GEMINI_API_KEY. */
export function geminiApiKey(): string {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

export function gemini(): GoogleGenerativeAIProvider {
  if (!provider) {
    provider = createGoogleGenerativeAI({ apiKey: geminiApiKey() });
  }
  return provider;
}

export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Convenience: the default chat/extraction model. */
export function geminiModel() {
  return gemini()(DEFAULT_MODEL);
}
