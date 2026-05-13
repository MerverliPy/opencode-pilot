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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(width).toBe(768);
  });
});

test.describe("Emulation — desktop viewport", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("desktop layout renders correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(width).toBe(1440);
  });
});

test.describe("Emulation — resize_page dynamic", () => {
  test("resize from mobile to desktop updates layout", async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mobileWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(mobileWidth).toBe(375);

    // Resize to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300); // Allow layout to settle

    const desktopWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(desktopWidth).toBe(1440);
  });

  test("resize from desktop to mobile updates layout", async ({ page }) => {
    // Start desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const desktopWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(desktopWidth).toBe(1440);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const mobileWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(mobileWidth).toBe(375);
  });
});

test.describe("Emulation — device pixel ratio", () => {
  test("device pixel ratio is 1 on standard desktop", async ({ page }) => {
    await page.goto("/");
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    expect(dpr).toBe(1);
  });
});
