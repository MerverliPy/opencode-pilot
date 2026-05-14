# Pilot E2E Quick Guide

Quick start for running Pilot Playwright end-to-end tests.

## Prerequisites

- **Node.js >= 20** installed
- **Playwright browsers** installed:

```bash
npx playwright install chromium
```

For full-stack tests the Hono server needs `better-sqlite3` native bindings — run `npm install` from the project root first.

## Running tests

### UI-only mode (default)

Starts Vite dev server automatically, tests against the frontend in isolation:

```bash
npm run test:e2e
```

Fastest mode. Covers most tests — rendering, console errors, accessibility, viewports, form interaction, navigation.

### Full-stack mode

Starts both Hono server (`:3000`) and Vite dev server (`:5173`):

```bash
npm run test:e2e:fullstack
```

Required for:
- Terminal WebSocket tests (`tests/terminal/websocket.spec.ts`)
- SSE event flow tests (`tests/chat/sse-flow.spec.ts`)
- Permission card full-stack flow (`tests/chat/permission.spec.ts`)
- Tunnel controls test (`tests/settings/flow.spec.ts`)
- Performance regression with CDP metrics (`tests/diagnostics/performance-regression.spec.ts`)

### Single test file

```bash
npm run test -w e2e -- tests/navigation/routes.spec.ts
```

### Run tests in headed mode (see the browser)

```bash
npm run test -w e2e -- --headed
```

### Interactive Playwright UI

```bash
npm run test -w e2e -- --ui
```

Opens browser GUI — pick tests, see step-by-step trace, inspect DOM snapshots.

### Debug mode (Playwright Inspector)

```bash
npm run test -w e2e -- --debug
```

Pauses on each test. Step through locators, pick elements, inspect network.

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run test:e2e` | Full UI-only suite |
| `npm run test:e2e:fullstack` | Full suite with Hono server |
| `npm run test -w e2e -- tests/terminal/websocket.spec.ts` | Single file |
| `npm run test -w e2e -- --grep "permission"` | Run tests matching pattern |
| `npm run test -w e2e -- --reporter list` | CLI-only output (no HTML report) |
| `npm run test -w e2e -- --update-snapshots` | Rebaseline visual snapshots |
| `npm run test -w e2e -- --project chromium` | Run only Chromium project |
| `npm run test -w e2e -- --retries 3` | Retry failed tests up to 3 times |

## Understanding test results

### CLI output

```
Running 128 tests using 4 workers
  ✓ tests/navigation/routes.spec.ts:12:5 (2.1s)
  ✓ tests/settings/flow.spec.ts:15:5 (1.8s)
  ✗ tests/visual/screenshot.spec.ts:18:5 (3.2s)
  ...
  125 passed (45.3s)
```

- **✓** = passed
- **✗** = failed  
- Lines show file, line, column, and duration
- Summary line at the end

### HTML report

After a run, open the interactive HTML report:

```bash
npx playwright show-report e2e/playwright-report
```

Shows pass/fail per test, trace viewer, video, console log per test.

### Artifacts (on failure)

| Artifact | Location |
|----------|----------|
| Screenshot | `e2e/test-results/` — captured at failure moment |
| Trace (first retry) | `e2e/test-results/` — full DOM/network/console log |
| Video | `e2e/test-results/` — screen recording of failed test |

## Troubleshooting

### Tests hang on "waiting for page.goto"

Vite dev server might not be ready. Kill stale processes:

```bash
kill $(lsof -ti:5173) 2>/dev/null; npm run test:e2e
```

### WebSocket tests fail

Full-stack tests skip when `E2E_FULL_STACK` not set. Verify:

```bash
echo $E2E_FULL_STACK  # Should print "1"
```

### Visual snapshot mismatches

Snapshots are OS-specific. On a new OS or browser update, rebaseline:

```bash
npm run test -w e2e -- tests/visual/ --update-snapshots
```

Commit the updated PNGs.

### Accessibility tests fail with new violations

New WCAG violations caught. Review the violation details in test output. If acceptable, document in `KNOWN_VIOLATIONS` array in `tests/accessibility/wcag.spec.ts`. If bugs, fix UI code.

### "Cannot find module" import errors

Fixture imports require the correct relative path:

```ts
// From tests/navigation/
import { test } from "../../fixtures/pilot.fixture";
// From tests/chat/
import { test } from "../../fixtures/pilot.fixture";
```

### Port conflict

If port 5173 or 3000 is already used, set env vars:

```bash
PORT=3001 E2E_FULL_STACK=1 npm run test:e2e:fullstack
```

## CI

In CI (`CI=1`):
- `forbidOnly: true` — prevents `.only` from merging
- `retries: 2` — retries each failed test
- `workers: 1` — serial execution for stability
- No auto-start — set `E2E_BASE_URL` to the deployed URL

## Next steps

See [`docs/in-depth-guide.md`](in-depth-guide.md) for architecture overview, writing new tests, page objects, fixtures, visual/performance regression, and contributing guidelines.
