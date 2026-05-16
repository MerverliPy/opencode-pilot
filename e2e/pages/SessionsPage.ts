import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Sessions page.
 *
 * Encapsulates selectors and actions for the sessions list UI including
 * the session rows, new session button, loading/empty/error states.
 */
export class SessionsPage extends BasePage {
  readonly heading: Locator;
  readonly newSessionButton: Locator;
  readonly sessionList: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByTestId("sessions-heading");
    this.newSessionButton = page.getByTestId("new-session-button");
    this.sessionList = page.getByTestId("session-list");
    this.emptyState = page.getByTestId("sessions-empty");
    this.loadingState = page.getByTestId("sessions-loading");
    this.errorAlert = page.getByTestId("sessions-error");
  }

  async gotoSessions() {
    await this.goto("/sessions");
  }

  async clickNewSession() {
    await this.newSessionButton.click();
  }

  getSessionRow(id: string): Locator {
    return this.page.getByTestId(`session-row-${id}`);
  }

  getDeleteButton(id: string): Locator {
    return this.page.getByTestId(`delete-session-${id}`);
  }

  getSessionTitle(sessionId: string): Locator {
    return this.getSessionRow(sessionId).locator("[data-testid^='session-title']");
  }

  getSessionDate(sessionId: string): Locator {
    return this.getSessionRow(sessionId).locator("[data-testid^='session-date']");
  }

  async getSessionCount(): Promise<number> {
    return this.sessionList.locator("[data-testid^='session-row-']").count();
  }

  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible().catch(() => false);
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string | null> {
    const visible = await this.errorAlert.isVisible().catch(() => false);
    if (!visible) return null;
    return this.errorAlert.textContent();
  }

  async hasServerError(): Promise<boolean> {
    return this.page.getByTestId("sessions-no-server").isVisible().catch(() => false);
  }
}
