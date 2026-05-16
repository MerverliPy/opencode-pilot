import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Diff page (Git diff viewer).
 *
 * Encapsulates selectors and actions for the diff UI including
 * branch info, refresh/commit controls, and diff content states.
 */
export class DiffPage extends BasePage {
  readonly heading: Locator;
  readonly branch: Locator;
  readonly refreshButton: Locator;
  readonly refreshing: Locator;
  readonly errorDiv: Locator;
  readonly successMessage: Locator;
  readonly content: Locator;
  readonly loadingState: Locator;
  readonly cleanState: Locator;
  readonly loadingDiffs: Locator;
  readonly noServerMessage: Locator;
  readonly header: Locator;
  readonly commitInput: Locator;
  readonly commitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByTestId("diff-heading");
    this.branch = page.getByTestId("diff-branch");
    this.refreshButton = page.getByTestId("diff-refresh-button");
    this.refreshing = page.getByTestId("diff-refreshing");
    this.errorDiv = page.getByTestId("diff-error");
    this.successMessage = page.getByTestId("diff-success");
    this.content = page.getByTestId("diff-content");
    this.loadingState = page.getByTestId("diff-loading");
    this.cleanState = page.getByTestId("diff-clean");
    this.loadingDiffs = page.getByTestId("diff-loading-diffs");
    this.noServerMessage = page.getByTestId("diff-no-server");
    this.header = page.getByTestId("diff-header");
    this.commitInput = page.getByTestId("commit-message-input");
    this.commitButton = page.getByTestId("commit-button");
  }

  async gotoDiff(): Promise<void> {
    await this.goto("/diff");
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async getBranchName(): Promise<string> {
    return (await this.branch.textContent()) ?? "";
  }

  async getCommitMessage(): Promise<string> {
    return await this.commitInput.inputValue();
  }

  async typeCommitMessage(text: string): Promise<void> {
    await this.commitInput.fill(text);
  }

  async clickCommit(): Promise<void> {
    await this.commitButton.click();
  }

  async isRefreshing(): Promise<boolean> {
    return this.refreshing.isVisible().catch(() => false);
  }

  async hasError(): Promise<boolean> {
    return this.errorDiv.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorDiv.textContent()) ?? "";
  }

  async hasSuccess(): Promise<boolean> {
    return this.successMessage.isVisible().catch(() => false);
  }

  async getSuccessMessage(): Promise<string> {
    return (await this.successMessage.textContent()) ?? "";
  }

  async isClean(): Promise<boolean> {
    return this.cleanState.isVisible().catch(() => false);
  }

  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible().catch(() => false);
  }

  async hasNoServer(): Promise<boolean> {
    return this.noServerMessage.isVisible().catch(() => false);
  }

  async isCommitFormVisible(): Promise<boolean> {
    return this.commitInput.isVisible().catch(() => false);
  }

  async isCommitButtonDisabled(): Promise<boolean> {
    return this.commitButton.isDisabled().catch(() => false);
  }
}
