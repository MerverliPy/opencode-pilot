import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Settings page.
 *
 * Encapsulates selectors and actions for the settings UI including
 * the server configuration form.
 */
export class SettingsPage extends BasePage {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly urlInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: /settings/i });
    this.nameInput = page.getByTestId("server-name-input");
    this.urlInput = page.getByTestId("server-url-input");
    this.usernameInput = page.locator('input[type="text"]').nth(1);
    this.passwordInput = page.locator('input[type="password"]');
  }

  async gotoSettings() {
    await this.goto("/settings");
  }

  async fillServerConfig(name: string, url: string) {
    if ((await this.nameInput.count()) > 0) {
      await this.nameInput.fill(name);
    }
    if ((await this.urlInput.count()) > 0) {
      await this.urlInput.fill(url);
    }
  }
}