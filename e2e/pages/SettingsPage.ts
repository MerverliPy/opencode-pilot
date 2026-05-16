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
  readonly addServerButton: Locator;
  readonly serverList: Locator;
  readonly noServersMessage: Locator;
  readonly modalCancelButton: Locator;
  readonly modalSaveButton: Locator;
  readonly settingsHeading: Locator;
  readonly pushSettings: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: /settings/i });
    this.nameInput = page.getByTestId("server-name-input");
    this.urlInput = page.getByTestId("server-url-input");
    this.usernameInput = page.locator('input[type="text"]').nth(1);
    this.passwordInput = page.locator('input[type="password"]');
    this.addServerButton = page.getByTestId("add-server-button");
    this.serverList = page.getByTestId("server-list");
    this.noServersMessage = page.getByTestId("no-servers-message");
    this.modalCancelButton = page.getByTestId("modal-cancel-button");
    this.modalSaveButton = page.getByTestId("modal-save-button");
    this.settingsHeading = page.getByTestId("settings-heading");
    this.pushSettings = page.getByTestId("push-settings");
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

  async clickAddServer(): Promise<void> {
    await this.addServerButton.click();
  }

  async cancelModal(): Promise<void> {
    await this.modalCancelButton.click();
  }

  async saveModal(): Promise<void> {
    await this.modalSaveButton.click();
  }

  getServerRow(id: string): Locator {
    return this.page.getByTestId(`server-row-${id}`);
  }

  getActivateButton(id: string): Locator {
    return this.page.getByTestId(`activate-server-${id}`);
  }

  getEditButton(id: string): Locator {
    return this.page.getByTestId(`edit-server-${id}`);
  }

  getRemoveButton(id: string): Locator {
    return this.page.getByTestId(`remove-server-${id}`);
  }

  async isModalVisible(): Promise<boolean> {
    return (await this.nameInput.count()) > 0 && (await this.nameInput.isVisible());
  }

  async getServerCount(): Promise<number> {
    return await this.page.getByTestId(/^server-row-/).count();
  }

  async fillFullServerConfig(
    name: string,
    url: string,
    username?: string,
    password?: string,
  ): Promise<void> {
    await this.nameInput.fill(name);
    await this.urlInput.fill(url);
    if (username !== undefined) {
      await this.usernameInput.fill(username);
    }
    if (password !== undefined) {
      await this.passwordInput.fill(password);
    }
  }
}