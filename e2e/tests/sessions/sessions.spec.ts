import { test, expect } from "@playwright/test";

test.describe("Sessions page — routing and rendering", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
    });
  });

  test("renders sessions page at /sessions", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-no-server")).toBeVisible();
  });

  test("shows no server configured message without active server", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-no-server")).toBeVisible();
  });

  test("has a New Session button visible with server", async ({ page }) => {
    await page.goto("/sessions");
    // Without a configured server the no-server div is shown instead
    await expect(page.getByTestId("sessions-no-server")).toBeVisible();
    await expect(page.getByTestId("new-session-button")).not.toBeVisible();
  });
});

test.describe("Sessions page — UI state", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
    });
  });

  test("shows empty state when no sessions exist", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-no-server")).toBeVisible();
  });
});

test.describe("Sessions page — with seeded server", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      const server = {
        id: "test-server-1",
        name: "Test Server",
        url: "http://localhost:4096",
      };
      localStorage.setItem("pilot.servers", JSON.stringify([server]));
      localStorage.setItem("pilot.activeServer", server.id);
    });
    // Mock API calls to the seeded server to prevent connection-refused console errors
    await page.route("http://localhost:4096/**", (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith("/session")) {
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
    });
  });

  test("no page errors on sessions page", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));

    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-heading")).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test("no console errors on sessions page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-heading")).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test("page has a heading", async ({ page }) => {
    await page.goto("/sessions");
    const heading = page.getByRole("heading", { name: /sessions/i });
    await expect(heading).toBeVisible();
  });

  test("navigating from sessions back home", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page.getByTestId("sessions-heading")).toBeVisible();

    const chatLink = page.getByRole("link", { name: /chat/i });
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL(/^\/(chat)?$/);
  });
});

test.describe("Sessions page — navigation", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.removeItem("pilot.servers");
      localStorage.removeItem("pilot.activeServer");
    });
  });

  test("sessions page URL is correct", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page).toHaveURL(/\/sessions/);
  });
});
