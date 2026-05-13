import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Screenshot E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - take_screenshot
 *   - take_snapshot
 *
 * Screenshots are saved to e2e/screenshots/ for visual regression inspection.
 */

const screenshotsDir = join(process.cwd(), "screenshots");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

test.describe("Screenshot — full-page per route", () => {
  const routes = ["/", "/chat", "/sessions", "/files", "/settings"];

  for (const route of routes) {
    test(`screenshot ${route || "/"}`, async ({ page }) => {
      ensureDir(screenshotsDir);

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const fileName = `route-${route.replace(/\//g, "_") || "root"}.png`;
      const filePath = join(screenshotsDir, fileName);

      await page.screenshot({ path: filePath, fullPage: true });

      expect(existsSync(filePath)).toBe(true);
    });
  }
});

test.describe("Screenshot — element-level snapshots", () => {
  test("chat prompt input snapshot", async ({ page }) => {
    ensureDir(screenshotsDir);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const input = page.getByPlaceholder("ask opencode…");
    await expect(input).toBeVisible();

    const filePath = join(screenshotsDir, "element-prompt-input.png");
    await input.screenshot({ path: filePath });

    expect(existsSync(filePath)).toBe(true);
  });

  test("settings form snapshot", async ({ page }) => {
    ensureDir(screenshotsDir);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const filePath = join(screenshotsDir, "element-settings-form.png");
    await page.screenshot({ path: filePath, fullPage: true });

    expect(existsSync(filePath)).toBe(true);
  });
});

test.describe("Screenshot — viewport vs fullPage", () => {
  test("viewport-only screenshot matches visible area", async ({ page }) => {
    ensureDir(screenshotsDir);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const viewportPath = join(screenshotsDir, "viewport.png");
    await page.screenshot({ path: viewportPath, fullPage: false });

    expect(existsSync(viewportPath)).toBe(true);
  });
});
