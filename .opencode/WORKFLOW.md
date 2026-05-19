# OpenCode Workflow

This project uses a token-lean, n9router-directed OpenCode workflow optimized for classification, compact context handoffs, single edit ownership, targeted verification, and risk-based review.

For the full operational manual, command examples, scripts, plugins, tools, and maintenance procedures, see:

```text
docs/opencode-workflow-guide.md
```

## Runtime entry points

- `opencode.json.example`: local OpenCode config template.
- `AGENTS.md`: repository orientation and core npm scripts.
- `.opencode/rules/pilot-core.md`: canonical token, edit, verification, and security policy.
- `.opencode/agents/*.md`: primary agents and subagents.
- `.opencode/commands/*.md`: TUI slash commands.
- `.opencode/skills/*/SKILL.md`: on-demand domain playbooks.
- `.opencode/tools/*.ts`: deterministic custom tools.
- `.opencode/plugins/*.ts`: auto-loaded runtime hooks.

## Default route

OpenCode defaults to `orchestrator`, a read-only routing agent.

Normal feature workflow:

```text
triage -> context -> plan -> implement -> verify -> review
```

Performance-sensitive or workflow-sensitive tasks may add:

```text
bench/profile -> targeted workflow adjustment -> benchmark verification
```

## Primary agents

- `orchestrator`: default read-only workflow router and result synthesizer.
- `implementer`: trusted edit-capable TypeScript/React/Hono implementation owner.
- `verifier`: read-only build/type/test/lint gatekeeper.
- `planner`: read-only implementation planner.
- `maintainer`: trusted edit-capable docs/refactor/workflow maintenance owner.

## Key subagents

- Routing/discovery: `change-classifier`, `context-pack-builder`, `context-scout`, `docs-scout`.
- Design/testing: `architect`, `test-strategist`.
- Repair: `build-fixer`, `e2e-runner`, `docs-updater`.
- Review: `code-reviewer`, `typescript-reviewer`, `api-contract-reviewer`, `security-auditor`, `performance-reviewer`, `sqlite-memory-reviewer`, `terminal-stream-reviewer`, `ui-render-reviewer`, `workflow-profiler`.

## Command surface

Core commands:

```text
/triage
/context
/plan
/implement
/verify
/preflight
/review
/perf
/fix-build
/e2e
/docs
/setup-n9router
/bench
```

## Custom Pilot tools

The deterministic tools in `.opencode/tools/pilot.ts` are exposed to agents as:

```text
pilot_changed_files
pilot_risk_scan
pilot_verify_plan
pilot_repo_map
```

These tools classify changed files, identify risk labels, select verification commands, and summarize repository/workspace structure.

## Plugin posture

Project-local plugins in `.opencode/plugins/` are auto-loaded by OpenCode. Do not also list those same files in `opencode.json`, or hooks may run twice.

Current plugin roles:

- `n9router-director.ts`: n9router-related routing support.
- `tool-guardrails.ts`: destructive command, secret-file, dev-server, dependency-change, and doc-sprawl guardrails.
- `rtk-compressor.ts`: general tool-output compression.
- `build-log-compressor.ts`: TypeScript/ESLint/Jest/Playwright/Vite/npm log compression.
- `benchtest-metrics.ts`: gated benchmark instrumentation.

## Verification

Full local verification:

```bash
npm run check:opencode
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

Use `/preflight` for changed-file-aware verification during normal development.
