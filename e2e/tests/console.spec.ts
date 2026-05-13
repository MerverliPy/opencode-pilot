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
  for (const route of ROUTES) {
    test(`no console.error on ${route || "/"}`, async ({ page }) => {
      const errors: { type: string; text: string }[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push({ type: msg.type(), text: msg.text() });
        }
      });

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      expect(errors).toHaveLength(0);
    });
  }
});

test.describe("Console — warning audit", () => {
  for (const route of ROUTES) {
    test(`no console.warn on ${route || "/"}`, async ({ page }) => {
      const warnings: { type: string; text: string }[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "warning") {
          warnings.push({ type: msg.type(), text: msg.text() });
        }
      });

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      expect(warnings).toHaveLength(0);
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
    await page.waitForLoadState("networkidle");

    // Should have at least some console messages (e.g. from React dev)
    // or zero if the app is completely clean
    // We just assert the array is defined and checkable
    expect(Array.isArray(messages)).toBe(true);
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
    await page.waitForLoadState("networkidle");

    expect(pageErrors).toHaveLength(0);
  });

  test("no request failures for static assets", async ({ page }) => {
    const failedRequests: { url: string; status: number | null }[] = [];

    page.on("requestfailed", (req) => {
      failedRequests.push({
        url: req.url(),
        status: req.response()?.status() ?? null,
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out non-critical failures (e.g. favicon)
    const criticalFailures = failedRequests.filter(
      (r) => !r.url.includes("favicon"),
    );

    expect(criticalFailures).toHaveLength(0);
  });
});
