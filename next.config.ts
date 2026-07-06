import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

// Routes that embed a query at runtime pull in onnxruntime-node. File tracing
// misses its native .so (loaded via a dynamic path), so force the linux/x64 lib
// into each such function or it throws "libonnxruntime.so.1: cannot open shared
// object file" on Vercel. NB: these functions are large (~360 MB) because
// serverExternalPackages copies the whole transformers/onnx closure; deploying
// them needs VERCEL_SUPPORT_LARGE_FUNCTIONS=1 set on the target environment.
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
  // Force the linux/x64 onnxruntime native lib into each embedding route (see
  // EMBED_ROUTES note) — including the new /api/agent route.
  outputFileTracingIncludes: byRoute([`${ONNX_BIN}/**/linux/x64/*`]),
};

export default nextConfig;
