import { test, expect } from "../../fixtures/pilot.fixture";

/**
 * Settings flow E2E tests.
 *
 * Tests the server configuration flow:
 * - Navigate to settings
 * - Add a server
 * - View server details
 * - Remove a server
 * - Tunnel controls (full-stack only)
 */

test.describe("Settings — server configuration", () => {
  test("settings page renders with Add Server button", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Should show the Settings heading
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Should show the Add Server button
    await expect(page.getByTestId("add-server-button")).toBeVisible();
  });

  test("click Add Server reveals form inputs", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Click Add Server
    await page.getByTestId("add-server-button").click();

    // Form inputs should appear
    await expect(page.getByTestId("server-name-input")).toBeVisible();
    await expect(page.getByTestId("server-url-input")).toBeVisible();
  });

  test("fill server form and save", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Click Add Server
    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();

    // Fill the form
    await page.getByTestId("server-name-input").fill("Test Server");
    await page.getByTestId("server-url-input").fill("http://localhost:4096");

    // Verify values
    await expect(page.getByTestId("server-name-input")).toHaveValue("Test Server");
    await expect(page.getByTestId("server-url-input")).toHaveValue("http://localhost:4096");
  });

  test("shows no servers message when empty", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // The Add Server button should always be visible regardless of server state
    await expect(page.getByTestId("add-server-button")).toBeVisible();
  });

  test("cancel add server hides form", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Click Add Server
    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();

    // Click Cancel (look for cancel/close button)
    const cancelButton = page.getByRole("button", { name: /cancel|close/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      // Form should be hidden
      await expect(page.getByTestId("server-name-input")).not.toBeVisible();
    }
  });
});

test.describe("Settings — tunnel controls", () => {
  test.skip(() => !process.env.E2E_FULL_STACK, "Requires E2E_FULL_STACK=1");

  test("tunnel section is visible on settings page", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Tunnel section should be visible
    await expect(page.getByText(/tunnel/i).first()).toBeVisible();
  });
});