---

name: e2e-playwright
description: "Use for Playwright E2E design, stable selectors, trace/screenshot capture, flake triage, and critical Pilot browser workflows."
compatibility: opencode
---

# Playwright E2E

## Test design

- Cover critical user journeys, not implementation details.
- Prefer role/name selectors and stable test IDs over brittle CSS.
- Use `await expect(locator).toBeVisible()` and response/URL waits instead of fixed sleeps.
- Keep tests independent and reset state where possible.

## Failure triage

Capture:
- failing spec and test name
- browser/project
- first assertion failure
- console/page errors
- trace, screenshot, and video paths if generated

## Pilot target flows

- Navigation and layout rendering.
- Prompt input and message/session rendering.
- Files/diff views.
- Terminal page behavior.
- Settings and n9router connection UI.
- Offline/install PWA behavior where applicable.

## Commands

- Targeted: `npm run test -w e2e -- <spec>` if supported by the package script.
- Full: `npm run test:e2e`.
- Debug only with explicit approval: `npx playwright test --debug`.
