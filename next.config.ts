import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

// Routes that embed a query at runtime pull in onnxruntime-node. Force its
// linux/x64 native lib into the bundle (file tracing misses it, causing
// "libonnxruntime.so.1: cannot open shared object file"), and drop the
// win32/darwin/arm64 binaries Vercel never runs — those alone are ~160 MB and
// push these functions past Vercel's 250 MB uncompressed limit.
const EMBED_ROUTES = [
  "/api/match",
  "/api/leads/triage",
  "/api/leads/rerun",
  "/api/visual-search",
  "/api/listings",
  "/api/agent",
];
const ONNX_BIN =
  "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin";
const byRoute = (globs: string[]): Record<string, string[]> =>
  Object.fromEntries(EMBED_ROUTES.map((r) => [r, globs]));

const nextConfig: NextConfig = {
  // Pin the workspace root — this repo sits alongside other lockfiles.
  turbopack: { root },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  // Native/heavy server-only deps must NOT be bundled by the build.
  // They are loaded lazily inside server handlers and scripts.
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
    "pg-boss",
    "postgres",
  ],
  // Keep only the linux/x64 onnxruntime native lib in each embedding route's
  // function; exclude the other platforms' binaries (see EMBED_ROUTES note).
  outputFileTracingIncludes: byRoute([`${ONNX_BIN}/**/linux/x64/*`]),
  outputFileTracingExcludes: byRoute([
    `${ONNX_BIN}/napi-v*/win32/**`,
    `${ONNX_BIN}/napi-v*/darwin/**`,
    `${ONNX_BIN}/napi-v*/linux/arm64/**`,
  ]),
};

export default nextConfig;
