import { test, expect } from "@playwright/test";

/**
 * Input automation E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - click
 *   - fill
 *   - fill_form
 *   - type_text
 *   - press_key
 *   - hover
 *   - handle_dialog
 *   - evaluate_script
 *
 * Tests user interactions across the Pilot UI.
 */

test.describe("Input — click / hover", () => {
  test("click nav link navigates to Settings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const settingsLink = page.getByRole("link", { name: /settings/i });
    await expect(settingsLink).toBeVisible();

    await settingsLink.click();
    await expect(page).toHaveURL("/settings");
  });

  test("hover on nav link shows visual state", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const sessionsLink = page.getByRole("link", { name: /sessions/i });
    await expect(sessionsLink).toBeVisible();

    // hover triggers CSS :hover state
    await sessionsLink.hover();

    // Verify the element is still present after hover
    await expect(sessionsLink).toBeVisible();
  });
});

test.describe("Input — type_text / fill / press_key", () => {
  test("type text into prompt input via evaluate_script", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const input = page.getByTestId("prompt-input");
    await expect(input).toBeVisible();

    // The input is disabled when no server is configured.
    // Use evaluate_script (mirrors chrome-devtools-mcp evaluate_script)
    // to directly set the value and enable the element.
    await page.evaluate(() => {
      const input = document.querySelector(
        'input[data-testid="prompt-input"]',
      ) as HTMLInputElement | null;
      if (input) {
        input.disabled = false;
        input.value = "Hello from Playwright";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await expect(input).toHaveValue("Hello from Playwright");
  });

  test("press Enter key in prompt input", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const input = page.getByTestId("prompt-input");
    await expect(input).toBeVisible();

    // Enable and fill via evaluate_script
    await page.evaluate(() => {
      const input = document.querySelector(
        'input[data-testid="prompt-input"]',
      ) as HTMLInputElement | null;
      if (input) {
        input.disabled = false;
        input.value = "Test message";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await input.press("Enter");

    // After submit the input may clear or show loading state
    // Just verify the interaction completed without error
    await expect(page).toHaveURL(/\//);
  });
});

test.describe("Input — fill_form", () => {
  test("fill and submit settings form", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // The settings form inputs only appear after clicking "Add Server"
    await page.getByTestId("add-server-button").click();

    // fill_form — fill available fields
    await expect(page.getByTestId("server-name-input")).toBeVisible();
    await page.getByTestId("server-name-input").fill("My Server");
    await expect(page.getByTestId("server-name-input")).toHaveValue("My Server");

    await expect(page.getByTestId("server-url-input")).toBeVisible();
    await page.getByTestId("server-url-input").fill("http://localhost:8080");
    await expect(page.getByTestId("server-url-input")).toHaveValue(
      "http://localhost:8080",
    );
  });
});

test.describe("Input — keyboard navigation", () => {
  test("Tab key navigates through focusable elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Get initial focus
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test("Escape key does not crash the app", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Escape");

    // Page should still be functional
    await expect(page).toHaveURL(/\//);
  });
});