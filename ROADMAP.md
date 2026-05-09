# Pilot Feature Roadmap

A comprehensive roadmap for Pilot — the native iOS client for OpenCode. This document maps what is currently implemented, what is planned, and what is explicitly out of scope.

---

## Current Features (Implemented)

### Core Chat

- [x] **Real-time message stream** — Bottom-aligned auto-scrolling FlatList with role headers (user>, opencode>, system>)
- [x] **SSE event streaming** — Subscribes to `/event` with `react-native-sse`, auto-reconnects with exponential backoff (500ms → 15s)
- [x] **Message parts rendering** — Text, reasoning, tool calls, file attachments, step-start/finish
- [x] **Fenced code blocks** — Inline code splitting with ``` delimiter, language detection from extension
- [x] **Lightweight syntax highlighting** — Custom tokenizer for TS/JS/Go/Rust/Python/Java/Kotlin/Swift/C/C++/JSON/YAML/Markdown/Bash (keywords, strings, comments, numbers)
- [x] **Code block actions** — Copy button + long-press to copy with haptic feedback
- [x] **Tool call display** — Collapsible by default, expand to see input/output, status icons (● / ✓ / ✗)
- [x] **Session status tracking** — idle / busy / error / aborted with colored dot indicator
- [x] **Abort handling** — Tap status spinner to abort busy session with heavy haptic
- [x] **Prompt input** — Auto-growing TextInput with `>` prefix, submit via button or keyboard
- [x] **Prompt toolbar** — `/` (slash commands), `@` (file mentions), send button
- [x] **Working directory injection** — Automatically prepends `[Working in: path]` to every prompt
- [x] **Token count display** — Shows total input+output tokens in status bar
- [x] **Empty state** — Styled placeholder with hints for `/` commands and `@` mentions

### Session Management

- [x] **Auto-resume last session** — Loads last session ID from SecureStore on boot
- [x] **Session picker modal** — List all sessions sorted by updated time, tap to switch
- [x] **Create new session** — "+ new" button creates session and prompts for working directory
- [x] **Delete sessions** — Long-press to delete with confirmation alert
- [x] **Session hydration** — Loads full message + parts when switching sessions
- [x] **Session reset** — Clears turns and state when switching servers

### File Browser

- [x] **Directory tree browsing** — Lazy-expand with `../` parent navigation
- [x] **File name search** — Fuzzy search via `/find/file?query=` with debounce (250ms)
- [x] **Text content search** — Ripgrep-powered text search via `/find?pattern=`
- [x] **File viewer modal** — Reads `/file/content?path=` with syntax highlighting
- [x] **Working directory sync** — Browser auto-navigates to selected workdir

### Diff Viewer

- [x] **Session-scoped diffs** — Fetches `/session/:id/diff` for current session
- [x] **Unified diff rendering** — Line-by-line with TUI green/red palette (+ green / − red)
- [x] **File list** — Shows per-file added/removed counts
- [x] **Diff detail view** — Tap file to expand full diff with horizontal scroll
- [x] **Pull-to-refresh** — RefreshControl to reload diffs

### Memory System

- [x] **Auto-extraction** — Watches `busy → idle` transitions, spawns shadow OpenCode session to extract memories from last 20 turns
- [x] **Auto-injection** — Prepends `[Memory Context — from previous sessions]` block to every prompt with top-5 relevant memories
- [x] **Semantic deduplication** — Cosine similarity threshold 0.92 against existing embeddings
- [x] **SQLite storage** — 6 tables: memories, embeddings, user_profile, timeline, providers, config (WAL mode, foreign keys)
- [x] **Category system** — 4 categories: preference, fact, code_pattern, decision
- [x] **Memory UI** — Browse, search (content + tags), filter by category, pin, archive, delete
- [x] **Drawer badge** — Live memory count badge with extraction spinner
- [x] **Embedding providers** — 8 providers, 37+ models:
  - Ollama (local, zero-config default: nomic-embed-text)
  - LM Studio (local)
  - OpenAI (text-embedding-3-small/large, ada-002)
  - Voyage AI (voyage-code-3 — best for code)
  - Jina AI (task-specific LoRA, 89 languages)
  - Mistral (fast, balanced)
  - OpenRouter (1 key → 25+ models, free tier)
  - Cohere (embed-v4.0 — 128K context)
- [x] **Secure API key storage** — Per-provider keys in expo-secure-store
- [x] **Per-server config isolation** — Each OpenCode server has independent memory config
- [x] **Memory card actions** — Pin (always injects), archive (soft hide), delete (permanent with alert)

### Permissions & Actions

- [x] **Inline permission cards** — Allow Once / Always / Deny buttons with haptic feedback
- [x] **Permission SSE events** — Listens for `permission.requested` and `permission.replied`
- [x] **Always remember** — `remember: true` for persistent permission grants
- [x] **Push notification actions** — Allow Once / Deny action buttons on permission push notifications

### Settings & Configuration

- [x] **Multi-server management** — Add, switch, remove servers with URL + optional basic auth
- [x] **Server setup screen** — First-run gate with health check validation
- [x] **Font size control** — 10–20px stepper in settings
- [x] **Push token display** — Copy Expo push token to clipboard
- [x] **Debug log** — Structured log store (100-entry ring buffer) with copy-to-clipboard
- [x] **Error badge** — Floating error count pill that navigates to settings log
- [x] **Version info** — Shows 0.1.0 in about section

### Slash Commands & Pickers

- [x] **Slash command modal** — Lists `/command` endpoints, filterable, with argument input
- [x] **@ mention modal** — File search picker, copies `@path` to clipboard
- [x] **Model picker modal** — Lists all providers/models from `/config/providers`, radio selection
- [x] **Agent picker modal** — Lists `/agent` endpoints, toggles build/plan mode
- [x] **Working directory sheet** — Bottom-sheet directory picker with breadcrumb navigation

### UI/UX

- [x] **TUI aesthetic** — JetBrains Mono font, dark theme (#0F0F0F background, #FFB454 accent)
- [x] **Drawer navigation** — Slide-over (~78% width), swipe-to-dismiss, 5 items + version footer
- [x] **Modal shell** — Full-screen TUI-style modals with SafeAreaProvider for notch handling
- [x] **Haptics** — Light impact on send, heavy on abort, success on copy
- [x] **Spinner** — Braille-pattern animated spinner matching OpenCode TUI
- [x] **Pills** — Model/agent chips in status bar with press-to-change
- [x] **Error boundary** — TUI-style crash screen with stack trace and reset button
- [x] **Top bar** — Session title (tappable), working directory (tappable), status dot (tappable)
- [x] **Keyboard avoiding view** — iOS padding behavior for prompt input

### Notifications

- [x] **Expo Push registration** — Request permissions, get token, persist to SecureStore
- [x] **Push notification relay** — Node.js relay (`relay/relay.js`) forwards SSE events to Expo Push API
- [x] **Event types pushed** — session.idle, session.error, permission.requested
- [x] **Action buttons** — "Allow Once" and "Deny" on permission notifications (background action)
- [x] **Deep link on tap** — Opens main TUI (basic)
- [x] **Notification category registration** — `PILOT_PERMISSION` category with action buttons

### State Management

- [x] **Zustand stores** — 4 stores: server, session, UI, log
- [x] **SecureStore persistence** — Servers, active server, last session, push token, workdir per session
- [x] **Server gate** — Redirects to `/setup` if no active server, otherwise to `/`

### API Layer

- [x] **OpencodeClient** — Full REST wrapper for all OpenCode HTTP endpoints:
  - Health, sessions (CRUD + abort + status), messages, diff, files, find, config/providers, agents, commands, permissions
- [x] **Basic auth** — Authorization header from server config with manual base64
- [x] **Typed errors** — ApiError with status and body
- [x] **Referential stability** — useMemo on server fields prevents infinite bootstrap loops

### Scripts & Tooling

- [x] **Correctness benchmark** (`pilot-bench.mjs`) — 25 tests across 12 suites (health, latency, config, sessions, messages, diff, files, SSE, permissions, error handling, concurrent load, client stability)
- [x] **Load test** (`pilot-load.mjs`) — Ramping VU test (warm-up → ramp → sustain → spike → sustain-2 → cool-down), 7 endpoints round-robin, per-endpoint p50/p95/p99
- [x] **SSE benchmark** (`pilot-sse-bench.mjs`) — Concurrent connections (1/5/10), reconnection resilience (10 cycles), event throughput (10s), full app flow simulation (10 steps)
- [x] **Memory plugin benchmark** (`pilot-memory-bench.mjs`) — Shadow session pathway, extraction JSON parser, cosine similarity & topK, config defaults, injection context format
- [x] **API smoke test** (`pilot-test.mjs`) — Original standalone test suite
- [x] **HTML audit report** (`audit-report.mjs`) — Self-contained HTML with summary cards, latency bar charts (SVG), load curve line charts, color-coded tables
- [x] **Benchmark runner** (`bench.sh`) — Orchestrates all 4 suites + report generation
- [x] **Audit scripts** (`opencode-audit.sh`, `opencode-audit-v1.1.sh`) — OpenCode-specific audit tools
- [x] **Fix script** (`opencode-fix-tui-noise.sh`) — TUI noise cleanup utility

### OpenCode Configuration

- [x] **Agents** — 13 specialized agents (planner, architect, code-reviewer, security-reviewer, tdd-guide, python-reviewer, go-reviewer, go-build-resolver, e2e-runner, database-reviewer, doc-updater, build-error-resolver, refactor-cleaner)
- [x] **Commands** — 20+ slash commands (plan, code-review, tdd, build-fix, refactor-clean, e2e, go-review, go-build, go-test, python-review, verify, eval, test-coverage, update-codemaps, update-docs, setup-pm, orchestrate, learn, checkpoint, evolve, instinct-export/import/status, skill-create)
- [x] **Rules** — 8 rule files (security, coding-style, testing, git-workflow, agents, performance, hooks, patterns)
- [x] **Skills** — 30+ skills (python-testing, python-patterns, golang-testing, backend-patterns, security-review, coding-standards, springboot-security/tdd, django-patterns/security/tdd/verification, eval-harness, clickhouse-io, frontend-patterns, golang-patterns, java-coding-standards, jpa-patterns, postgres-patterns, project-guidelines-example, iterative-retrieval, continuous-learning/v2, strategic-compact, tdd-workflow, verification-loop)
- [x] **Plugins** — 4 plugins (session-manager, tool-guardrails, code-quality, strategic-compact)
- [x] **MCP servers** — GitHub, memory, sequential-thinking, filesystem

---

## Partially Implemented / Stubbed Features

### Memory Plugin

- [~] **Profile repository** (`user_profile` table exists, CRUD functions implemented, but no UI to view or edit profile entries)
- [~] **Timeline repository** (`memory_timeline` table exists, CRUD functions implemented, but no UI to view extraction/injection history)
- [~] **Embedding providers table** (`embedding_providers` table exists in schema but not actively used — providers are loaded from `ModelRegistry.ts` instead)
- [~] **Memory export/backup** — No export or import functionality (MEMORY.md notes "no export or undo functionality" as known limitation)

### UI/UX

- [~] **Theme switching** — `theme/syntax.ts` exists but is **not imported or used anywhere** in the app. Only the hardcoded dark TUI palette is active. Light theme mentioned in DESIGN.md but never implemented.
- [~] **React Native Syntax Highlighter** — Listed in README/DESIGN.md tech stack, but **not in package.json**. The app uses a custom lightweight tokenizer instead.
- [~] **Session title editing** — Session title is displayed and tappable, but there is no UI to edit or rename sessions
- [~] **Message cost display** — `cost` field exists in `Message` type but is never rendered in the UI
- [~] **Session sharing** — `share.url` field exists in `Session` type but no share UI is implemented
- [~] **Reasoning tokens display** — `tokens.reasoning` exists in type but not shown separately in status bar

### Notifications

- [~] **Deep link to specific session** — Push notifications include `sessionID` in payload, but `useNotificationDeepLink` only opens `/` (main TUI). A comment in the code notes: "A more granular jump-to-session can be added by exposing a session-id param on the index route."

### Testing

- [~] **React Native app tests** — No Jest configuration, no test files for the mobile app. Only 2 plugin test files exist (`.opencode/plugins/__tests__/`). The `tdd-guide` agent exists but is not applied to the Pilot app itself.
- [~] **E2E tests** — `e2e-runner` agent configured but no actual Playwright tests for the mobile app

---

## Planned Features (Not Yet Implemented)

### High Priority

- [ ] **Light theme** — Full light palette variant (surface colors, syntax colors, status bar). Currently dark-only.
- [ ] **Session title editing** — Inline rename or modal to edit session titles via `PATCH /session/:id`
- [ ] **Memory timeline UI** — Screen or modal to view extraction/injection/dedup audit log
- [ ] **Memory profile UI** — View and manage derived user profile facts from memories
- [ ] **Session deep linking from push** — Open directly to the relevant session when tapping a notification
- [ ] **Message retry / resend** — Retry failed prompts, cancel in-flight requests
- [ ] **Offline indicator** — Show when SSE disconnects or server is unreachable
- [ ] **Session sharing UI** — Copy share URL or open shared session
- [ ] **Cost tracking display** — Show per-message and per-session cost in status bar or message metadata

### Medium Priority

- [ ] **Memory export / backup** — JSON export of all memories per server, with import/restore
- [ ] **Memory bulk operations** — Multi-select memories for batch archive/delete
- [ ] **Search memory by semantic similarity** — Embed search query and find relevant memories (currently only text search on content/tags)
- [ ] **Memory confidence threshold UI** — Slider or picker to adjust extraction confidence filter (currently hardcoded 0.65)
- [ ] **Image rendering** — Display images from `file` parts or image URLs in messages
- [ ] **Markdown rendering** — Rich markdown support beyond fenced code blocks (headers, lists, links, tables)
- [ ] **Message editing** — Edit sent user messages and re-run
- [ ] **Message deletion** — Remove individual messages from a session
- [ ] **Branching conversations** — Fork a session at a specific message to create a new thread
- [ ] **Font family selection** — Toggle between JetBrains Mono, SF Mono, Fira Code, etc.
- [ ] **Biometric auth** — Face ID / Touch ID to unlock app or protect server credentials
- [ ] **Server URL QR code scanner** — Scan QR to add server instead of manual typing
- [ ] **Session tags / folders** — Organize sessions with custom tags or folder groups
- [ ] **Quick reply suggestions** — AI-generated follow-up prompts based on context
- [ ] **Voice input** — Speech-to-text for prompt input

### Low Priority / Future Ideas

- [ ] **Android support** — Currently iOS-only (explicit non-goal, but could be expanded)
- [ ] **iPad / tablet layout** — Optimized two-pane layout for larger screens
- [ ] **Widget support** — iOS home screen widget showing last session status or quick prompt
- [ ] **Apple Watch companion** — View session status, receive notifications, send quick prompts
- [ ] **Siri Shortcuts integration** — "Ask OpenCode about..." voice commands
- [ ] **Custom themes** — User-defined accent colors and background colors
- [ ] **Session analytics** — Token usage charts, cost over time, model usage breakdown
- [ ] **Memory visualization** — Graph view of memory relationships and clusters
- [ ] **Collaborative sessions** — Share session with other Pilot users for pair programming
- [ ] **Local model fallback** — Run small local LLM on-device when server is unreachable
- [ ] **File upload** — Upload images/documents from device to server
- [ ] **Haptic patterns** — Rich haptic feedback for different event types (success, warning, error)
- [ ] **Accessibility audit** — VoiceOver labels, dynamic type support, color blindness modes
- [ ] **Internationalization (i18n)** — Multi-language UI support

---

## Recently Completed

- **Per-session working directory support** (2026-05-08) — Added `workdir` state with directory picker, auto-persistence per session/server, and automatic prompt injection
- **Memory plugin v1** (2026-05-08) — Full extraction/injection pipeline with 8 embedding providers, 37 models, SQLite storage, deduplication, and complete UI
- **Model reference standardization** (2026-05-08) — Updated all agent configs. Note: model provider format varies by OpenCode version; verify `opencode.json` and `.opencode/agents/*.md` match your active provider.
- **pnpm migration + ESLint** (2026-05-08) — Migrated from npm to pnpm, added ESLint 9 with expo-config
- **PostCSS security patch** (2026-05-08) — Removed vulnerable unused deps, patched postcss XSS vulnerability
- **Agent model configuration** (2026-05-08) — Reviewed and aligned all 13 agent prompts with active model provider
- **Complete benchmark suite** (2026-05-08) — 4-phase benchmark system with HTML audit report generation
- **Push notification action buttons** (2026-05-08) — Allow Once / Deny quick actions on permission push notifications without opening app
- **Error badge + debug log** (2026-05-08) — Floating error indicator with structured log viewer in settings

---

## Known Limitations

1. **iOS only** — No Android build configuration or testing. Android adaptiveIcon exists in `app.json` but is untested.
2. **No offline mode** — App requires network connection to OpenCode server. No caching of messages or files for offline viewing.
3. **No file write API** — OpenCode server has no write endpoint; all file edits happen through chat. This is a deliberate non-goal.
4. **Background SSE unreliable** — iOS kills SSE connections in background. Mitigated by server-side relay + push notifications, but real-time streaming stops when app is backgrounded.
5. **Syntax highlighting limited** — Custom tokenizer only covers most common languages. No semantic analysis or full parser-based highlighting.
6. **No unit tests for mobile app** — The React Native app has zero automated tests. Only the OpenCode plugin layer has 2 test files.
7. **Memory extraction silent failures** — If Ollama is down or extraction times out, failure is silent (no user notification). Check logs to diagnose.
8. **No memory undo** — Clearing all memories is irreversible. No export/backup before clear.
9. **Single embedding model at a time** — Cannot mix embeddings from different models within one server's memory store.
10. **Text search in files may skip** — Server-side ripgrep can fail on binary/cache files, causing `/find?pattern=` to return errors.
11. **No message history pagination** — All messages for a session are loaded at once. Very long sessions may cause performance issues.
12. **Modal state not persisted** — If app is killed while a modal is open, modal state is lost (not stored in URL/navigation state).
13. **No rate limiting UI** — If server rate-limits, user sees generic error. No retry-with-backoff UI for user-facing actions.
14. **Drawer swipe width limited** — `swipeEdgeWidth: 40` means only edge swipes open drawer, not full-screen swipe.
15. **SecureStore size limits** — Large numbers of servers or very long workdir paths could approach SecureStore limits (no known issues yet).
16. **Theme is compile-time dark** — No runtime theme switching. `syntax.ts` exists as dead code.
17. **No session search** — Session picker has no search/filter for finding old sessions by title.
18. **Memory card no edit** — Memories cannot be edited after extraction (only pin/archive/delete).
19. **No inline file creation** — Cannot create new files from the file browser (server has no write endpoint).
20. **Push token refresh** — Token is fetched once at launch. If it changes, user must manually re-copy in settings.
