import { test, expect } from "@playwright/test";

test.describe("Settings — server CRUD", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
      localStorage.removeItem("pilot.e2eAuthBypass");
    });
  });

  test("settings page renders with all sections", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("settings-heading")).toBeVisible();
    await expect(page.getByTestId("push-toggle")).toBeVisible();
    await expect(page.getByTestId("start-tunnel-button")).toBeVisible();
    await expect(page.getByTestId("add-server-button")).toBeVisible();
  });

  test("click Add Server opens modal", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();
  });

  test("cancel modal closes it", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();

    await page.getByTestId("modal-cancel-button").click();
    await expect(page.getByTestId("server-name-input")).not.toBeVisible();
  });

  test("fill and save server", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("add-server-button").click();
    await page.getByTestId("server-name-input").fill("My Server");
    await page.getByTestId("server-url-input").fill("http://localhost:4096");
    await page.getByTestId("modal-save-button").click();

    // Modal closes after save
    await expect(page.getByTestId("server-name-input")).not.toBeVisible();
    // A server row appears in the list
    await expect(page.getByTestId("server-list").getByRole("button")).not.toHaveCount(0);
  });

  test("shows no servers message when empty", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("no-servers-message")).toBeVisible();
  });

  test("save button disabled when fields empty", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();

    // Both fields empty — save should be disabled
    await expect(page.getByTestId("modal-save-button")).toBeDisabled();
  });

  test("fill username and password fields", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("add-server-button").click();
    await page.getByTestId("server-name-input").fill("My Server");
    await page.getByTestId("server-url-input").fill("http://localhost:4096");
    await page.getByTestId("server-username-input").fill("admin");
    await page.getByTestId("server-password-input").fill("secret");

    await expect(page.getByTestId("server-name-input")).toHaveValue("My Server");
    await expect(page.getByTestId("server-url-input")).toHaveValue(
      "http://localhost:4096",
    );
    await expect(page.getByTestId("server-username-input")).toHaveValue("admin");
    await expect(page.getByTestId("server-password-input")).toHaveValue("secret");
  });

  test("edit button visible for existing server", async ({ page }) => {
    await page.addInitScript(() => {
      const servers = [
        {
          id: "test-server-1",
          name: "Test Server",
          url: "http://localhost:4096",
          username: "",
          password: "",
        },
      ];
      localStorage.setItem("pilot.servers", JSON.stringify(servers));
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("edit-server-test-server-1")).toBeVisible();
  });
});

test.describe("Settings — console", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
      localStorage.removeItem("pilot.e2eAuthBypass");
    });
  });

  test("no console errors on settings page", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Settings — navigation", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
      localStorage.removeItem("pilot.e2eAuthBypass");
    });
  });

  test("settings page URL correct", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL("/settings");
  });
});
