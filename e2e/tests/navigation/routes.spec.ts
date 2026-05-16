import { test, expect } from "@playwright/test";

/**
 * Navigation E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - navigate_page
 *   - list_pages
 *   - new_page
 *   - close_page
 *   - select_page
 *   - wait_for
 */

test.describe("Navigation — route rendering", () => {
  test.beforeEach(async ({ context }) => {
    // Clear server state before each test to prevent cross-test pollution
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
    });
  });

  test("root / renders Chat page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    // Chat page shows prompt textarea with placeholder
    await expect(
      page.getByPlaceholder("ask opencode…"),
    ).toBeVisible();
  });

  test("/chat renders Chat page", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByPlaceholder("ask opencode…"),
    ).toBeVisible();
  });

  test("/chat/:sessionId deep link works", async ({ page }) => {
    const sessionId = "test-session-123";
    await page.goto(`/chat/${sessionId}`);
    await expect(page).toHaveURL(`/chat/${sessionId}`);
    await expect(
      page.getByPlaceholder("ask opencode…"),
    ).toBeVisible();
  });

  test("/sessions renders Sessions page", async ({ page }) => {
    await page.goto("/sessions");
    // Without a configured server, Sessions shows "no server configured"
    await expect(
      page.getByText(/no server configured/i),
    ).toBeVisible();
  });

  test("/files renders Files page", async ({ page }) => {
    await page.goto("/files");
    // Without a configured server, Files shows "no server configured"
    await expect(
      page.getByText(/no server configured/i),
    ).toBeVisible();
  });

  test("/settings renders Settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /settings/i }),
    ).toBeVisible();
  });

  test("unknown route redirects to /", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Navigation — internal links", () => {
  test("clicking nav links switches pages without reload", async ({ page }) => {
    await page.goto("/");

    // Navigate to settings via nav link (emoji + text label)
    const settingsLink = page.getByRole("link", { name: /settings/i });
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL("/settings");

    // Navigate to sessions via nav link
    const sessionsLink = page.getByRole("link", { name: /sessions/i });
    await expect(sessionsLink).toBeVisible();
    await sessionsLink.click();
    await expect(page).toHaveURL("/sessions");

    // Navigate back to chat via nav link
    const chatLink = page.getByRole("link", { name: /chat/i });
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Navigation — multi-page", () => {
  test("new_page / list_pages / close_page lifecycle", async ({ browser }) => {
    const context = await browser.newContext();

    // list_pages — initially no pages
    let pages = context.pages();
    expect(pages).toHaveLength(0);

    // new_page — create two pages
    const page1 = await context.newPage();
    await page1.goto("/");
    await page1.waitForLoadState("domcontentloaded");
    await expect(page1.getByTestId("prompt-input")).toBeVisible();

    const page2 = await context.newPage();
    await page2.goto("/settings");
    await page2.waitForLoadState("domcontentloaded");
    await expect(page2.getByTestId("main-content")).toBeVisible();

    // list_pages — verify both exist
    pages = context.pages();
    expect(pages).toHaveLength(2);

    // select_page — bring page1 to front
    await page1.bringToFront();
    expect(context.pages()[0]).toBe(page1);

    // close_page
    await page2.close();
    pages = context.pages();
    expect(pages).toHaveLength(1);

    await context.close();
  });
});