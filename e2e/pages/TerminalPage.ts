import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Terminal page.
 *
 * Encapsulates selectors and actions for the terminal UI including
 * the xterm container and terminal controls.
 */
export class TerminalPage extends BasePage {
  readonly terminalContainer: Locator;
  readonly terminalElement: Locator;

  constructor(page: Page) {
    super(page);
    this.terminalContainer = page.getByTestId("terminal-container");
    this.terminalElement = page.locator(".xterm");
  }

  async gotoTerminal() {
    await this.goto("/terminal");
  }

  async isVisible() {
    return this.terminalContainer.isVisible();
  }

  async typeCommand(command: string) {
    await this.page.keyboard.type(command);
  }
}