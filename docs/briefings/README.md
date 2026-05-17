# 🎯 Briefing Card Index — Test & Performance Overhaul + Chat Rewrite

> **Ultra-compact per-phase briefings.** Each card ~100-200 tokens.
> Agent reads index → picks phase → reads card → executes.
> Full plan at `docs/test-overhaul-plan.md` — use briefings for daily work.

## Phase Quick-Reference

| Phase | Card | Tasks | Effort | Deps | Verify |
|-------|------|-------|--------|------|--------|
| P0 ⚡ | [Quick Wins](P0.md) | 8 | ~2h | none | `typecheck -w server && typecheck -w ui` |
| P1 🧪 | [Server Unit Tests](P1.md) | 6 | ~4h | P0.5,P0.6 | `typecheck -w server && test -w server && coverage` |
| P2 🔌 | [Server Integration](P2.md) | 2 | ~3h | P1 batch 1a | `typecheck -w server && test -w server` |
| P3 🔒 | [Security Expansion](P3.md) | 6 | ~3.5h | P0.1,P0.2,P0.4 | `typecheck -w server && test -w server` |
| P4 🖥️ | [UI Unit Tests](P4.md) | 8 | ~3.5h | P1 | `typecheck -w ui && test -w ui` |
| P5 🎭 | [Mock Replacement](P5.md) | 2 | ~45m | none | `typecheck -w ui && test -w ui` |
| P6 🌐 | [E2E Expansion](P6.md) | 8 | ~8.5h | P5 | `typecheck -w ui && typecheck -w e2e` |
| P7 📊 | [Benchtest Real Data](P7.md) | 4 | ~2.5h | P0,P1 | `benchtest:quick` |
| P8 🏎️ | [Long-term Opts](P8.md) | 6 | ~3d | P7 | `build && test && test:e2e` |
| P9 🚀 | [Direct Chat Endpoint](P9.md) | 6 | ~1.5h | P8 | `typecheck -w server && test -w server` |
| P10 💬 | [Simple Chat UI](P10.md) | 8 | ~4h | P9 | `typecheck -w ui && test -w ui` |
| P11 🔍 | [Debug Log System](P11.md) | 6 | ~1.5h | P9 | `typecheck -w server && typecheck -w ui` |
| P12 ✨ | [Polish & Multi-model](P12.md) | 8 | ~3h | P10,P11 | `build && test && test:e2e` |
| P13 🔍 | [Workflow Audit & QA](P13.md) | 6 | ~2h | none | `bash -n scripts/dogfood-qa.sh` |

## Dependency DAG

```
P0 (no deps)
 ├── P1 ── P2
 ├── P3
 ├── P4
P5 (no deps) ─── P6
P0+P1 ─── P7 ─── P8
                   └── P9
                        ├── P10 ─── P12
                        └── P11 ────┘
```

**Parallelism allowed:** P3/P4/P5 can run in parallel with P1/P2. P11 parallel with P10.
**P13:** No dependencies — runs anytime. Independent of all other phases.

## How to Use

1. Scan index → find phase with ⏳ status whose deps are ✅
2. Read that phase's briefing card (~100-200 tokens)
3. Assign yourself in `docs/test-overhaul-plan.md` (Agent Sign-Off Registry + task row)
4. Execute task, run verification
5. Sign off in main plan's phase sign-off block

## Status Legend

| Badge | Meaning |
|-------|---------|
| ⏳ | Not Started |
| 🔄 | In Progress |
| ✅ | Completed |
| 🚫 | Blocked |

## Agent Sign-Off Format

Fill this in the main plan document on completion:

```yaml
signed_by:   <role>       # e.g. Implementer
model:       <provider/model>
date:        YYYY-MM-DD
verification: "<cmd> (N/N passing)"
difficulties: "<issue>"
decisions:   "<rationale>"
```

## Test Failure Fix Plan — Batches

| Batch | Files | Fixes issue(s) | Est. lines changed |
|-------|-------|----------------|--------------------|
| 1 | routes.spec.ts, console.spec.ts | 4 failures (#1, #2, #3, indirectly #4/#5) | ~6 |
| 2 | Sessions.tsx, wcag.spec.ts | 2 failures (#4, #5) | ~10 |
| 3 | interaction.spec.ts, performance-regression.spec.ts | 2 failures (#6, #7) | ~6 |
| 4 | benchtest/package.json, benchtest/tsconfig.json | 5 benchtest scenarios | ~6 |

---

## Cross-Cutting Audit Findings

### 🔴 Critical: Secrets in `opencode.json`

| Type | Location | Risk |
|------|----------|------|
| GitHub PAT | `opencode.json:32` | Token exfiltration via agent reads |
| n9router API key | `opencode.json:108` | Provider takeover |

**Fix:** Move both to env vars (`$GITHUB_TOKEN`, `$N9ROUTER_API_KEY`).

### Agent Permission Optimizations

| Agent | Change | Why |
|-------|--------|-----|
| orchestrator | Add `implementer: allow` | Chain plan→implement inline |
| verifier | Add `code-reviewer`, `typescript-reviewer: allow` | Route analysis without round-trip |
| implementer | Add `e2e-runner: allow` | Write E2E tests on UI changes |
| context-scout | Broaden `find` pattern | Covers future workspaces |
| planner | Change `docs-scout: ask`→`allow` | Unblock external doc research |
| security-auditor | Default to `v4-flash` | Save tokens on routine audits |

### Workflow Gaps

| Issue | Fix |
|-------|-----|
| pilot-core.md missing remediation.md xref | Add one-line reference |
| WORKFLOW.md missing `/docs` command + `security-auditor` | Update agent topology |
| `.opencode/.gitignore` stale entries | Clean up nonexistent references |

---

> **P13 task card:** see `docs/briefings/P13.md` (create if not exists) or `docs/test-overhaul-plan.md` Phase 13.
