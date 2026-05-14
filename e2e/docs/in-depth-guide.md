# Pilot E2E In-Depth Guide

Comprehensive guide to the Pilot Playwright E2E test suite — architecture, patterns, advanced usage, and contributing.

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Directory structure](#2-directory-structure)
3. [Page Object Model](#3-page-object-model)
4. [Custom fixtures](#4-custom-fixtures)
5. [Shared utilities](#5-shared-utilities)
6. [Writing a new test](#6-writing-a-new-test)
7. [Full-stack testing](#7-full-stack-testing)
8. [Visual regression testing](#8-visual-regression-testing)
9. [Performance regression testing](#9-performance-regression-testing)
10. [Accessibility testing](#10-accessibility-testing)
11. [CI integration](#11-ci-integration)
12. [Debugging techniques](#12-debugging-techniques)
13. [Contributing guidelines](#13-contributing-guidelines)

---

## 1. Architecture overview

The E2E suite uses four layers:

```
tests/          ← Test specs organized by user journey
  ├─ fixtures/  ← Custom Playwright fixtures (console tracking, viewports, page objects)
  ├─ pages/     ← Page Object Model classes
  └─ utils/     ← Shared constants (routes, selectors, viewports, CSS helpers)
```

**Playwright** runs tests in real Chromium (headed or headless). Tests interact with the Pilot PWA as a user would — clicking, typing, reading text.

**Two modes:**
- **UI-only** (default): Vite dev server serves the React app. Hono server not started. Tests cover rendering, accessibility, layout, and interactions that don't need a live backend.
- **Full-stack** (`E2E_FULL_STACK=1`): Both Hono and Vite servers run. Tests exercise terminal WebSocket, SSE event streaming, permission cards, and tunnel controls.

**Guiding principles:**
- Tests mirror [`chrome-devtools-mcp`](https://github.com/nicepkg/chrome-devtools-mcp) tools (the AI agent's browser automation capabilities).
- Stable selectors via `data-testid` attributes — never CSS class names or fragile selectors.
- Each test file includes JSDoc listing the chrome-devtools-mcp tools it mirrors.
- Tests are fully parallel by default (`fullyParallel: true`), no shared state.

---

## 2. Directory structure

```
e2e/
├── playwright.config.ts       # Playwright configuration
├── pages/                     # Page Object Model
│   ├── BasePage.ts            #   Shared goto(), waitForApp()
│   ├── ChatPage.ts            #   Chat/chat page interactions
│   ├── SettingsPage.ts        #   Settings page interactions
│   ├── TerminalPage.ts        #   Terminal page interactions
│   ├── Navigation.ts          #   Sidebar/nav, route switching
│   └── index.ts               #   Barrel exports
├── fixtures/                  # Custom fixtures
│   ├── pilot.fixture.ts       #   Combined fixture with all extensions
│   └── index.ts               #   Barrel export
├── utils/                     # Shared utilities
│   ├── routes.ts              #   Route path constants (ROUTES, ALL_ROUTES)
│   ├── selectors.ts           #   data-testid selectors (APP, SETTINGS, TERMINAL, PERMISSION, NAV_LINKS)
│   ├── viewports.ts           #   Viewport presets (VIEWPORTS, DEVICES)
│   ├── css-utils.ts           #   CSS inspection helpers
│   └── index.ts               #   Barrel exports
├── tests/                     # Test specs by journey
│   ├── navigation/            #   Route rendering, links, multi-page lifecycle
│   │   └── routes.spec.ts
│   ├── chat/                  #   Chat UI, permission cards, SSE flow
│   │   ├── interaction.spec.ts
│   │   ├── permission.spec.ts
│   │   └── sse-flow.spec.ts
│   ├── settings/              #   Server config flow, form input
│   │   ├── flow.spec.ts
│   │   └── form.spec.ts
│   ├── terminal/              #   WebSocket terminal
│   │   └── websocket.spec.ts
│   ├── visual/                #   Screenshots, visual regression
│   │   ├── screenshot.spec.ts
│   │   ├── regression.spec.ts
│   │   └── *.spec.ts-snapshots/  # Generated PNG baselines
│   ├── viewport/              #   Responsive layout, emulation
│   │   ├── emulation.spec.ts
│   │   └── responsive.spec.ts
│   ├── diagnostics/           #   Console, network, performance
│   │   ├── console.spec.ts
│   │   ├── network.spec.ts
│   │   ├── performance.spec.ts
│   │   └── performance-regression.spec.ts
│   └── accessibility/         #   WCAG 2.2 AA audits
│       └── wcag.spec.ts
├── screenshots/               # Legacy screenshot output (deprecated)
├── playwright-report/         # Playwright HTML report output
└── test-results/              # Failure artifacts (traces, screenshots, videos)
```

---

## 3. Page Object Model

Page objects live in `pages/`. Each encapsulates selectors and methods for a single page or UI area.

### BasePage

All pages extend `BasePage`, which provides:

```ts
// pages/BasePage.ts
export class BasePage {
  async goto(path: string): Promise<void>       // Navigate + waitForLoadState("domcontentloaded")
  async waitForApp(): Promise<void>             // Wait for prompt-input OR session-bar
  get mainContent(): Locator                    // data-testid="main-content"
}
```

### ChatPage

```ts
// pages/ChatPage.ts
export class ChatPage extends BasePage {
  readonly promptInput: Locator     // getByPlaceholder("ask opencode…")
  readonly sessionHeader: Locator   // page.locator("header")
  readonly messageArea: Locator     // data-testid="message-area" or main

  async gotoChat(sessionId?: string)  // Navigates to / or /chat/:sessionId
  async submitMessage(text: string)    // Enables input, fills, presses Enter
}
```

### SettingsPage

```ts
// pages/SettingsPage.ts
export class SettingsPage extends BasePage {
  readonly heading: Locator           // getByRole("heading", { name: /settings/i })
  readonly nameInput: Locator         // First text input
  readonly urlInput: Locator          // URL input

  async gotoSettings()                // Navigate to /settings
  async fillServerConfig(name, url)   // Fill server form fields
}
```

### TerminalPage

```ts
// pages/TerminalPage.ts
export class TerminalPage extends BasePage {
  readonly terminalContainer: Locator   // data-testid="terminal-container" or .xterm
  readonly terminalElement: Locator     // .xterm

  async gotoTerminal()                  // Navigate to /terminal
  async isVisible()                     // Check terminal container visibility
  async typeCommand(command: string)    // Type into terminal via keyboard
}
```

### Navigation

```ts
// pages/Navigation.ts
export class Navigation extends BasePage {
  get desktopSidebar(): Locator         // data-testid="desktop-sidebar"
  get mobileNav(): Locator              // data-testid="mobile-nav"
  get sidebarToggleButton(): Locator    // getByRole("button", { name: /sidebar/i })

  async navigateTo(route: Route)        // Click nav link or goto() fallback
  async isSidebarVisible(): boolean
  async isMobileNavVisible(): boolean
  async getSidebarState(): "expanded" | "collapsed" | "hidden"
  async toggleSidebar()                 // Click toggle, wait for CSS transition
}
```

Usage in tests:

```ts
import { test, expect } from "../../fixtures/pilot.fixture";

test("settings form renders", async ({ settingsPage }) => {
  await settingsPage.gotoSettings();
  await expect(settingsPage.heading).toBeVisible();
  await expect(settingsPage.nameInput).toBeVisible();
});
```

---

## 4. Custom fixtures

The custom fixture (`fixtures/pilot.fixture.ts`) extends Playwright's `test` with additional capabilities.

### Console error tracking

```ts
type ConsoleErrorsFixture = {
  getConsoleErrors: () => ConsoleError[];
};
```

Captures all `console.error` calls during a test. Returns a snapshot array.

### API request tracking

```ts
type ApiRequestsFixture = {
  getApiRequests: () => ApiRequest[];
};
```

Captures all requests to `/api/*` endpoints, including URL, method, status, and content-type.

### Page object fixtures

```ts
type PageObjectFixtures = {
  pilotPage: ChatPage;
  settingsPage: SettingsPage;
  terminalPage: TerminalPage;
  navigation: Navigation;
};
```

Each fixture constructs the page object once per test.

### Viewport fixtures

```ts
type ViewportFixtures = {
  mobileViewport: void;   // 375×812 (iPhone X)
  tabletViewport: void;   // 768×1024 (iPad)
  desktopViewport: void;  // 1440×900
};
```

Set viewport size when the fixture is used.

### Combined fixture

The final exported `test` chains all fixtures:

```ts
export const test = viewportFixture;  // Chains: consoleErrors → apiRequests → pageObjects → viewports
export { expect };
```

### Importing and using

```ts
import { test, expect } from "../../fixtures/pilot.fixture";

test("no console errors on settings", async ({ settingsPage, getConsoleErrors }) => {
  await settingsPage.gotoSettings();
  const errors = getConsoleErrors();
  expect(errors).toHaveLength(0);
});

test("mobile layout", async ({ pilotPage, mobileViewport }) => {
  await pilotPage.gotoChat();
  // viewport is 375×812
});

test("navigate to terminal", async ({ navigation }) => {
  await navigation.navigateTo("/terminal");
  expect(await navigation.isSidebarVisible()).toBe(true);
});
```

**Important:** Only import fixtures when page objects or console/API tracking are needed. Simple tests that only use `page` can import from `@playwright/test` directly to avoid fixture overhead:

```ts
import { test, expect } from "@playwright/test";

test("basic test", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("prompt-input")).toBeVisible();
});
```

---

## 5. Shared utilities

### Routes (`utils/routes.ts`)

Centralized route constants:

```ts
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
```

### Selectors (`utils/selectors.ts`)

Centralized `data-testid` selectors:

```ts
export const APP = {
  promptInput: '[data-testid="prompt-input"]',
  sessionBar: '[data-testid="session-bar"]',
  messageList: '[data-testid="message-list"]',
  desktopSidebar: '[data-testid="desktop-sidebar"]',
  mobileNav: '[data-testid="mobile-nav"]',
  mainContent: '[data-testid="main-content"]',
} as const;

export const SETTINGS = {
  serverNameInput: '[data-testid="server-name-input"]',
  serverUrlInput: '[data-testid="server-url-input"]',
  addServerButton: '[data-testid="add-server-button"]',
  startTunnelButton: '[data-testid="start-tunnel-button"]',
  stopTunnelButton: '[data-testid="stop-tunnel-button"]',
  tunnelUrl: '[data-testid="tunnel-url"]',
} as const;

export const TERMINAL = {
  container: '[data-testid="terminal-container"]',
  tabBar: '[data-testid="terminal-tab-bar"]',
} as const;

export const PERMISSION = {
  card: '[data-testid="permission-card"]',
  approveButton: '[data-testid="permission-approve-button"]',
  onceButton: '[data-testid="permission-once-button"]',
  rejectButton: '[data-testid="permission-reject-button"]',
} as const;

export const NAV_LINKS = {
  chat: { name: /chat/i },
  sessions: { name: /sessions/i },
  files: { name: /files/i },
  settings: { name: /settings/i },
} as const;
```

### Viewports (`utils/viewports.ts`)

Consistent viewport presets:

```ts
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },   // iPhone X
  tablet: { width: 768, height: 1024 },  // iPad
  desktop: { width: 1440, height: 900 }, // Standard desktop
  laptop: { width: 1280, height: 720 },  // Laptop
} as const;

export const DEVICES = {
  iPhoneX: { ...VIEWPORTS.mobile, isMobile: true, hasTouch: true },
  iPad: { ...VIEWPORTS.tablet, isMobile: false, hasTouch: true },
  desktop: { ...VIEWPORTS.desktop, isMobile: false, hasTouch: false },
} as const;
```

### CSS utilities (`utils/css-utils.ts`)

Pure functions for inspecting CSS rules via `page.evaluate()`:

- `hasMatchingRule(rules, predicate)` — Check if a CSSRuleList has matching rules
- `hasEnvPadding(rules)` — Check for `env(safe-area-inset-*)` padding
- `getRulesForSelector(document, selector)` — Find CSS rules matching a selector

---

## 6. Writing a new test

### Step 1: Choose the right directory

| If testing... | Put it in... |
|---|---|
| Route rendering, links | `tests/navigation/` |
| Chat UI, prompt, permissions | `tests/chat/` |
| Settings, server config | `tests/settings/` |
| Terminal, WebSocket | `tests/terminal/` |
| Screenshots, pixel comparisons | `tests/visual/` |
| Viewport, responsive layout | `tests/viewport/` |
| Console, network, CDP, perf budgets | `tests/diagnostics/` |
| WCAG, keyboard, ARIA | `tests/accessibility/` |

### Step 2: Create the spec file

```ts
// tests/navigation/deep-links.spec.ts
import { test, expect } from "@playwright/test";

/**
 * Deep link navigation tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - navigate_page
 *   - wait_for
 */
```

### Step 3: Write the test

Simple test (no page objects needed):

```ts
test("deep link to /chat/abc-123 renders", async ({ page }) => {
  await page.goto("/chat/abc-123");
  await expect(page.getByTestId("prompt-input")).toBeVisible();
});
```

Test with page objects:

```ts
import { test, expect } from "../../fixtures/pilot.fixture";

test("permission card has approve/reject buttons", async ({ pilotPage }) => {
  await pilotPage.gotoChat();
  await expect(pilotPage.promptInput).toBeVisible();
});
```

### Step 4: Follow conventions

- **JSDoc**: Add file-level JSDoc describing what the tests cover and which chrome-devtools-mcp tools they mirror.
- **Describe blocks**: Group related tests with `test.describe("Area — feature", () => { ... })`.
- **No shared state**: Each test is independent. No `test.describe` hooks that mutate shared data.
- **No networkidle**: Replaced with `waitForLoadState("domcontentloaded")` + element visibility assertions.
- **No mock DOM injection**: Use `page.evaluate()` for Zustand store interactions when needed (e.g., permission cards), but prefer real interactions.

### Step 5: Verify

```bash
npm run test:e2e
```

---

## 7. Full-stack testing

Full-stack tests require the Hono server to be running alongside the Vite dev server.

### Configuration

Set `E2E_FULL_STACK=1`:

```bash
E2E_FULL_STACK=1 npm run test:e2e:fullstack
```

In `playwright.config.ts`, this triggers a dual-server `webServer` config:

```ts
const webServer = isFullStack
  ? [
      {
        command: `npx tsx server/src/cli.ts --port ${serverPort}`,
        port: Number(serverPort),
        env: {
          PORT: serverPort,
          OPENCODE_URL: process.env.OPENCODE_URL || "",
          CORS_ORIGINS: `http://localhost:${uiPort}`,
        },
      },
      {
        command: `npm run dev:ui -w ui`,
        url: `http://localhost:${uiPort}`,
        env: {
          PROXY_TARGET: `http://localhost:${serverPort}`,
        },
      },
    ]
  : /* UI-only config */;
```

### Skipping pattern

Tests that require full-stack mode use this pattern:

```ts
test.describe("Terminal — WebSocket", () => {
  test.skip(() => !process.env.E2E_FULL_STACK, "Requires E2E_FULL_STACK=1");

  test("connects and receives output", async ({ page }) => {
    // Full-stack test body
  });
});
```

### Full-stack test types

| Test type | File | What it exercises |
|---|---|---|
| Terminal WebSocket | `tests/terminal/websocket.spec.ts` | WebSocket connect, send command, receive PTY output |
| SSE event flow | `tests/chat/sse-flow.spec.ts` | EventSource connection, session lifecycle, state preservation |
| Permission card | `tests/chat/permission.spec.ts` | Real SSE permission.requested events |
| Tunnel controls | `tests/settings/flow.spec.ts` | Cloudflare tunnel start/stop |
| Performance regression | `tests/diagnostics/performance-regression.spec.ts` | CDP heap measurement across routes |

### Docker setup

For full-stack testing, run n9router via Docker Compose on its default port (`20128`). The `OPENCODE_URL` defaults to `http://localhost:20128` in `playwright.config.ts`:

```bash
# Terminal 1: Start n9router via Docker
docker compose -f docker/docker-compose.yml up -d

# Terminal 2: Run full-stack tests (connects to n9router at localhost:20128)
E2E_FULL_STACK=1 npm run test:e2e:fullstack
```

With the `full-stack` profile, Docker Compose also starts the Pilot Hono server:

```bash
docker compose -f docker/docker-compose.yml --profile full-stack up -d
```

For CI, build a Docker image with both servers:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm ci && npx playwright install chromium
CMD ["npx", "playwright", "test", "--config", "e2e/playwright.config.ts"]
```

The Playwright config reads `OPENCODE_URL` from the environment. When unset with `E2E_FULL_STACK=1`, it defaults to `http://localhost:20128` (the Docker n9router port). To use a different n9router address:

```bash
OPENCODE_URL=http://192.168.1.50:20128 E2E_FULL_STACK=1 npm run test:e2e:fullstack
```

---

## 8. Visual regression testing

Visual regression tests use Playwright's `toHaveScreenshot()` for pixel-level comparison against stored baselines.

### Baseline storage

Snapshots are stored in `tests/visual/*.spec.ts-snapshots/` directories. Generated automatically on first run.

### Writing a visual test

```ts
import { test, expect } from "../../fixtures/pilot.fixture";
import { ROUTES } from "../../utils/routes";

const { maxDiffPixelRatio } = { maxDiffPixelRatio: 0.01 };

test("settings page empty state", async ({ page, settingsPage }) => {
  await settingsPage.gotoSettings();
  await expect(settingsPage.heading).toBeVisible();
  await expect(page).toHaveScreenshot({
    fullPage: true,
    maxDiffPixelRatio,  // Allow 1% pixel difference tolerance
  });
});
```

### Rebaselining

When the UI intentionally changes, update baselines:

```bash
npm run test -w e2e -- tests/visual/ --update-snapshots
```

Then commit the updated PNG files.

### Visual regression across viewports

Test the same page at different viewports:

```ts
test("chat page — mobile viewport", async ({ page, pilotPage, mobileViewport }) => {
  await pilotPage.gotoChat();
  await expect(pilotPage.promptInput).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixelRatio });
});

test("chat page — desktop viewport", async ({ page, pilotPage, desktopViewport }) => {
  await pilotPage.gotoChat();
  await expect(pilotPage.promptInput).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixelRatio });
});
```

### Element-level screenshots

```ts
test("prompt input element snapshot", async ({ page }) => {
  await page.goto(ROUTES.HOME);
  const input = page.getByPlaceholder("ask opencode…");
  await expect(input).toBeVisible();
  await expect(input).toHaveScreenshot({ maxDiffPixelRatio });
});
```

---

## 9. Performance regression testing

Performance regression tests establish baselines and detect degradation.

### Navigation timing budgets

```ts
test("rapid navigation under budget", async ({ page }) => {
  const routes = [ROUTES.HOME, ROUTES.CHAT, ROUTES.SESSIONS, ROUTES.FILES, ROUTES.SETTINGS];
  const timings: number[] = [];

  for (const route of routes) {
    const start = Date.now();
    await page.goto(route);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();
    timings.push(Date.now() - start);
  }

  // Each route under 3s, average under 1.5s
  for (const t of timings) expect(t).toBeLessThan(3000);
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  expect(avg).toBeLessThan(1500);
});
```

### CDP heap measurement

```ts
test("heap does not grow significantly", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const initial = await cdp.send("Performance.getMetrics");
  const initialHeap = initial.metrics.find(m => m.name === "JSHeapUsedSize");

  // Navigate through routes...

  const final = await cdp.send("Performance.getMetrics");
  const finalHeap = final.metrics.find(m => m.name === "JSHeapUsedSize");

  const growthMB = (finalHeap.value - initialHeap.value) / 1024 / 1024;
  expect(growthMB).toBeLessThan(20);  // Max 20MB growth
});
```

### Long task detection

```ts
test("no long tasks during initial load", async ({ page }) => {
  await page.goto(ROUTES.HOME);
  await page.waitForLoadState("domcontentloaded");

  const longTasks = await page.evaluate(() => {
    return new Promise<PerformanceEntry[]>((resolve) => {
      const entries: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        entries.push(...list.getEntries());
      });
      observer.observe({ entryTypes: ["longtask"] });
      setTimeout(() => { observer.disconnect(); resolve(entries); }, 1000);
    });
  });

  expect(longTasks.length).toBe(0);
});
```

### Current budgets

| Metric | Budget | Notes |
|---|---|---|
| Route load time | < 3s per route | Measured from goto() to main-content visible |
| Average nav time | < 1.5s | Cached + non-cached |
| Repeated nav (last 3) | < 1s avg | Browser caching should help |
| Heap growth (full nav) | < 20MB | JSHeapUsedSize across all routes |
| Heap growth (any nav) | < 50MB | Upper bound safety net |
| Form interaction | < 500ms | Open form, type, submit |
| Long tasks (initial) | ≤ 2 | Some unavoidable during React hydration |

---

## 10. Accessibility testing

WCAG 2.2 AA audits via `@axe-core/playwright`.

### Automated audit per route

```ts
test("settings page has no WCAG violations", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("main-content")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toHaveLength(0);
});
```

### Known violations

Documented exceptions live in `KNOWN_VIOLATIONS` at the top of `tests/accessibility/wcag.spec.ts`. Remove entries as underlying issues are fixed.

### Keyboard navigation tests

```ts
test("Tab reaches interactive elements", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
  }
  // Verify focus landed on interactive elements
});
```

### Color contrast testing

Separate contrast audits with per-route known-violation filtering.

---

## 11. CI integration

### Environment

```yaml
# .github/workflows/e2e.yml
env:
  CI: "1"
  E2E_BASE_URL: "http://localhost:5173"
```

### Playwright config behavior

| Flag | CI=true | CI unset |
|---|---|---|
| `forbidOnly` | `true` | `false` |
| `retries` | `2` | `0` |
| `workers` | `1` | auto (CPU count) |
| Web server auto-start | disabled | enabled |

### GitHub Actions example

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run test:e2e
        env: { CI: "1" }

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

### Full-stack CI

```yaml
jobs:
  e2e-fullstack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run test:e2e:fullstack
        env:
          CI: "1"
          OPENCODE_URL: "http://opencode-mock:4096"  # Optional mock
```

---

## 12. Debugging techniques

### Playwright Inspector

```bash
npm run test -w e2e -- --debug
```

Opens inspector at the first test. Use:
- **Step over** to advance line by line
- **Explore** to inspect DOM elements
- **Record** to record new locators
- **Pick locator** to generate stable selectors

### Trace viewer

Traces are captured on first retry. Open:

```bash
npx playwright show-trace e2e/test-results/<trace-file>.zip
```

View timeline, network requests, console output, DOM snapshots at each action.

### Console logging

Add temporary logging:

```ts
test("debug log", async ({ page }) => {
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  // ...
});
```

### Screenshot on demand

```ts
await page.screenshot({ path: "/tmp/debug-screenshot.png", fullPage: true });
```

### Pause mid-test

```ts
await page.pause();  // Opens Playwright Inspector at this point
```

### Video recording

Enabled by default on failure (`video: "retain-on-failure"`). Watch the browser recording to understand what happened.

### Common debug patterns

**"Element not found"** — Use `page.pause()` then inspect the DOM with Playwright Inspector's pick-locator tool.

**"Timeout waiting for..."** — Check if the server is running (`lsof -i:5173`). Increase timeout temporarily: `test.slow()`.

**"Snapshot comparison failed"** — View the diff: Playwright generates comparison images in `test-results/`. Check for environmental differences (OS fonts, antialiasing).

---

## 13. Contributing guidelines

### Naming

- **Files**: `kebab-case.spec.ts` for test specs, `PascalCase.ts` for page objects.
- **Test descriptions**: `describe("Area — feature", ...)` — area first, colon dash separator, feature name.
- **Test titles**: `test("does something specific", ...)` — imperative, specific, readable in CLI output.

### Selector rules

1. Use `data-testid` attributes for stable targeting. Add `data-testid` to the UI code if missing.
2. Use `getByRole()` for navigation links and interactive elements.
3. Use `getByPlaceholder()` for input fields with unique placeholders.
4. Never use CSS class names, XPath, or fragile structural selectors.

### Code patterns

- **No `networkidle`**: Use `waitForLoadState("domcontentloaded")` + explicit element visibility.
- **No mock DOM injection**: Use `page.evaluate()` for Zustand store interactions when needed, but prefer real interactions with the UI.
- **Graceful fallbacks**: When elements may not exist (e.g., prompt disabled without server), make assertions conditional or use `.catch(() => false)`.
- **Early returns for skipped tests**: Full-stack tests use `test.skip()` at the describe level. UI-only tests that optionally exercise backend features guard with `if (!injected) return;`.

### Adding new selectors

1. Add the `data-testid` attribute to the React component.
2. Add the selector constant to `utils/selectors.ts`.
3. Add the locator to the appropriate page object.

### Adding new page objects

1. Create class extending `BasePage` in `pages/`.
2. Add locators as `readonly` class properties.
3. Add action methods for common user flows.
4. Export from `pages/index.ts`.
5. Add fixture to `fixtures/pilot.fixture.ts`.

### Prerequisites for merging

- [ ] Tests pass: `npm run test:e2e`
- [ ] No new console errors or warnings in tests
- [ ] No new WCAG violations (or documented in KNOWN_VIOLATIONS)
- [ ] Visual baselines updated if UI changed
- [ ] TypeScript clean: `npm run typecheck -w e2e`
- [ ] No `test.only` left behind (CI will catch with `forbidOnly: true`)
