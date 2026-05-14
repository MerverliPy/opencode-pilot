import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Route constants matching the app's navigation structure.
 */
export const Routes = {
  HOME: "/",
  CHAT: "/chat",
  SESSIONS: "/sessions",
  FILES: "/files",
  SETTINGS: "/settings",
  TERMINAL: "/terminal",
  DIFF: "/diff",
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];

/**
 * Page object for navigation — sidebar, mobile nav, and route switching.
 *
 * Provides methods for navigating between pages and inspecting
 * the sidebar / mobile nav state.
 */
export class Navigation extends BasePage {
  // ── Selectors ──────────────────────────────────────────────────────────────

  /** The desktop sidebar element. */
  get desktopSidebar(): Locator {
    return this.page.getByTestId("desktop-sidebar");
  }

  /** The mobile bottom navigation element. */
  get mobileNav(): Locator {
    return this.page.getByTestId("mobile-nav");
  }

  /** The main content area. */
  get mainContent(): Locator {
    return this.page.getByTestId("main-content");
  }

  /** The sidebar collapse/expand toggle button. */
  get sidebarToggleButton(): Locator {
    return this.page.getByRole("button", { name: /sidebar/i });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigate to a named route using the sidebar or mobile nav link.
   * Falls back to `goto()` if the link is not visible.
   */
  async navigateTo(route: Route): Promise<void> {
    const label = routeToLabel(route);
    const link = this.page.getByRole("link", { name: new RegExp(label, "i") });

    const linkVisible = await link.isVisible().catch(() => false);
    if (linkVisible) {
      await link.click();
    } else {
      await this.goto(route);
    }
  }

  // ── Sidebar state ──────────────────────────────────────────────────────────

  /** Whether the desktop sidebar is currently visible. */
  async isSidebarVisible(): Promise<boolean> {
    return this.desktopSidebar.isVisible().catch(() => false);
  }

  /** Whether the mobile navigation is currently visible. */
  async isMobileNavVisible(): Promise<boolean> {
    return this.mobileNav.isVisible().catch(() => false);
  }

  /**
   * Get the current sidebar state: "expanded", "collapsed", or "hidden".
   * "hidden" means the sidebar is not visible at all (mobile viewport).
   */
  async getSidebarState(): Promise<"expanded" | "collapsed" | "hidden"> {
    const visible = await this.desktopSidebar.isVisible().catch(() => false);
    if (!visible) return "hidden";

    const width = await this.desktopSidebar.evaluate((el) => {
      return el.getBoundingClientRect().width;
    });

    return width < 100 ? "collapsed" : "expanded";
  }

  /** Toggle the sidebar between collapsed and expanded. */
  async toggleSidebar(): Promise<void> {
    await this.sidebarToggleButton.click();
    // Wait for the CSS transition (0.2s) to settle
    await this.page.waitForFunction(() => {
      const sidebar = document.querySelector('[data-testid="desktop-sidebar"]');
      return sidebar instanceof HTMLElement && sidebar.getBoundingClientRect().width > 0;
    });
  }
}

/**
 * Map a route path to its navigation label.
 * Used to find the correct nav link by accessible name.
 */
function routeToLabel(route: Route): string {
  switch (route) {
    case "/":
      return "Chat";
    case "/chat":
      return "Chat";
    case "/sessions":
      return "Sessions";
    case "/files":
      return "Files";
    case "/settings":
      return "Settings";
    case "/terminal":
      return "Terminal";
    case "/diff":
      return "Diff";
    default:
      return "Chat";
  }
}
