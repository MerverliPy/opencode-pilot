import { test, expect } from "../../fixtures/pilot.fixture";
import { ROUTES } from "../../utils/routes";

/**
 * Visual regression tests for key UI states.
 *
 * Captures snapshots of important application states across viewports
 * using Playwright's `toHaveScreenshot()` for pixel-level comparison.
 */

// maxDiffPixelRatio controlled globally via playwright.config.ts expect.toHaveScreenshot

test.describe("Regression — settings page states", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("settings page — empty state (no servers configured)", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.gotoSettings();
    await expect(settingsPage.heading).toBeVisible();

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });

  test("settings page — add server form visible", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.gotoSettings();
    await expect(settingsPage.heading).toBeVisible();

    // Click the add-server button if present
    const addServerButton = page.getByRole("button", {
      name: /add.*server/i,
    });
    const buttonVisible = await addServerButton.isVisible().catch(() => false);
    if (buttonVisible) {
      await addServerButton.click();
    }

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });
});

test.describe("Regression — terminal page", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("terminal page — empty state", async ({ page }) => {
    await page.goto(ROUTES.TERMINAL);
    await page.waitForLoadState("domcontentloaded");
    // Wait for the page to finish rendering (terminal or fallback)
    await expect(page.getByTestId("main-content")).toBeVisible();

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });
});

test.describe("Regression — chat page", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("chat page — with prompt input", async ({ page, pilotPage }) => {
    await pilotPage.gotoChat();
    await expect(pilotPage.promptInput).toBeVisible();

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });
});

test.describe("Regression — responsive viewports", () => {
  test.skip(!!process.env.CI, "Visual regression requires local baseline — skip in CI");
  test("chat page — mobile viewport (375×812)", async ({
    page,
    pilotPage,
    mobileViewport,
  }) => {
    await pilotPage.gotoChat();
    await expect(pilotPage.promptInput).toBeVisible();

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });

  test("settings page — desktop viewport (1440×900)", async ({
    page,
    settingsPage,
    desktopViewport,
  }) => {
    await settingsPage.gotoSettings();
    await expect(settingsPage.heading).toBeVisible();

    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });
});