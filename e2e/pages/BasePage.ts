import type { Page, Locator } from "@playwright/test";

/**
 * Base page object providing common navigation and app-shell helpers.
 *
 * All page objects extend this class to share `goto()` and `waitForApp()`.
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Underlying Playwright Page instance. */
  getPage(): Page {
    return this.page;
  }

  /**
   * Navigate to a path and wait for `domcontentloaded`.
   * Prepends the base URL automatically (Playwright config handles this).
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Wait for the app shell to be visible — either the prompt input
   * (Chat page) or the session bar header.
   */
  async waitForApp(): Promise<void> {
    const promptInput = this.page.getByTestId("prompt-input");
    const sessionBar = this.page.getByTestId("session-bar");
    await Promise.race([
      promptInput.waitFor({ state: "visible" }),
      sessionBar.waitFor({ state: "visible" }),
    ]);
  }

  /** Locator for the main content area. */
  get mainContent(): Locator {
    return this.page.getByTestId("main-content");
  }
}
