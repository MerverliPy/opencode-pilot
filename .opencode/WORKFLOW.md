# OpenCode Workflow

This project uses a token-lean n9router-directed OpenCode workflow.

## Primary agents

- `orchestrator`: default primary agent; routes work and synthesizes results; read-only.
- `implementer`: trusted edit-capable TypeScript/React/Hono implementation owner.
- `planner`: read-only implementation and migration planning.
- `verifier`: read-only build/type/test/lint gatekeeper.
- `maintainer`: trusted edit-capable docs/refactor/workflow maintenance owner.

## Subagents

- Discovery: `context-scout`, `docs-scout`.
- Design/testing: `architect`, `test-strategist`.
- Review: `typescript-reviewer`, `code-reviewer`, `security-auditor`, `performance-reviewer`.
- Trusted fixers/updaters: `build-fixer`, `e2e-runner`, `docs-updater`.

## Command surface

- `/plan`
- `/implement`
- `/verify`
- `/review`
- `/fix-build`
- `/e2e`
- `/docs`
- `/setup-n9router`

## Skills

Skills are intentionally limited to Pilot-relevant guidance and should be loaded only on demand:

- `pilot-architecture`
- `typescript-react-hono`
- `tdd-verification`
- `security-review`
- `e2e-playwright`
- `n9router-workflow`
- `codemap-maintenance`
- `plugin-safety`

## MCP posture

`sequential-thinking` is enabled for low-risk planning support. High-risk/context-heavy MCPs (`github`, `memory`, `filesystem`, `chrome-devtools`) are disabled by default and should be enabled only for a specific workflow.
