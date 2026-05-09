# Pilot Feature Roadmap

**Project:** Pilot — Native iOS client for OpenCode
**Last Updated:** 2026-05-09
**Status:** Active Development

> **Note:** This file was consolidated on **2026-05-09** by merging the original `ROADMAP.md` and `FEATURE-ROADMAP.md` into a single roadmap document. It combines detailed narrative feature documentation with structured phase-based tracking.

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

## Feature Roadmap by Phase

### Legend

- `[ ]` — Not started
- `[~]` — Partially implemented / stubbed
- `[x]` — Complete

### Phase 2: High Priority Features

Core user-facing features that significantly improve the experience.

| #    | Feature                                      | Status | Notes                                                                                                        |
| ---- | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| 2.1  | Light theme support                          | `[ ]`  | Full light palette (surface, syntax, status bar). Currently dark-only. `syntax.ts` dead code may be related. |
| 2.2  | Session title editing                        | `[~]`  | `Session.title` exists and is tappable, but no edit UI. Need `PATCH /session/:id` integration.               |
| 2.3  | Memory timeline UI                           | `[~]`  | `memory_timeline` table + `TimelineRepository.ts` exist, but no screen to view extraction/injection history. |
| 2.4  | Memory profile UI                            | `[~]`  | `user_profile` table + `ProfileRepository.ts` exist, but no UI to view/edit profile entries.                 |
| 2.5  | Session deep linking from push notifications | `[~]`  | `sessionID` is in push payload, but `useNotificationDeepLink` only opens `/`. Need route param.              |
| 2.6  | Message retry / resend                       | `[ ]`  | Retry failed prompts, cancel in-flight requests.                                                             |
| 2.7  | Offline indicator                            | `[ ]`  | Show when SSE disconnects or server is unreachable.                                                          |
| 2.8  | Session sharing UI                           | `[~]`  | `share.url` field exists in `Session` type but never rendered.                                               |
| 2.9  | Cost tracking display                        | `[~]`  | `cost` field exists in `Message` type but never rendered in UI.                                              |
| 2.10 | Message cost/reasoning token display         | `[~]`  | `tokens.reasoning` exists but not shown in status bar.                                                       |

### Phase 3: Medium Priority Features

Quality-of-life improvements and power-user features.

| #    | Feature                        | Status | Notes                                                                                        |
| ---- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| 3.1  | Memory export / backup         | `[ ]`  | JSON export of all memories per server, with import/restore. Known limitation per MEMORY.md. |
| 3.2  | Memory bulk operations         | `[ ]`  | Multi-select memories for batch archive/delete.                                              |
| 3.3  | Semantic memory search         | `[ ]`  | Embed search query and find relevant memories. Currently only text search on content/tags.   |
| 3.4  | Memory confidence threshold UI | `[ ]`  | Slider to adjust extraction confidence filter (currently hardcoded 0.65).                    |
| 3.5  | Image rendering in messages    | `[ ]`  | Display images from `file` parts or image URLs.                                              |
| 3.6  | Rich markdown rendering        | `[ ]`  | Headers, lists, links, tables beyond fenced code blocks.                                     |
| 3.7  | Message editing                | `[ ]`  | Edit sent user messages and re-run.                                                          |
| 3.8  | Message deletion               | `[ ]`  | Remove individual messages from a session.                                                   |
| 3.9  | Branching conversations        | `[ ]`  | Fork a session at a specific message to create a new thread.                                 |
| 3.10 | Font family selection          | `[ ]`  | Toggle between JetBrains Mono, SF Mono, Fira Code, etc.                                      |
| 3.11 | Biometric auth                 | `[ ]`  | Face ID / Touch ID to unlock app or protect server credentials.                              |
| 3.12 | Server URL QR code scanner     | `[ ]`  | Scan QR to add server instead of manual typing.                                              |
| 3.13 | Session tags / folders         | `[ ]`  | Organize sessions with custom tags or folder groups.                                         |
| 3.14 | Quick reply suggestions        | `[ ]`  | AI-generated follow-up prompts based on context.                                             |
| 3.15 | Voice input                    | `[ ]`  | Speech-to-text for prompt input.                                                             |

### Phase 4: Low Priority / Future Ideas

Nice-to-have features for future releases.

| #    | Feature                     | Status | Notes                                                             |
| ---- | --------------------------- | ------ | ----------------------------------------------------------------- |
| 4.1  | Android support             | `[ ]`  | Explicit non-goal, but `app.json` has `android` config. Untested. |
| 4.2  | iPad / tablet layout        | `[ ]`  | Two-pane layout for larger screens.                               |
| 4.3  | iOS home screen widget      | `[ ]`  | Show last session status or quick prompt.                         |
| 4.4  | Apple Watch companion       | `[ ]`  | View status, receive notifications, send quick prompts.           |
| 4.5  | Siri Shortcuts integration  | `[ ]`  | "Ask OpenCode about..." voice commands.                           |
| 4.6  | Custom themes               | `[ ]`  | User-defined accent and background colors.                        |
| 4.7  | Session analytics           | `[ ]`  | Token usage charts, cost over time, model usage breakdown.        |
| 4.8  | Memory visualization        | `[ ]`  | Graph view of memory relationships and clusters.                  |
| 4.9  | Collaborative sessions      | `[ ]`  | Share session with other Pilot users for pair programming.        |
| 4.10 | Local model fallback        | `[ ]`  | Run small local LLM on-device when server is unreachable.         |
| 4.11 | File upload                 | `[ ]`  | Upload images/documents from device to server.                    |
| 4.12 | Rich haptic patterns        | `[ ]`  | Different haptic feedback for success, warning, error.            |
| 4.13 | Accessibility audit         | `[ ]`  | VoiceOver labels, dynamic type support, color blindness modes.    |
| 4.14 | Internationalization (i18n) | `[ ]`  | Multi-language UI support.                                        |

### Phase 5: Technical Debt & Testing

Infrastructure and quality improvements.

| #   | Task                                                                                   | Status | Notes                                                                                                  |
| --- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| 5.1 | React Native unit tests                                                                | `[ ]`  | Zero tests for the mobile app. Only 2 plugin test files exist.                                         |
| 5.2 | E2E tests for mobile app                                                               | `[ ]`  | `e2e-runner` agent exists but no actual Playwright tests for RN.                                       |
| 5.3 | Type cleanup: remove unused `cost`, `share.url`, `tokens.reasoning` if not implemented | `[~]`  | Fields exist in types but no UI. Either implement or remove.                                           |
| 5.4 | Remove empty `types/` directory at root                                                | `[ ]`  | Contains no files.                                                                                     |
| 5.5 | Document `audit.sh` dev-server utility                                                 | `[ ]`  | No README mention of this script.                                                                      |
| 5.6 | Plugin test coverage expansion                                                         | `[~]`  | Only `session-manager.test.ts` and `tool-guardrails.test.ts` exist.                                    |
| 5.7 | Consolidate embedding provider registry                                                | `[~]`  | `embedding_providers` table exists in schema but providers are loaded from `ModelRegistry.ts` instead. |

### Phase 6: Documentation Overhaul

Comprehensive documentation updates to match the current codebase.

| #   | Task                                                  | Status | Notes                                                       |
| --- | ----------------------------------------------------- | ------ | ----------------------------------------------------------- |
| 6.1 | README: add `plugin/` to project structure            | `[ ]`  | Memory plugin is a major feature missing from README.       |
| 6.2 | README: update tech stack table (remove false deps)   | `[ ]`  | Remove `react-native-syntax-highlighter`.                   |
| 6.3 | AGENTS.md: add memory plugin section                  | `[ ]`  | Completely absent from project overview.                    |
| 6.4 | AGENTS.md: refresh "Last Updated" and migration notes | `[ ]`  | Date is 2026-02-02; migration from Claude Code is complete. |
| 6.5 | relay/README.md: remove "Phase 9" parenthetical       | `[ ]`  | Push notifications are complete.                            |
| 6.6 | DESIGN.md: complete file structure overhaul           | `[ ]`  | Multiple paths and files are wrong.                         |
| 6.7 | BENCH.md: correct `audit-report.mjs` usage docs       | `[ ]`  | `--out` behavior is misdocumented.                          |

---

## Recently Completed

### Phase 1: Critical Fixes & Cleanup (2026-05-08)

These items address bugs, dead code, and documentation inaccuracies identified in the 2026-05-08 audit.

| #    | Task                                                                        | Status | Notes                                                                                                     |
| ---- | --------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| 1.1  | Remove dead code: `theme/syntax.ts`                                         | `[x]`  | Deleted file and export from `theme/index.ts`                                                             |
| 1.2  | Consolidate TUI noise fix scripts (`v2`, `v3`)                              | `[x]`  | All 3 versions deleted — were run-once repair scripts                                                     |
| 1.3  | Fix README tech stack: remove `react-native-syntax-highlighter` claim       | `[x]`  | Updated to "Custom lightweight tokenizer"                                                                 |
| 1.4  | Fix DESIGN.md tech stack: remove `opencode-ai JS SDK` claim                 | `[x]`  | Updated to "Custom `fetch()` wrapper"                                                                     |
| 1.5  | Fix DESIGN.md reanimated version (v3 → v4)                                  | `[x]`  | Updated to v4                                                                                             |
| 1.6  | Fix DESIGN.md file structure (modals path, remove non-existent files)       | `[x]`  | Corrected to `components/modals/`, removed `PromptToolbar.tsx`/`DrawerItem.tsx`, added missing components |
| 1.7  | Fix or remove false ROADMAP claim about model standardization               | `[x]`  | Rephrased to note provider format variance                                                                |
| 1.8  | Fix or remove false ROADMAP claim about "agent model tiering"               | `[x]`  | Rephrased to "agent model configuration"                                                                  |
| 1.9  | Update AGENTS.md: add memory plugin, correct skill count (29), refresh date | `[x]`  | Full rewrite: all 29 skills, 24 commands, Pilot section, rules, plugins, MCP                              |
| 1.10 | Archive old audit HTML reports                                              | `[~]`  | Already in `.gitignore`; files remain in repo root for now                                                |
| 1.11 | Delete `.gitignore.bak` backup file                                         | `[x]`  | Deleted                                                                                                   |
| 1.12 | Add `pilot-audit-*.html` to `.gitignore`                                    | `[x]`  | Already present in `.gitignore` line 8                                                                    |

### Earlier Completions

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

---

## Milestones

| Milestone  | Target     | Deliverables                                  |
| ---------- | ---------- | --------------------------------------------- |
| **v0.1.1** | 2026-05-15 | Phase 1 complete (all cleanup + doc fixes)    |
| **v0.2.0** | 2026-06-01 | Phase 2 complete (high-priority features)     |
| **v0.3.0** | 2026-07-01 | Phase 3 complete (medium-priority features)   |
| **v0.4.0** | 2026-08-01 | Phase 5 complete (testing + tech debt)        |
| **v1.0.0** | 2026-Q4    | Phase 4 features + polish + App Store release |

---

## How to Update This Roadmap

1. When a feature is completed, change `[ ]` to `[x]` in the phase tables and add it to the **Recently Completed** section.
2. When a feature is stubbed/partially done, use `[~]` in the phase tables and move details to the **Partially Implemented / Stubbed Features** narrative section.
3. When new features are requested, add them to the appropriate phase.
4. After each audit, update the **Last Updated** date and reconcile with `AUDIT-REPORT-*.md`.

---

_Generated from deep audit on 2026-05-08. See `AUDIT-REPORT-2026-05-08.md` for full findings._
