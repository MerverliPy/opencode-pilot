import { test as base, expect } from "@playwright/test";
import { ChatPage } from "../pages/ChatPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TerminalPage } from "../pages/TerminalPage";
import { Navigation } from "../pages/Navigation";

// ---------------------------------------------------------------------------
// Types for custom fixtures
// ---------------------------------------------------------------------------

/** Console error entry captured during a test. */
interface ConsoleError {
  message: string;
  type: string;
  location?: string;
}

/** API request entry captured during a test. */
interface ApiRequest {
  url: string;
  method: string;
  status?: number;
  contentType?: string;
}

// ---------------------------------------------------------------------------
// Console error tracking fixture
// ---------------------------------------------------------------------------

type ConsoleErrorsFixture = {
  getConsoleErrors: () => ConsoleError[];
};

const consoleErrorsFixture = base.extend<ConsoleErrorsFixture>({
  getConsoleErrors: async ({ page }, use) => {
    const errors: ConsoleError[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push({
          message: msg.text(),
          type: msg.type(),
          location: msg.location().url,
        });
      }
    });

    await use(() => [...errors]);
  },
});

// ---------------------------------------------------------------------------
// Network request tracking fixture
// ---------------------------------------------------------------------------

type ApiRequestsFixture = {
  getApiRequests: () => ApiRequest[];
};

const apiRequestsFixture = consoleErrorsFixture.extend<ApiRequestsFixture>({
  getApiRequests: async ({ page }, use) => {
    const requests: ApiRequest[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/")) {
        requests.push({
          url,
          method: req.method(),
        });
      }
    });

    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/")) {
        const matching = requests.find(
          (r) => r.url === url && r.status === undefined,
        );
        if (matching) {
          matching.status = res.status();
          matching.contentType = res.headers()["content-type"];
        }
      }
    });

    await use(() => [...requests]);
  },
});

// ---------------------------------------------------------------------------
// Page object fixtures
// ---------------------------------------------------------------------------

type PageObjectFixtures = {
  pilotPage: ChatPage;
  settingsPage: SettingsPage;
  terminalPage: TerminalPage;
  navigation: Navigation;
};

const pageObjectFixture = apiRequestsFixture.extend<PageObjectFixtures>({
  pilotPage: async ({ page }, use) => {
    const pilotPage = new ChatPage(page);
    await use(pilotPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  terminalPage: async ({ page }, use) => {
    const terminalPage = new TerminalPage(page);
    await use(terminalPage);
  },

  navigation: async ({ page }, use) => {
    const navigation = new Navigation(page);
    await use(navigation);
  },
});

// ---------------------------------------------------------------------------
// Viewport fixtures
// ---------------------------------------------------------------------------

type ViewportFixtures = {
  mobileViewport: void;
  tabletViewport: void;
  desktopViewport: void;
};

const viewportFixture = pageObjectFixture.extend<ViewportFixtures>({
  mobileViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await use();
  },

  tabletViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await use();
  },

  desktopViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await use();
  },
});

// ---------------------------------------------------------------------------
// Final combined test fixture
// ---------------------------------------------------------------------------

/**
 * Custom Playwright test fixture for Pilot E2E tests.
 *
 * Extends the base test with:
 * - **pilotPage**: `ChatPage` instance for the chat UI
 * - **settingsPage**: `SettingsPage` instance for the settings UI
 * - **terminalPage**: `TerminalPage` instance for the terminal UI
 * - **navigation**: `Navigation` instance for sidebar/nav interactions
 * - **getConsoleErrors**: Returns console errors collected during the test
 * - **getApiRequests**: Returns API requests (to `/api/*`) collected during the test
 * - **mobileViewport**: Sets viewport to 375×812 (iPhone X)
 * - **tabletViewport**: Sets viewport to 768×1024 (iPad)
 * - **desktopViewport**: Sets viewport to 1440×900
 *
 * @example
 * ```ts
 * import { test, expect } from "../fixtures";
 *
 * test("chat page loads", async ({ pilotPage }) => {
 *   await pilotPage.gotoChat();
 *   await expect(pilotPage.promptInput).toBeVisible();
 * });
 *
 * test("no console errors on settings", async ({ settingsPage, getConsoleErrors }) => {
 *   await settingsPage.gotoSettings();
 *   expect(getConsoleErrors()).toHaveLength(0);
 * });
 *
 * test("mobile layout works", async ({ pilotPage, mobileViewport }) => {
 *   await pilotPage.gotoChat();
 *   // viewport is 375×812
 * });
 * ```
 */
export const test = viewportFixture;
export { expect };