import { test, expect } from "../../fixtures/pilot.fixture";
import { ROUTES } from "../../utils/routes";

/**
 * Visual regression screenshot tests.
 *
 * Uses Playwright's `toHaveScreenshot()` for pixel-level comparison
 * against stored baselines. Baselines are auto-generated on first run
 * with `--update-snapshots` and stored alongside this test file.
 */

// maxDiffPixelRatio controlled globally via playwright.config.ts expect.toHaveScreenshot

test.describe("Screenshot — full-page per route", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  const routes = [ROUTES.HOME, ROUTES.CHAT, ROUTES.SESSIONS, ROUTES.FILES, ROUTES.SETTINGS];

  for (const route of routes) {
    test(`full-page screenshot ${route === "/" ? "root" : route.replace("/", "")}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();

      await expect(page).toHaveScreenshot({ fullPage: true });
    });
  }
});

test.describe("Screenshot — element-level snapshots", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("chat prompt input snapshot", async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await page.waitForLoadState("domcontentloaded");

    const input = page.getByPlaceholder("ask opencode…");
    await expect(input).toBeVisible();

    await expect(input).toHaveScreenshot();
  });

  test("settings form snapshot", async ({ page }) => {
    await page.goto(ROUTES.SETTINGS);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    await expect(page.getByTestId("main-content")).toHaveScreenshot();
  });
});

test.describe("Screenshot — viewport vs fullPage", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("viewport-only screenshot matches visible area", async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    await expect(page).toHaveScreenshot({ fullPage: false });
  });
});