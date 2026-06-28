import { Langfuse } from "langfuse";

/**
 * Langfuse tracing singleton. Wired now; spans/generations get attached as the
 * LLM + retrieval paths land. No-ops gracefully when keys are absent.
 */

let client: Langfuse | null = null;

export function langfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return null;
  }
  if (!client) {
    client = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL ?? "https://cloud.langfuse.com",
    });
  }
  return client;
}
