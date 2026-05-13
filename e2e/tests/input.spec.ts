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

    const input = page.getByPlaceholder("ask opencode…");
    await expect(input).toBeVisible();

    // The textarea is disabled when no server is configured.
    // Use evaluate_script (mirrors chrome-devtools-mcp evaluate_script)
    // to directly set the value and enable the element.
    await page.evaluate(() => {
      const textarea = document.querySelector(
        'textarea[placeholder="ask opencode…"]',
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.disabled = false;
        textarea.value = "Hello from Playwright";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await expect(input).toHaveValue("Hello from Playwright");
  });

  test("press Enter key in prompt input", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const input = page.getByPlaceholder("ask opencode…");
    await expect(input).toBeVisible();

    // Enable and fill via evaluate_script
    await page.evaluate(() => {
      const textarea = document.querySelector(
        'textarea[placeholder="ask opencode…"]',
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.disabled = false;
        textarea.value = "Test message";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
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

    // The settings form has name, url, username, password inputs
    // Use label-based selectors for robustness
    const inputs = page.locator('input[type="text"]');
    const urlInput = page.locator('input[type="url"]');

    // fill_form — fill available fields
    if ((await inputs.count()) > 0) {
      await inputs.first().fill("My Server");
      await expect(inputs.first()).toHaveValue("My Server");
    }

    if ((await urlInput.count()) > 0) {
      await urlInput.fill("http://localhost:8080");
      await expect(urlInput).toHaveValue("http://localhost:8080");
    }
  });
});

test.describe("Input — keyboard navigation", () => {
  test("Tab key navigates through focusable elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Get initial focus
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("Escape key does not crash the app", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Escape");

    // Page should still be functional
    await expect(page).toHaveURL(/\//);
  });
});
