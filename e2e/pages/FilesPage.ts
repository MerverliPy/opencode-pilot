import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Files page.
 *
 * Encapsulates selectors and actions for the file tree browser
 * including the file tree pane, up button, file items, and preview pane.
 */
export class FilesPage extends BasePage {
  readonly fileTree: Locator;
  readonly currentPath: Locator;
  readonly upButton: Locator;
  readonly previewPane: Locator;
  readonly previewHeader: Locator;
  readonly previewName: Locator;
  readonly previewPath: Locator;
  readonly previewEmpty: Locator;
  readonly errorDiv: Locator;
  readonly loadingState: Locator;
  readonly emptyDirectory: Locator;
  readonly noServerMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.fileTree = page.getByTestId("file-tree");
    this.currentPath = page.getByTestId("file-current-path");
    this.upButton = page.getByTestId("file-up-button");
    this.previewPane = page.getByTestId("file-preview");
    this.previewHeader = page.getByTestId("file-preview-header");
    this.previewName = page.getByTestId("file-preview-name");
    this.previewPath = page.getByTestId("file-preview-path");
    this.previewEmpty = page.getByTestId("file-preview-empty");
    this.errorDiv = page.getByTestId("file-error");
    this.loadingState = page.getByTestId("file-loading");
    this.emptyDirectory = page.getByTestId("file-empty-directory");
    this.noServerMessage = page.getByTestId("file-no-server");
  }

  async gotoFiles() {
    await this.goto("/files");
  }

  async clickUp() {
    await this.upButton.click();
  }

  async clickFileItem(name: string) {
    await this.page.getByTestId(`file-item-${name}`).click();
  }

  getFileItems(): Locator {
    return this.page.locator('[data-testid^="file-item-"]');
  }

  async isLoading() {
    return this.loadingState.isVisible();
  }

  async hasError() {
    return this.errorDiv.isVisible();
  }

  async isPreviewEmpty() {
    return this.previewEmpty.isVisible();
  }

  async getCurrentPath() {
    return this.currentPath.textContent();
  }

  async getPreviewFileName() {
    return this.previewName.textContent();
  }

  async getPreviewFilePath() {
    return this.previewPath.textContent();
  }

  async hasNoServer() {
    return this.noServerMessage.isVisible();
  }

  async getFileItemCount(): Promise<number> {
    return await this.getFileItems().count();
  }

  async selectFile(name: string): Promise<void> {
    await this.clickFileItem(name);
  }
}
