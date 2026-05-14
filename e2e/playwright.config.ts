import { defineConfig, devices } from "@playwright/test";

const isFullStack = !!process.env.E2E_FULL_STACK;
const isCI = !!process.env.CI;

const serverPort = process.env.PORT || "3000";
const uiPort = "5173";

const webServer = isFullStack
  ? [
      {
        command: `npx tsx server/src/cli.ts --port ${serverPort}`,
        port: Number(serverPort),
        reuseExistingServer: !isCI,
        timeout: 30_000,
        env: {
          ...process.env,
          PORT: serverPort,
          OPENCODE_URL: process.env.OPENCODE_URL || "http://localhost:20128",
          CORS_ORIGINS: `http://localhost:${uiPort},http://100.81.83.98:${uiPort}`,
        },
      },
      {
        command: `npm run dev:ui -w ui`,
        url: `http://localhost:${uiPort}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          ...process.env,
          PROXY_TARGET: `http://localhost:${serverPort}`,
        },
      },
    ]
  : isCI
    ? undefined
    : {
        command: "npm run dev:ui -w ui",
        url: `http://localhost:${uiPort}`,
        reuseExistingServer: true,
        timeout: 120_000,
      };

export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["list"], ["html"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${uiPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Relax screenshot tolerance in CI (different font rendering, no anti-aliasing)
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: isCI ? 0.05 : 0.01,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer,
});