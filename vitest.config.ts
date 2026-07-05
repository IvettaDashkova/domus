import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for the pure logic (geo, TSP, retrieval metrics, matrix, schemas).
// `@/` is aliased to src/ so tested modules resolve their imports exactly as
// they do under Next — no separate tsconfig-paths plugin needed.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
