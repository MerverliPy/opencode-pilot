import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '..');
const isFullStack = !!process.env.E2E_FULL_STACK;
const isCI = !!process.env.CI;

const serverPort = process.env.PORT || "43001";
const uiPort = process.env.E2E_UI_PORT || "43173";

const webServer = isFullStack
  ? [
      {
        command: `node ${resolve(__dirname, '../server/node_modules/.bin/tsx')} ${resolve(__dirname, '../server/src/cli.ts')} --port ${serverPort}`,
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
        command: `npm --prefix ${rootDir} run dev:ui -- -- --port ${uiPort}`,
        url: `http://localhost:${uiPort}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          ...process.env,
          PROXY_TARGET: `http://localhost:${serverPort}`,
          PORT: uiPort,
        },
      },
    ]
  : isCI
    ? undefined
    : {
        command: `npm --prefix ${rootDir} run dev:ui -- -- --port ${uiPort}`,
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
  workers: isCI ? 2 : undefined,
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
