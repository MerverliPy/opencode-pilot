# Pilot Feature Roadmap

**Project:** Pilot — Native iOS client for OpenCode
**Last Updated:** 2026-05-08
**Status:** Active Development

This roadmap tracks planned features, documentation debt, and cleanup tasks. For the full historical changelog, see `ROADMAP.md`.

---

## Legend

- `[ ]` — Not started
- `[~]` — Partially implemented / stubbed
- `[x]` — Complete

---

## Phase 1: Critical Fixes & Cleanup

These items address bugs, dead code, and documentation inaccuracies identified in the 2026-05-08 audit.

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1.1 | Remove dead code: `theme/syntax.ts` | `[x]` | — | Deleted file and export from `theme/index.ts` |
| 1.2 | Consolidate TUI noise fix scripts (`v2`, `v3`) | `[x]` | — | All 3 versions deleted — were run-once repair scripts |
| 1.3 | Fix README tech stack: remove `react-native-syntax-highlighter` claim | `[x]` | — | Updated to "Custom lightweight tokenizer" |
| 1.4 | Fix DESIGN.md tech stack: remove `opencode-ai JS SDK` claim | `[x]` | — | Updated to "Custom `fetch()` wrapper" |
| 1.5 | Fix DESIGN.md reanimated version (v3 → v4) | `[x]` | — | Updated to v4 |
| 1.6 | Fix DESIGN.md file structure (modals path, remove non-existent files) | `[x]` | — | Corrected to `components/modals/`, removed `PromptToolbar.tsx`/`DrawerItem.tsx`, added missing components |
| 1.7 | Fix or remove false ROADMAP claim about model standardization | `[x]` | — | Rephrased to note provider format variance |
| 1.8 | Fix or remove false ROADMAP claim about "agent model tiering" | `[x]` | — | Rephrased to "agent model configuration" |
| 1.9 | Update AGENTS.md: add memory plugin, correct skill count (29), refresh date | `[x]` | — | Full rewrite: all 29 skills, 24 commands, Pilot section, rules, plugins, MCP |
| 1.10 | Archive old audit HTML reports | `[~]` | — | Already in `.gitignore`; files remain in repo root for now |
| 1.11 | Delete `.gitignore.bak` backup file | `[x]` | — | Deleted |
| 1.12 | Add `pilot-audit-*.html` to `.gitignore` | `[x]` | — | Already present in `.gitignore` line 8 |

---

## Phase 2: High Priority Features

Core user-facing features that significantly improve the experience.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Light theme support | `[ ]` | Full light palette (surface, syntax, status bar). Currently dark-only. `syntax.ts` dead code may be related. |
| 2.2 | Session title editing | `[~]` | `Session.title` exists and is tappable, but no edit UI. Need `PATCH /session/:id` integration. |
| 2.3 | Memory timeline UI | `[~]` | `memory_timeline` table + `TimelineRepository.ts` exist, but no screen to view extraction/injection history. |
| 2.4 | Memory profile UI | `[~]` | `user_profile` table + `ProfileRepository.ts` exist, but no UI to view/edit profile entries. |
| 2.5 | Session deep linking from push notifications | `[~]` | `sessionID` is in push payload, but `useNotificationDeepLink` only opens `/`. Need route param. |
| 2.6 | Message retry / resend | `[ ]` | Retry failed prompts, cancel in-flight requests. |
| 2.7 | Offline indicator | `[ ]` | Show when SSE disconnects or server is unreachable. |
| 2.8 | Session sharing UI | `[~]` | `share.url` field exists in `Session` type but never rendered. |
| 2.9 | Cost tracking display | `[~]` | `cost` field exists in `Message` type but never rendered in UI. |
| 2.10 | Message cost/reasoning token display | `[~]` | `tokens.reasoning` exists but not shown in status bar. |

---

## Phase 3: Medium Priority Features

Quality-of-life improvements and power-user features.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | Memory export / backup | `[ ]` | JSON export of all memories per server, with import/restore. Known limitation per MEMORY.md. |
| 3.2 | Memory bulk operations | `[ ]` | Multi-select memories for batch archive/delete. |
| 3.3 | Semantic memory search | `[ ]` | Embed search query and find relevant memories. Currently only text search on content/tags. |
| 3.4 | Memory confidence threshold UI | `[ ]` | Slider to adjust extraction confidence filter (currently hardcoded 0.65). |
| 3.5 | Image rendering in messages | `[ ]` | Display images from `file` parts or image URLs. |
| 3.6 | Rich markdown rendering | `[ ]` | Headers, lists, links, tables beyond fenced code blocks. |
| 3.7 | Message editing | `[ ]` | Edit sent user messages and re-run. |
| 3.8 | Message deletion | `[ ]` | Remove individual messages from a session. |
| 3.9 | Branching conversations | `[ ]` | Fork a session at a specific message to create a new thread. |
| 3.10 | Font family selection | `[ ]` | Toggle between JetBrains Mono, SF Mono, Fira Code, etc. |
| 3.11 | Biometric auth | `[ ]` | Face ID / Touch ID to unlock app or protect server credentials. |
| 3.12 | Server URL QR code scanner | `[ ]` | Scan QR to add server instead of manual typing. |
| 3.13 | Session tags / folders | `[ ]` | Organize sessions with custom tags or folder groups. |
| 3.14 | Quick reply suggestions | `[ ]` | AI-generated follow-up prompts based on context. |
| 3.15 | Voice input | `[ ]` | Speech-to-text for prompt input. |

---

## Phase 4: Low Priority / Future Ideas

Nice-to-have features for future releases.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Android support | `[ ]` | Explicit non-goal, but `app.json` has `android` config. Untested. |
| 4.2 | iPad / tablet layout | `[ ]` | Two-pane layout for larger screens. |
| 4.3 | iOS home screen widget | `[ ]` | Show last session status or quick prompt. |
| 4.4 | Apple Watch companion | `[ ]` | View status, receive notifications, send quick prompts. |
| 4.5 | Siri Shortcuts integration | `[ ]` | "Ask OpenCode about..." voice commands. |
| 4.6 | Custom themes | `[ ]` | User-defined accent and background colors. |
| 4.7 | Session analytics | `[ ]` | Token usage charts, cost over time, model usage breakdown. |
| 4.8 | Memory visualization | `[ ]` | Graph view of memory relationships and clusters. |
| 4.9 | Collaborative sessions | `[ ]` | Share session with other Pilot users for pair programming. |
| 4.10 | Local model fallback | `[ ]` | Run small local LLM on-device when server is unreachable. |
| 4.11 | File upload | `[ ]` | Upload images/documents from device to server. |
| 4.12 | Rich haptic patterns | `[ ]` | Different haptic feedback for success, warning, error. |
| 4.13 | Accessibility audit | `[ ]` | VoiceOver labels, dynamic type support, color blindness modes. |
| 4.14 | Internationalization (i18n) | `[ ]` | Multi-language UI support. |

---

## Phase 5: Technical Debt & Testing

Infrastructure and quality improvements.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | React Native unit tests | `[ ]` | Zero tests for the mobile app. Only 2 plugin test files exist. |
| 5.2 | E2E tests for mobile app | `[ ]` | `e2e-runner` agent exists but no actual Playwright tests for RN. |
| 5.3 | Type cleanup: remove unused `cost`, `share.url`, `tokens.reasoning` if not implemented | `[~]` | Fields exist in types but no UI. Either implement or remove. |
| 5.4 | Remove empty `types/` directory at root | `[ ]` | Contains no files. |
| 5.5 | Document `audit.sh` dev-server utility | `[ ]` | No README mention of this script. |
| 5.6 | Plugin test coverage expansion | `[~]` | Only `session-manager.test.ts` and `tool-guardrails.test.ts` exist. |
| 5.7 | Consolidate embedding provider registry | `[~]` | `embedding_providers` table exists in schema but providers are loaded from `ModelRegistry.ts` instead. |

---

## Phase 6: Documentation Overhaul

Comprehensive documentation updates to match the current codebase.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | README: add `plugin/` to project structure | `[ ]` | Memory plugin is a major feature missing from README. |
| 6.2 | README: update tech stack table (remove false deps) | `[ ]` | Remove `react-native-syntax-highlighter`. |
| 6.3 | AGENTS.md: add memory plugin section | `[ ]` | Completely absent from project overview. |
| 6.4 | AGENTS.md: refresh "Last Updated" and migration notes | `[ ]` | Date is 2026-02-02; migration from Claude Code is complete. |
| 6.5 | relay/README.md: remove "Phase 9" parenthetical | `[ ]` | Push notifications are complete. |
| 6.6 | DESIGN.md: complete file structure overhaul | `[ ]` | Multiple paths and files are wrong. |
| 6.7 | BENCH.md: correct `audit-report.mjs` usage docs | `[ ]` | `--out` behavior is misdocumented. |

---

## Milestones

| Milestone | Target | Deliverables |
|-----------|--------|-------------|
| **v0.1.1** | 2026-05-15 | Phase 1 complete (all cleanup + doc fixes) |
| **v0.2.0** | 2026-06-01 | Phase 2 complete (high-priority features) |
| **v0.3.0** | 2026-07-01 | Phase 3 complete (medium-priority features) |
| **v0.4.0** | 2026-08-01 | Phase 5 complete (testing + tech debt) |
| **v1.0.0** | 2026-Q4 | Phase 4 features + polish + App Store release |

---

## How to Update This Roadmap

1. When a feature is completed, change `[ ]` to `[x]` and move it to the historical log in `ROADMAP.md`.
2. When a feature is stubbed/partially done, use `[~]`.
3. When new features are requested, add them to the appropriate phase.
4. After each audit, update the "Last Updated" date and reconcile with `AUDIT-REPORT-*.md`.

---

*Generated from deep audit on 2026-05-08. See `AUDIT-REPORT-2026-05-08.md` for full findings.*
