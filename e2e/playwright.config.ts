import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Pilot E2E tests.
 *
 * Mirrors capabilities exposed by chrome-devtools-mcp:
 * - Navigation, input automation, screenshots, console inspection
 * - Network monitoring, device emulation, performance tracing
 *
 * Chromium is the only browser since chrome-devtools-mcp is Chrome-only.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: process.env.CI
    ? undefined
    : {
        command: "cd .. && npm run dev:ui",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
