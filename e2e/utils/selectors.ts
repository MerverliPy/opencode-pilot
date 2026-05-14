/**
 * Centralized selectors for E2E tests.
 *
 * Uses data-testid attributes for stable element targeting.
 * Role-based selectors are used for navigation links.
 */

// App shell
export const APP = {
  promptInput: '[data-testid="prompt-input"]',
  sessionBar: '[data-testid="session-bar"]',
  messageList: '[data-testid="message-list"]',
  desktopSidebar: '[data-testid="desktop-sidebar"]',
  mobileNav: '[data-testid="mobile-nav"]',
  mainContent: '[data-testid="main-content"]',
} as const;

// Settings
export const SETTINGS = {
  serverNameInput: '[data-testid="server-name-input"]',
  serverUrlInput: '[data-testid="server-url-input"]',
  addServerButton: '[data-testid="add-server-button"]',
  startTunnelButton: '[data-testid="start-tunnel-button"]',
  stopTunnelButton: '[data-testid="stop-tunnel-button"]',
  tunnelUrl: '[data-testid="tunnel-url"]',
} as const;

// Terminal
export const TERMINAL = {
  container: '[data-testid="terminal-container"]',
  tabBar: '[data-testid="terminal-tab-bar"]',
} as const;

// Permission card
export const PERMISSION = {
  card: '[data-testid="permission-card"]',
  approveButton: '[data-testid="permission-approve-button"]',
  onceButton: '[data-testid="permission-once-button"]',
  rejectButton: '[data-testid="permission-reject-button"]',
} as const;

// Navigation links (role-based)
export const NAV_LINKS = {
  chat: { name: /chat/i },
  sessions: { name: /sessions/i },
  files: { name: /files/i },
  settings: { name: /settings/i },
} as const;