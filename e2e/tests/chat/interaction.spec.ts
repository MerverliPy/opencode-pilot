import { test, expect } from "../../fixtures/pilot.fixture";

/**
 * Interactive UI behavior E2E tests for the Pilot PWA.
 *
 * Covers:
 *  1. Session bar visibility, sticky positioning, safe-area padding, z-index
 *  2. Session bar on mobile viewport
 *  3. Prompt textarea disabled/enabled state and typing
 *  4. Sidebar collapse/expand toggle
 *  5. Clipboard interaction for file parts and tool output copy buttons
 */

// ---------------------------------------------------------------------------
// Test group 1: Session bar visibility and layout
// ---------------------------------------------------------------------------

test.describe("Session bar visibility and layout", () => {
  test("session bar header is visible on chat page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // The Chat page renders a <header> element containing the session title
    // and status indicator. It must be visible on initial load.
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("session bar has sticky positioning", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    // Guards against the header losing its sticky positioning, which would
    // cause the session bar to scroll out of view when the message area overflows.
    const position = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return window.getComputedStyle(header).position;
    });

    expect(position).toBe("sticky");
  });

  test("session bar does not collapse when content overflows", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    // The header must have flexShrink: 0 so it never shrinks when the
    // message area or other siblings compete for vertical space.
    const flexShrink = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return (header as HTMLElement).style.flexShrink;
    });

    expect(flexShrink).toBe("0");
  });

  test("session bar has safe-area padding at top", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    // On devices with a notch (e.g. iPhone), the header must respect
    // env(safe-area-inset-top) so content isn't hidden behind the notch.
    const paddingTop = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return (header as HTMLElement).style.paddingTop;
    });

    expect(paddingTop).toContain("safe-area-inset-top");
  });

  test("session bar has z-index above content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    // The sticky header must layer above the scrollable message area so
    // messages don't paint over the session bar when scrolling.
    const zIndex = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return parseInt(window.getComputedStyle(header).zIndex, 10);
    });

    expect(zIndex).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Test group 2: Session bar on mobile viewport
// ---------------------------------------------------------------------------

test.describe("Session bar on mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("session bar is visible on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // The session bar must remain visible even on narrow mobile screens.
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("session bar top edge is at or near viewport top", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("prompt-input")).toBeVisible();

    // On mobile the header should be flush with the top of the viewport
    // (within 1px tolerance for sub-pixel rounding).
    const top = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return header.getBoundingClientRect().top;
    });

    expect(top).not.toBeNull();
    expect(Math.abs(top!)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Test group 3: Interactive elements — prompt input
// ---------------------------------------------------------------------------

test.describe("Interactive elements — prompt input", () => {
  test("prompt textarea is present and disabled without server", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Without a server configured, the prompt textarea must be disabled
    // to prevent the user from submitting messages that cannot be processed.
    const textarea = page.getByPlaceholder("ask opencode…");
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeDisabled();
  });

  // NOTE: Prompt input disabled state requires a running server.
  // See Phase 2 for full-stack E2E prompt tests.
});

// ---------------------------------------------------------------------------
// Test group 4: Interactive elements — sidebar navigation
// ---------------------------------------------------------------------------

test.describe("Interactive elements — sidebar navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sidebar collapse toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // At desktop viewport the sidebar should be visible at its expanded width.
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();

    const initialWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // The collapse button toggles sidebar between 240px and 56px.
    const collapseButton = page.getByRole("button", {
      name: /sidebar/i,
    });
    await collapseButton.click();

    // Wait for the CSS transition to settle — sidebar width drops below 100px
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      return el !== null && el.getBoundingClientRect().width < 100;
    });

    const collapsedWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Collapsed width should be smaller than the initial width
    expect(collapsedWidth).toBeLessThan(initialWidth!);
    // Collapsed sidebar is ~80px (56px minWidth + 12px+12px padding)
    expect(collapsedWidth!).toBeLessThan(100);
  });

  test("sidebar expand toggle restores width", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();

    // Collapse first
    const collapseButton = page.getByRole("button", {
      name: /sidebar/i,
    });
    await collapseButton.click();
    // Wait for the CSS transition to settle — sidebar width drops below 100px
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      return el !== null && el.getBoundingClientRect().width < 100;
    });

    const collapsedWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Now expand — the button label flips to "Expand sidebar"
    const expandButton = page.getByRole("button", {
      name: /expand sidebar/i,
    });
    await expandButton.click();
    // Wait for the CSS transition to settle — sidebar width exceeds 200px
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      return el !== null && el.getBoundingClientRect().width > 200;
    });

    const restoredWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="desktop-sidebar"]');
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Restored width should be back to expanded size (~264px = 240px + padding)
    expect(restoredWidth!).toBeGreaterThan(200);
    expect(restoredWidth!).toBeGreaterThan(collapsedWidth! * 2);
  });
});

// NOTE: Clipboard tests require a running server with real message content.
// See Phase 2 for full-stack E2E clipboard tests.


test.describe.configure({ mode: "serial" });

test.describe("Session title rename — full-stack", () => {
  test.skip(() => !process.env.E2E_FULL_STACK, "Requires E2E_FULL_STACK=1");

  test.beforeEach(async ({ page }) => {
    // Skip if no OpenCode upstream is configured (default 20128 won't be running)
    if (!process.env.OPENCODE_URL || process.env.OPENCODE_URL === "http://localhost:20128") {
      test.skip(true, "Requires OpenCode upstream at OPENCODE_URL");
      return;
    }
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "pilot.servers",
        JSON.stringify([
          {
            id: "e2e-test-server",
            name: "E2E Test",
            url: window.location.origin,
          },
        ]),
      );
      localStorage.setItem("pilot.activeServer", "e2e-test-server");
    });
  });

  test("renames session title and persists after reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();
    await expect(page.getByTestId("session-bar")).toContainText("new session");

    await page.getByTestId("session-title-edit").click();
    const titleInput = page.getByTestId("session-title-input");
    await expect(titleInput).toBeVisible();
    await titleInput.fill("  Renamed session  ");
    await titleInput.press("Enter");

    await expect(titleInput).not.toBeVisible();
    await expect(page.getByTestId("session-bar")).toContainText("Renamed session");

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("session-bar")).toContainText("Renamed session");
  });

  test("failed rename keeps edit mode open and shows error", async ({ page }) => {
    let sessionId: string | null = null;

    await page.route("**/session/*", async (route) => {
      const request = route.request();
      if (request.method() !== "PATCH") {
        await route.continue();
        return;
      }

      const url = new URL(request.url());
      const patchSessionId = url.pathname.split("/").pop();
      if (!sessionId || patchSessionId !== sessionId) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "rename failed",
      });
    });

    page.on("response", async (response) => {
      if (response.request().method() !== "POST") return;
      if (!response.url().endsWith("/session")) return;
      const body = (await response.json()) as { id?: string };
      sessionId = body.id ?? null;
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();
    await expect(page.getByTestId("session-bar")).toContainText("new session");

    await page.getByTestId("session-title-edit").click();
    const titleInput = page.getByTestId("session-title-input");
    await expect(titleInput).toBeVisible();
    await titleInput.fill("Broken rename");
    await titleInput.press("Enter");

    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("Broken rename");
    await expect(page.getByText("Server error: rename failed")).toBeVisible();
  });

  test("escape cancels rename without saving", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();
    await expect(page.getByTestId("session-bar")).toContainText("new session");

    await page.getByTestId("session-title-edit").click();
    const titleInput = page.getByTestId("session-title-input");
    await expect(titleInput).toBeVisible();
    await titleInput.fill("Cancelled title");
    await titleInput.press("Escape");

    await expect(titleInput).not.toBeVisible();
    await expect(page.getByTestId("session-bar")).toContainText("new session");
  });
});
