# Pilot Feature Roadmap

**Project:** Pilot — Web PWA for OpenCode
**Last Updated:** 2026-05-12
**Status:** Active Migration (M1 next)

---

## Migration Phases

| #      | Task                    | Priority  | Deliverable                                                            | Validation                                  | Status   |
| ------ | ----------------------- | --------- | ---------------------------------------------------------------------- | ------------------------------------------- | -------- |
| M0     | ~~Write new DESIGN.md~~ | ✅ Done   | `DESIGN.md` replaced with approved web spec                            | File written                                | Done     |
| M0     | ~~Update TASKS.md~~     | ✅ Done   | `TASKS.md` active area updated                                         | File written                                | Done     |
| **M1** | **Repo restructure**    | 🔴 High   | npm workspaces; remove Expo/RN files; scaffold Hono server + Vite app  | `npm run build` succeeds in both workspaces | **Next** |
| M2     | Core chat parity        | 🔴 High   | SSE, sessions, messages, prompt input, permission cards, mobile layout | 498 ported tests pass + manual smoke test   | Pending  |
| M3     | PWA + remote access     | 🟡 Medium | Manifest, service worker, Cloudflare tunnel+QR, Web Push, iOS banner   | Lighthouse PWA score ≥ 90                   | Pending  |
| M4     | Power features          | 🟡 Medium | xterm.js terminal, CodeMirror file viewer, diff2html Git UI, multi-tab | Terminal sends/receives input; diff renders | Pending  |
| M5     | Memory plugin port      | 🟢 Low    | `plugin/memory/` → `server/src/memory/`; React Memory UI screen        | All ported memory tests pass                | Pending  |

### M1 Detail — Repo Restructure

| Step | Action                                                                                   |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | Add root `package.json` with `workspaces: ["server", "ui", "shared"]`                    |
| 2    | Create `shared/types.ts` (move shared TypeScript types)                                  |
| 3    | Scaffold `server/` — Hono app, `package.json`, `tsconfig.json`                           |
| 4    | Scaffold `ui/` — Vite + React app, `package.json`, `tsconfig.json`                       |
| 5    | Remove Expo/RN files: `app/`, `app.json`, `eas.json`, `expo-env.d.ts`, `babel.config.js` |
| 6    | Remove Expo/RN deps from root `package.json`                                             |
| 7    | Add `pilot start` CLI entry point in `server/src/cli.ts`                                 |
| 8    | Verify `npm run build` succeeds (both workspaces)                                        |

---

## Post-Migration Backlog

Carry-over from the RN backlog, mapped to migration phase:

| Feature                                           | Phase   |
| ------------------------------------------------- | ------- |
| Light theme (system-aware `prefers-color-scheme`) | M2      |
| Session title editing                             | M2      |
| Message retry / resend                            | M2      |
| Rich markdown rendering                           | M2      |
| Cost + reasoning token display in chat            | M2      |
| Session deep linking from push notification       | M3      |
| Offline indicator                                 | M3      |
| Server URL QR (replaced by Cloudflare tunnel QR)  | M3      |
| Memory timeline UI                                | M5      |
| Memory profile UI                                 | M5      |
| Semantic memory search                            | M5      |
| Memory export / backup                            | M5      |
| Image rendering in messages                       | post-M4 |
| Session tags / folders                            | post-M4 |

**Permanently dropped** (iOS-native only, no web equivalent):

- iOS home screen widget
- Apple Watch companion
- Siri Shortcuts
- Face ID / Touch ID _(may revisit with WebAuthn post-M5)_

---

## Milestones

| Milestone  | Target     | Deliverables                                     | Status |
| ---------- | ---------- | ------------------------------------------------ | ------ |
| **v0.1.1** | 2026-05-12 | All RN tech debt cleared. 498 tests passing.     | `[x]`  |
| **v0.2.0** | 2026-05-19 | M1 complete — monorepo scaffolded, Expo removed  | `[ ]`  |
| **v0.3.0** | 2026-06-02 | M2 complete — core chat parity in web app        | `[ ]`  |
| **v0.4.0** | 2026-06-16 | M3 complete — PWA installable, tunnel+QR working | `[ ]`  |
| **v0.5.0** | 2026-07-07 | M4 complete — terminal, editor, diff viewer live | `[ ]`  |
| **v1.0.0** | 2026-08-01 | M5 complete — memory plugin ported, full parity  | `[ ]`  |

---

## Recently Completed

### Pre-Migration: Technical Debt & Testing (v0.1.1 — 2026-05-12)

| #    | Task                                                                        | Status | Notes                                                                                                |
| ---- | --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| 1.1  | Remove dead code: `theme/syntax.ts`                                         | `[x]`  | Deleted file and export from `theme/index.ts`                                                        |
| 1.2  | Consolidate TUI noise fix scripts                                           | `[x]`  | All 3 versions deleted — run-once repair scripts                                                     |
| 1.3  | Fix README tech stack: remove false `react-native-syntax-highlighter` claim | `[x]`  | Updated to "Custom lightweight tokenizer"                                                            |
| 1.4  | Fix DESIGN.md tech stack: remove false `opencode-ai JS SDK` claim           | `[x]`  | Updated to "Custom fetch() wrapper"                                                                  |
| 1.5  | Set up Jest test infrastructure                                             | `[x]`  | `jest.config.js`, `package.json`, `__mocks__/`                                                       |
| 1.6  | Unit tests for `services/`                                                  | `[x]`  | `services/__tests__/api.test.ts`, `logger.test.ts`, `auth.test.ts`                                   |
| 1.7  | Unit tests for `store/`                                                     | `[x]`  | `store/__tests__/session.test.ts`, `server.test.ts`, `log.test.ts`, `ui.test.ts`, `n9router.test.ts` |
| 1.8  | Unit tests for `plugin/memory/`                                             | `[x]`  | All sub-tasks; 92.44% statement coverage                                                             |
| 1.9  | Extract sub-components from oversized files                                 | `[x]`  | `memory.tsx` 1005→654 lines, `settings.tsx` 877→657 lines                                            |
| 1.10 | Fix BENCH.md `--out` docs                                                   | `[x]`  | Corrected output file paths and flag names                                                           |
| 1.11 | Achieve 80%+ test coverage                                                  | `[x]`  | 498 tests, 0 failing. tsc --noEmit clean. lint 0 warnings.                                           |

---

## How to Update This Roadmap

1. When a migration phase is completed, change status to `Done` in the migration table and add it to **Recently Completed**.
2. When a backlog item is implemented, move it from the backlog table to the relevant "Recently Completed" phase.
3. After each sprint, update the **Last Updated** date.
