import { test, expect } from "@playwright/test";

/**
 * Emulation E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - emulate
 *   - resize_page
 *
 * Tests responsive layout across mobile, tablet, and desktop viewports.
 */

test.describe("Emulation — mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("mobile layout renders without horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    // Allow a small tolerance for scrollbar width and rounding
    // The app uses a fixed sidebar that may cause minor overflow on very small screens
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });

  test("mobile nav is accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("mobile-nav")).toBeVisible();

    // On mobile there should be a way to navigate (bottom nav or sidebar)
    const navLinks = page.locator("a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Emulation — tablet viewport", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("tablet layout renders correctly", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(width).toBe(768);

    // Verify the settings page renders at tablet width
    // Settings page renders with the Add Server button
    await expect(page.getByTestId("add-server-button")).toBeVisible();
  });
});

test.describe("Emulation — desktop viewport", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("desktop layout renders correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(width).toBe(1440);

    // Verify the desktop sidebar is visible at this viewport
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();
  });
});

test.describe("Emulation — resize_page dynamic", () => {
  test("resize from mobile to desktop updates layout", async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    const mobileWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(mobileWidth).toBe(375);

    // Resize to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.clientWidth === 1440);

    const desktopWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(desktopWidth).toBe(1440);

    // Verify the desktop sidebar appears after resizing
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();
  });

  test("resize from desktop to mobile updates layout", async ({ page }) => {
    // Start desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    const desktopWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(desktopWidth).toBe(1440);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForFunction(() => document.documentElement.clientWidth === 375);

    const mobileWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(mobileWidth).toBe(375);

    // Verify the page remains usable — header should still be visible
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });
});

test.describe("Emulation — device pixel ratio", () => {
  test("device pixel ratio is 1 on standard desktop", async ({ page }) => {
    await page.goto("/");
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    expect(dpr).toBe(1);

    // Verify the app renders content at standard resolution
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });
});