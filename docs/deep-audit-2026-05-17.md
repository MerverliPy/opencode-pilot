# PILOT DEEP AUDIT REPORT

**Date:** 2026-05-17
**Version:** v0.2.0
**Commits since last audit:** ~35 (features + hardening + testing expansion)
**Branch:** main (single branch workflow)

---

## 1. EXECUTIVE SUMMARY

Pilot is an OpenCode PWA client — React + Vite frontend, Hono Node.js backend, npm workspaces monorepo. It proxies to upstream `opencode serve`, provides direct n9router chat completions, terminal (node-pty), Git UI, Web Push, Cloudflare tunnel, and a server-side SQLite memory plugin.

**Health: GOOD** — tests pass, types check, builds clean. Post-migration from React Native complete. Production hardening done. Feature development active.

---

## 2. REPO STATISTICS

| Metric | Value |
|--------|-------|
| Total TS/TSX source files | 170 |
| Total lines of code | ~31,868 |
| Workspaces | 5 (server, ui, shared, e2e, benchtest) |
| Tests passing | 522 ui + 216 server = **738 unit** (+ 59 E2E) |
| Typecheck | All 4 workspaces clean |
| Lint | Clean (flat config, `eslint.config.js`) |
| Build | Clean (shared → server → ui) |
| ESLint config | Flat config, workspace-aware, test relaxations |
| OpenCode agents | 16 |
| OpenCode commands | 8 |
| OpenCode plugins | 4 (n9router-director, tool-guardrails, rtk-compressor, index) |
| OpenCode skills | 8 |
| CI jobs | 6 (commitlint, typecheck, lint, test-server, test-ui, e2e) |

---

## 3. ARCHITECTURE

```
Browser/PWA
  ├── ui/src/       React 19 + Vite 6 + Zustand + react-router v7
  ├── shared/       Shared TypeScript types (217 lines, hand-written)
  └── e2e/          Playwright (59 E2E tests)

Pilot Server (Hono, Node.js)
  ├── proxy.ts      OpenCode API proxy (all /api/*, /session/*, /event, etc.)
  ├── n9routerChat.ts  Direct /api/chat/completions (bypasses OpenCode agent)
  ├── auth.ts       Bearer token auth (env-driven PILOT_AUTH_TOKEN)
  ├── terminal.ts   node-pty WebSocket bridge (xterm.js)
  ├── push.ts       Web Push (VAPID) relay
  ├── tunnel.ts     Cloudflare tunnel manager (cloudflared)
  ├── git.ts        simple-git routes (status, diff, commit, push)
  ├── rateLimit.ts  In-memory per-IP rate limiter (100 req/min)
  └── memory/       SQLite memory plugin (7 files)
      ├── MemoryRepository.ts    CRUD + FTS5 search
      ├── EmbeddingRepository.ts Vector embedding storage
      ├── ProfileRepository.ts   User profile key-value store
      └── TimelineRepository.ts  Event timeline

Upstream: opencode serve (HTTP + SSE)
```

---

## 4. SERVER AUDIT (server/src/ — 14 source files)

### Quality: STRONG

| File | Lines | Tests | Notes |
|------|-------|-------|-------|
| `index.ts` | 250 | ✅ | Middleware wiring, route protection, `startServer()` |
| `proxy.ts` | 123 | ✅ (95% stmt) | Hono proxy middleware, SSE streaming, header stripping |
| `auth.ts` | 66 | ✅ | Bearer token, env-driven, graceful disable |
| `terminal.ts` | 187 | ✅ | PTY lifecycle, WebSocket bridge, auth upgrade gate |
| `push.ts` | 115 | ✅ | VAPID subscribe/unsubscribe/broadcast |
| `tunnel.ts` | 97 | ✅ | cloudflared spawn/kill/status |
| `git.ts` | 156 | ✅ | Status/diff/commit/push via simple-git |
| `n9routerChat.ts` | 230 | ❌ No dedicated tests | Direct n9router streaming completions |
| `rateLimit.ts` | 22 | — | Clean, simple |
| `db.ts` | 65 | ✅ | SQLite push_subscriptions |
| `cli.ts` | 56 | ✅ | Arg parsing, env fallback |
| `debugLog.ts` | 46 | — | Hono middleware |
| `memory/` | 8 files | ✅ | Embedded schema migrator, 5 tables, FTS5 |

### Issues found:
- **`n9routerChat.ts`** — no dedicated unit tests (integration-only through E2E)
- **`proxy.ts` line 78** — `AbortSignal.timeout(30_000)` — consider making configurable
- **`terminal.ts`** — buffer limit hardcoded at 65536 bytes
- **`tunnel.ts`** — spawns external binary (`cloudflared`), no graceful shutdown signal

---

## 5. UI AUDIT (ui/src/ — 10 pages, 13 components, 6 stores, 13 services)

### Quality: STRONG to MIXED

### Pages (8)

| Page | Lines | Tests | Notes |
|------|-------|-------|-------|
| `SimpleChat.tsx` | 783 | ✅ | **Largest file** — conversation management baked in |
| `Settings.tsx` | 468 | ✅ | Inline styles, modal pattern |
| `Memory.tsx` | — | ✅ | Basic list view, no timeline/profile UI yet |
| `Chat.tsx` | — | ✅ | OpenCode session chat |
| `Sessions.tsx` | — | ✅ | Session list |
| `Files.tsx` | — | ✅ | Split-pane file tree + CodeMirror preview |
| `Terminal.tsx` | — | ✅ | xterm.js + multi-tab |
| `Diff.tsx` | — | ✅ | diff2html + commit form |

### Stores (5 Zustand)
- `session.ts` — Session status, turns, messages, permissions (well-tested)
- `server.ts` — Server config CRUD, localStorage persistence
- `n9router.ts` — n9router URL/key config
- `ui.ts` — Modal state, font size (minimal)
- `log.ts` — Debug log ring buffer

### Style Architecture
- **CSS**: Inline styles via `theme.ts` tokens + CSS custom properties (dark/light)
- **`theme.ts`** (129 lines) — Well-structured: `darkColors` + `lightColors` palettes, `getSystemTheme()`, CSS variable mapping
- **Light theme**: Implemented via `prefers-color-scheme`, CSS vars, targeted component updates

### Issues found:
- **`SimpleChat.tsx` (783 lines)** — biggest UI file, should extract conversation management
- **`Settings.tsx` (468 lines)** — all inline, no form abstraction
- **Chat vs SimpleChat** — two parallel chat UIs, partial feature duplication
- **No accessibility audit** — test IDs exist but no ARIA audit
- **Mobile responsive** — Layout has 768px breakpoint, some pages untested on mobile

---

## 6. SHARED PACKAGE

| File | Lines | Quality |
|------|-------|---------|
| `shared/src/types.ts` | 217 | EXCELLENT |

Types: Session, Message, Part (5 variants), PermissionRequest, ServerEvent (12 variants), ServerConfig, N9RouterConfig, N9RouterModel, ProviderSummary. Hand-written, no dependency on OpenCode SDK.

**Issue:** No tests for type shapes (TypeScript-compile-time only)

---

## 7. E2E AUDIT

| Config | Tests | Framework |
|--------|-------|-----------|
| `playwright.config.ts` (79 lines) | 59 | Playwright 1.60+ |

Tests cover: navigation, screenshots, console errors, network intercepts, form input, viewport/responsive, performance tracing. CI job exists with full stack or UI-only modes.

**Issues:**
- E2E tests rely on external OpenCode instance for full-stack mode
- UI-only mode limited to static pages
- No accessibility E2E (axe-core installed but no a11y spec tests)

---

## 8. TEST INFRASTRUCTURE

| Workspace | Tests | Framework | Coverage Scope | Threshold |
|-----------|-------|-----------|----------------|-----------|
| `server/` | **216** | Jest + ts-jest | proxy, auth, git, push, tunnel, terminal, memory, db, cli, health | None configured |
| `ui/` | **522** | Jest + ts-jest | `services/`, `store/`, `plugin/` | 80% global |
| `e2e/` | **59** | Playwright | Navigation, forms, console, network, perf | N/A |
| **Total** | **797** | | | |

### Gaps:
- `server/jest.config.cjs` — no coverage thresholds configured
- `n9routerChat.ts` — no dedicated unit tests
- UI coverage excludes `pages/` and `components/` (actual coverage ~50-60% of UI total)

---

## 9. CI/CD

**Status: COMPREHENSIVE**

| Job | Status | Details |
|-----|--------|---------|
| commitlint | ✅ | `@commitlint/config-conventional` |
| typecheck | ✅ | All 4 workspaces, serial |
| lint | ✅ | ESLint flat config |
| test-server | ✅ | 216 tests |
| test-ui | ✅ | 522 tests, coverage PR comment bot |
| e2e | ✅ | Build → start → Playwright, artifact upload |
| ci-pass | ✅ | Aggregate gate |

**Issues:**
- E2E CI uses single Chromium only (no Firefox/WebKit)
- No benchmark CI integration
- No dependency vulnerability scanning (npm audit)

---

## 10. OPENCODE CONFIGURATION

**Plugins (4):** n9router-director, tool-guardrails, rtk-compressor, index
**Agents (16):** architect, build-fixer, code-reviewer, context-scout, docs-scout, docs-updater, e2e-runner, implementer, maintainer, orchestrator, performance-reviewer, planner, security-auditor, test-strategist, typescript-reviewer, verifier
**Skills (8):** pilot-architecture, typescript-react-hono, tdd-verification, e2e-playwright, security-review, plugin-safety, codemap-maintenance, n9router-workflow
**Commands (8):** docs, e2e, fix-build, implement, plan, review, setup-n9router, verify

---

## 11. SECURITY ASSESSMENT

| Risk | Status | Detail |
|------|--------|--------|
| Rate limiting | ✅ | 100 req/min per IP |
| CORS | ✅ | Configurable via `CORS_ORIGINS` |
| Body size limit | ✅ | 10MB default |
| Auth | ✅ | Bearer token, all protected routes, WS upgrade gate |
| Input validation | ⚠️ Partial | Proxy passes through unvalidated |
| SQL injection | ✅ | Parameterized queries |
| Secrets in env | ✅ | `.env` gitignored, `.env.example` documents all |
| Password in URL | ⚠️ | Server config in localStorage (XSS surface) |
| CSP headers | ❌ Missing | No Content-Security-Policy header |

---

## 12. ACTIVE TASKS & BACKLOG

**v0.4.0 — Tier 2 (4 done: P12-P14 ✅, 4 pending):**

| # | Task | Status |
|---|------|--------|
| P15 | Session title editing | 🔴 Not started |
| P16 | Message retry / resend UX | 🔴 Not started |
| P17 | Offline indicator | 🔴 Not started |
| P18 | Session deep linking from push | 🔴 Not started |

**v0.5.0 — Tier 3 (Memory completion):** P19-P22 all not started
**v1.0.0 — Tier 4 (Polish):** P24-P30 all not started

---

## 13. TECHNICAL DEBT REGISTER

| ID | Debt | File(s) | Severity |
|----|------|---------|----------|
| D1 | SimpleChat.tsx too large (783 lines) | `ui/src/pages/SimpleChat.tsx` | MEDIUM |
| D2 | Two parallel chat UIs | `Chat.tsx`, `SimpleChat.tsx` | MEDIUM |
| D3 | ChatMessage custom markdown renderer | `ChatMessage.tsx` | LOW |
| D4 | No server coverage thresholds | `server/jest.config.cjs` | LOW |
| D5 | UI coverage excludes pages/components | `ui/jest.config.cjs` | MEDIUM |
| D6 | No CSP headers | `server/src/index.ts` | LOW |
| D7 | No prettierrc | Root | LOW |
| D8 | Stale audit HTML reports in root | Root (6 files) | LOW |
| D9 | `@types/better-sqlite3` in UI deps | `ui/package.json` | LOW |
| D10 | Hardcoded version string | `server/src/index.ts:86` | LOW |
| D11 | n9routerChat.ts no direct unit tests | `server/src/n9routerChat.ts` | MEDIUM |

---

## 14. KEY METRICS SUMMARY

```
✅ Tests:       797 passing (522 ui + 216 server + 59 e2e)
✅ Typecheck:   Clean — all 4 workspaces
✅ Lint:        Clean — flat ESLint config
✅ Build:       Clean — shared → server → ui
✅ CI:          6 jobs, all passing, E2E artifacts on failure
✅ Auth:        Server bearer token + WS upgrade gate
✅ PWA:         Manifest, service worker, install banner, Web Push
✅ Memory:      Server-side SQLite, FTS5 search, 5 tables, full CRUD
✅ Terminal:    node-pty + WebSocket + auth
✅ Light theme: System-aware via prefers-color-scheme
✅ Rate limit:  100 req/min per IP
✅ CORS:        Configurable origins

⚠️ Issues:      11 debt items (0 critical, 3 medium, 8 low)
⚠️ Backlog:     4 Tier-2 + 4 Tier-3 + 7 Tier-4 tasks pending
⚠️ UI coverage: Pages/components excluded from coverage requirements
```

**Bottom line:** Pilot is in strong shape. Migration complete, production hardening done, 797 tests passing. 4 high-priority features remain for v0.4.0. Memory plugin UI needs completion. No critical blockers.
