import { test, expect } from "../../fixtures/pilot.fixture";
import { ROUTES } from "../../utils/routes";

/**
 * Visual regression screenshot tests.
 *
 * Uses Playwright's `toHaveScreenshot()` for pixel-level comparison
 * against stored baselines. Baselines are auto-generated on first run
 * with `--update-snapshots` and stored alongside this test file.
 */

const { maxDiffPixelRatio } = { maxDiffPixelRatio: 0.01 };

test.describe("Screenshot — full-page per route", () => {
  const routes = [ROUTES.HOME, ROUTES.CHAT, ROUTES.SESSIONS, ROUTES.FILES, ROUTES.SETTINGS];

  for (const route of routes) {
    test(`full-page screenshot ${route === "/" ? "root" : route.replace("/", "")}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();

      await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixelRatio });
    });
  }
});

test.describe("Screenshot — element-level snapshots", () => {
  test("chat prompt input snapshot", async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await page.waitForLoadState("domcontentloaded");

    const input = page.getByPlaceholder("ask opencode…");
    await expect(input).toBeVisible();

    await expect(input).toHaveScreenshot({ maxDiffPixelRatio });
  });

  test("settings form snapshot", async ({ page }) => {
    await page.goto(ROUTES.SETTINGS);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    await expect(page.getByTestId("main-content")).toHaveScreenshot({
      maxDiffPixelRatio,
    });
  });
});

test.describe("Screenshot — viewport vs fullPage", () => {
  test("viewport-only screenshot matches visible area", async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    await expect(page).toHaveScreenshot({ fullPage: false, maxDiffPixelRatio });
  });
});