/**
 * Viewport presets and device descriptors for E2E tests.
 *
 * Provides consistent viewport sizes across test files and
 * Playwright-compatible device descriptors for emulation tests.
 */

import type { ViewportSize } from '@playwright/test';

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 } as ViewportSize,    // iPhone X
  tablet: { width: 768, height: 1024 } as ViewportSize,   // iPad
  desktop: { width: 1440, height: 900 } as ViewportSize,  // Standard desktop
  laptop: { width: 1280, height: 720 } as ViewportSize,   // Laptop
} as const;

export const DEVICES = {
  iPhoneX: { ...VIEWPORTS.mobile, isMobile: true, hasTouch: true },
  iPad: { ...VIEWPORTS.tablet, isMobile: false, hasTouch: true },
  desktop: { ...VIEWPORTS.desktop, isMobile: false, hasTouch: false },
} as const;