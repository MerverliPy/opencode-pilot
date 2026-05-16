import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Pilot Memory page.
 *
 * Encapsulates selectors and actions for the memory UI including
 * the memory list, search, category filter, and card actions.
 */
export class MemoryPage extends BasePage {
  // ── Main layout ────────────────────────────────────────────────────────────

  /** The header container for the memory page. */
  readonly header: Locator;

  /** The count badge showing total memories. */
  readonly count: Locator;

  /** The extracting indicator. */
  readonly extracting: Locator;

  /** The search input. */
  readonly searchInput: Locator;

  /** The error div. */
  readonly error: Locator;

  /** The memory list container. */
  readonly list: Locator;

  /** The searching indicator. */
  readonly searching: Locator;

  /** The empty state wrapper. */
  readonly listEmpty: Locator;

  // ── Category filter ────────────────────────────────────────────────────────

  /** The category filter container. */
  readonly categoryFilter: Locator;

  /** The "All" filter tab. */
  readonly filterTabAll: Locator;

  /** The "Preference" filter tab. */
  readonly filterTabPreference: Locator;

  /** The "Fact" filter tab. */
  readonly filterTabFact: Locator;

  /** The "Code Pattern" filter tab. */
  readonly filterTabCodePattern: Locator;

  /** The "Decision" filter tab. */
  readonly filterTabDecision: Locator;

  // ── Empty state ────────────────────────────────────────────────────────────

  /** The empty state container. */
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    // Main layout
    this.header = page.getByTestId("memory-header");
    this.count = page.getByTestId("memory-count");
    this.extracting = page.getByTestId("memory-extracting");
    this.searchInput = page.getByTestId("memory-search");
    this.error = page.getByTestId("memory-error");
    this.list = page.getByTestId("memory-list");
    this.searching = page.getByTestId("memory-searching");
    this.listEmpty = page.getByTestId("memory-list-empty");

    // Category filter
    this.categoryFilter = page.getByTestId("category-filter");
    this.filterTabAll = page.getByTestId("filter-tab-all");
    this.filterTabPreference = page.getByTestId("filter-tab-preference");
    this.filterTabFact = page.getByTestId("filter-tab-fact");
    this.filterTabCodePattern = page.getByTestId("filter-tab-code_pattern");
    this.filterTabDecision = page.getByTestId("filter-tab-decision");

    // Empty state
    this.emptyState = page.getByTestId("memory-empty-state");
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Navigate to the memory page. */
  async gotoMemory(): Promise<void> {
    await this.goto("/memory");
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  /** Type a search query into the memory search input. */
  async searchMemories(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  // ── Memory count ───────────────────────────────────────────────────────────

  /** Get the displayed memory count text. */
  async getMemoryCount(): Promise<string> {
    return (await this.count.textContent()) ?? "";
  }

  // ── Memory cards ───────────────────────────────────────────────────────────

  /** Return all memory card locators. */
  getMemoryCards(): Locator {
    return this.page.getByTestId("memory-card");
  }

  /** Return a specific memory card locator by index. */
  getMemoryCard(index: number): Locator {
    return this.page.getByTestId("memory-card").nth(index);
  }

  /** Click the pin button on a memory card. Defaults to the first card. */
  async pinMemory(index = 0): Promise<void> {
    await this.getMemoryCard(index).getByTestId("memory-pin").click();
  }

  /** Click the archive button on a memory card. Defaults to the first card. */
  async archiveMemory(index = 0): Promise<void> {
    await this.getMemoryCard(index).getByTestId("memory-archive").click();
  }

  /** Click the delete button on a memory card. Defaults to the first card. */
  async deleteMemory(index = 0): Promise<void> {
    await this.getMemoryCard(index).getByTestId("memory-delete").click();
  }

  // ── Category filter ────────────────────────────────────────────────────────

  /** Click a category filter tab by its test id suffix. */
  async filterByCategory(
    category: "all" | "preference" | "fact" | "code_pattern" | "decision",
  ): Promise<void> {
    const tab = this.page.getByTestId(`filter-tab-${category}`);
    await tab.click();
  }

  // ── State helpers ──────────────────────────────────────────────────────────

  /** Whether the searching indicator is visible. */
  async isSearching(): Promise<boolean> {
    return this.searching.isVisible().catch(() => false);
  }

  /** Whether the empty state is visible (either list-empty or empty-state). */
  async isEmpty(): Promise<boolean> {
    const listEmptyVisible = await this.listEmpty.isVisible().catch(() => false);
    if (listEmptyVisible) return true;
    return this.emptyState.isVisible().catch(() => false);
  }

  /** Get the error message text, or null if no error is shown. */
  async getErrorMessage(): Promise<string | null> {
    const visible = await this.error.isVisible().catch(() => false);
    if (!visible) return null;
    return (await this.error.textContent()) ?? null;
  }

  /** Whether the extracting indicator is visible. */
  async isExtracting(): Promise<boolean> {
    return this.extracting.isVisible().catch(() => false);
  }
}
