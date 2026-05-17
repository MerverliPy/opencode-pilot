import { test, expect, type BrowserContext } from "@playwright/test";

/**
 * Memory page E2E tests.
 *
 * Covers:
 *  - Routing and rendering
 *  - Search input behavior
 *  - Category filter tabs
 *  - Empty state
 *  - Console and page errors
 *  - Accessibility
 *  - Navigation
 */

async function seedServer(context: BrowserContext) {
  await context.addInitScript(() => {
    const server = { id: "test-server-1", name: "Test Server", url: "http://localhost:4096" };
    localStorage.setItem("pilot.servers", JSON.stringify([server]));
    localStorage.setItem("pilot.activeServer", server.id);
  });
}

test.beforeEach(async ({ context }) => {
  // Clear server state before each test to prevent cross-test pollution
  await context.addInitScript(() => {
    localStorage.removeItem("pilot.servers");
    localStorage.removeItem("pilot.activeServer");
  });
});

// ---------------------------------------------------------------------------
// Routing and rendering
// ---------------------------------------------------------------------------

test.describe("Memory page — routing and rendering", () => {
  test("shows no server configured when no active server", async ({ page }) => {
    await page.goto("/memory");
    await page.waitForLoadState("domcontentloaded");

    // Without a configured server, the page either shows "no server configured"
    // or redirects to the root
    const noServer = page.getByText(/no server configured/i);
    const isNoServerVisible = await noServer.isVisible().catch(() => false);

    if (isNoServerVisible) {
      await expect(noServer).toBeVisible();
    } else {
      // May redirect to "/" when no server is configured
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Seeded server — full Memory UI tests
// ---------------------------------------------------------------------------

test.describe("with seeded server", () => {
  test.beforeEach(async ({ context }) => {
    await seedServer(context);
  });

  test.describe("Memory page — routing and rendering", () => {
    test("renders memory page at /memory", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.getByTestId("memory-header")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  test.describe("Memory page — search", () => {
    test("search input accepts text", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      const searchInput = page.getByTestId("memory-search");
      await expect(searchInput).toBeVisible();

      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");
    });

    test("search input clears", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      const searchInput = page.getByTestId("memory-search");
      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");

      await searchInput.clear();
      await expect(searchInput).toHaveValue("");
    });
  });

  // ---------------------------------------------------------------------------
  // Category filter
  // ---------------------------------------------------------------------------

  test.describe("Memory page — category filter", () => {
    test("category filter tabs are visible", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      const categoryFilter = page.getByTestId("category-filter");
      await expect(categoryFilter).toBeVisible();

      // Verify all filter tabs exist
      await expect(page.getByTestId("filter-tab-all")).toBeVisible();
      await expect(page.getByTestId("filter-tab-preference")).toBeVisible();
      await expect(page.getByTestId("filter-tab-fact")).toBeVisible();
      await expect(page.getByTestId("filter-tab-code_pattern")).toBeVisible();
      await expect(page.getByTestId("filter-tab-decision")).toBeVisible();
    });

    test("clicking filter tab changes active filter", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      // Click the "Fact" filter tab — verify it responds without error
      const factTab = page.getByTestId("filter-tab-fact");
      await expect(factTab).toBeVisible();
      await factTab.click();

      // The click should not trigger a navigation error or page crash
      await expect(page.getByTestId("memory-header")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------

  test.describe("Memory page — list state", () => {
    test("shows empty state when no memories", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      // With a seeded server but no memories, the page should show
      // the list-empty or empty-state container
      const listEmpty = page.getByTestId("memory-list-empty");
      const emptyState = page.getByTestId("memory-empty-state");

      const listEmptyVisible = await listEmpty.isVisible().catch(() => false);
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);

      expect(listEmptyVisible || emptyStateVisible).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  test.describe("Memory page — a11y", () => {
    test("search input has accessible label", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");

      const searchInput = page.getByTestId("memory-search");
      await expect(searchInput).toBeVisible();

      // Check that the input has an associated label or aria-label
      const ariaLabel = await searchInput.getAttribute("aria-label");
      const inputId = await searchInput.getAttribute("id");
      let hasLabel = false;

      if (ariaLabel) {
        hasLabel = true;
      } else if (inputId) {
        // Check for a <label for="..."> element
        const label = page.locator(`label[for="${inputId}"]`);
        hasLabel = (await label.count()) > 0;
      }

      expect(hasLabel).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  test.describe("Memory page — navigation", () => {
    test("navigating from memory back to chat works", async ({ page }) => {
      await page.goto("/memory");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("memory-header")).toBeVisible();

      // Click the Chat nav link to navigate back
      const chatLink = page.getByRole("link", { name: /chat/i });
      await expect(chatLink).toBeVisible();
      await chatLink.click();

      // Should land on the chat page
      await expect(page).toHaveURL(/^\/(chat)?$/);
      await expect(page.getByTestId("main-content")).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// Console errors
// ---------------------------------------------------------------------------

test.describe("Memory page — console errors", () => {
  test("no console errors on memory page", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/memory");
    await page.waitForLoadState("domcontentloaded");

    expect(consoleErrors).toHaveLength(0);
  });

  test("no page errors on navigation to memory", async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    await page.goto("/memory");
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
  });
});
