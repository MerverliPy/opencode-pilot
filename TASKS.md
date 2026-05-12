# Pilot — Task Agenda

## Agent Workflow Instructions

> **Before any work, read this file.**
>
> This file is the single source of truth for what to work on next. Follow this order:
>
> 1. Read this file to find the active (non-completed) task.
> 2. Execute the task in its own atomic scope.
> 3. Validate: run lint/typecheck/tests as specified.
> 4. Present the diff to the user and ask: "Commit and push now?"
> 5. After user confirms commit/push: update this file — mark the task `[x]`, append a "Completed" entry with date + description + files changed.
> 6. The file now naturally points to the next active task — repeat from step 1.
>
> Never start a task without reading this file. Never leave this file stale after a commit.

---

## Recently Completed

| Date       | Task                                     | Files Changed                                                                                                                                                                                                                                          | Notes                                                                                                                                                                      |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-12 | Fix BENCH.md `--out` docs                | `BENCH.md`                                                                                                                                                                                                                                             | Fixed `--json` → `--out` for pilot-bench.mjs; corrected output files table (removed fictional `/tmp/pilot-results.json`, added 4 per-suite temp files + merged JSON path). |
| 2026-05-12 | Unit tests for `plugin/memory/` hooks/UI | `plugin/memory/hooks/__tests__/useMemoryInjection.test.ts`, `useMemoryExtraction.test.ts`, `plugin/memory/ui/components/__tests__/EmptyState.test.tsx`, `CategoryFilter.test.tsx`, `MemoryCard.test.tsx`, `plugin/memory/ui/components/MemoryCard.tsx` | 488 tests, 0 failing, 92.44% statements, 90.81% branches, 96.2% functions. All thresholds met.                                                                             |
| 2026-05-11 | Achieve 80%+ test coverage               | `plugin/memory/__tests__/`, `.opencode/plugins/__tests__/`, `__mocks__/expo-sqlite.ts`, `jest.config.js`                                                                                                                                               | 419 tests, 35 suites, 85.63% statements, 89.78% branches, 93.99% functions. All thresholds met.                                                                            |
| 2026-05-09 | Commit + push doc consolidation          | `AGENTS.md`, `ROADMAP.md`, `FEATURE-ROADMAP.md` (deleted), `TASKS.md` (new)                                                                                                                                                                            | Commit `7fa1fd2a` on main. Remote updated.                                                                                                                                 |
| 2026-05-09 | Consolidate ROADMAP files                | `ROADMAP.md` (rewrite), `FEATURE-ROADMAP.md` (delete)                                                                                                                                                                                                  | Merged Phase 1-6 tables into single roadmap. Reduced from 430 → 368 lines.                                                                                                 |
| 2026-05-09 | Fix README stale refs                    | No changes needed                                                                                                                                                                                                                                      | Phase 1 audit already fixed syntax.ts + plugin/ references.                                                                                                                |
| 2026-05-09 | Fix DESIGN.md SDK claim                  | No changes needed                                                                                                                                                                                                                                      | Phase 1 audit already replaced false SDK claim with "Custom REST client built on plain fetch()".                                                                           |
| 2026-05-09 | Update AGENTS.md                         | `AGENTS.md`                                                                                                                                                                                                                                            | Added "Agent Workflow" section referencing TASKS.md; updated Pilot doc link.                                                                                               |
| 2026-05-09 | Fix AGENTS.md skill count                | No changes needed                                                                                                                                                                                                                                      | Prose already reads "29 skills".                                                                                                                                           |
| 2026-05-09 | Fix README.md plugin/ dir                | No changes needed                                                                                                                                                                                                                                      | Phase 1 already added to project structure.                                                                                                                                |
| 2026-05-09 | Phase 5: Jest test suite                 | `jest.config.js`, `jest.setup.js`, `__mocks__/`, `services/__tests__/`, `store/__tests__/`                                                                                                                                                             | Commit `c9e42c26` on main. 118 tests, all passing. Remote updated.                                                                                                         |

---

## Active Work Area: Phase 5 — Technical Debt & Testing

**Triggered by:** Deep audit on 2026-05-09 revealed zero test coverage (violates 80% mandate), 2 files >800 lines, 3 lint warnings, 18 outdated packages, and 7 suppressed `react-hooks/exhaustive-deps` warnings.

### Deep Audit Action Plan (in priority order)

| #   | Task                                           | Priority  | Files                                                                                                | Validation                        |
| --- | ---------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | ~~Set up Jest test infrastructure~~            | ✅ Done   | `jest.config.js`, `package.json`, `__mocks__/`                                                       | `npm test` runs without error     |
| 2   | ~~Unit tests for `services/`~~                 | ✅ Done   | `services/__tests__/api.test.ts`, `logger.test.ts`, `auth.test.ts`                                   | `npm test` passes                 |
| 3   | ~~Unit tests for `store/`~~                    | ✅ Done   | `store/__tests__/session.test.ts`, `server.test.ts`, `log.test.ts`, `ui.test.ts`, `n9router.test.ts` | `npm test` passes                 |
| 4   | ~~Unit tests for `plugin/memory/`~~            | ✅ Done   | `plugin/memory/__tests__/` — see `TEST_COVERAGE_PLAN.md`                                             | `npm test` passes                 |
| 4a  | ~~Fix Jest config (Phase 0)~~                  | ✅ Done   | `jest.config.js`                                                                                     | `npm test` passes, coverage works |
| 4b  | ~~Unit tests for `services/` (remaining)~~     | ✅ Done   | `services/__tests__/n9router.test.ts`, `sse.test.ts`, `notifications.test.ts`                        | `npm test` passes                 |
| 4c  | ~~Unit tests for `plugin/memory/` pure logic~~ | ✅ Done   | `embeddings/__tests__/`, `dedup/__tests__/`                                                          | `npm test` passes                 |
| 4d  | ~~Unit tests for `plugin/memory/` DB layer~~   | ✅ Done   | `db/__tests__/` (needs enhanced `expo-sqlite` mock)                                                  | `npm test` passes                 |
| 4e  | ~~Unit tests for `plugin/memory/` providers~~  | ✅ Done   | `embeddings/__tests__/` (OpenAI, Ollama, Cohere, Factory)                                            | `npm test` passes                 |
| 4f  | ~~Unit tests for `plugin/memory/` store~~      | ✅ Done   | `store/__tests__/memoryStore.test.ts`                                                                | `npm test` passes                 |
| 4g  | ~~Unit tests for `plugin/memory/` extraction~~ | ✅ Done   | `extraction/__tests__/`, `injection/__tests__/`                                                      | `npm test` passes                 |
| 4h  | ~~Unit tests for `plugin/memory/` hooks/UI~~   | ✅ Done   | `hooks/__tests__/`, `ui/components/__tests__/`                                                       | `npm test` passes                 |
| 4i  | ~~Unit tests for `.opencode/plugins/`~~        | ✅ Done   | `.opencode/plugins/__tests__/` (currently ignored by Jest)                                           | `npm test` passes                 |
| 5   | ~~Clean ESLint warnings~~                      | ✅ Done   | `components/modals/ModelModal.tsx`, `TitleEditModal.tsx`                                             | `npm run lint` → 0 warnings       |
| 6   | ~~Fix BENCH.md `--out` docs~~                  | ✅ Done   | `BENCH.md`                                                                                           | Docs match actual behavior        |
| 7   | Extract sub-components from oversized files    | 🟡 Medium | `app/(main)/memory.tsx`, `settings.tsx`                                                              | `npx tsc --noEmit` passes         |
| 8   | Plan Expo SDK 55 upgrade                       | 🟢 Low    | `package.json`                                                                                       | Research only                     |

---

## Backlog (Phase 2-6)

### Phase 2: High Priority

- `[ ]` 2.1 Light theme support — Full light palette variant. Currently dark-only.
- `[ ]` 2.2 Session title editing — `Session.title` exists but no edit UI. Need `PATCH /session/:id`.
- `[ ]` 2.3 Memory timeline UI — `memory_timeline` table exists, needs screen.
- `[ ]` 2.4 Memory profile UI — `user_profile` table exists, needs screen.
- `[ ]` 2.5 Session deep linking from push — `sessionID` in payload but opens `/` only.
- `[ ]` 2.6 Message retry / resend — Retry failed prompts, cancel in-flight.
- `[ ]` 2.7 Offline indicator — Show when SSE disconnects or server unreachable.
- `[ ]` 2.8 Session sharing UI — `share.url` field exists but never rendered.
- `[ ]` 2.9 Cost tracking display — `cost` field in Message type, never rendered.
- `[ ]` 2.10 Reasoning token display — `tokens.reasoning` exists, not shown.

### Phase 3: Medium Priority

- `[ ]` 3.1 Memory export / backup — JSON export per server, import/restore.
- `[ ]` 3.2 Memory bulk operations — Multi-select for batch archive/delete.
- `[ ]` 3.3 Semantic memory search — Embed query, find memories.
- `[ ]` 3.4 Memory confidence threshold UI — Slider for extraction confidence (currently 0.65).
- `[ ]` 3.5 Image rendering in messages — Display images from file parts or URLs.
- `[ ]` 3.6 Rich markdown rendering — Headers, lists, links, tables beyond code blocks.
- `[ ]` 3.7 Message editing — Edit sent messages and re-run.
- `[ ]` 3.8 Message deletion — Remove individual messages.
- `[ ]` 3.9 Branching conversations — Fork session at a message.
- `[ ]` 3.10 Font family selection — Toggle between JetBrains Mono, SF Mono, etc.
- `[ ]` 3.11 Biometric auth — Face ID / Touch ID.
- `[ ]` 3.12 Server URL QR scanner — Scan QR to add server.
- `[ ]` 3.13 Session tags / folders — Organize sessions.
- `[ ]` 3.14 Quick reply suggestions — AI-generated follow-ups.
- `[ ]` 3.15 Voice input — Speech-to-text.

### Phase 4: Low Priority / Future Ideas

- `[ ]` 4.1 Android support — `app.json` has config, untested.
- `[ ]` 4.2 iPad / tablet layout — Two-pane layout.
- `[ ]` 4.3 iOS home screen widget — Quick prompt / status.
- `[ ]` 4.4 Apple Watch companion — View status, send quick prompts.
- `[ ]` 4.5 Siri Shortcuts — "Ask OpenCode about..."
- `[ ]` 4.6 Custom themes — User-defined accent/background.
- `[ ]` 4.7 Session analytics — Token/cost charts.
- `[ ]` 4.8 Memory visualization — Graph view.
- `[ ]` 4.9 Collaborative sessions — Pair programming.
- `[ ]` 4.10 Local model fallback — On-device LLM.
- `[ ]` 4.11 File upload — Upload images/documents.
- `[ ]` 4.12 Rich haptic patterns — Different haptics per event.
- `[ ]` 4.13 Accessibility audit — VoiceOver, dynamic type.
- `[ ]` 4.14 Internationalization (i18n) — Multi-language.

### Phase 5: Technical Debt & Testing

- `[x]` 5.1 React Native unit tests — 118 tests across services/ and store/. Jest + ts-jest configured.
- `[ ]` 5.2 E2E tests for mobile app — No Playwright tests for RN.
- `[~]` 5.3 Type cleanup: remove unused `cost`, `share.url`, `tokens.reasoning` if not implemented.
- `[ ]` 5.4 Remove empty `types/` directory — Already removed (directory does not exist).
- `[ ]` 5.5 Document `audit.sh` dev-server utility — No README mention.
- `[~]` 5.6 Plugin test coverage expansion — See `TEST_COVERAGE_PLAN.md`. 8 phases covering services/, plugin/memory/, .opencode/plugins/. Target ~230 tests, 100% coverage.
- `[~]` 5.7 Consolidate embedding provider registry — `embedding_providers` table exists but providers loaded from `ModelRegistry.ts`.

### Phase 6: Documentation Overhaul

- `[~]` 6.1 README: add `plugin/` to project structure — Already present (Phase 1 audit fixed).
- `[~]` 6.2 README: update tech stack table — Already fixed (Phase 1).
- `[~]` 6.3 AGENTS.md: add memory plugin section — Already present (Phase 1).
- `[~]` 6.4 AGENTS.md: refresh date — Already updated to 2026-05-08.
- `[ ]` 6.5 relay/README.md: remove "Phase 9" parenthetical — Need to verify.
- `[x]` 6.6 DESIGN.md: file structure overhaul — Fixed in Phase 1.
- `[ ]` 6.7 BENCH.md: correct `audit-report.mjs` usage docs — `--out` behavior misdocumented.

---

## Backlog (Phase 2-6)

### Phase 2: High Priority

- `[ ]` 2.1 Light theme support — Full light palette variant. Currently dark-only.
- `[ ]` 2.2 Session title editing — `Session.title` exists but no edit UI. Need `PATCH /session/:id`.
- `[ ]` 2.3 Memory timeline UI — `memory_timeline` table exists, needs screen.
- `[ ]` 2.4 Memory profile UI — `user_profile` table exists, needs screen.
- `[ ]` 2.5 Session deep linking from push — `sessionID` in payload but opens `/` only.
- `[ ]` 2.6 Message retry / resend — Retry failed prompts, cancel in-flight.
- `[ ]` 2.7 Offline indicator — Show when SSE disconnects or server unreachable.
- `[ ]` 2.8 Session sharing UI — `share.url` field exists but never rendered.
- `[ ]` 2.9 Cost tracking display — `cost` field in Message type, never rendered.
- `[ ]` 2.10 Reasoning token display — `tokens.reasoning` exists, not shown.

### Phase 3: Medium Priority

- `[ ]` 3.1 Memory export / backup — JSON export per server, import/restore.
- `[ ]` 3.2 Memory bulk operations — Multi-select for batch archive/delete.
- `[ ]` 3.3 Semantic memory search — Embed query, find memories.
- `[ ]` 3.4 Memory confidence threshold UI — Slider for extraction confidence (currently 0.65).
- `[ ]` 3.5 Image rendering in messages — Display images from file parts or URLs.
- `[ ]` 3.6 Rich markdown rendering — Headers, lists, links, tables beyond code blocks.
- `[ ]` 3.7 Message editing — Edit sent messages and re-run.
- `[ ]` 3.8 Message deletion — Remove individual messages.
- `[ ]` 3.9 Branching conversations — Fork session at a message.
- `[ ]` 3.10 Font family selection — Toggle between JetBrains Mono, SF Mono, etc.
- `[ ]` 3.11 Biometric auth — Face ID / Touch ID.
- `[ ]` 3.12 Server URL QR scanner — Scan QR to add server.
- `[ ]` 3.13 Session tags / folders — Organize sessions.
- `[ ]` 3.14 Quick reply suggestions — AI-generated follow-ups.
- `[ ]` 3.15 Voice input — Speech-to-text.

### Phase 4: Low Priority / Future Ideas

- `[ ]` 4.1 Android support — `app.json` has config, untested.
- `[ ]` 4.2 iPad / tablet layout — Two-pane layout.
- `[ ]` 4.3 iOS home screen widget — Quick prompt / status.
- `[ ]` 4.4 Apple Watch companion — View status, send quick prompts.
- `[ ]` 4.5 Siri Shortcuts — "Ask OpenCode about..."
- `[ ]` 4.6 Custom themes — User-defined accent/background.
- `[ ]` 4.7 Session analytics — Token/cost charts.
- `[ ]` 4.8 Memory visualization — Graph view.
- `[ ]` 4.9 Collaborative sessions — Pair programming.
- `[ ]` 4.10 Local model fallback — On-device LLM.
- `[ ]` 4.11 File upload — Upload images/documents.
- `[ ]` 4.12 Rich haptic patterns — Different haptics per event.
- `[ ]` 4.13 Accessibility audit — VoiceOver, dynamic type.
- `[ ]` 4.14 Internationalization (i18n) — Multi-language.

### Phase 5: Technical Debt & Testing

- `[x]` 5.1 React Native unit tests — 118 tests across services/ and store/. Jest + ts-jest configured.
- `[ ]` 5.2 E2E tests for mobile app — No Playwright tests for RN.
- `[~]` 5.3 Type cleanup: remove unused `cost`, `share.url`, `tokens.reasoning` if not implemented.
- `[ ]` 5.4 Remove empty `types/` directory — Already removed (directory does not exist).
- `[ ]` 5.5 Document `audit.sh` dev-server utility — No README mention.
- `[~]` 5.6 Plugin test coverage expansion — See `TEST_COVERAGE_PLAN.md`. 8 phases covering services/, plugin/memory/, .opencode/plugins/. Target ~230 tests, 100% coverage.
- `[~]` 5.7 Consolidate embedding provider registry — `embedding_providers` table exists but providers loaded from `ModelRegistry.ts`.

### Phase 6: Documentation Overhaul

- `[~]` 6.1 README: add `plugin/` to project structure — Already present (Phase 1 audit fixed).
- `[~]` 6.2 README: update tech stack table — Already fixed (Phase 1).
- `[~]` 6.3 AGENTS.md: add memory plugin section — Already present (Phase 1).
- `[~]` 6.4 AGENTS.md: refresh date — Already updated to 2026-05-08.
- `[ ]` 6.5 relay/README.md: remove "Phase 9" parenthetical — Need to verify.
- `[x]` 6.6 DESIGN.md: file structure overhaul — Fixed in Phase 1.
- `[ ]` 6.7 BENCH.md: correct `audit-report.mjs` usage docs — `--out` behavior misdocumented.

---

## Milestones

| Milestone  | Target     | Deliverables                                  | Status |
| ---------- | ---------- | --------------------------------------------- | ------ |
| **v0.1.1** | 2026-05-15 | Phase 1 complete (all cleanup + doc fixes)    | `[x]`  |
| **v0.2.0** | 2026-06-01 | Phase 2 complete (high-priority features)     | `[ ]`  |
| **v0.3.0** | 2026-07-01 | Phase 3 complete (medium-priority features)   | `[ ]`  |
| **v0.4.0** | 2026-08-01 | Phase 5 complete (testing + tech debt)        | `[ ]`  |
| **v1.0.0** | 2026-Q4    | Phase 4 features + polish + App Store release | `[ ]`  |
