---
name: workflow-routing
description: "Use to route Pilot tasks by changed files, risk labels, reviewer fanout, and verification gates."
compatibility: opencode
---

# Workflow routing

## First pass

1. Use `pilot_changed_files` when a diff exists.
2. Use `change-classifier` for broad requests or ambiguous scope.
3. Use `context-pack-builder` before implementation unless exact files and tests are already known.
4. Use `pilot_risk_scan` before review fanout.
5. Use `pilot_verify_plan` before running verification.

## Route matrix

| Change type | Agent route | Verification |
| --- | --- | --- |
| `shared/src/**` | `api-contract-reviewer`, `typescript-reviewer` | `npm run typecheck -w shared` |
| `server/src/**` | `architect` when design changes, then `implementer` | `npm run typecheck -w server` |
| `server/src/**/routes/**` | `api-contract-reviewer`, `security-auditor` when inputs change | `npm run typecheck -w server` |
| `ui/src/**` | `ui-render-reviewer` when rendering or state changes | `npm run typecheck -w ui`, `npm run test -w ui` |
| `e2e/**` | `e2e-runner` | targeted Playwright or `npm run test:e2e` |
| `.opencode/**` | `code-reviewer`, `plugin-safety`, `workflow-profiler` when benchmarked | `npm run check:opencode` |
| terminal/proxy/tunnel/SSE | `terminal-stream-reviewer`, `security-auditor`, `performance-reviewer` | server typecheck plus targeted E2E when user-facing |

## Fanout limit

Default to at most three reviewers. Escalate only when risk labels cross independent surfaces.
