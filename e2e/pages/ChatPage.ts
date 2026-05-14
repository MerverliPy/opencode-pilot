import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Chat page.
 *
 * Encapsulates selectors and actions for the chat UI including
 * the prompt textarea, message area, and session header.
 */
export class ChatPage extends BasePage {
  readonly promptInput: Locator;
  readonly sessionHeader: Locator;
  readonly messageArea: Locator;

  constructor(page: Page) {
    super(page);
    this.promptInput = page.getByTestId("prompt-input");
    this.sessionHeader = page.getByTestId("session-bar");
    this.messageArea = page.getByTestId("message-list");
  }

  async gotoChat(sessionId?: string) {
    if (sessionId) {
      await this.goto(`/chat/${sessionId}`);
    } else {
      await this.goto("/");
    }
  }

  async enablePromptInput() {
    await this.page.evaluate(() => {
      const textarea = document.querySelector(
        'textarea[placeholder="ask opencode…"]',
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.disabled = false;
      }
    });
  }

  async submitMessage(text: string) {
    await this.enablePromptInput();
    await this.promptInput.fill(text);
    await this.promptInput.press("Enter");
  }
}