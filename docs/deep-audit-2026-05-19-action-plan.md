# Pilot Deep Audit — Priority Action Plan

**Created:** 2026-05-19 | **Source:** Deep audit findings from chat session  
**Purpose:** Agent-executable task list. Update status as tasks complete.  
**Usage:** `[ ] pending` → `[~] in_progress` → `[x] completed @YYYY-MM-DD`

---

## Status Legend

| Marker | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress (one at a time per phase) |
| `[x]` | Completed (append `@date` and PR/commit) |
| `[/]` | Blocked (note dependency) |

---

## Phase 0 — Critical Bugs (Fix before ANY other work)

**Completion gate:** All 7 tasks checked, `npm run typecheck` clean.

### TASK C2 [ ] Fix XML filter concurrency — switch n9routerChat.ts to per-instance filter

- **Files:** `server/src/n9routerChat.ts`
- **Risk:** Concurrent `POST /api/chat/completions` requests corrupt each other's XML filtering. Data corruption on 2+ users.
- **Agent:** `implementer` (edit-capable, understands TypeScript)

**What to change:**

1. **DELETE lines 24-27** (module-level globals `_xmlDepth`, `_xmlTagBuf`, `_inTag`, `MAX_TAG_BUF`).
2. **DELETE function `filterXmlContent`** (lines ~118-195) — the global-state version.
3. **DELETE function `resetXmlFilter`** (lines ~195-200) — no longer needed.
4. **In `rawSSEToResponse`** (~line 348-392): Replace `resetXmlFilter()`/`filterXmlContent()` with instance from `createXmlFilter()`:
   ```
   const xmlFilter = createXmlFilter();
   // then: xmlFilter.filter(chunk) on each chunk
   ```
5. **In `streamFromN9router`** (~line 397-509): Same replacement — one `XmlFilter` per stream.
6. **In `readSSEStream`** (if it uses globals): Same pattern.
7. **KEEP** `XML_TOOL_TAGS` constant (lines 30-35) and `createXmlFilter()` (lines 46-97) — they are correct.
8. Verify NO remaining references to `filterXmlContent`, `resetXmlFilter`, `_xmlDepth`, `_xmlTagBuf`, `_inTag`.

- **Verification:** `npm run typecheck -w server && npm run test -w server 2>&1 | tail -5`

---

### TASK C3 [ ] Fix broken Stop button — wire AbortController

- **Files:** `ui/src/services/useChatStream.ts`, `ui/src/pages/SimpleChat.tsx`
- **Risk:** Stop button is a no-op. Streaming cannot be cancelled.
- **Agent:** `implementer`

**What to change:**

**A. `ui/src/services/useChatStream.ts`:**
   - Add optional `abortController` param to `startStream()`:
     ```
     async (reader, callbacks, abortController?: AbortController) => {
       if (abortController) abortRef.current = abortController;
       ...
     }
     ```
   - In `finally` block: `abortRef.current = null;`

**B. `ui/src/pages/SimpleChat.tsx` (line 207):**
   - Pass `abortController` as 3rd arg: `await startStream(reader, { ... }, abortController);`

- **Verification:** `npm run typecheck -w ui && npm run test -w ui 2>&1 | tail -5`

---

### TASK C1 [ ] Fix shell command injection in toolExecutor

- **Files:** `server/src/tools/toolExecutor.ts`
- **Risk:** LLM-generated search patterns containing `$()`, backticks, `;`, `|`, `&&` execute arbitrary shell commands via `execSync`.
- **Agent:** `implementer`

**What to change:**

Replace `execSync` calls at lines 59-69 (rg) and 81-82 (grep) with `spawnSync` using array args — never interpolate user input into a shell string.

```
// OLD: execSync(`rg ... "${pattern}" ...`, ...)
// NEW: spawnSync("rg", ["--line-number", ..., pattern, relPath], ...)
```

IMPORTANT: `spawnSync` does NOT throw on non-zero exit — check `result.status !== 0` instead. Exit code 1 from rg means "no matches".

- **Verification:** `npm run typecheck -w server && npm run test -w server 2>&1 | tail -5`

---

### TASK C5 [ ] Fix dangerouslySetInnerHTML XSS in ChatMessage

- **Files:** `ui/src/components/ChatMessage.tsx`
- **Risk:** Persistent XSS — model output containing `<script>alert(1)</script>` executes in user context.
- **Agent:** `implementer`

**What to change:**

Replace the custom `renderMarkdown` function (lines ~25-102) that uses `dangerouslySetInnerHTML` with `react-markdown` (already imported elsewhere in the project at `MarkdownContent.tsx`).

Preferred approach:
```typescript
import ReactMarkdown from "react-markdown";
// Replace the list/p rendering with:
<ReactMarkdown>{message.content}</ReactMarkdown>
```

Keep existing styling: `fontFamily: fonts.sans, fontSize: fontSizes.md, lineHeight: 1.6, color: colors.text` applied to the wrapper.

- **Verification:** `npm run typecheck -w ui && npm run test -w ui 2>&1 | tail -5`

---

### TASK C7 [ ] Add PTY WebSocket heartbeat + stale client cleanup

- **Files:** `server/src/terminal.ts`
- **Risk:** Zombie WebSocket entries grow forever. Dead connections waste CPU on every keystroke broadcast.
- **Agent:** `implementer`

**What to change:**

1. After `session.clients = new Set()` (~line 46), add 30s heartbeat interval that removes CLOSED/CLOSING clients.
2. In `proc.onExit`, call `clearInterval(heartbeatInterval)`.
3. In `proc.onData` broadcast, wrap `ws.send(data)` in try/catch — remove on failure.
4. In `ws.on("message")` handler (~line 173), add max message size check: `if (msg.toString().length > 1_048_576) return;`

- **Verification:** `npm run typecheck -w server && npm run test -w server 2>&1 | tail -5`

---

### TASK C4 [ ] Remove live API key from opencode.json

- **Files:** `.env` (verify gitignore), `docker/.env` (verify gitignore), `opencode.json`
- **Risk:** Live n9router API key in plaintext on disk in three locations.
- **Agent:** `implementer`

**What to change:**

1. Verify `.env` and `docker/.env` are gitignored: `grep "^.env" .gitignore`, `grep "docker/.env" .gitignore`
2. Search opencode.json for `N9ROUTER_API_KEY` or `n9r_` — replace value with placeholder `<your-api-key>`

- **Verification:**
  ```bash
  grep -r "n9r_" opencode.json 2>/dev/null && echo "KEY STILL PRESENT" || echo "KEY REMOVED"
  git check-ignore .env && echo ".env gitignored"
  git check-ignore docker/.env && echo "docker/.env gitignored"
  ```

---

### TASK C8 [ ] Remove better-sqlite3 from ui/package.json

- **Files:** `ui/package.json`
- **Risk:** Native C++ addon in browser package — install bloat, misleading dependency.
- **Agent:** `build-fixer`

**What to change:**

Remove from `devDependencies`:
```json
"@types/better-sqlite3": "^7.6.13",
"better-sqlite3": "^12.10.0",
```

- **Verification:** `npm run typecheck -w ui && npm run test -w ui 2>&1 | tail -5`

---

## Phase 1 — High Priority (After Phase 0 completes)

**Completion gate:** All Phase 0 tasks `[x]`, typecheck clean.

### TASK H1 [ ] Timing-safe auth comparison

- **Files:** `server/src/auth.ts` (line 33)
- **Agent:** `implementer`
- **Change:** Replace `===` with `crypto.timingSafeEqual()`. Create `Buffer` from both values, compare lengths first, then use constant-time comparison.
- **Verification:** `npm run typecheck -w server && npm run test -w server`

### TASK H2 [ ] Strip error detail from production responses

- **Files:** `server/src/index.ts:36`, `server/src/n9routerChat.ts:421`
- **Agent:** `implementer`
- **Change:** Remove `detail` field from client error responses. Log `detail` server-side via `console.error` only. Return generic `{ error: "Internal Server Error" }` to clients.
- **Verification:** `npm run typecheck -w server && npm run test -w server`

### TASK C6 [ ] Add tests for tool calling + XML filter

- **Files:** Create `server/src/tools/__tests__/toolExecutor.test.ts`, `server/src/tools/__tests__/toolDefinitions.test.ts`, add to `server/src/__tests__/n9routerChat.test.ts`
- **Agent:** `implementer` (write tests) then `tdd-verification` (verify coverage)
- **Coverage targets:**
  - `createXmlFilter()`: partial tags, nested tags, self-closing, unknown tags pass-through
  - `accumulateToolCalls()`: streaming chunks, multiple tool calls, partial args
  - `handleToolCalls()`: tool execution, result assembly
  - `executeToolCall()`: all 4 tools, unknown tool, path traversal blocking, file not found, file too large
  - `readSSEStream()`: partial SSE lines, malformed JSON, `[DONE]` termination
- **Verification:** `npm run test -w server 2>&1 | tail -5`

---

## Phase 2 — Medium Priority (This sprint)

### TASK M1 [ ] Fix toolRound dead code

- **Files:** `server/src/n9routerChat.ts:586,685-691`
- **Agent:** `implementer`
- **Change:** Either implement multi-round tool calling OR remove `MAX_TOOL_ROUNDS`, `toolRound`, and dead branch at 685-691. If single-round intentional, add comment.

### TASK M19 [ ] Extract shared chat abstractions (SimpleChat ↔ Chat)

- **Files:** `ui/src/pages/SimpleChat.tsx`, `ui/src/pages/Chat.tsx`
- **Agent:** `implementer`
- **Scope:** Extract shared `useChatStream` hook, `MessageRenderer` component, `ChatInput` component.

### TASK H7 [ ] Fix O(n²) SSE chunk updates in SimpleChat

- **Files:** `ui/src/pages/SimpleChat.tsx:210-216`
- **Agent:** `implementer`
- **Change:** Replace `setMessages(prev => prev.map(...))` with `useReducer` or ref-based mutation + batched set on timer.

### TASK H8 [ ] Add message list virtualization

- **Files:** `ui/src/components/MessageList.tsx:344`
- **Agent:** `implementer`
- **Change:** Wrap message list in `react-window` `FixedSizeList` or `react-virtuoso`.

### TASK H9 [ ] Add rate limit Map eviction

- **Files:** `server/src/index.ts:53`
- **Agent:** `implementer`
- **Change:** Add periodic `setInterval` sweep to delete entries older than `rateLimitWindow`.

### TASK H10 [ ] Cap proxy SSE line buffer

- **Files:** `server/src/proxy.ts:110`
- **Agent:** `implementer`
- **Change:** If `lineBuffer.length > 1_048_576`, flush as-is and reset.

### TASK H13 [ ] Standardize error response format

- **Files:** All server route files
- **Agent:** `architect` (plan) → `implementer` (execute)
- **Change:** Define `AppError` class with `code`, `status`, `message`. Create error middleware.

### TASK M20 [ ] Set server coverage thresholds

- **Files:** `server/jest.config.cjs`
- **Agent:** `build-fixer`
- **Change:** Add `coverageThreshold: { global: { branches: 60, functions: 60, lines: 65, statements: 65 } }`

### TASK M21 [ ] Add tests for useChatStream.ts

- **Files:** Create `ui/src/services/__tests__/useChatStream.test.ts`
- **Agent:** `implementer`

---

## Phase 3 — Low / Nice-to-Have (Backlog)

| Task | Description |
|------|-------------|
| L1 | Add CSP/X-Frame-Options/X-Content-Type-Options headers to `server/src/index.ts` |
| L2 | Add route-level `React.lazy()` code splitting in `ui/src/App.tsx` |
| L3 | Fix `window.innerWidth` in render → use `sidebarOpen` state (SimpleChat.tsx:557) |
| L4 | Add `.catch()` to `void hydrate()` in Settings.tsx:31 |
| L5 | Replace `health.test.ts` placeholder with real health check or delete file |
| L6 | Unify two SQLite connections (`db.ts` + `memoryDb.ts`) — pass shared `Database` |
| L7 | Remove `benchtest` barrel export from `.opencode/plugins/index.ts` |
| L8 | Wrap `ChatMessage` in `React.memo` |
| L9 | Memoize `MarkdownContent` — render plain text during streaming |
| L10 | Debounce `localStorage.setItem` in SimpleChat to 500ms or save on `visibilitychange` |
| L11 | Add structured logging with correlation IDs |
| L12 | Run `npm audit fix` for picomatch ReDoS (npm bundled dep) |
| L13 | Reconcile DESIGN.md auth section (claims cookies, uses Bearer) |

---

## How Agents Should Update This Document

When you complete a task:

1. Change the status marker: `[ ]` → `[x] completed @YYYY-MM-DD`
2. Add a one-line note under the task with:
   ```
   **Done:** <commit-hash> — <brief note>
   **Verification:** <test/typecheck result>
   ```
3. Do NOT reorder tasks or change task IDs.
4. Do NOT delete completed tasks — keep for audit trail.
5. If a task is blocked, mark `[/] blocked on <task-id>` instead of `[x]`.

Example:
```markdown
### TASK C2 [x] completed @2026-05-19 Fix XML filter concurrency
**Done:** a1b2c3d — Switched rawSSEToResponse + streamFromN9router to createXmlFilter() instances
**Verification:** typecheck ✅ / server tests 216/216 ✅
```
