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

| Date       | Task                                        | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-13 | M5 Memory plugin port                       | `server/src/memory/schema.ts`, `memoryDb.ts`, `MemoryRepository.ts`, `EmbeddingRepository.ts`, `ProfileRepository.ts`, `TimelineRepository.ts`, `memoryRouter.ts`, `server/src/index.ts`, `ui/src/services/memoryApi.ts`, `ui/src/plugin/memory/store/memoryStore.ts`, `ui/src/plugin/memory/hooks/useMemoryExtraction.ts`, `ui/src/plugin/memory/ui/components/MemoryCard.tsx`, `CategoryFilter.tsx`, `EmptyState.tsx`, `ui/src/pages/Memory.tsx`, `ui/src/App.tsx`, `ui/src/components/Layout.tsx`, `ui/src/pages/Chat.tsx`, test files updated | Memory DB ported to server-side better-sqlite3 + Hono router (10 routes). HTTP client + Zustand store rewritten. Memory page + nav entry added. useMemoryExtraction/Injection wired into Chat. 467 tests passing, tsc clean. |
| 2026-05-13 | M4 Power features                           | `server/src/terminal.ts`, `server/src/git.ts`, `server/src/index.ts`, `ui/src/pages/Terminal.tsx`, `ui/src/pages/Files.tsx`, `ui/src/pages/Diff.tsx`, `ui/src/components/CodeMirrorViewer.tsx`, `ui/src/components/Layout.tsx`, `ui/src/App.tsx`, `ui/vite.config.ts`, `ui/src/components/__tests__/CodeMirrorViewer.test.tsx`, `ui/src/pages/__tests__/Terminal.test.tsx`, `ui/src/pages/__tests__/Diff.test.tsx`                                                                                                                                | node-pty WebSocket PTY bridge, simple-git Git UI with diff2html, CodeMirror 6 read-only file viewer, xterm.js multi-tab terminal, split-pane Files page, Diff page with commit form. 467 tests passing. tsc/build clean.     |
| 2026-05-13 | M3 PWA + remote access                      | `ui/public/manifest.webmanifest`, `offline.html`, `icon.svg`, `ui/index.html`, `vite.config.ts`, `ui/src/components/InstallBanner.tsx`, `PushSettings.tsx`, `TunnelSettings.tsx`, `ui/src/services/push.ts`, `tunnel.ts`, `server/src/db.ts`, `push.ts`, `tunnel.ts`, `server/src/index.ts`, `eslint.config.js`, tests                                                                                                                                                                                                                            | PWA manifest, service worker (Workbox), iOS install banner, Web Push (VAPID), Cloudflare tunnel + QR. 441 tests passing. tsc/lint/build all clean.                                                                           |
| 2026-05-13 | Add chrome-devtools-mcp + Playwright E2E    | `opencode.json`, `package.json`, `package-lock.json`, `.gitignore`, `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tests/navigation.spec.ts`, `screenshot.spec.ts`, `console.spec.ts`, `network.spec.ts`, `input.spec.ts`, `emulation.spec.ts`, `performance.spec.ts`                                                                                                                                                                                                                                                                       | chrome-devtools-mcp MCP server added (headless, 40 tools). 59 E2E tests covering navigation, screenshots, console, network, input, emulation, performance. 415 unit + 59 E2E = 474 passing.                                  |
| 2026-05-13 | M2 Core chat parity                         | `server/src/proxy.ts`, `server/src/index.ts`, `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/src/components/Layout.tsx`, `MessageList.tsx`, `PromptInput.tsx`, `PermissionCard.tsx`, `ui/src/pages/Chat.tsx`, `Sessions.tsx`, `Settings.tsx`, `Files.tsx`, `jest.setup.cjs`, `tsconfig.test.json`, `types/modules.d.ts`                                                                                                                                                                                                                                 | Full web chat UI with SSE, sessions, messages, prompt input, permission cards, responsive layout. 415 tests passing (390 existing + 25 new). tsc/lint/build all clean. Server proxy tested.                                  |
| 2026-05-12 | M1 Repo restructure (monorepo)              | `package.json` (root workspaces), `shared/`, `server/`, `ui/` scaffolded, Expo/RN removed, `server/src/cli.ts`, `Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, all `__mocks__/`, `jest.config.cjs`, `jest.setup.cjs`, `tsconfig*.json` per workspace                                                                                                                                                                                                                                                                  | npm workspaces monorepo. 390 tests passing, 0 failing. `tsc --noEmit` clean. `vite build` clean. Docker job enabled.                                                                                                         |
| 2026-05-12 | Enhance directory picker with repo title    | `components/modals/WorkdirSheet.tsx`, `app/(main)/_layout.tsx`, `components/modals/__tests__/WorkdirSheet.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                               | Shows all files/folders from server root. Title displays repo name at root, folder name when navigating. Files visible but non-tappable. 10 new tests. 498 tests passing.                                                    |
| 2026-05-12 | Plan Expo SDK 55 upgrade                    | `EXPO_SDK_55_UPGRADE_PLAN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Research-only task. Analyzed 12 breaking changes; zero affect Pilot. Created dependency matrix + step-by-step upgrade procedure + risk assessment.                                                                           |
| 2026-05-12 | Extract sub-components from oversized files | `app/(main)/memory.tsx`, `settings.tsx`, `diff.tsx`, `files.tsx`, `usage.tsx`, `components/memory/*`, `components/shared/*`                                                                                                                                                                                                                                                                                                                                                                                                                       | memory.tsx 1005→654 lines, settings.tsx 877→657 lines. Unified ScreenHeader replaces 4 independent local defs. tsc --noEmit passes, 488 tests pass.                                                                          |
| 2026-05-12 | Fix BENCH.md `--out` docs                   | `BENCH.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fixed `--json` → `--out` for pilot-bench.mjs; corrected output files table (removed fictional `/tmp/pilot-results.json`, added 4 per-suite temp files + merged JSON path).                                                   |
| 2026-05-12 | Unit tests for `plugin/memory/` hooks/UI    | `plugin/memory/hooks/__tests__/useMemoryInjection.test.ts`, `useMemoryExtraction.test.ts`, `plugin/memory/ui/components/__tests__/EmptyState.test.tsx`, `CategoryFilter.test.tsx`, `MemoryCard.test.tsx`, `plugin/memory/ui/components/MemoryCard.tsx`                                                                                                                                                                                                                                                                                            | 488 tests, 0 failing, 92.44% statements, 90.81% branches, 96.2% functions. All thresholds met.                                                                                                                               |
| 2026-05-11 | Achieve 80%+ test coverage                  | `plugin/memory/__tests__/`, `.opencode/plugins/__tests__/`, `__mocks__/expo-sqlite.ts`, `jest.config.js`                                                                                                                                                                                                                                                                                                                                                                                                                                          | 419 tests, 35 suites, 85.63% statements, 89.78% branches, 93.99% functions. All thresholds met.                                                                                                                              |
| 2026-05-09 | Commit + push doc consolidation             | `AGENTS.md`, `ROADMAP.md`, `FEATURE-ROADMAP.md` (deleted), `TASKS.md` (new)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Commit `7fa1fd2a` on main. Remote updated.                                                                                                                                                                                   |
| 2026-05-09 | Consolidate ROADMAP files                   | `ROADMAP.md` (rewrite), `FEATURE-ROADMAP.md` (delete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Merged Phase 1-6 tables into single roadmap. Reduced from 430 → 368 lines.                                                                                                                                                   |
| 2026-05-09 | Fix README stale refs                       | No changes needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Phase 1 audit already fixed syntax.ts + plugin/ references.                                                                                                                                                                  |
| 2026-05-09 | Fix DESIGN.md SDK claim                     | No changes needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Phase 1 audit already replaced false SDK claim with "Custom REST client built on plain fetch()".                                                                                                                             |
| 2026-05-09 | Update AGENTS.md                            | `AGENTS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Added "Agent Workflow" section referencing TASKS.md; updated Pilot doc link.                                                                                                                                                 |
| 2026-05-09 | Fix AGENTS.md skill count                   | No changes needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Prose already reads "29 skills".                                                                                                                                                                                             |
| 2026-05-09 | Fix README.md plugin/ dir                   | No changes needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Phase 1 already added to project structure.                                                                                                                                                                                  |
| 2026-05-09 | Phase 5: Jest test suite                    | `jest.config.js`, `jest.setup.js`, `__mocks__/`, `services/__tests__/`, `store/__tests__/`                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Commit `c9e42c26` on main. 118 tests, all passing. Remote updated.                                                                                                                                                           |

---

## Active Work Area: PWA Migration

**Triggered by:** Decision on 2026-05-12 to pivot from React Native / Expo to a web-first PWA.
Power features (xterm.js terminal, CodeMirror editor, diff2html, Cloudflare tunnel) are impractical in React Native.
Full rationale and design spec in `DESIGN.md`.

### Migration Phases

| #      | Task                                    | Priority  | Deliverable                                                            | Validation                                  | Status   |
| ------ | --------------------------------------- | --------- | ---------------------------------------------------------------------- | ------------------------------------------- | -------- |
| M0     | ~~Write new DESIGN.md (web PWA spec)~~  | ✅ Done   | `DESIGN.md` replaced with approved web spec                            | File written                                | Done     |
| M0     | ~~Update TASKS.md with migration plan~~ | ✅ Done   | `TASKS.md` active area updated                                         | File written                                | Done     |
| **M1** | ~~**Repo restructure**~~                | ✅ Done   | npm workspaces; remove Expo/RN files; scaffold Hono server + Vite app  | 390 tests passing, builds clean             | **Done** |
| M2     | Core chat parity                        | 🔴 High   | SSE, sessions, messages, prompt input, permission cards, mobile layout | 415 tests passing + manual smoke test       | ✅ Done  |
| M3     | PWA + remote access                     | 🟡 Medium | Manifest, service worker, Cloudflare tunnel+QR, Web Push, iOS banner   | Lighthouse PWA score ≥ 90                   | ✅ Done  |
| M4     | Power features                          | 🟡 Medium | xterm.js terminal, CodeMirror file viewer, diff2html Git UI, multi-tab | Terminal sends/receives input; diff renders | ✅ Done  |
| M5     | Memory plugin port                      | 🟢 Low    | `plugin/memory/` → `server/src/memory/`; React Memory UI screen        | All ported memory tests pass                | ✅ Done  |

### M1 Detail — Repo Restructure

| Step | Action                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | Add root `package.json` with `workspaces: ["server", "ui", "shared"]`                                            |
| 2    | Create `shared/types.ts` (move shared TypeScript types)                                                          |
| 3    | Scaffold `server/` — Hono app, `package.json`, `tsconfig.json`                                                   |
| 4    | Scaffold `ui/` — Vite + React app, `package.json`, `tsconfig.json`                                               |
| 5    | Remove Expo/RN files: `app/`, `app.json`, `eas.json`, `expo-env.d.ts`, `babel.config.js`                         |
| 6    | Remove Expo/RN deps from root `package.json`                                                                     |
| 7    | Add `pilot start` CLI entry point in `server/src/cli.ts`                                                         |
| 8    | Verify `npm run build` succeeds (both workspaces)                                                                |
| 9    | Update `.github/workflows/ci.yml` for monorepo — run typecheck/lint/test per workspace, update cache keys        |
| 10   | Enable Docker release job in `.github/workflows/release.yml` — change `if: false` to `if: true` after Dockerfile |

---

## Completed (Pre-Migration)

### Phase 5 — Technical Debt & Testing (all done)

| #   | Task                                            | Files                                                                                                |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Set up Jest test infrastructure                 | `jest.config.js`, `package.json`, `__mocks__/`                                                       |
| 2   | Unit tests for `services/`                      | `services/__tests__/api.test.ts`, `logger.test.ts`, `auth.test.ts`                                   |
| 3   | Unit tests for `store/`                         | `store/__tests__/session.test.ts`, `server.test.ts`, `log.test.ts`, `ui.test.ts`, `n9router.test.ts` |
| 4   | Unit tests for `plugin/memory/` (all sub-tasks) | `plugin/memory/__tests__/`, `hooks/__tests__/`, `ui/components/__tests__/`                           |
| 5   | Clean ESLint warnings                           | `components/modals/ModelModal.tsx`, `TitleEditModal.tsx`                                             |
| 6   | Fix BENCH.md `--out` docs                       | `BENCH.md`                                                                                           |
| 7   | Extract sub-components from oversized files     | `app/(main)/memory.tsx`, `settings.tsx`, `diff.tsx`, `files.tsx`, `usage.tsx`                        |
| 8   | Plan Expo SDK 55 upgrade                        | `EXPO_SDK_55_UPGRADE_PLAN.md`                                                                        |

Final state before migration: **498 tests passing, 0 failing. tsc --noEmit passes. npm run lint → 0 warnings.**

---

## Post-Migration Backlog

These items carry over from the RN backlog and will be implemented in the web PWA:

- Light theme (system-aware via `prefers-color-scheme`) — M2
- Session title editing — M2
- Memory timeline UI — M5
- Memory profile UI — M5
- Session deep linking from push notification — M3
- Message retry / resend — M2
- Offline indicator — M3
- Cost + token display in chat — M2
- Semantic memory search — M5
- Memory export / backup — M5
- Image rendering in messages — post-M4
- Rich markdown rendering — M2
- Session tags / folders — post-M4
- Server URL QR (replaced by Cloudflare tunnel QR) — M3

Items permanently dropped (iOS-native only, no web equivalent):

- iOS home screen widget
- Apple Watch companion
- Siri Shortcuts
- Face ID / Touch ID (may revisit with WebAuthn)

---

## Milestones

| Milestone  | Target     | Deliverables                                     | Status |
| ---------- | ---------- | ------------------------------------------------ | ------ |
| **v0.1.1** | 2026-05-12 | All RN tech debt cleared. 498 tests passing.     | `[x]`  |
| **v0.2.0** | 2026-05-19 | M1 complete — monorepo scaffolded, Expo removed  | `[x]`  |
| **v0.3.0** | 2026-06-02 | M2 complete — core chat parity in web app        | `[ ]`  |
| **v0.4.0** | 2026-06-16 | M3 complete — PWA installable, tunnel+QR working | `[ ]`  |
| **v0.5.0** | 2026-07-07 | M4 complete — terminal, editor, diff viewer live | `[x]`  |
| **v1.0.0** | 2026-08-01 | M5 complete — memory plugin ported, full parity  | `[x]`  |
