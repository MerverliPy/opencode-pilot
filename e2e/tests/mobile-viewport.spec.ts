import { test, expect, devices } from "@playwright/test";

/**
 * Mobile viewport regression E2E tests.
 *
 * Guards against two fixed bugs:
 *  1. White outline around screen on iOS — caused by missing
 *     viewport-fit=cover in viewport meta and no html/body background.
 *  2. Bottom nav icons cut off by iOS home indicator — caused by missing
 *     padding-bottom: env(safe-area-inset-bottom) on mobile nav.
 */

// ---------------------------------------------------------------------------
// Test group 1: Viewport meta tag
// ---------------------------------------------------------------------------

test.describe("Viewport meta tag", () => {
  test("contains viewport-fit=cover", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const content = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") ?? "";
    });

    expect(content).toContain("viewport-fit=cover");
  });

  test("contains width=device-width", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const content = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") ?? "";
    });

    expect(content).toContain("width=device-width");
  });
});

// ---------------------------------------------------------------------------
// Test group 2: No white outline (background coverage)
// ---------------------------------------------------------------------------

test.describe("No white outline — background coverage", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("html element background is not white or transparent", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bg = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
      };
    });

    // The theme sets html background to #0d0d0d (rgb(13, 13, 13)).
    // It must not be white (rgb(255, 255, 255)) or transparent.
    expect(bg.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg.backgroundColor).not.toBe("rgb(255, 255, 255)");
    expect(bg.backgroundColor).not.toBe("transparent");
  });

  test("body element background is not white or transparent", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bg = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return style.backgroundColor;
    });

    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("rgb(255, 255, 255)");
  });

  test("root layout div fills full viewport height with no edge gaps", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const layout = await page.evaluate(() => {
      const root = document.getElementById("root");
      if (!root) return null;
      const rootChild = root.firstElementChild as HTMLElement | null;
      if (!rootChild) return null;

      const rootRect = root.getBoundingClientRect();
      const childRect = rootChild.getBoundingClientRect();

      return {
        rootHeight: rootRect.height,
        childHeight: childRect.height,
        childTop: childRect.top,
        childLeft: childRect.left,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.childHeight).toBeGreaterThanOrEqual(layout!.viewportHeight);
    expect(layout!.childTop).toBe(0);
    expect(layout!.childLeft).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test group 3: Mobile bottom nav safe area
// ---------------------------------------------------------------------------

test.describe("Mobile bottom nav safe area", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("mobile-nav element is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mobileNav = page.locator(".mobile-nav");
    await expect(mobileNav).toBeVisible();
  });

  test("mobile-nav has padding-bottom including env(safe-area-inset-bottom)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check the actual CSS rule for env(safe-area-inset-bottom).
    // Computed style resolves env() to its fallback or the UA value,
    // so we inspect the stylesheet rules directly.
    const hasEnvPadding = await page.evaluate(() => {
      const checkRules = (rules: CSSRuleList): boolean => {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) {
            if (checkRules(rule.cssRules)) return true;
          }
          if (rule instanceof CSSStyleRule) {
            if (rule.selectorText?.includes("mobile-nav")) {
              if (rule.style.paddingBottom?.includes("safe-area-inset-bottom")) {
                return true;
              }
            }
          }
        }
        return false;
      };
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          if (checkRules(sheet.cssRules)) return true;
        } catch {
          // Cross-origin stylesheets throw on cssRules access; skip.
        }
      }
      return false;
    });

    expect(hasEnvPadding).toBe(true);
  });

  test("all 7 nav items in mobile-nav are fully visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const navItems = page.locator(".mobile-nav a");
    await expect(navItems).toHaveCount(7);

    // Verify each nav item is within the viewport bounds
    const allVisible = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-nav");
      if (!nav) return false;

      const links = nav.querySelectorAll("a");
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      for (let i = 0; i < links.length; i++) {
        const rect = links[i].getBoundingClientRect();
        if (rect.top < 0 || rect.left < 0) return false;
        if (rect.bottom > viewportHeight) return false;
        if (rect.right > viewportWidth) return false;
      }
      return true;
    });

    expect(allVisible).toBe(true);
  });

  test("last nav item bottom edge is within the viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const lastItemInViewport = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-nav");
      if (!nav) return false;

      const links = nav.querySelectorAll("a");
      const lastLink = links[links.length - 1];
      if (!lastLink) return false;

      const rect = lastLink.getBoundingClientRect();
      return rect.bottom <= window.innerHeight;
    });

    expect(lastItemInViewport).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test group 4: iPhone device emulation
// ---------------------------------------------------------------------------

const iPhone14Pro = (() => {
  const d = devices["iPhone 14 Pro"];
  return {
    viewport: d.viewport,
    userAgent: d.userAgent,
    deviceScaleFactor: d.deviceScaleFactor,
    isMobile: d.isMobile,
    hasTouch: d.hasTouch,
  };
})();

test.describe("iPhone 14 Pro device emulation", () => {
  test.use(iPhone14Pro);

  test("no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    // Allow small tolerance for rounding
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("bottom nav is fully visible and not cut off", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mobileNav = page.locator(".mobile-nav");
    await expect(mobileNav).toBeVisible();

    const navNotClipped = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-nav");
      if (!nav) return false;

      const rect = nav.getBoundingClientRect();
      return rect.bottom <= window.innerHeight && rect.top >= 0;
    });

    expect(navNotClipped).toBe(true);
  });

  test("viewport meta has viewport-fit=cover", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const content = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") ?? "";
    });

    expect(content).toContain("viewport-fit=cover");
  });
});

// ---------------------------------------------------------------------------
// Test group 5: Dynamic viewport resize
// ---------------------------------------------------------------------------

test.describe("Dynamic viewport resize", () => {
  test("sidebar visible on desktop, hidden on mobile; mobile nav hidden on desktop, visible on mobile", async ({
    page,
  }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Desktop: sidebar visible, mobile nav hidden
    const sidebar = page.locator(".desktop-sidebar");
    await expect(sidebar).toBeVisible();

    const mobileNav = page.locator(".mobile-nav");
    await expect(mobileNav).toBeHidden();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    // Wait for the media query to take effect and layout to settle
    await page.waitForTimeout(300);

    // Mobile: sidebar hidden, mobile nav visible
    await expect(sidebar).toBeHidden();
    await expect(mobileNav).toBeVisible();

    // Verify mobile nav has safe-area padding in its CSS rule
    const hasEnvPadding = await page.evaluate(() => {
      const checkRules = (rules: CSSRuleList): boolean => {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) {
            if (checkRules(rule.cssRules)) return true;
          }
          if (rule instanceof CSSStyleRule) {
            if (rule.selectorText?.includes("mobile-nav")) {
              if (
                rule.style.paddingBottom?.includes("safe-area-inset-bottom")
              ) {
                return true;
              }
            }
          }
        }
        return false;
      };
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          if (checkRules(sheet.cssRules)) return true;
        } catch {
          // Cross-origin stylesheets throw; skip
        }
      }
      return false;
    });
    expect(hasEnvPadding).toBe(true);
  });

  test("no content overflow after resize from desktop to mobile", async ({
    page,
  }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    // Allow small tolerance for rounding
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});