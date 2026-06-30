import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root — this repo sits alongside other lockfiles.
  turbopack: { root },
  // Native/heavy server-only deps must NOT be bundled by the build.
  // They are loaded lazily inside server handlers and scripts.
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
    "pg-boss",
    "postgres",
  ],
  // Force the onnxruntime-node native libs (.so) into the serverless function
  // bundle — file tracing misses them (loaded via a dynamic path), which causes
  // "libonnxruntime.so.1: cannot open shared object file" on Vercel.
  outputFileTracingIncludes: {
    "/api/match": [
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/**/linux/x64/*",
    ],
    "/api/leads/triage": [
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/**/linux/x64/*",
    ],
  },
};

export default nextConfig;
