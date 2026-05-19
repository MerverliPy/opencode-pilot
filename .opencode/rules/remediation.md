# Pilot Remediation Guide

Actionable fix plan for coding agents. Fix security holes first, then architecture drift, then dead code.

---

## Issue-ready checklist

### Critical

- [x] **Terminal WS no auth** — resolved: WS upgrade gated by bearer token in server/src/terminal.ts
- [x] **Git routes no auth** — resolved: all /git/* routes protected in server/src/index.ts
- [x] **Tunnel routes no auth** — resolved: all /tunnel/* routes protected in server/src/index.ts
- [x] **Proxy routes no auth** — resolved: all proxy-mounted routes protected; Pilot token stripped before upstream forward in server/src/proxy.ts
Also protected: /push/* and /memory/* routes.
- [x] **Static file path traversal** — resolved: normalize() + resolve() + startsWith() guard in server/src/index.ts setupStatic() (`server/src/index.ts`) — serving static files from filesystem root may expose config, .env, DB.
- [x] **Browser secret persistence** — resolved: AES-GCM-256 encryption via Web Crypto + IndexedDB in ui/src/services/crypto.ts, wrapping sensitive localStorage keys (`ui/src/services/auth.ts`, related stores) — tokens/credentials persist in browser storage. Exposed to XSS.
- [x] **SSE auth middleware audit** — resolved: UI uses `fetch` + `ReadableStream` with `Authorization: Bearer` header (`ui/src/services/sse.ts`). Server `/event` route protected via `protectRoute("/event")` + `requireBearerAuth()`. WS terminal auth via `isAuthorizedNodeRequest()`. Pilot token stripped before proxy forward. See `.opencode/codemap/auth-story.md`.
- [ ] **Memory embedding tenant isolation gap** — embedding vectors not scoped to tenant/user. Cross-tenant data leak via similarity search.

### High

- [ ] **Debug log captures sensitive payloads** — full request/response bodies logged, including auth headers, tokens, file contents.
- [ ] **Mixed UI server-target model** — Diff/Push/Tunnel/Terminal/SSE services hardcode relative paths bypassing `serverUrl`. Breaks when server != UI origin.
- [ ] **Duplicate memory schema** — `ui/src/plugin/memory/db/schema.ts` duplicates `server/src/memory/schema.ts`. Two sources of truth. Domain contract drift over time.
- [ ] **Rate limiter map leak** (`server/src/index.ts`) — unbounded in-memory `Map` with no cleanup. OOM under sustained traffic.
- [ ] **`server/src/push.ts` `broadcastPushNotification()`** — exported but zero callers. Dead code. Wire into SSE or delete + tests.

### Medium

- [ ] **`server/src/memory/memoryRouter.ts`** — no `serverId` param validation (length, format, charset). SQLite parameterized but unbounded input.
- [ ] **`server/src/git.ts`** — `POST /git/commit` defaults `cwd` to `process.cwd()`. No validation target is a git repo.
- [ ] **`ui/src/store/session.ts` `upsertPart`** — creates placeholder messages for orphan parts silently. Should warn instead.
- [ ] **Push client bypass** (`ui/src/services/push.ts`) — fetch to `/push/status` instead of through `serverUrl`.
- [ ] **Tunnel client bypass** (`ui/src/services/tunnel.ts`) — relative `/tunnel/*` paths bypass proxy.
- [ ] **`audit.sh` stale RN/Expo references** — `REACT_NATIVE_PACKAGER_HOSTNAME`, `npx expo start` from migration era.

### Low

- [ ] **`ui/src/services/types.ts` re-export shim** — remove after confirming zero direct imports.
- [ ] **`server/src/memory/memoryRouter.ts` triplicate JSDoc** — `/memory/:serverId/timeline` listed 3 times.
- [ ] **`coverage/`, `debugscreenshots/`** — add to `.gitignore` or move per-workspace.
- [ ] **Root stale docs** — `DESIGN.md`, `MEMORY.md`, `BENCH.md` — check against current architecture.
- [ ] **`e2e/tests/chat/sse-flow.spec.ts`** — verify passes with current proxy setup.

---

## Ranked fix plan (effort x impact)

| Rank | Theme | Impact | Effort | Why now | Primary files |
|------|-------|--------|--------|---------|---------------|
| 1 | Auth on terminal/git/tunnel/proxy routes | ✅ RESOLVED | 3h | Implemented via env-driven bearer token (PILOT_AUTH_TOKEN). Auth covers terminal WS + HTTP, git, tunnel, proxy, push, memory routes. | `server/src/auth.ts`, `server/src/index.ts`, `server/src/terminal.ts`, `server/src/proxy.ts` |
| 2 | Static file traversal protection | Critical | 1h | Path traversal exposes env, DB, config. | `server/src/index.ts` |
| 3 | Browser secret storage hardening | Critical | 2h | XSS -> token exfiltration. Move to httpOnly cookies or encrypted session store. | `ui/src/services/auth.ts`, auth stores |
| 4 | SSE auth middleware audit | ✅ RESOLVED | — | UI uses `fetch` + `ReadableStream` with Bearer auth. All SSE/WS routes protected. See `.opencode/codemap/auth-story.md`. | `server/src/index.ts`, `ui/src/services/sse.ts` |
| 5 | Proxy debug log leak (SSE) | High | 0.5h | `proxy.ts:135-150` logs AI response content metadata (XML debug). Leftover instrumentation. Gate behind `NODE_ENV=development` or remove. | `server/src/proxy.ts` |
| 6 | Memory embedding tenant scoping | Critical | 2h | Cross-tenant data leak via vector similarity search. | Memory embedding service |
| 7 | Debug log sanitization | High | 1h | Credentials, tokens, file contents in logs. Strip headers, truncate bodies. | Logger config, request middleware |
| 8 | Duplicate memory schema → shared/ | High | 1h | Two schemas diverge over time. Move canonical types to `shared/src/`. | `ui/src/plugin/memory/db/schema.ts`, `server/src/memory/schema.ts`, `shared/src/types.ts` |
| 9 | Unify UI server-target model | High | 1.5h | Diff/Push/Tunnel/Terminal/SSE bypass active server URL. All must read `serverUrl` from store. | `ui/src/services/push.ts`, `ui/src/services/tunnel.ts`, SSE service, diff service |
| 10 | Rate limiter TTL cleanup | Medium | 1h | OOM under load. Add setInterval eviction or `lru-cache`. | `server/src/index.ts` |
| 11 | Dead code: `broadcastPushNotification` | Medium | 0.5h | Zero callers. Remove or wire into SSE. | `server/src/push.ts` |
| 12 | Input validation: git cwd, serverId params | Medium | 1h | Unvalidated input to filesystem and DB ops. | `server/src/git.ts`, `server/src/memory/memoryRouter.ts` |
| 13 | Test coverage for auth + security paths | Medium | 2h | No test validates terminal/tunnel/proxy auth rejection. | `e2e/tests/terminal/`, `e2e/tests/tunnel/` |
| 14 | Stale audit script + root cleanup | Low | 0.25h | RN references mislead. Root artifacts confuse agents. | `audit.sh`, root `.html`, `.json`, `.log` files |
| 15 | Re-export shim + JSDoc cleanup | Low | 0.25h | Minor code quality. | `ui/src/services/types.ts`, `server/src/memory/memoryRouter.ts` |

---

## Per-file remediation backlog

### `server`

| File | Fix |
|------|-----|
| `server/src/auth.ts` | **NEW** — Bearer token auth module. Exports `requireBearerAuth()` middleware, `isAuthorizedNodeRequest()` for WS upgrade, `isAuthEnabled()`, `getConfiguredAuthToken()`. |
| `server/src/index.ts` | ✅ Auth middleware mounted on all sensitive route paths via `protectRoute()`. Also protects `/push/*` and `/memory/*`. CORS updated to allow `Authorization` header. |
| `server/src/terminal.ts` | ✅ WS upgrade handler rejects unauthorized connections with HTTP 401 before upgrade. Accepts `authToken` parameter. |
| `server/src/proxy.ts` | ✅ `copyHeaders()` strips local Pilot bearer token before upstream fetch. `ProxyConfig` accepts optional `pilotAuthToken`. |
| `server/src/index.ts` | Fix static file serving to restrict to known directory. Add rate limiter TTL cleanup (`lru-cache` or periodic eviction). |
| `server/src/push.ts` | Remove `broadcastPushNotification()` and `getAllPushSubscriptions()` if zero callers confirmed. Or wire into SSE event handler. |
| `server/src/memory/memoryRouter.ts` | Add `serverId` length/format validation on all param-based routes. Deduplicate JSDoc. |
| `server/src/memory/schema.ts` | This is canonical server schema. Extract shared domain types to `shared/src/` for cross-package imports. |
| Logger middleware | Sanitize request/response bodies before logging. Strip `authorization`, `cookie`, `x-api-key` headers. Truncate bodies >1KB. |
| SSE route registration | ✅ Audit complete — `/event` route protected via `protectRoute("/event")` + `requireBearerAuth()`. UI uses `fetch` + `ReadableStream` with Bearer auth. See `.opencode/codemap/auth-story.md`. Open: proxy debug logging leaks AI response metadata (`proxy.ts:135-150`), unbounded PTY sessions (`terminal.ts`), no SSE auth-failure user feedback. |
| Memory embedding service | Scope embedding vectors to tenant/user ID. Filter similarity searches by owner. |

### `ui`

| File | Fix |
|------|-----|
| `ui/src/services/auth.ts` + auth stores | Stop persisting raw tokens in localStorage/sessionStorage. Use httpOnly cookies or encrypted session store. Clear on logout. |
| `ui/src/plugin/memory/db/schema.ts` | **Delete** — duplicates `server/src/memory/schema.ts`. Import domain types from `shared/` instead. |
| `ui/src/services/memoryApi.ts` | Update import path: `../plugin/memory/db/schema` → `shared/src/types`. |
| `ui/src/services/push.ts` | Accept `serverUrl` from store like other services. Don't hardcode `/push/status`. |
| `ui/src/services/tunnel.ts` | Same fix — pass `serverUrl`, build absolute fetch paths. |
| `ui/src/services/types.ts` | Re-export shim. Remove after `rg "from.*services/types"` confirms zero direct imports. |
| `ui/src/store/session.ts` | Replace silent placeholder message creation in `upsertPart` with `console.warn`. Handle via parent message fetch. |
| Diff/Push/Tunnel/SSE service clients | All must read `serverUrl` from Zustand store. No relative path hardcodes. |

### `shared`

| File | Fix |
|------|-----|
| `shared/src/types.ts` | Destination for shared contracts. Move memory domain types, server config shapes, embedding types here. Single source imported by both server and UI. |
| (new) `shared/src/memory.ts` | Extract memory-specific types (MemoryDocument, MemoryQuery, embedding vectors) from `server/src/memory/schema.ts`. |
| (new) `shared/src/auth.ts` | Auth token shapes, session types, permission enums shared between server auth middleware and UI auth service. |

### `tests/e2e`

| File | Fix |
|------|-----|
| `e2e/tests/terminal/websocket.spec.ts` | Add test for WS auth rejection: connect without token → 401/403. Connect with wrong session owner → rejected. |
| `e2e/tests/tunnel/` | Add tunnel auth rejection tests. |
| `e2e/tests/proxy/` | Add proxy auth + path traversal rejection tests. |
| `e2e/tests/chat/sse-flow.spec.ts` | Verify SSE passthrough works after unified auth middleware changes. |
| (all spec files) | Use stable selectors (text, role). Avoid fragile class-name selectors. |

---

## Execution rules for coding agents

1. **Secure dangerous routes first.** Terminal WS, git, tunnel, proxy — patch auth on these before any feature or cleanup. These are machine-control surfaces with no authentication.

2. **Never let two agents edit the same file concurrently.** Check `git status` and discuss file ownership before starting.

3. **Minimal diffs per commit.** Change exactly what the fix requires. Do not reformat, restructure, or rename unrelated code in same commit.

4. **Validate inputs at every boundary.** Route params, query strings, request bodies, WS messages, SSE payloads — sanitize length, charset, and format. Use Zod or manual guards.

5. **Move shared contracts to `shared/`, never import server internals from UI.** Domain types (memory, auth, config) live in `shared/src/`. UI must not import from `server/` package internals.

6. **Unify UI server-target model.** Every service making server requests must read `serverUrl` from Zustand store. No hardcoded relative paths. This includes Diff, Push, Tunnel, Terminal, and SSE services.

7. **Remove dead code only after confirming zero callers.** `rg "symbolName" --include "*.ts"` across whole repo. If no callers, delete (don't comment out). If planned feature, track in tasks, don't leave stubs.

8. **Delete duplicated files, don't keep both.** `ui/src/plugin/memory/db/schema.ts` must be deleted and replaced with shared imports. Two schemas will drift.

9. **Sanitize all logs before and after.** Strip `authorization`, `cookie`, `x-api-key` headers. Truncate bodies >1KB. Never log tokens, credentials, or file contents.

10. **Verify narrowly first.** Changed server file → `npm run typecheck -w server`. Changed UI file → `npm run typecheck -w ui`. Cross-package type change → root `npm run typecheck`. Then broader checks.

11. **Test security boundaries after fixing them.** After adding auth to terminal WS, add a test that verifies unauthenticated connection is rejected. After hardening static file serving, test traversal attempts return 403.
