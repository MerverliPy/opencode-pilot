# Repository Deep Audit Report

**Date:** 2026-05-08
**Scope:** Full filesystem audit for false information, dead code, outdated docs, and redundancy
**Auditor:** OpenCode Orchestrator

---

## Executive Summary

This audit found **27 issues** across 5 categories:
- **Critical:** 4 issues (false claims about core dependencies/models)
- **High:** 8 issues (significant documentation inaccuracies, dead code)
- **Medium:** 9 issues (outdated references, minor doc mismatches)
- **Low:** 6 issues (cosmetic/stale items)

## Remediation Status

**Phase 1 cleanup was executed immediately after the audit.** The following items have been resolved:

| # | Issue | Action Taken |
|---|-------|-------------|
| 1 | `theme/syntax.ts` dead code | **DELETED** file; removed export from `theme/index.ts` |
| 2 | `.gitignore.bak.20260508-194835` | **DELETED** |
| 3-4 | 3× `opencode-fix-tui-noise*.sh` scripts | **ALL DELETED** — these were run-once repair scripts, not part of the project |
| 5 | README false claim: `react-native-syntax-highlighter` | **FIXED** → "Custom lightweight tokenizer" |
| 6 | DESIGN false claim: `react-native-syntax-highlighter` | **FIXED** → "Custom lightweight tokenizer" |
| 7 | DESIGN false claim: `opencode-ai JS SDK` | **FIXED** → "Custom `fetch()` wrapper (`OpencodeClient`)" |
| 8 | DESIGN reanimated v3 claim | **FIXED** → v4 |
| 9 | DESIGN.md file structure (modals path, non-existent files) | **FIXED** — corrected to `components/modals/`, removed `PromptToolbar.tsx` and `DrawerItem.tsx`, added `ErrorBadge.tsx`, `ErrorBoundary.tsx`, `ModalShell.tsx`, `WorkdirSheet.tsx` |
| 10 | DESIGN.md `syntax.ts` in file tree | **FIXED** → `index.ts` |
| 11 | ROADMAP false claim: model standardization | **FIXED** — rephrased to note provider format variance |
| 12 | ROADMAP false claim: agent model tiering | **FIXED** — rephrased to "agent model configuration" |
| 13 | AGENTS.md stale date (2026-02-02) | **FIXED** → 2026-05-08 |
| 14 | AGENTS.md missing memory plugin | **FIXED** — added Pilot section with memory plugin mention |
| 15 | AGENTS.md incomplete skill list (12 listed, 29 exist) | **FIXED** — expanded to all 29 skills |
| 16 | AGENTS.md incomplete command list | **FIXED** — expanded from 17 to all 24 commands |
| 17 | AGENTS.md missing rules/plugins/MCP docs | **FIXED** — added sections for rules, plugins, and MCP servers |
| 18 | README missing `plugin/` directory | **FIXED** — added `plugin/memory/` to project structure |
| 19 | README missing `logger.ts` | **FIXED** — `services/` now lists `logger.ts` |
| 20 | README missing `log` store | **FIXED** — `store/` now lists `log` |
| 21 | relay/README.md Phase 9 parenthetical | **FIXED** — removed "(once Phase 9 wiring is complete)" |
| 22 | `.gitignore` missing audit HTML pattern | **VERIFIED** — `pilot-audit-*.html` already present at line 8 |

**Remaining open items** (not addressed in Phase 1):
- BENCH.md `audit-report.mjs` usage documentation (medium)
- `cost`, `share.url`, `tokens.reasoning` type fields — need UI implementation or removal (medium/low)
- `store/log.ts` usage verification (low)
- Empty `types/` directory (low)
- `audit.sh` documentation (low)
- Old audit HTML files in repo root (low — already in `.gitignore`)

---

## 1. Dead Code & Unused Files

| # | File | Issue | Severity | Action |
|---|------|-------|----------|--------|
| 1 | `theme/syntax.ts` | Exported in `theme/index.ts` but **never imported anywhere** in the app. The app uses a custom lightweight tokenizer in `CodeBlock.tsx`. Confirmed dead code. | High | Remove file and export from `theme/index.ts` |
| 2 | `.gitignore.bak.20260508-194835` | Old backup file created during migration. Not referenced anywhere. | Low | Delete |
| 3 | `opencode-fix-tui-noise.sh` | **3 versions** of the same script exist (`v2`, `v3`, and original). Only the newest should be kept. | Medium | Consolidate to one script or delete all if no longer needed |
| 4 | `opencode-fix-tui-noise-v2.sh` | Redundant duplicate of TUI noise fix script. | Medium | Delete if superseded by v3 |
| 5 | `pilot-audit-2026-05-08-11-59.html` | Multiple old HTML audit reports accumulating in repo root. | Low | Add to `.gitignore` or move to `reports/` directory |
| 6 | `pilot-audit-2026-05-08-12-15.html` | Same as above. | Low | Archive or delete old reports |
| 7 | `pilot-audit-2026-05-08-17-10.html` | Same as above. | Low | Archive or delete old reports |

---

## 2. False Information in Documentation

| # | Document | Claim | Reality | Severity | Action |
|---|----------|-------|---------|----------|--------|
| 1 | `README.md` line 41 | Tech stack: "react-native-syntax-highlighter" | **NOT in `package.json`**. App uses custom tokenizer. | **Critical** | Remove from README or add dependency |
| 2 | `DESIGN.md` line 49 | Tech stack: "react-native-syntax-highlighter" | **NOT in `package.json`**. Same as above. | **Critical** | Remove from DESIGN.md |
| 3 | `DESIGN.md` line 47 | Tech stack: "opencode-ai JS SDK" for API client | App uses **plain `fetch()`** via custom `OpencodeClient` class (`services/api.ts`). The SDK is NOT in `package.json` and NOT used. | **Critical** | Correct to "Custom fetch-based REST client" |
| 4 | `DESIGN.md` line 51 | Animations: "react-native-reanimated v3" | `package.json` has `"react-native-reanimated": "~4.1.1"`. README correctly says v4. | **Critical** | Update to v4 |
| 5 | `ROADMAP.md` line 240 | "Updated all agent configs to use `github-copilot/claude-sonnet-4` format" | **ALL 13 agents still use `model: claude-sonnet-4.6`** (checked every `.opencode/agents/*.md`). The claimed standardization never happened. | **Critical** | Either fix all agent configs or remove the false claim |
| 6 | `ROADMAP.md` line 243 | "Agent model tiering — Updated all agent prompts to active providers with tiered sizing" | **ALL agents use the SAME model** (`claude-sonnet-4.6`). No tiering exists (no lightweight vs heavy model distribution). | High | Remove false claim or implement actual tiering |
| 7 | `AGENTS.md` | "30+ skills" | Only **29 skill directories** exist in `.opencode/skills/`. Count: backend-patterns, clickhouse-io, coding-standards, continuous-learning, continuous-learning-v2, django-patterns, django-security, django-tdd, django-verification, eval-harness, frontend-patterns, golang-patterns, golang-testing, iterative-retrieval, java-coding-standards, jpa-patterns, postgres-patterns, project-guidelines-example, python-patterns, python-testing, security-review, springboot-patterns, springboot-security, springboot-tdd, springboot-verification, strategic-compact, tdd-workflow, verification-loop | Medium | Correct to "29 skills" |
| 8 | `AGENTS.md` | "4 plugins" listed: session-manager, tool-guardrails, code-quality, strategic-compact | **5 plugin files exist** (including `index.ts`). `opencode.json` references 4, but `index.ts` exports all 4. The count is technically correct but the file count is 5. | Low | Clarify or ignore |
| 9 | `BENCH.md` line 55 | Claims `node audit-report.mjs --in /tmp/out.json --out ./report.html` | The script actually **prints the path to stdout**, it does NOT write to the `--out` path directly when invoked standalone. The `bench.sh` wrapper captures the stdout path. | Medium | Correct documentation to match actual behavior |

---

## 3. Wrong File Paths / Structure Claims

| # | Document | Claim | Reality | Severity | Action |
|---|----------|-------|---------|----------|--------|
| 1 | `DESIGN.md` line 234-248 | File structure shows modals in `app/modals/` directory | Modals are in **`components/modals/`**. `app/modals/` does NOT exist. | High | Fix all paths in DESIGN.md structure diagram |
| 2 | `DESIGN.md` line 242 | Mentions `PromptToolbar.tsx` | File does NOT exist. Toolbar is inline in `app/(main)/index.tsx`. | High | Remove from file structure or note as inline |
| 3 | `DESIGN.md` line 238 | Mentions `DrawerItem.tsx` | File does NOT exist. Only `DrawerContent.tsx` exists. | Medium | Remove from file structure |
| 4 | `DESIGN.md` line 182 | "Thin wrapper around the official `opencode-ai` SDK" | There is NO SDK wrapper. The code uses raw `fetch()`. | High | Correct the description |
| 5 | `README.md` line 95 | Project structure: `├── theme/ # colors.ts, fonts.ts, syntax.ts` | `syntax.ts` is dead code (see Dead Code #1). | Low | Remove `syntax.ts` from description |

---

## 4. Outdated / Stale Documentation

| # | Document | Issue | Severity | Action |
|---|----------|-------|----------|--------|
| 1 | `AGENTS.md` footer | "Last Updated: 2026-02-02" | Today is 2026-05-08. Docs are 3+ months stale. Many features (memory plugin, benchmarks, push actions) were added since then and are not documented. | High | Update date and add memory plugin section |
| 2 | `AGENTS.md` | Does NOT mention the Memory Plugin at all | The memory plugin is a major feature with UI, database, embeddings, 8 providers, etc. Completely absent from AGENTS.md. | High | Add memory plugin to project overview |
| 3 | `README.md` | Project structure does NOT include `plugin/` directory | The memory plugin lives in `plugin/memory/` with 15+ files. Not mentioned. | Medium | Add `plugin/` to project structure |
| 4 | `relay/README.md` line 39 | "(once Phase 9 wiring is complete)" | Phase 9 (Push notifications) IS complete per ROADMAP. This note implies it's not done. | Medium | Remove parenthetical or rephrase |
| 5 | `AGENTS.md` Migration Notes | "Agents now use OpenCode frontmatter format with `mode: subagent`" | This is stale. All agents HAVE been migrated. The note is no longer useful. | Low | Remove or move to historical notes |
| 6 | `ROADMAP.md` line 237 | "PostCSS security patch" in Recently Completed | The `postcss` override is still in `package.json` but this was a one-time fix. No action needed, but the item is genuinely completed. | Low | None — just noting it's historical now |

---

## 5. Missing Documentation / Undocumented Features

| # | Feature | Where it exists | What's missing | Severity |
|---|---------|----------------|---------------|----------|
| 1 | Memory Plugin UI | `plugin/memory/ui/`, `app/(main)/memory.tsx` | Not mentioned in README, AGENTS.md, or DESIGN.md | High |
| 2 | Benchmark suite | `pilot-bench.mjs`, `pilot-load.mjs`, etc. | Only BENCH.md documents it; README has minimal mention | Medium |
| 3 | Audit/dev server script | `audit.sh` | No documentation exists for this utility | Low |
| 4 | Plugin layer (OpenCode) | `.opencode/plugins/` | AGENTS.md mentions plugins but doesn't explain what they do | Medium |
| 5 | Store log system | `store/log.ts` | Debug log feature is not documented outside settings UI | Low |

---

## 6. Code Quality / Structural Issues

| # | Issue | Location | Severity | Action |
|---|-------|----------|----------|--------|
| 1 | `cost` field in `Message` type is never rendered | `services/types.ts` line 99 | Medium | Either implement cost display or remove from type |
| 2 | `share.url` field in `Session` type has no UI | `services/types.ts` line 12 | Medium | Either implement sharing UI or remove from type |
| 3 | `tokens.reasoning` exists but not shown separately | `services/types.ts` line 100 | Low | Add reasoning token display or remove field |
| 4 | `useLogStore` (`store/log.ts`) — check if it's used | `store/log.ts` | Low | Verify usage; if unused, it's dead code |
| 5 | `types/` directory is empty | `types/` | Low | Remove empty directory or add shared types |

---

## Recommendations Summary

### Immediate Actions (Critical/High)
1. **Fix agent model configs** — Either update all 13 agents to use `github-copilot/claude-sonnet-4` as claimed, or remove the false ROADMAP claim.
2. **Remove dead code** — Delete `theme/syntax.ts` and its export from `theme/index.ts`.
3. **Fix DESIGN.md tech stack** — Remove `react-native-syntax-highlighter` and `opencode-ai JS SDK` claims. Update reanimated to v4.
4. **Fix DESIGN.md file structure** — Correct modal paths to `components/modals/`, remove `PromptToolbar.tsx` and `DrawerItem.tsx`.
5. **Update AGENTS.md** — Update "Last Updated" date, add memory plugin section, correct skill count to 29.
6. **Clean up redundant scripts** — Consolidate or delete old `opencode-fix-tui-noise.sh` versions.
7. **Archive old audit HTML files** — Move to `reports/` or `.gitignore` them.

### Medium Priority
8. Update README project structure to include `plugin/` directory.
9. Fix `relay/README.md` Phase 9 note.
10. Remove or implement `cost`, `share.url`, and `tokens.reasoning` UI features.
11. Document the `audit.sh` dev-server utility.
12. Clean up `.gitignore.bak` file.

### Low Priority
13. Remove stale migration notes from AGENTS.md.
14. Consider removing empty `types/` directory.
15. Add `pilot-audit-*.html` to `.gitignore`.

---

*End of Audit Report*
