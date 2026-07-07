import { defineConfig, devices } from "@playwright/test";

// E2E over the public surface (landing + SEO routes). Self-contained by default:
// builds and serves the production app locally — no DB/Supabase needed, since the
// landing renders unauthenticated. Set E2E_BASE_URL to test a remote deployment
// (e.g. production) instead of booting a local server.
const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start -p ${PORT}`,
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
});
