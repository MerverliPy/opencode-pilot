# Pilot — Implementation Plan & Audit Findings

> **Generated**: 2026-05-13
> **Audit scope**: Full repository deep audit (source, config, CI/CD, tests, docs, .opencode/ ecosystem)
> **Version audited**: v0.2.0 (all M1-M5 migration milestones marked complete)

---

## Executive Summary

Pilot has successfully completed its PWA migration from React Native/Expo to a web-first architecture (React + Vite + Hono). All 5 migration milestones (M1-M5) are done. The codebase is clean, well-organized, and follows a disciplined monorepo pattern. Tests pass (381 unit, 59 E2E), type checks are clean, and builds succeed.

**However**, the project is now in a dangerous limbo: `TASKS.md` has no active task. The post-migration backlog (12 items) sits untouched. Critical production-readiness gaps exist in security, static file serving, observability, and server-side testing. This document provides the prioritized roadmap to take Pilot from a working prototype to a production-grade application.

---

## Part 1: Architecture & Code Quality Assessment

### Strengths

| Area                   | Assessment                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo structure** | Well-scoped workspaces (ui/server/shared/e2e). Clean separation of concerns. Shared types package avoids duplication.                                |
| **State management**   | Zustand stores are simple, immutable, well-tested. Each store has a single responsibility.                                                           |
| **Memory plugin**      | Impressive complexity: 8 embedding providers, 37+ models, cosine similarity dedup, extraction/injection lifecycle. Server-side SQLite port is clean. |
| **PWA implementation** | Complete: manifest, Workbox service worker, iOS install banner, Web Push with VAPID, Cloudflare tunnel + QR.                                         |
| **TypeScript**         | Strict mode everywhere. Shared types are hand-written and precise. No `any` leakage (enforced by ESLint in non-test code).                           |
| **CI/CD**              | Comprehensive: commitlint, typecheck, lint, test+coverage, semantic-release, Docker publish. Coverage comment bot on PRs.                            |
| **ESLint**             | Flat config (`eslint.config.js`). Well-structured with workspace-specific rules and test file relaxations.                                           |
| **Plugin system**      | 5 OpenCode plugins: session management, tool guardrails, code quality (formatting), strategic compaction, RTK compression. All tested.               |
| **Agent ecosystem**    | 13 agents, 26 commands, 36 skills, 8 rules. Comprehensive `.opencode/` configuration.                                                                |

### Concerns

| #   | Area                                  | Severity | Detail                                                                                                                                      |
| --- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Stale TASKS.md**                    | HIGH     | All milestones complete, no active task. The agent workflow (`read TASKS.md → find active task → execute`) is broken.                       |
| C2  | **Dual lockfiles**                    | MEDIUM   | Both `package-lock.json` (npm) and `pnpm-lock.yaml` exist. Only one should be present. CI uses `npm ci`.                                    |
| C3  | **Missing production static serving** | HIGH     | `server/src/index.ts:80-83` returns a text placeholder. The built Vite frontend is never served in production.                              |
| C4  | **No error boundary**                 | HIGH     | No `<ErrorBoundary>` in the React tree. Any uncaught render error whites out the entire app.                                                |
| C5  | **No CSS strategy**                   | MEDIUM   | No CSS framework or design-system tokens file identified. `theme.ts` exists but is not integrated with a CSS-in-JS or utility-class system. |
| C6  | **Server module coupling**            | LOW      | `server/src/index.ts` calls all `setup*()` functions in `startServer()`. No lazy initialization or dependency injection.                    |
| C7  | **No structured logging**             | MEDIUM   | Server uses raw `console.log`. No log levels, no correlation IDs, no structured format.                                                     |
| C8  | **Hardcoded version string**          | LOW      | `index.ts:20` has hardcoded `"0.2.0"`. Should read from `package.json`.                                                                     |

---

## Part 2: Security Assessment

### Critical Findings

| #   | Finding                                 | Severity | Location                                                                                                                                   |
| --- | --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | **No rate limiting**                    | CRITICAL | `server/src/index.ts` — the entire Hono app has zero rate limiting. The proxy passes unthrottled to upstream OpenCode.                     |
| S2  | **No CORS configuration**               | HIGH     | Hono has no CORS middleware. Browser cross-origin requests to the API may be unrestricted or blocked unpredictably.                        |
| S3  | **No input validation on proxy routes** | MEDIUM   | All `/api/*`, `/session/*`, `/file/*`, `/find/*`, `/config/*`, `/agent/*`, `/command/*`, `/global/*` pass through without body validation. |
| S4  | **No request body size limiting**       | MEDIUM   | No max body size on any POST endpoint. Large payloads can consume server memory.                                                           |
| S5  | **VAPID keys in env vars**              | LOW      | `server/src/index.ts:101-103` reads VAPID keys from `process.env` — acceptable but should be documented in a `.env.example`.               |

### Mitigation Recommendations

```
S1 → Add hono/rate-limit middleware with per-IP throttling (100 req/min default)
S2 → Add hono/cors middleware with explicit allowlist
S3 → Add Zod validation on proxy routes for known dangerous payload patterns
S4 → Add body size limit middleware (e.g., 10MB hard cap)
S5 → Create .env.example with all expected environment variables
```

---

## Part 3: Testing Infrastructure Assessment

### Current Coverage

| Workspace            | Tests    | Framework      | Coverage Scope                                                           |
| -------------------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `ui/`                | 381 unit | Jest + ts-jest | `services/`, `store/`, `plugin/memory/`                                  |
| `e2e/`               | 59 E2E   | Playwright     | Navigation, screenshots, console, network, input, emulation, performance |
| `server/`            | **0**    | —              | **None**                                                                 |
| `.opencode/plugins/` | 43 tests | Jest           | All 5 plugins + utils                                                    |

### Critical Gaps

| #   | Gap                          | Impact                                                                                                                           |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **Zero server tests**        | The entire Hono server (proxy, push, tunnel, terminal, git, memory routers) has no test coverage. Regression risk is extreme.    |
| T2  | **UI pages not in coverage** | `collectCoverageFrom` excludes `pages/`, `components/`, `hooks/`. The UI that users actually SEE has zero coverage requirements. |
| T3  | **No integration tests**     | No tests that spin up the Hono server + hit real endpoints. All testing is unit or E2E with a live OpenCode instance.            |
| T4  | **E2E tests not in CI**      | The 59 Playwright tests exist but no CI job runs them.                                                                           |
| T5  | **No API contract tests**    | The proxy routes have no contract tests to verify they forward correctly to upstream OpenCode.                                   |

### Coverage Reality Check

Current coverage reports show 80%+ on `services/`, `store/`, and `plugin/` — but these represent only ~40% of the UI source code by line count. The actual total coverage is likely 45-55% when `pages/` and `components/` are included.

---

## Part 4: Post-Migration Backlog Status

All 12 items from `TASKS.md` "Post-Migration Backlog" remain unimplemented:

| #   | Item                           | Original Priority | Current Assessment                                                                |
| --- | ------------------------------ | ----------------- | --------------------------------------------------------------------------------- |
| B1  | Light theme (system-aware)     | M2                | **MISSING**. UI is dark-only.                                                     |
| B2  | Session title editing          | M2                | **MISSING**. No inline edit UI.                                                   |
| B3  | Memory timeline UI             | M5                | **MISSING**. Memory page is basic list only.                                      |
| B4  | Memory profile UI              | M5                | **MISSING**. No profile visualization.                                            |
| B5  | Session deep linking from push | M3                | **MISSING**. Push notifications don't navigate.                                   |
| B6  | Message retry / resend         | M2                | **MISSING**. No retry UX.                                                         |
| B7  | Offline indicator              | M3                | **MISSING**. No connectivity state display.                                       |
| B8  | Cost + token display           | M2                | **MISSING**. Messages show no cost/token data (types exist in `shared/types.ts`). |
| B9  | Semantic memory search         | M5                | **MISSING**. Only category filter, no embedding-based search UI.                  |
| B10 | Memory export / backup         | M5                | **MISSING**. No export functionality.                                             |
| B11 | Image rendering in messages    | post-M4           | **MISSING**. FilePart type exists but no renderer.                                |
| B12 | Rich markdown rendering        | M2                | **MISSING**. messages render as plain text (no markdown parsing).                 |
| B13 | Session tags / folders         | post-M4           | **MISSING**. No session organization.                                             |

---

## Part 5: Prioritized Action Plan

### TIER 1 — CRITICAL (Ship Blockers for v0.3.0 Production Release)

These items must be completed before Pilot can be considered production-ready.

| Priority | Task                                                                  | Estimate | Dependencies |
| -------- | --------------------------------------------------------------------- | -------- | ------------ |
| **P1**   | Fix TASKS.md — create new active work area with remaining backlog     | 0.5h     | None         |
| **P2**   | Add Hono rate limiting middleware                                     | 1h       | None         |
| **P3**   | Add Hono CORS middleware with configurable allowlist                  | 1h       | None         |
| **P4**   | Serve production Vite build from Hono server (static file middleware) | 2h       | None         |
| **P5**   | Add React `<ErrorBoundary>` at app root + per-route boundaries        | 2h       | None         |
| **P6**   | Create `.env.example` with all expected env vars                      | 0.5h     | None         |
| **P7**   | Add server-side test infrastructure (Jest config + setup)             | 2h       | None         |
| **P8**   | Add unit tests for server proxy routes (at minimum)                   | 3h       | P7           |
| **P9**   | Add body size limit middleware (10MB default)                         | 0.5h     | None         |
| **P10**  | Remove stale pnpm-lock.yaml                                           | 0.1h     | None         |
| **P11**  | Add E2E job to CI (requires server to be built first)                 | 1.5h     | P4           |

**Tier 1 total: ~14h**

---

### TIER 2 — HIGH (Feature Completeness for v0.4.0)

These are the most impactful missing features from the post-migration backlog.

| Priority | Task                                                                         | Estimate | Notes                                                                |
| -------- | ---------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| **P12**  | Implement rich Markdown rendering in messages                                | 3h       | Use `react-markdown` + `remark-gfm` with code syntax highlighting    |
| **P13**  | Display cost and token counts on each assistant message                      | 2h       | Types already exist in `shared/types.ts`. SSE events carry the data. |
| **P14**  | Implement light theme (system-aware via `prefers-color-scheme`)              | 4h       | Design tokens from `theme.ts`. CSS custom properties approach.       |
| **P15**  | Implement session title editing (inline edit in chat header + sessions list) | 2h       | Already have `updateTitle` in session store. Need UI.                |
| **P16**  | Implement message retry / resend UX                                          | 3h       | Requires understanding OpenCode's resend API.                        |
| **P17**  | Add offline indicator (navigator.onLine + online/offline events)             | 1h       | Simple banner component.                                             |
| **P18**  | Implement session deep linking from push notification                        | 2h       | Service worker `notificationclick` → navigate to `/chat/:sessionId`. |

**Tier 2 total: ~17h**

---

### TIER 3 — MEDIUM (Memory Plugin Completion for v0.5.0)

Memory is the most complex feature but the UI is minimal. These items complete it.

| Priority | Task                                                     | Estimate | Notes                                                                            |
| -------- | -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| **P19**  | Implement semantic memory search (embedding-based query) | 4h       | Backend route already exists (`/memory/search`). Needs frontend UI.              |
| **P20**  | Add memory timeline view                                 | 3h       | TimelineRepository exists server-side. Add UI page/component.                    |
| **P21**  | Add user profile visualization                           | 2h       | ProfileRepository exists. Build profile display.                                 |
| **P22**  | Implement memory export (JSON download)                  | 1.5h     | Backend route needed + download button.                                          |
| **P23**  | Fix `Chat.tsx` memory injection wiring                   | 2h       | `useMemoryInjection` exists but needs verification it actively prepends context. |

**Tier 3 total: ~12.5h**

---

### TIER 4 — LOW (Polish & Enhancement for v1.0.0)

| Priority | Task                                                                   | Estimate | Notes                                                                       |
| -------- | ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| **P24**  | Add image rendering in messages (FilePart with mime type image/\*)     | 2h       | Simple `<img>` renderer for image file parts.                               |
| **P25**  | Implement session tags / folders                                       | 4h       | Tree or tag-based organization. Requires schema extension.                  |
| **P26**  | Add structured JSON logging to server (pino or similar)                | 2h       | Replace raw `console.log` with leveled logger.                              |
| **P27**  | Add request correlation IDs (X-Request-ID header)                      | 1h       | Middleware that generates/forwards a request ID.                            |
| **P28**  | Add health check endpoint details (uptime, memory usage, proxy status) | 1h       | Expand `/health` from simple true/false.                                    |
| **P29**  | Read version string from package.json at runtime                       | 0.5h     | Eliminate hardcoded `"0.2.0"`.                                              |
| **P30**  | Add Docker Compose for full Pilot + n9router deployment                | 2h       | Combine existing `docker/docker-compose.yml` (n9router) with Pilot service. |

**Tier 4 total: ~12.5h**

---

### TIER 5 — NICE TO HAVE (Post v1.0.0)

| Priority | Task                                                        | Notes                                                               |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| **P31**  | E2E test recategorization (split critical vs. nice-to-have) | Prevent flaky non-critical tests from failing CI.                   |
| **P32**  | Lighthouse CI integration                                   | Automate PWA score tracking per PR.                                 |
| **P33**  | Add Zod request body validation on proxy routes             | Validate known-dangerous payloads before forwarding.                |
| **P34**  | Add WebAuthn (replaces dropped Face ID / Touch ID)          | Passwordless auth for sensitive operations.                         |
| **P35**  | Server-side rendering consideration for initial load        | Could improve perceived load time.                                  |
| **P36**  | Use feature branches + PR workflow                          | Currently all commits on `main`. PR template exists but unused.     |
| **P37**  | Add `CHANGELOG.md` generation to semantic-release config    | `.releaserc.json` already has `@semantic-release/changelog` plugin. |

---

## Part 6: Technical Debt Register

| #   | Debt                                                                | Location                                                                  | Blast Radius                               | Remediation                                               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| D1  | `Chat.tsx` growing large                                            | `ui/src/pages/Chat.tsx`                                                   | Hard to maintain                           | Extract into `features/chat/` with sub-components         |
| D2  | Window type stubs remain from Expo era                              | `ui/types/modules.d.ts`                                                   | Confusing to newcomers                     | Prune remaining Expo stubs                                |
| D3  | Client-side memory plugin partially duplicated server-side          | `ui/src/plugin/memory/db/schema.ts` mirrors `server/src/memory/schema.ts` | Drift risk                                 | Single source of truth for schema DDL                     |
| D4  | Benchmark scripts have no CI integration                            | `pilot-bench.mjs` et al.                                                  | Benchmark regression                       | Wire into benchmark CI job (manual trigger ok)            |
| D5  | No `.prettierrc` file                                               | Root                                                                      | Inconsistent formatting across editors     | Add `.prettierrc` with project settings                   |
| D6  | `@types/better-sqlite3` in both server and ui                       | `server/package.json`, `ui/package.json`                                  | Confusing — UI shouldn't need SQLite types | UI only needs it for test mocks; investigate removal      |
| D7  | OpenCode agent configs for unused languages                         | `.opencode/agents/`                                                       | Context waste (Go, Python, etc.)           | Keep — these are part of the "everything-opencode" bundle |
| D8  | `server/src/cli.ts` has undocumented `--username`/`--password` args | CLI                                                                       | User confusion                             | Either document or proxy config to read from env          |

---

## Part 7: Target Milestones (Revised)

| Milestone  | Target     | Scope             | Key Deliverables                                                                                         |
| ---------- | ---------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| **v0.3.0** | 2026-05-26 | Tier 1 (Critical) | Rate limiting, CORS, static serving, error boundary, server tests, CI E2E, `.env.example`                |
| **v0.4.0** | 2026-06-09 | Tier 2 (High)     | Markdown rendering, light theme, cost/token display, offline indicator, push deep linking, message retry |
| **v0.5.0** | 2026-06-23 | Tier 3 (Medium)   | Semantic memory search, timeline view, profile UI, memory export                                         |
| **v1.0.0** | 2026-07-14 | Tier 4 (Low)      | Session tags, structured logging, image rendering, full Docker Compose, request correlation IDs          |

---

## Part 8: Immediate Next Actions

1. **Update `TASKS.md`** to reflect this plan as the new active work area with P1-P11 as the next execution scope.
2. **Begin Tier 1 execution** starting with P1 (update TASKS.md), then proceed sequentially through P2-P11.
3. **Run a full CI validation** (`npm run typecheck && npm run lint && npm run test:coverage`) after each item to prevent regressions.
4. **Commit each item independently** following conventional commit format for clean history and meaningful semantic-release changelogs.

---

## Part 9: Agent Opening Sequence

When an agent begins work on any enhancement, it should open files in the following order to build context efficiently. This sequence follows the data flow from types → UI → store → service → server, minimizing redundant reads while maximizing understanding.

### Universal Opening Sequence (Every Task)

| Step | File | Why |
|------|------|-----|
| 1 | `IMPLEMENTATION_PLAN.md` | Understand task priority, requirements, and dependencies |
| 2 | `shared/src/types.ts` | All API contracts and data shapes live here — the single source of truth |
| 3 | `DESIGN.md` | Architecture diagrams and UI wireframes for the feature |
| 4 | `TASKS.md` | Current active work area and completion status |

After these four, the agent should follow the **tier-specific sequence** below.

### Tier 2 — Feature Completeness (P12–P18)

#### P12: Rich Markdown Rendering

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/components/MessageList.tsx` | Current plain-text rendering — the primary file to modify |
| 6 | `ui/src/pages/Chat.tsx` | Parent page that renders MessageList |
| 7 | `shared/src/types.ts` → `TextPart`, `ReasoningPart` | Understand what content types need rendering |
| 8 | `ui/package.json` | Check current deps; will need `react-markdown`, `remark-gfm`, syntax highlighter |

#### P13: Cost + Token Display

| Step | File | Why |
|------|------|-----|
| 5 | `shared/src/types.ts` → `Message.cost`, `Message.tokens` | Types already exist — understand the shape |
| 6 | `ui/src/pages/Chat.tsx` | Where cost display would be added per-message |
| 7 | `ui/src/store/session.ts` | `upsertMessage` already stores cost/tokens data |
| 8 | `ui/src/services/sse.ts` | SSE events carry cost data — verify it reaches the store |

#### P14: Light Theme

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/theme.ts` | Current dark-only palette — needs light palette + CSS custom properties |
| 6 | `ui/src/components/Layout.tsx` | Where theme toggle UI would live |
| 7 | `ui/src/pages/Settings.tsx` | Where theme preference would be persisted |
| 8 | `ui/src/store/ui.ts` | May need a `theme` state slice |

#### P15: Session Title Editing

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/store/session.ts` | Already has `updateTitle` action |
| 6 | `ui/src/store/ui.ts` | Already has `openTitleEdit` modal action |
| 7 | `ui/src/pages/Chat.tsx` | Where the editable title UI would go |
| 8 | `ui/src/services/api.ts` | `updateSession` method already exists for the API call |

#### P16: Message Retry / Resend

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/pages/Chat.tsx` | Where retry button would appear on messages |
| 6 | `ui/src/services/api.ts` | `promptAsync` — understand the resend API contract |
| 7 | `ui/src/services/sse.ts` | SSE reconnection logic — understand event flow |
| 8 | `shared/src/types.ts` → `ServerEvent` | Understand message lifecycle events |

#### P17: Offline Indicator

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/services/sse.ts` | `useEventStream` — has reconnect logic, needs status exposure |
| 6 | `ui/src/components/Layout.tsx` | Where offline banner would render |
| 7 | `ui/src/store/server.ts` | Server connection state — may need `online`/`offline` tracking |

#### P18: Push Deep Linking

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/services/push.ts` | Push subscription helpers — understand current push flow |
| 6 | `ui/src/services/auth.ts` | Session persistence — need to navigate to stored session |
| 7 | `ui/src/pages/Chat.tsx` | Target route for deep link (`/chat/:sessionId`) |
| 8 | `ui/src/store/session.ts` | Session state management |

### Tier 3 — Memory Plugin Completion (P19–P23)

#### P19: Semantic Memory Search

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/memory/MemoryRepository.ts` | `searchMemories()` exists but is text-based — needs vector search |
| 6 | `server/src/memory/EmbeddingRepository.ts` | Embedding storage — needs similarity search method |
| 7 | `server/src/memory/memoryRouter.ts` | `/memory/:serverId/search` route — extend with vector search |
| 8 | `ui/src/plugin/memory/store/memoryStore.ts` | UI store — add search state |
| 9 | `ui/src/pages/Memory.tsx` | Search UI — add semantic search input |

#### P20: Memory Timeline View

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/memory/TimelineRepository.ts` | `getTimeline()`, `getTimelineBySession()` — already implemented |
| 6 | `server/src/memory/memoryRouter.ts` | `/memory/:serverId/timeline` route — already exists |
| 7 | `ui/src/services/memoryApi.ts` | `getTimeline()` client method — already exists |
| 8 | `ui/src/pages/Memory.tsx` | Where timeline view component would be added |

#### P21: Memory Profile UI

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/memory/ProfileRepository.ts` | `getProfile()`, `upsertProfileEntry()` — already implemented |
| 6 | `server/src/memory/memoryRouter.ts` | `/memory/:serverId/profile` route — already exists |
| 7 | `ui/src/services/memoryApi.ts` | `getProfile()` client method — already exists |
| 8 | `ui/src/pages/Memory.tsx` | Where profile visualization would be added |

#### P22: Memory Export

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/memory/MemoryRepository.ts` | Need to add export endpoint (JSON download) |
| 6 | `server/src/memory/memoryRouter.ts` | Add `/memory/:serverId/export` route |
| 7 | `ui/src/services/memoryApi.ts` | Add `exportMemories()` client method |
| 8 | `ui/src/pages/Memory.tsx` | Add download button |

#### P23: Memory Injection Wiring Verification

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/plugin/memory/hooks/useMemoryInjection.ts` | The hook that builds memory context prefix |
| 6 | `ui/src/pages/Chat.tsx` | Where injection is wired into prompt submission |
| 7 | `ui/src/plugin/memory/injection/MemoryInjector.ts` | The injection lifecycle |
| 8 | `ui/src/store/session.ts` | Verify prompt flow includes injected context |

### Tier 4 — Polish & Enhancement (P24–P30)

#### P24: Image Rendering

| Step | File | Why |
|------|------|-----|
| 5 | `shared/src/types.ts` → `FilePart` | Understand image part type |
| 6 | `ui/src/components/MessageList.tsx` | Where image renderer would be added |

#### P25: Session Tags / Folders

| Step | File | Why |
|------|------|-----|
| 5 | `shared/src/types.ts` → `Session` | May need schema extension for tags |
| 6 | `ui/src/pages/Sessions.tsx` | Where tag/folder UI would live |
| 7 | `ui/src/services/api.ts` | May need new API methods |

#### P26: Structured Logging

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/index.ts` | Contains `console.log`/`console.error` calls to replace |
| 6 | `server/src/terminal.ts` | Contains `console.log` calls |
| 7 | `server/src/tunnel.ts` | Contains `console.log` calls |

#### P27: Request Correlation IDs

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/index.ts` | Where middleware is mounted — add X-Request-ID middleware |

#### P28: Health Check Enhancement

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/index.ts` | Current `/health` endpoint — expand with uptime/memory/proxy status |
| 6 | `server/src/proxy.ts` | Check upstream connectivity status |

#### P29: Version from package.json

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/index.ts:20` | Hardcoded `"0.2.0"` — replace with `import { version } from '../package.json'` |

#### P30: Docker Compose

| Step | File | Why |
|------|------|-----|
| 5 | `Dockerfile` | Current production build — understand the image |
| 6 | `docker/docker-compose.yml` | Existing n9router compose — extend with Pilot service |

### Tech Debt Opening Sequences

#### D1: Chat.tsx Decomposition

| Step | File | Why |
|------|------|-----|
| 5 | `ui/src/pages/Chat.tsx` | The 355-line file to decompose |
| 6 | `ui/src/components/` | Existing components — understand extraction patterns |
| 7 | `ui/src/store/session.ts` | State used by Chat — understand what sub-components need |

#### D3: Schema Drift Risk

| Step | File | Why |
|------|------|-----|
| 5 | `server/src/memory/schema.ts` | Server-side schema (source of truth) |
| 6 | `ui/src/plugin/memory/db/schema.ts` | Client-side schema copy — identify drift |

### Quick Reference: Architecture Data Flow

```
shared/src/types.ts          ← All API contracts (start here for any change)
     ↓
server/src/index.ts           ← Server entry, middleware, route mounting
server/src/proxy.ts           ← API proxy to upstream OpenCode
server/src/memory/            ← Memory plugin (7 files, SQLite-backed)
     ↓
ui/src/services/api.ts        ← OpencodeClient (20 methods)
ui/src/services/sse.ts        ← EventSource hook with reconnect
ui/src/services/memoryApi.ts  ← MemoryApi (12 methods)
ui/src/store/                 ← 6 Zustand stores (session, server, ui, n9router, log, memory)
ui/src/pages/Chat.tsx         ← Main UI (355 lines, needs decomposition)
ui/src/theme.ts               ← Dark-only theme (needs light mode)
```

---

## Appendix A: File Size Audit

Files exceeding the 400-line target (from coding-style.md):

| File                                    | Lines | Recommendation               |
| --------------------------------------- | ----- | ---------------------------- |
| `ui/src/pages/Chat.tsx`                 | ~600+ | Extract sub-components       |
| `pilot-audit-report.mjs`                | 695   | Utility — acceptable         |
| `pilot-memory-bench.mjs`                | 532   | Utility — acceptable         |
| `DESIGN.md`                             | 613   | Documentation — acceptable   |
| `.opencode/agents/e2e-runner.md`        | 859   | OpenCode config — acceptable |
| `.opencode/agents/database-reviewer.md` | 675   | OpenCode config — acceptable |

## Appendix B: Dependency Health

| Dependency         | Version  | Risk   | Note                                           |
| ------------------ | -------- | ------ | ---------------------------------------------- |
| `react`            | ^19.1.0  | LOW    | Latest stable                                  |
| `hono`             | ^4.7.0   | LOW    | Latest stable                                  |
| `react-router-dom` | ^7.15.0  | LOW    | Latest v7                                      |
| `zustand`          | ^4.5.0   | LOW    | v5 exists but v4 is mature                     |
| `vite`             | ^6.3.0   | LOW    | Latest stable                                  |
| `better-sqlite3`   | ^12.10.0 | LOW    | Latest stable                                  |
| `node-pty`         | ^1.1.0   | MEDIUM | Native module, requires build tools            |
| `simple-git`       | ^3.36.0  | LOW    | Latest stable                                  |
| `vite-plugin-pwa`  | ^1.3.0   | LOW    | Latest stable                                  |
| `jest`             | ^29.7.0  | MEDIUM | Mature but consider vitest migration long-term |
