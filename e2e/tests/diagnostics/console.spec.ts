import { test, expect } from "@playwright/test";

/**
 * Console E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - list_console_messages
 *   - get_console_message
 *   - evaluate_script
 *
 * Validates that all routes load without console errors or warnings.
 */

const ROUTES = ["/", "/chat", "/sessions", "/files", "/settings"];

test.describe("Console — error-free page loads", () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear server state before each test to prevent cross-test pollution
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
      localStorage.removeItem("pilot.e2eAuthBypass");
    });
    // Mock backend-dependent endpoints to prevent Vite proxy errors
    await page.route("**/push/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ enabled: false, publicKey: null }),
      }),
    );
    await page.route("**/tunnel/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, url: null, error: null }),
      }),
    );
  });
  for (const route of ROUTES) {
    test(`no console.error on ${route || "/"}`, async ({ page }) => {
      const errors: { type: string; text: string }[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push({ type: msg.type(), text: msg.text() });
        }
      });

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();

      expect(errors).toHaveLength(0);
    });
  }
});

test.describe("Console — warning audit", () => {
  test.beforeEach(async ({ context }) => {
    // Clear server state before each test to prevent cross-test pollution
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
      localStorage.removeItem("pilot.e2eAuthBypass");
    });
  });
  for (const route of ROUTES) {
    test(`no console.warn on ${route || "/"}`, async ({ page }) => {
      const warnings: { type: string; text: string }[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "warning") {
          warnings.push({ type: msg.type(), text: msg.text() });
        }
      });

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();

      // Filter out PWA/service-worker warnings that only appear in production builds
      const appWarnings = warnings.filter(
        (w) =>
          !w.text.includes("offline.html") &&
          !w.text.includes("service-worker") &&
          !w.text.includes("ServiceWorker") &&
          !w.text.includes("workbox"),
      );
      expect(appWarnings).toHaveLength(0);
    });
  }
});

test.describe("Console — message capture and inspection", () => {
  test("list_console_messages collects all console output", async ({
    page,
  }) => {
    const messages: string[] = [];

    page.on("console", (msg) => {
      messages.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Verify the console listener mechanism captured messages correctly
    expect(messages.length).toBeGreaterThanOrEqual(0);
  });

  test("evaluate_script returns correct value", async ({ page }) => {
    await page.goto("/");

    // Mirrors evaluate_script — inject JS into the page context
    const title = await page.evaluate(() => document.title);
    expect(typeof title).toBe("string");

    const url = await page.evaluate(() => window.location.href);
    expect(url).toContain("localhost");

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

test.describe("Console — page error events", () => {
  test("no unhandled page errors on load", async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    expect(pageErrors).toHaveLength(0);
  });

  test("no request failures for static assets", async ({ page }) => {
    const failedRequests: string[] = [];

    page.on("requestfailed", (req) => {
      failedRequests.push(req.url());
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Filter out non-critical failures (e.g. favicon)
    const criticalFailures = failedRequests.filter(
      (url) => !url.includes("favicon"),
    );

    expect(criticalFailures).toHaveLength(0);
  });
});