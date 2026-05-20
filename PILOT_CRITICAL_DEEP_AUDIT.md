# REFERENCE-ONLY ARCHIVE

This document is no longer the agent task source of truth. Use `TASKS.md` for the human-maintained agenda and `.opencode/plans/next-task.json` only as a generated machine pointer. Use this file only when the user explicitly asks for historical deep-audit remediation context.


# PILOT CRITICAL DEEP AUDIT — STATUS TRACKER

**Date:** 2026-05-19 | **Reviewers:** 8 agents, 3 waves + 3 follow-ups  
**Key:** `[ ]` uncompleted · `[~]` working · `[x]` finished

---

## SPRINT 1 — CRITICAL (19 findings)

### Security — Fix immediately

- [x] **C1** `server/src/terminal.ts:39` — PTY inherits full `process.env` → secrets exposed (`env` leak). Filter to safe vars only.
- [x] **C2** `server/src/memory/MemoryRepository.ts:106` — SQL injection via LIMIT string interpolation `${opts.limit}`. Parameterize: `LIMIT @limit`.
- [x] **C3** `server/src/memory/MemoryRepository.ts:216-226` — No retention enforcement; `maxMemories` never checked. Add purge on insert.

### Streaming — Fix immediately

- [x] **C4** `server/src/proxy.ts:79` — SSE killed after 30s (`AbortSignal.timeout`). Remove/extend for SSE.
- [x] **C5** `server/src/n9routerChat.ts:307-419` — Upstream HTTP connection leak on client disconnect. Wire `c.req.raw.signal`.
- [x] **C6** `server/src/n9routerChat.ts:217-252,582-583` — Full SSE body buffered in RAM before forwarding. Stream-through for non-tool-call path.

### React Rendering — Fix immediately

- [ ] **C7** `ui/src/pages/Chat.tsx:32-37` — `useServerStore(s=>s.active())` returns new ref every render → cascade re-render. Select primitives + useMemo.
- [ ] **C8** `ui/src/App.tsx:11-18` — All 8 pages eagerly imported. Wrap in `React.lazy()` + `<Suspense>`.
- [ ] **C9** `ui/vite.config.ts:57-60` — No `manualChunks`; single vendor chunk >1MB. Add chunk splitting.
- [ ] **C10** `ui/src/components/MarkdownContent.tsx` — `rehype-highlight` loads full highlight.js (~200KB). Replace with `rehype-pretty-code`.

### Data Safety — Fix immediately

- [ ] **C11** `server/src/memory/MemoryRepository.ts:43, EmbeddingRepository.ts:22,129` — `JSON.parse()` without try/catch → 500 on corrupt data. Add `safeJsonParse`.
- [ ] **C12** `server/src/memory/memoryDb.ts:25-34` — No migration versioning; `SCHEMA_VERSION` stored but never checked. Add version-gated migrations.
- [ ] **C13** UI Chat.tsx — SSE subscription re-starts on every `server` ref change (cascade from C7). Pass stable primitive to SSE hook.
- [ ] **C14** `ui/src/pages/Terminal.tsx:140-155` — setTimeout-based DOM render race with xterm. Use `useLayoutEffect` + ref callback.
- [ ] **C15** `ui/src/pages/Terminal.tsx:42-54,228-233` — xterm instances leak across HMR (fast refresh). Dispose in cleanup before re-creation.
- [ ] **C16** `server/src/index.ts:60` — Rate limit bypass via spoofed `X-Forwarded-For`. Use `cf-connecting-ip` / `x-real-ip` / remote address.
- [ ] **C17** `server/src/terminal.ts:61` — Silent data loss under backpressure; no drain-event recovery. Add drain-aware write queue.
- [ ] **C18** `server/src/terminal.ts:75,154,162` — Unprotected `ws.send()` calls → crash on bad WebSocket state. Wrap in try/catch.
- [ ] **C19** `server/src/terminal.ts:49-56` — Heartbeat interval leaked if `onExit` never fires. Store timer on session object; clear in `killSession()`.

---

## SPRINT 2 — HIGH (48 findings)

### Security & Auth

- [ ] **H1** `server/src/n9routerChat.ts:328-331,571-572` — N9ROUTER_API_KEY leaked in upstream error `detail`. Redact; log server-side only.
- [ ] **H2** `server/src/git.ts:139-153` — Git push allows arbitrary remote push with no guard. Add feature flag + branch protection.
- [ ] **H3** `server/src/terminal.ts:119-141` — No origin validation on terminal WebSocket. Add `Origin` header check.
- [ ] **H4** `server/src/terminal.ts:143-159` — No session ownership binding. Bind session creator to per-session token.
- [ ] **H5** `server/src/proxy.ts:42-53` — Proxy forwards `Authorization` to upstream after stripping pilot token. Only forward non-pilot auth.
- [ ] **H6** `server/src/memory/memoryRouter.ts:162-168` — Export uses `limit: 999999` (effectively unbounded). Cap at 10,000.
- [ ] **H7** `server/src/memory/memoryRouter.ts:188-315` — Import accepts arbitrary JSON with weak validation. Add max size + field validation.
- [ ] **H8** `server/src/memory/memoryRouter.ts:55,101-102` — No validation of limit/offset query params (NaN, negative, float). Add `clamp` + `isNaN` check.
- [ ] **H9** `server/src/index.ts:75-84` — CORS origins from env allows `*`. Validate not wildcard when `credentials: true`.
- [ ] **H10** `server/src/terminal.ts:39` — `process.env as Record<string,string>` loses `undefined` type info. Filter undefined entries.
- [ ] **H11** `server/src/n9routerChat.ts:331,572` — `status as any` circumvents Hono typing. Use `StatusCode` from `hono/utils/http-status`.
- [ ] **H12** `tsconfig.opencode.json:9` — `noImplicitAny: false` in plugin layer. Remove override; fix resulting errors.

### SQLite & Data

- [ ] **H13** `server/src/memory/MemoryRepository.ts:102,106` — `LIMIT -1` when `limit` is 0/NaN/undefined → full table scan. Validate + hard cap.
- [ ] **H14** `server/src/memory/schema.ts:115` — Missing composite index for `ORDER BY is_pinned DESC, updated_at DESC`. Add index.
- [ ] **H15** `server/src/memory/TimelineRepository.ts:50-63` — Timeline has no retention policy. Add age-based purge.
- [ ] **H16** `server/src/memory/memoryDb.ts:17-37` — First memory request pays full DB init + migration cost. Eager init at startup.
- [ ] **H17** `server/src/memory/memoryRouter.ts:212-281` — Per-row INSERT in import (no transaction). Wrap in `db.transaction()`.
- [ ] **H18** `server/src/db.ts:64,88,94; memory/*.ts` — Unsafe SQLite result casts (`as MemoryRow[]`). Add Zod validation or branded assertions.

### Terminal & Streaming

- [ ] **H19** `server/src/tunnel.ts:63` — No SIGKILL fallback for hung cloudflared. Add 5s timeout then SIGKILL.
- [ ] **H20** `ui/src/services/sse.ts:129` — Stale setTimeout not cleared in cleanup. Store timer ID in ref; clear on unmount.
- [ ] **H21** `ui/src/services/useChatStream.ts:82` — `abortRef` overwritten by concurrent `startStream`. Check before overwriting; abort previous.
- [ ] **H22** `ui/src/services/useChatStream.ts:80/140` — Race condition on `streaming` boolean. Use ref counter (`streaming = counter > 0`).
- [ ] **H23** `ui/src/pages/Terminal.tsx:116` — `onData` listener never cleaned up per tab (only on dispose). Store disposable; dispose on re-connect.
- [ ] **H24** `ui/src/services/sse.ts:97-99` — Infinite retry for non-auth errors (no max count). Add max retries (e.g., 20).
- [ ] **H25** `ui/src/services/useChatStream.ts` — No read timeout for hanging streams. Add watchdog timer (abort if no data for 60s).
- [ ] **H26** `server/src/n9routerChat.ts:315,555` — No keep-alive agent for n9router upstream. Add `http.Agent({ keepAlive: true })`.

### React Rendering & State

- [ ] **H27** `ui/src/components/MessageList.tsx:271-350` — No virtualization; all turns re-render on every SSE event. Add `react-window` or `@tanstack/virtual`.
- [ ] **H28** `ui/src/components/CodeMirrorViewer.tsx:162-171` — Full state recreation on filename change. Reconfigure extensions instead.
- [ ] **H29** `ui/src/components/CodeMirrorViewer.tsx:145` — Mount effect empty deps; stale content flash. Include `content` in deps or use ref pattern.
- [ ] **H30** `ui/src/components/Layout.tsx:112-122` — NavLink/MobileNavLink not `React.memo`'d → 14+ re-renders per route change.
- [ ] **H31** `ui/src/store/session.ts:96-120` — `upsertPart` creates new `parts` array on every SSE chunk → cascading re-renders. Use `immer` middleware.
- [ ] **H32** `ui/src/store/server.ts:58` — `active()` returns new object every call → re-render cascade (root cause of C7). Use `useShallow` or precomputed `activeServer`.
- [ ] **H33** `ui/src/store/session.ts:97-120` — O(n×m) linear scan on every SSE event. Replace turns array with `Map<messageId, Turn>`.

### API Contracts & Types

- [ ] **H34** Multiple files — Three different error response shapes across API. Standardize to one error contract.
- [ ] **H35** `server/src/memory/memoryRouter.ts:330-336` — PATCH memory returns stale data (fetched before update). Re-fetch after `updateMemory()`.
- [ ] **H36** `shared/src/types.ts` vs `server/schema.ts` vs `ui/plugin/schema.ts` — Memory types duplicated 3×. Move to `shared/`.
- [ ] **H37** `shared/src/types.ts` vs `tunnel.ts` — `N9RouterTunnelStatus` dead type; server returns different shape. Align or remove.
- [ ] **H38** `SessionTags.updatedAt` — Server uses `unixepoch()` (seconds) but shared type says `number` (ms). Normalize to ISO string or unify units.
- [ ] **H39** `shared/src/types.ts:39,208` — Discriminated unions defeated by `| string` fallback. Remove `| string` or change to just `string`.
- [ ] **H40** `server/src/index.ts:262` — `httpServer as import("node:http").Server` — unsafe cast. Use actual return type or minimal interface.

### Test Coverage

- [ ] **H41** `server/src/auth.ts` — Zero tests for auth middleware (critical security boundary). Add unit tests: token match/mismatch/missing.
- [ ] **H42** `server/src/terminal.ts` — 202 lines, zero tests for WebSocket/PTY lifecycle. Add integration tests with mock ws + pty.
- [ ] **H43** `ui/src/services/useChatStream.ts` — 166 lines, zero tests. Add unit tests: streaming, XML strip, abort, error, [DONE].
- [ ] **H44** `ui/src/services/n9routerChat.ts` — Chat client zero tests. Add tests: success stream, 401, 502.
- [ ] **H45** `ui/src/services/crypto.ts` — 190 lines, zero tests for AES-GCM encrypt/decrypt. Add round-trip, corruption, key persistence tests.
- [ ] **H46** `server/src/push.ts` — 123 lines, zero tests. Add Hono integration tests for subscribe/status/broadcast.
- [ ] **H47** `server/src/tools/toolExecutor.ts` — 170 lines, zero tests. Add file read, search, path traversal guard tests.
- [ ] **H48** `server/src/rateLimit.ts` — Zero isolated tests. Add prefix matching + 429 behavior tests.

---

## SPRINT 3 — MEDIUM (50 findings)

### Security & Config

- [ ] **M1** `server/src/memory/MemoryRepository.ts:193-198` — FTS5 sanitization incomplete (operators pass through). Escape/reject reserved chars.
- [ ] **M2** `server/src/memory/memoryRouter.ts:188-315` — Import silently drops malformed rows. Return skipped count + error messages.
- [ ] **M3** `server/src/index.ts:75-84` — CORS origins validation: log warning if `*` configured with credentials.
- [ ] **M4** `server/src/debugLog.ts:28` — Debug middleware logs paths after auth; redact query params.
- [ ] **M5** `server/src/memory/memoryRouter.ts` — Route param `serverId`/`sessionId` not validated for UUID shape. Add format middleware.
- [ ] **M6** `server/src/memory/memoryRouter.ts` — No rate limiting on import/export endpoints specifically.

### SQLite & Storage

- [ ] **M7** `server/src/memory/memoryDb.ts:21` — No WAL checkpoint management. Add `wal_autocheckpoint` pragma + periodic checkpoint.
- [ ] **M8** `server/src/memory/EmbeddingRepository.ts:117-122` — Semantic search silently truncated at 100 embeddings. Make limit configurable.
- [ ] **M9** `server/src/memory/schema.ts:67-78` vs `MemoryRepository.ts:216-226` — Config defaults duplicated. Single source of truth.
- [ ] **M10** `server/src/memory/similarity.ts:7` — Vector dimension mismatch returns 0 silently. Log warning or throw.

### Streaming & Terminal

- [ ] **M11** `server/src/proxy.ts:200-204` — Non-SSE proxied streams: no client-disconnect abort. Wire context abort signal.
- [ ] **M12** `server/src/n9routerChat.ts:341/414` — Duplicate Content-Type/Connection headers. Remove redundant `c.header()` calls.
- [ ] **M13** `ui/src/pages/Terminal.tsx:140` — setTimeout not tracked for cleanup on unmount. Store ID in ref; clear on unmount.
- [ ] **M14** `ui/src/services/useChatStream.ts` — No read timeout for hanging streams. Add watchdog timer.
- [ ] **M15** `server/src/index.ts:78-84` — CORS middleware runs on all routes including `/health`. Scope to `/api/*` (negligible; skip).

### React Rendering & State

- [ ] **M16** `ui/src/store/connectivity.ts:14-21` — Module-level event listeners never cleaned up (HMR leak). Move to component effect.
- [ ] **M17** `ui/src/components/ChatMessage.tsx:22` — Not `React.memo`'d. Wrap in memo.
- [ ] **M18** `ui/src/components/MarkdownContent.tsx:11-21` — Re-parses markdown every render. Memo with string comparison; static plugin arrays.
- [ ] **M19** `ui/src/components/DebugPanel.tsx:21-30` — Keyboard handler re-attaches on every toggle. Use `useRef(onToggle)` pattern.
- [ ] **M20** `ui/src/App.tsx:24-30,37` — Double ErrorBoundary nesting. Remove inner per-route boundaries.
- [ ] **M21** `ui/src/components/Layout.tsx:255-265` — Inline `<style>` tag in render. Move to CSS or `useEffect` injection.
- [ ] **M22** `ui/src/store/session.ts:129-136` — `removePart()` missing `sessionID` guard → wrong session's part removable.

### API Contracts & Types

- [ ] **M23** `server/src/memory/memoryRouter.ts:330-336` — PATCH memory returns stale data. Re-fetch after update (duplicate with H35, fix once).
- [ ] **M24** `server/src/memory/memoryRouter.ts` — POST memory has no request body validation. Add schema validation.
- [ ] **M25** `server/src/sessionTags.ts` — PUT session-tags: no request validation; silently swallows unexpected fields.
- [ ] **M26** `shared/src/types.ts:166` — Catch-all SSE event type prevents exhaustive checking. Remove or narrow.
- [ ] **M27** `server/src/memory/memoryRouter.ts:13-14,20-21` — Duplicate route doc comments. Remove duplicates.
- [ ] **M28** `shared/src/types.ts:88,137` — `input?: unknown`, `metadata?: Record<string, unknown>`. Narrow if possible.

### TypeScript Quality

- [ ] **M29** `server/src/proxy.ts:200-204` — `.pipeTo()` not awaited; error swallowed. Wire AbortController.
- [ ] **M30** `server/src/terminal.ts:180` — Non-null assertion `sessionId!` inside callback. Use explicit guard.
- [ ] **M31** Multiple repositories — Missing explicit return type annotations on exported functions. Add annotations.
- [ ] **M32** `ui/src/services/n9routerChat.ts:48` — `body` is `any` from `res.json()`. Add type assertion.
- [ ] **M33** `ui/src/components/CodeMirrorViewer.tsx:144-145` — `eslint-disable` on effect deps. Use ref-based init pattern.

### Performance

- [ ] **M34** `ui/src/*` — No debounce/throttle utility in project. Add `useDebounce` hook.
- [ ] **M35** `ui/package.json` — `diff2html` (~150KB) eagerly loaded. Lazy-load when navigating to `/diff`.
- [ ] **M36** `ui/package.json` — `qrcode` (~50KB). Lazy-load.
- [ ] **M37** Server — No response compression (`Content-Encoding: gzip`). Add Hono `compress()` middleware.
- [ ] **M38** `server/src/memory/memoryRouter.ts:341,349` — DELETE route ordering fragile (must register `/all` before `/:id`). Add explicit guard.

### Test Quality

- [ ] **M39** `ui/src/__tests__/sw.test.ts` — Vacuous test (`expect(true).toBe(true)`). Add real tests or remove.
- [ ] **M40** `ui/src/pages/__tests__/SimpleChat.test.tsx` — Only 2 tests; missing streaming/error/retry. Extend coverage.
- [ ] **M41** `ui/src/store/connectivity.ts` — Zero tests. Add store tests for online/offline.
- [ ] **M42** `ui/src/services/__tests__/sse.test.ts` — Fragile `flush()` microtask dance. Replace with deterministic promise await.
- [ ] **M43** `ui/src/pages/__tests__/Memory.test.tsx` — Overly mocked; no real behavior tested. Add integration tests.
- [ ] **M44** Multiple UI test files — `global.fetch` mock leaks across tests. Centralize in jest setup or MSW.
- [ ] **M45** `server/jest.config.cjs` — No `coverageThreshold`. Add branches=60, functions=60, lines=65.
- [ ] **M46** `ui/jest.config.cjs` — Coverage excludes components and pages. Extend `collectCoverageFrom`.
- [ ] **M47** E2E — No auth flow E2E. Add: token setup → authorized request → revoke → 401.
- [ ] **M48** E2E — No chat send/receive E2E. Add: type → submit → wait SSE → verify rendered content.
- [ ] **M49** E2E — No memory CRUD E2E. Add: create → list → search → delete → verify removed.
- [ ] **M50** E2E — No rate limiting E2E. Add: rapid requests → 429 → wait → recovery.

---

## SPRINT 4 — LOW (29 findings)

### Security & Config (defense-in-depth)

- [ ] **L1** `server/src/index.ts:87` — Health endpoint leaks version string. Move to env var or remove.
- [ ] **L2** `server/src/tunnel.ts:69-78` — Tunnel status shows error details (paths, flags). Redact before returning.
- [ ] **L3** `server/src/db.ts:12; memoryDb.ts:20-21` — Two separate DB handles to same `pilot.db`. Share one handle.
- [ ] **L4** `server/src/auth.ts:48-52` — `WWW-Authenticate` missing realm. Use `Bearer realm="Pilot"`.
- [ ] **L5** `server/src/sessionTags.ts:46-48` — PUT session-tags re-reads DB unnecessarily. Return from `setSessionTags`.
- [ ] **L6** `server/src/n9routerChat.ts:495,585-612` — `MAX_TOOL_ROUNDS` loop control never increments (vestigial). Remove unused var.
- [ ] **L7** `server/src/n9routerChat.ts:499` — No request body size validation on chat endpoint. Validate token count.

### Streaming & Terminal (edge cases)

- [ ] **L8** `server/src/terminal.ts:188` — Dead code: `if (session.pty)` always true. Remove guard.
- [ ] **L9** `server/src/proxy.ts:110` — Unbounded `lineBuffer` for malformed input. Add cap.
- [ ] **L10** `server/src/tunnel.ts` — Stdio streams not destroyed on process exit. Trivial; auto-GC'd.
- [ ] **L11** `ui/src/pages/Terminal.tsx:228-233` — `ws.close()` during CONNECTING state. Add abort of connection attempt.

### React Rendering (micro-optimizations)

- [ ] **L12** `ui/src/components/PromptInput.tsx:16-25` — `submit` useCallback depends on `text` (every keystroke). Use `useRef(text)` pattern.
- [ ] **L13** `ui/src/store/server.ts:56-58` — `active()` returns new reference each call. Cache or add shallow-equality check.
- [ ] **L14** `ui/src/store/log.ts:17-26` — localStorage persistence is synchronous during init. Defer; throttle persistence.
- [ ] **L15** `ui/src/components/CodeMirrorViewer.tsx:117` — Magic index 5 for `oneDark` theme. Use `push` or conditional include.

### TypeScript (polish)

- [ ] **L16** Root — No root `tsconfig.json` with project references. Add composite project.
- [ ] **L17** `ui/tsconfig.json:11-12` — Two path aliases resolve to same file. Remove redundant alias.
- [ ] **L18** `server/src/memory/EmbeddingRepository.ts:22,129` — `JSON.parse(...) as number[]` unvalidated. Validate with guard.
- [ ] **L19** `server/src/memory/MemoryRepository.ts:43` — `JSON.parse(...) as string[]` unvalidated. Validate with guard.
- [ ] **L20** `shared/src/types.ts` — `[key: string]: unknown` on `ChatCompletionRequest`. Use `Record<string, unknown>`.
- [ ] **L21** `ui/vite.config.ts:38-45` — `bypass` callback uses manual regex — fragile routing. Use Hono sub-app.

### Performance (micro)

- [ ] **L22** `server/src/index.ts:131-144` — 13 separate `app.all()` proxy routes. Consolidate to wildcard patterns.
- [ ] **L23** `ui/src/services/useChatStream.ts:93-101` — String copy per SSE chunk. Use offset tracking.
- [ ] **L24** `server/src/terminal.ts:59-69` — Broadcast loop on empty client sets. Early return on empty.
- [ ] **L25** `server/src/index.ts:185-217` — Sync I/O per static file request. Use `serveStatic` for catch-all.

### E2E Gaps

- [ ] **L26** E2E — No push notification E2E. Add: status → subscribe → persistence → unsubscribe.
- [ ] **L27** E2E — No SSE reconnect E2E. Add: connect → restart server → verify reconnection.
- [ ] **L28** E2E — No session tags CRUD E2E. Add: create session → add tags → filter → delete tags.
- [ ] **L29** E2E — No terminal interaction E2E. Add: open terminal → type command → verify output.

---

## VERIFICATION COMMANDS

```bash
# Server
npm run typecheck -w server && npm run test -w server
# UI
npm run typecheck -w ui && npm run test -w ui
# Shared
npm run typecheck -w shared
# Cross-package
npm run typecheck && npm run build
# E2E
npm run test:e2e
# Full
npm run typecheck && npm run build && npm run test:coverage && npm run test:e2e
```

---

## STATS

| Wave | Reviewers | Critical | High | Medium | Low |
|------|-----------|----------|------|--------|-----|
| 1 — Security | security-auditor, sqlite-memory, terminal-stream | 6 | 19 | 19 | 14 |
| 2 — Quality | ui-render, api-contract, typescript | 11 | 18 | 12 | 10 |
| 3 — Coverage/Perf | test-strategist, performance-reviewer | 0 | 11 | 16 | 14 |
| Follow-ups | api-contract, typescript-ui, perf-selective | 0 | 2 | 7 | 5 |
| **TOTAL** | 11 agents | **19** | **50** | **54** | **43** |

---

*Invoke `/` in any opencode session to read this tracker and find the next unfinished task.*

---

## WAVE 5 — 14-Agent Deep Audit (2026-05-20)

**Reviewers:** orchestrator, api-contract-reviewer, architect, code-reviewer, context-scout, docs-scout, e2e-runner, performance-reviewer, security-auditor, sqlite-memory-reviewer, terminal-stream-reviewer, test-strategist, typescript-reviewer, ui-render-reviewer, workflow-profiler

### New Critical (5 — add to SPRINT 1)

- [ ] **C20** `.opencode/plugins/build-log-compressor.ts:79-86` — BuildLogCompressor fires on non-bash READ outputs matching Playwright keywords → destroys agent .md definitions (orchestrator.md compressed to RTK stub). Gate: `if (input.tool !== "bash") return null;`
- [ ] **C21** `.opencode/plugins/rtk-compressor.ts:18` — COMPRESS_THRESHOLD=500 too low → unnecessary compression of small files. Raise to 2000 + exclude .opencode/agents/rules/*.md.
- [ ] **C22** `server/src/tools/toolExecutor.ts:59-92` — Command injection via `spawnSync("rg")` with user-controlled pattern. `--include=*.env` could leak secrets. Sanitize pattern + use `--` separator. Remove grep fallback entirely.
- [ ] **C23** `server/src/memory/MemoryRepository.ts:104-111` — Race condition: retention delete is non-atomic read-then-delete. Wrap in `db.transaction()`.
- [ ] **C24** `server/src/terminal.ts:90-108` — PTY `onData` iterates `session.clients` Set while `ws.send()` can trigger `ws.on("close")` mutation during iteration. Snapshot before iterating: `[...session.clients]`.

### New High (6 — add to SPRINT 2)

- [ ] **H49** `server/src/proxy.ts:82` — SSRF via upstream proxy: `openCodeUrl` not validated. Attacker-controlled env var → open SSRF proxy. Validate scheme (https only), reject RFC1918/loopback.
- [ ] **H50** `server/src/auth.ts:55-65` — Timing attack on bearer token: `===` comparison not constant-time. Use `crypto.timingSafeEqual()`.
- [ ] **H51** `server/src/terminal.ts:203-208` — PTY process NOT killed after "Session not found" path. Auto-created session leaks with zero clients.
- [ ] **H52** `server/src/proxy.ts:80-81` — SSE streams have NO timeout → connection hangs forever if upstream stops responding. Add 300s idle timeout.
- [ ] **H53** `server/src/proxy.ts:203-207` — Stream pipe error silently swallowed → client left hanging. Close readable on error.
- [ ] **H54** `ui/src/services/api.ts:86` vs `server/src/index.ts:91` — UI calls GET /global/health but server registers GET /health. Health check unreachable when upstream unavailable.

### New Medium (10 — add to SPRINT 3)

- [ ] **M51** `server/src/memory/MemoryRepository.ts:209-227` — FTS5 query injection: sanitization strips only `'` and `"`. FTS5 operators (AND, OR, NOT, NEAR) pass through → potential DoS via expensive queries.
- [ ] **M52** `server/src/memory/MemoryRepository.ts:122-123` — Unbounded list: `opts.limit ?? -1` → full table scan. Hard-cap at 1000.
- [ ] **M53** `server/src/memory/EmbeddingRepository.ts:109-138` — Semantic search hard-capped at 100 embeddings → silent recall loss for large servers.
- [ ] **M54** `server/src/memory/memoryRouter.ts:51-57` — `parseInt(limitQ, 10)` → NaN for non-numeric input passes through as undefined → returns ALL records.
- [ ] **M55** `server/src/memory/memoryRouter.ts:162-184` — Export `limit: 999999` unbounded. Cap or paginate.
- [ ] **M56** `server/src/index.ts:33-36` — Error detail leak in global handler: `detail: message` exposes internal paths/DB errors to client.
- [ ] **M57** `server/src/index.ts:165-172` — Error detail leak in terminal/sessions handler. Same pattern.
- [ ] **M58** `ui/src/services/api.ts:81` — `return (await res.text()) as unknown as T` — unsafe double-cast, zero type safety.
- [ ] **M59** `tsconfig.opencode.json:9` — `noImplicitAny: false` overrides `strict: true` in plugin layer.
- [ ] **M60** `ui/tsconfig.test.json:4-5` — `strict: false` + `noImplicitAny: false` → test files have zero type safety.

### New Low (8 — add to SPRINT 4)

- [ ] **L30** `server/src/db.ts:12` — DB connection created at module import with no error handling. Lazy init like memoryDb.ts.
- [ ] **L31** `server/src/memory/memoryDb.ts:17-18` — No `closeMemoryDb()` export. Add for testing.
- [ ] **L32** `server/src/memory/MemoryRepository.ts:100-101` — Archived memories never counted for retention → accumulate forever.
- [ ] **L33** `server/src/index.ts:193-220` — Symlink path traversal in static file serving. Use `realpathSync`.
- [ ] **L34** `server/src/terminal.ts:220-247` — No WebSocket message rate limiting. Floodable.
- [ ] **L35** `ui/src/store/connectivity.ts:14` — Module-level event listeners never cleaned up (HMR leak).
- [ ] **L36** `ui/src/components/Layout.tsx:108` — Two separate useServerStore selectors → 2+ re-renders per change.
- [ ] **L37** `ui/src/sw.ts:9` — No `skipWaiting()` → SW activation waits for next navigation.

---

## UPDATED STATS

| Wave | Reviewers | Critical | High | Medium | Low |
|------|-----------|----------|------|--------|-----|
| 1 — Security | security-auditor, sqlite-memory, terminal-stream | 6 | 19 | 19 | 14 |
| 2 — Quality | ui-render, api-contract, typescript | 11 | 18 | 12 | 10 |
| 3 — Coverage/Perf | test-strategist, performance-reviewer | 0 | 11 | 16 | 14 |
| 4 — Follow-ups | api-contract, typescript-ui, perf-selective | 0 | 2 | 7 | 5 |
| **5 — 14-Agent Deep** | orchestrator + 13 specialists | **5** | **6** | **10** | **8** |
| **GRAND TOTAL** | 15 agents | **24** | **56** | **64** | **51** |
| **FIXED (prev)** | | 6 | 0 | 0 | 0 |
| **REMAINING** | | **18** | **56** | **64** | **51** |

---

*See EXECUTION_FIXIT_PLAN.md for step-by-step agent-friendly fix instructions with exact code snippets and verification commands.*
