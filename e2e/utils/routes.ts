/**
 * Route constants for E2E tests.
 *
 * Centralizes all app routes so tests reference a single source of truth.
 */

export const ROUTES = {
  HOME: '/',
  CHAT: '/chat',
  SESSIONS: '/sessions',
  FILES: '/files',
  SETTINGS: '/settings',
  TERMINAL: '/terminal',
  DIFF: '/diff',
} as const;

export const ALL_ROUTES = Object.values(ROUTES);