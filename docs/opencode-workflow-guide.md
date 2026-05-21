# Pilot OpenCode Workflow Guide

This document explains the `.opencode` workflow used by Pilot: how OpenCode loads it, what each agent, command, tool, plugin, and skill does, and which scripts to run for day-to-day work.

Pilot is a TypeScript monorepo with:

- `server/`: Hono + Node APIs, terminal/session/proxy/tunnel flows, SQLite-backed memory modules.
- `ui/`: React + Vite PWA, Zustand stores, CodeMirror/xterm UI, Jest tests.
- `shared/`: shared TypeScript contracts.
- `e2e/`: Playwright tests.
- `benchtest/`: workflow benchmark and instrumentation harness.

The OpenCode workflow is designed for three goals:

1. **Token discipline**: classify and pack context before reading large file sets.
2. **Single edit ownership**: only one edit-capable agent owns a file set at a time.
3. **Narrow verification first**: run the cheapest command that proves the change before broader gates.

---

## 1. OpenCode runtime setup

### 1.1 Install dependencies

```bash
npm install
```

### 1.2 Configure OpenCode locally

Copy the example config and edit your local provider settings:

```bash
cp opencode.json.example opencode.json
$EDITOR opencode.json
```

Rules for `opencode.json`:

- Keep `default_agent` as `orchestrator` unless testing a specific agent.
- Keep committed config free of secrets.
- Add provider secrets only to local, gitignored config.
- Do not include local `opencode.json`, `*.db`, `*.db-shm`, or `*.db-wal` files in audit bundles.
- Do not list project-local `.opencode/plugins/*` files in the `plugin` array. OpenCode auto-loads project plugins from `.opencode/plugins/`; listing the same files manually can double-run hooks.
- Keep model entries routed through `n9router/*` unless deliberately testing a direct provider route.

### 1.3 Start OpenCode

Start the TUI in the current repository:

```bash
opencode
```

Start OpenCode for this repo from another directory:

```bash
opencode /path/to/opencode-pilot
```

Run a non-interactive one-shot prompt:

```bash
opencode run "Summarize the Pilot OpenCode workflow and list the verification gates."
```

Select a specific agent for an ad hoc run:

```bash
opencode --agent orchestrator
opencode --agent verifier
opencode run --agent orchestrator "Triage the current diff and propose verification gates."
```

### 1.4 Recommended first smoke check

Inside the OpenCode TUI, run:

```text
/triage current diff
/context current diff
/preflight
```

---

## 2. Current `.opencode` inventory and drift notes

Current runtime inventory:

| Surface | Current contents | Notes |
| --- | ---: | --- |
| Agents | 37 markdown agents (6 primary, 31 subagents) | Generated inventory is tracked in `docs/opencode-inventory.md`. |
| Commands | 26 slash commands | Generated inventory is tracked in `docs/opencode-inventory.md`. |
| Skills | 30 skill playbooks | Generated inventory is tracked in `docs/opencode-inventory.md`. |
| Tools | 1 TypeScript tool module, 4 exported tools | Exposed as `pilot_*` tools. |
| Plugins | 6 TypeScript plugin files | `n9router-director.ts` is now explicitly documented. |
| Rules | `pilot-core.md` | Canonical token/edit/verification/security policy. |
| Codemap/plans | `codemap/`, `plans/` | Lightweight workflow context and queued task metadata. |


Run `npm run write:opencode-inventory` after adding/removing agents, commands, skills, plugins, tools, or rules. Run `npm run check:opencode-inventory` in CI/preflight to catch drift between the filesystem and generated docs.

Critical observations from the current `.opencode` review:

- The generated inventory is the authoritative runtime count for agents, commands, skills, plugins, tools, and rules.
- `audit-tracker` is read-only and intentionally token-minimal. It reads `TASKS.md`, compares `.opencode/plans/next-task.json` only as a generated pointer, and reports mismatches instead of overriding the agenda.
- Current active work is the `TASKS.md` **Tailscale Security Readiness v0.4.1 — Tier 0** queue; it supersedes feature-completeness tasks until P26-P36 are complete or explicitly deferred.
- Legacy deep-audit trackers are reference-only unless the user explicitly asks for historical remediation context.
- `pilot-self-run` is operational rather than advisory. It checks ports, stops stale Pilot processes, starts the server/UI stack, verifies health, and returns connection URLs.
- `n9router-director` is loaded as a project-local plugin. It currently warns on `session.created` and emits a warning when `opencode.json` edits introduce non-`n9router/*` model entries.
- `maintainer` is a primary edit-capable agent, but normal automatic routing should still prefer `/docs`, `/implement`, or direct `opencode run --agent maintainer` invocation when maintenance ownership is required.

---

## 3. Load model: what OpenCode reads

OpenCode composes this project workflow from these layers:

| Layer | Path | Purpose |
| --- | --- | --- |
| Project config | `opencode.json` | Runtime provider, default agent, permissions, MCP servers, watcher ignores. |
| Repo orientation | `AGENTS.md` | Repository map, required workflow, core npm scripts. |
| Canonical policy | `.opencode/rules/pilot-core.md` | Token policy, edit policy, verification policy, security policy. |
| Agents | `.opencode/agents/*.md` | Role-specific agent instructions, permissions, step budgets. |
| Commands | `.opencode/commands/*.md` | Slash commands available in the TUI. |
| Skills | `.opencode/skills/*/SKILL.md` | Domain playbooks loaded only when relevant. |
| Tools | `.opencode/tools/*.ts` | Custom deterministic tools available to agents. |
| Plugins | `.opencode/plugins/*.ts` | Runtime hooks for routing, guardrails, compression, metrics. |

The current workflow starts from `orchestrator` by default. The orchestrator is read-only and routes work to scouts, planners, implementers, verifiers, and targeted reviewers.

---

## 4. High-level workflow

Use this path for normal engineering work:

```text
triage -> context -> plan -> implement -> verify -> review -> bench/profile when needed
```

Expanded:

1. **Triage**: classify the request or current diff into workspace, risk labels, agents, and verification gates.
2. **Context pack**: collect only files, symbols, tests, commands, constraints, and risks needed by the next agent.
3. **Plan**: define goal, non-goals, affected files, implementation batches, risks, and gates.
4. **Implement**: one edit-capable owner makes a minimal coherent diff.
5. **Verify**: run the narrowest adequate command first.
6. **Review**: call only reviewers matching the risk scan.
7. **Profile**: run benchtest and metrics only when workflow performance is relevant.

Canonical implementation command:

```text
/implement <specific task>
```

Canonical pre-merge gate:

```text
/preflight
```

---

## 5. Agents

Agents are configured in `.opencode/agents/*.md`. Each agent has a mode, permission profile, optional model, and step budget.

### 5.1 Primary agents

| Agent | Edits files | Main use | Notes |
| --- | ---: | --- | --- |
| `orchestrator` | No | Default router and synthesizer | Starts with classifier/context pack and delegates narrowly. |
| `implementer` | Yes | Main TypeScript/React/Hono implementation owner | Uses context packs and targeted reviewers. |
| `verifier` | No | Build/type/test/lint gatekeeper | Uses changed-file-aware verification. |
| `planner` | No | Implementation and migration planning | Use when changes are non-trivial. |
| `maintainer` | Yes | Docs/refactor/workflow maintenance | Use for deliberate workflow/doc upkeep. Prefer direct invocation when needed. |

### 5.2 Discovery and routing agents

| Agent | Edits files | Use when |
| --- | ---: | --- |
| `change-classifier` | No | You need a fast route from a request or diff to workspaces, risk labels, agents, and gates. |
| `context-pack-builder` | No | The next agent needs compact, actionable context without rereading the repository. |
| `context-scout` | No | You need broader repository discovery, but still want bounded output. |
| `docs-scout` | No | The task requires external/OpenCode/n9router documentation lookup. |

### 5.3 Design, testing, and repair agents

| Agent | Edits files | Use when |
| --- | ---: | --- |
| `architect` | No | The design crosses packages or changes core boundaries. |
| `test-strategist` | No | You need a test plan or verification matrix. |
| `build-fixer` | Yes | Build/type/lint/import failures need a minimal fix. |
| `e2e-runner` | Yes | Playwright specs need to be created, modified, or debugged. |
| `docs-updater` | Yes | Existing docs/codemaps need source-of-truth updates. |

### 5.4 Reviewer agents

| Agent | Edits files | Trigger |
| --- | ---: | --- |
| `code-reviewer` | No | General behavior, correctness, async/lifecycle risk, minimality. |
| `typescript-reviewer` | No | TS/React/Hono typing, hooks, lint/build implications. |
| `api-contract-reviewer` | No | `shared`/`server`/`ui` DTO or API boundary changes. |
| `security-auditor` | No | Auth/session, Hono routes, terminal, proxy, SQLite, secrets, storage. |
| `performance-reviewer` | No | Rendering, streaming, SQLite, terminal output, bundle/build cost. |
| `sqlite-memory-reviewer` | No | SQLite, memory repositories, migrations, retention, pagination. |
| `terminal-stream-reviewer` | No | PTY, terminal, SSE, EventSource, WebSocket, proxy, tunnel, cleanup. |
| `ui-render-reviewer` | No | React rendering, Zustand subscriptions, xterm/CodeMirror cost. |
| `workflow-profiler` | No | Benchtest metrics, agent fanout, RTK savings, workflow regressions. |

### 5.5 Direct agent scripts

Use these when you want to bypass slash commands and start from a known agent:

```bash
opencode run --agent orchestrator "Triage this task: add bounded pagination to memory search."
opencode run --agent verifier "Use changed files to propose and run the narrowest verification gate."
opencode run --agent maintainer "Update the OpenCode workflow guide after skill changes."
opencode run --agent performance-reviewer "Review the current diff for UI render and SSE performance risk."
opencode run --agent workflow-profiler "Analyze the latest benchtest output and identify workflow bottlenecks."
```

Prefer slash commands for normal work because they encode the intended route.

---

## 6. Slash command surface

Commands live under `.opencode/commands/*.md`. In the TUI, type `/` followed by the command name.

| Command | Primary purpose |
| --- | --- |
| `/triage` | Classify a task or current diff into workspaces, risk labels, route, verification, and context budget. |
| `/context` | Build a compact context pack for the next agent. |
| `/plan` | Create a compact implementation plan without editing. |
| `/implement` | Run the optimized implementation flow. |
| `/fix-build` | Use `build-fixer` for TypeScript, build, lint, import, and dependency-resolution failures. |
| `/docs` | Update existing docs or codemaps from source-of-truth files. |
| `/verify` | Run targeted or full verification through `verifier`. |
| `/preflight` | Fast pre-PR check from changed files. |
| `/review` | Risk-based review fanout. |
| `/perf` | Focused performance review. |
| `/e2e` | Create, run, or debug Playwright E2E tests. |
| `/setup-n9router` | Review or apply n9router setup guidance. |
| `/bench` | Run or analyze OpenCode workflow benchmark metrics. |

### 6.1 Implementation flow

`/implement` should follow this route:

```text
change-classifier -> context-pack-builder -> plan -> implementer -> pilot_verify_plan -> verifier -> risk-based reviewers
```

Rules:

- One edit-capable owner at a time.
- Minimal coherent diff.
- No broad verification until narrow gates are insufficient.
- Review only the risk surfaces that changed.

### 6.2 Verification modes

| `/verify` argument | Behavior |
| --- | --- |
| empty | Choose narrowest adequate gate from changed files. |
| `quick` | Root/package typecheck and build only. |
| `full` | Typecheck, build, lint, unit tests, and E2E when practical. |
| `pre-pr` | Full verification plus risk-based security/performance review. |

---

## 7. Custom deterministic tools

Custom tools live in `.opencode/tools/pilot.ts`. The file exports multiple tools; OpenCode exposes them as `pilot_<export name>`:

| Tool | Purpose |
| --- | --- |
| `pilot_changed_files` | Summarizes changed files, workspaces, and risk labels from git diff/status. |
| `pilot_risk_scan` | Maps changed files to high-risk surfaces and matching reviewers. |
| `pilot_verify_plan` | Produces the narrowest adequate verification commands for changed files. |
| `pilot_repo_map` | Summarizes root scripts, workspaces, workspace scripts, and key directories. |

These tools are usually invoked by agents, not by a human shell command. To force their use, ask through a command or agent:

```text
/triage current diff and use pilot_changed_files, pilot_risk_scan, and pilot_verify_plan
/context current diff and include pilot_repo_map output
/verify use pilot_verify_plan before running commands
```

### 7.1 Risk labels emitted by custom tools

| Risk label | Meaning |
| --- | --- |
| `api-contract` | Shared/server/UI DTO or response contract risk. |
| `auth-session` | Auth, token, cookie, session, CORS, CSRF, permission risk. |
| `terminal-stream` | Terminal, PTY, xterm, stream, SSE, EventSource, WebSocket risk. |
| `proxy-tunnel` | Proxy, tunnel, upstream, local routing, CORS risk. |
| `sqlite-memory` | SQLite, memory repository, migration, database/query risk. |
| `react-render` | React component/render lifecycle risk. |
| `zustand-state` | Zustand selector/store/subscription risk. |
| `bundle-build` | Vite/Rollup/package/tsconfig/eslint/workbox risk. |
| `e2e-user-flow` | Playwright or user-journey risk. |
| `opencode-workflow` | Agent/command/plugin/skill/config risk. Run `npm run check:opencode-inventory` when surfaces change. |
| `secrets` | Secret-path or credential handling risk. |
| `docs-only` | Documentation-only change. |
| `low-risk` | No specific high-risk surface detected. |

---

## 8. Skills

Skills are domain-specific playbooks in `.opencode/skills/<name>/SKILL.md`. Agents load them only when relevant.

| Skill | Use when |
| --- | --- |
| `audit-tracker` | Finding the next unfinished canonical `TASKS.md` item and returning the next action in a compact form. Legacy deep-audit files are reference-only. |
| `benchtest-analysis` | Benchmark outputs, workflow metrics, RTK savings, fanout regressions. |
| `codemap-maintenance` | Codemap/doc updates. |
| `e2e-playwright` | Browser flows, Playwright traces, screenshots, videos. |
| `n9router-workflow` | n9router model/provider setup and validation. |
| `pilot-architecture` | Navigating Pilot package boundaries and source layout. |
| `pilot-performance` | Cross-cutting Pilot performance review. |
| `pilot-self-run` | Starting/stopping the full Pilot stack, verifying server/UI health, and returning connection URLs for local/remote testing. |
| `plugin-safety` | OpenCode plugin/tool safety and hook behavior. |
| `react-zustand-performance` | React, Zustand, xterm, CodeMirror, effects, selectors. |
| `security-review` | General app security review. |
| `server-boundary-security` | Hono routes, proxy, terminal, filesystem, auth/session, CORS, secrets. |
| `sqlite-memory-safety` | SQLite, memory repositories, persistence, migrations, retention. |
| `tdd-verification` | Test-first or behavior-changing work. |
| `terminal-sse-streaming` | Terminal, PTY, SSE, EventSource, WebSocket, proxy, tunnel. |
| `typescript-react-hono` | TypeScript, React, Vite, Hono implementation patterns. |
| `workflow-routing` | Choosing agents, reviewers, and verification gates from changed files. |

Prompt examples:

```text
/implement add bounded SQLite memory pagination; use sqlite-memory-safety
/review terminal SSE diff; use terminal-sse-streaming and server-boundary-security
/perf UI terminal page; use react-zustand-performance
/bench latest metrics; use benchtest-analysis
Use audit-tracker to identify the next unresolved critical audit item.
Start the full Pilot stack and provide URLs; use pilot-self-run.
```

### 8.1 `audit-tracker`

Purpose:

- Read `TASKS.md` as the canonical agenda.
- Find the first incomplete item in the active work area.
- Compare `.opencode/plans/next-task.json` only as a generated pointer; prefer `TASKS.md` on disagreement.
- Return only the next task, likely route, verification gates, and compact risk notes.

Use it for audit-driven remediation:

```text
Use audit-tracker to identify the next unfinished TASKS.md item. Do not edit yet.
/implement the next audit-tracker finding with the narrowest verification gate
```

Verification: none for the skill itself. It is read-only. Verification belongs to the implementation that follows.

### 8.2 `pilot-self-run`

Purpose:

- Detect whether Pilot ports are already occupied.
- Stop previous Pilot runs through `scripts/pilot-stop.sh` when needed.
- Start the stack through `scripts/pilot-start.sh`.
- Verify server/UI health.
- Return connection URLs and Pilot Settings values for testing.

Use it for local, LAN, Tailscale, or iPhone testing setup:

```text
Start the full Pilot stack for remote phone testing; use pilot-self-run.
```

Operational notes:

- The skill can kill stale Pilot processes. Confirm this behavior is appropriate before using it on shared machines.
- The emitted URLs are environment-specific. If Tailscale or LAN addresses change, update the skill before relying on its output.
- `OPENCODE_URL` must be configured for proxy routes.
- `PILOT_AUTH_TOKEN` should remain unset for the current unauthenticated local flow described by the skill.
- Vite must run from `ui/` when the dev server is used.
- The Pilot app should point at the Pilot server port, not the raw OpenCode upstream port.

---

## 9. Plugins

Plugins live in `.opencode/plugins/*.ts` and are auto-loaded by OpenCode from the project plugin directory.

### 9.1 `n9router-director.ts`

Hooks:

- `session.created`
- `tool.execute.before`

Responsibilities:

- Announce that the workflow director is active when a session starts.
- Watch edits/writes to `opencode.json` or `opencode.jsonc`.
- Warn when config edits appear to introduce direct non-`n9router/*` model entries.

Use this as a guardrail, not as a hard policy substitute. Provider routing changes should still be reviewed explicitly.

### 9.2 `tool-guardrails.ts`

Hook: `tool.execute.before`.

Blocks or warns on risky tool use:

- Blocks destructive commands such as `rm -rf`, `git reset --hard`, `git clean -fd`, force push, `drop table`, and `truncate table`.
- Blocks secret-file reads/writes for `.env*`, `.pem`, `.key`, private keys, `.npmrc`, and `.pypirc` while allowing redacted examples like `.env.example`.
- Blocks long-running `npm run dev` style commands unless running under tmux.
- Warns on dependency install/add/remove/update commands.
- Blocks documentation sprawl by restricting arbitrary markdown writes outside approved docs/codemaps/OpenCode paths.

Use tmux for persistent dev servers:

```bash
tmux new-session -d -s pilot-dev "npm run dev"
tmux attach -t pilot-dev
```

### 9.3 `rtk-compressor.ts`

Hook: `tool.execute.after`.

Compresses large, repetitive, or low-signal tool output. It detects and summarizes formats such as git diffs, git status, grep results, find/tree/ls output, search lists, numbered reads, repeated logs, and long text output.

Outputs are annotated like:

```text
[RTK: <filter> <before>→<after> bytes (-<saved>)]
```

### 9.4 `build-log-compressor.ts`

Hook: `tool.execute.after`.

Compresses build/test failure logs into the first actionable error groups for:

- TypeScript: `error TS####`
- ESLint: line/column findings
- Jest: failing specs and assertions
- Playwright: `expect`, locator, timeout, trace/test-results paths
- Vite/Rollup: build and resolution failures
- npm workspace logs

Output annotation:

```text
[RTK: build-log/<filter> <before>→<after> bytes (-<saved>)]
```

### 9.5 `benchtest-metrics.ts`

Hooks:

- `session.created`
- `tool.execute.before`
- `tool.execute.after`
- `experimental.session.compacting`

This plugin is no-op unless metrics are enabled:

```bash
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

Optional output path:

```bash
BENCHTEST_ENABLED=1 \
BENCHTEST_METRICS_OUT=/tmp/pilot-benchtest-metrics.jsonl \
npm run benchtest:quick
```

Metrics include tool duration, output size, estimated output tokens, RTK filter, RTK before/after bytes, and compaction context size.

### 9.6 `index.ts`

`index.ts` is a plugin export barrel. It re-exports the n9router director, tool guardrails, RTK compressor, and the benchtest plugin entry point. Do not treat it as a separate policy surface unless the runtime explicitly loads the barrel.

---

## 10. Verification scripts

### 10.1 Full local verification

Use this before merging workflow or TypeScript changes:

```bash
npm run check:opencode
npm run check:opencode-inventory
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

### 10.2 Shell script version

```bash
#!/usr/bin/env bash
set -euo pipefail

npm run check:opencode
npm run check:opencode-inventory
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

### 10.3 Changed-file-aware manual verification

Use the OpenCode command first:

```text
/preflight
```

Then run the commands it recommends. Common mappings:

| Changed files | Narrow gate |
| --- | --- |
| `.opencode/**` | `npm run check:opencode && npm run check:opencode-inventory` |
| `shared/src/**` | `npm run typecheck -w shared` |
| `server/**` | `npm run typecheck -w server` |
| `ui/**` | `npm run typecheck -w ui && npm run test -w ui` |
| `e2e/**` | `npm run typecheck -w e2e && npm run test:e2e` |
| `benchtest/**` | `npm run build -w benchtest && npm run benchtest:quick` |
| Cross-package | `npm run typecheck && npm run build` |

### 10.4 Build failure repair loop

```bash
npm run check:opencode
```

If it fails, use:

```text
/fix-build npm run check:opencode failed with the following error: <paste first useful error group>
```

For workspace failures:

```bash
npm run typecheck -w server
```

Then:

```text
/fix-build npm run typecheck -w server failed with: <paste first useful error group>
```

---

## 11. Practical recipes

### 11.1 Small server bugfix

```text
/triage fix server memory search returning unbounded results
/context fix server memory search returning unbounded results
/implement fix server memory search returning unbounded results
/preflight
/review current diff
```

Expected narrow shell gates:

```bash
npm run typecheck -w server
npm run build -w server
```

### 11.2 Shared API contract change

```text
/triage add a shared MemorySearchResult DTO used by server and UI
/plan add a shared MemorySearchResult DTO used by server and UI
/implement add a shared MemorySearchResult DTO used by server and UI
/review current diff
/verify
```

Expected review route:

```text
api-contract-reviewer -> typescript-reviewer -> code-reviewer
```

Expected shell gates:

```bash
npm run typecheck -w shared
npm run typecheck -w server
npm run typecheck -w ui
npm run typecheck
```

### 11.3 Terminal/SSE cleanup change

```text
/triage improve terminal SSE cleanup when a browser tab disconnects
/context improve terminal SSE cleanup when a browser tab disconnects
/implement improve terminal SSE cleanup when a browser tab disconnects
/review current diff
/perf current diff
/preflight
```

Expected review route:

```text
terminal-stream-reviewer -> security-auditor -> performance-reviewer
```

Expected shell gates:

```bash
npm run typecheck -w server
npm run typecheck -w ui
```

Add E2E only if user-visible terminal behavior changed:

```bash
npm run test:e2e
```

### 11.4 UI render/Zustand optimization

```text
/triage reduce terminal page Zustand over-subscription
/context reduce terminal page Zustand over-subscription
/perf terminal page Zustand subscriptions
/implement reduce terminal page Zustand over-subscription
/preflight
```

Expected review route:

```text
ui-render-reviewer -> performance-reviewer -> typescript-reviewer
```

Expected shell gates:

```bash
npm run typecheck -w ui
npm run test -w ui
```

### 11.5 OpenCode workflow change

```text
/triage update workflow routing for new reviewer agent
/context update workflow routing for new reviewer agent
/implement update workflow routing for new reviewer agent
/preflight
/bench latest metrics
```

Expected shell gates:

```bash
npm run check:opencode
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

### 11.6 Audit-driven remediation

```text
Use audit-tracker to identify the next unresolved audit finding.
/plan implement the returned audit finding with minimal scope
/implement implement the returned audit finding with minimal scope
/preflight
/review current diff
```

Expected behavior:

- The first prompt is read-only and returns the next target from `TASKS.md`.
- Implementation follows normal single-owner edit policy.
- Verification is based on the files touched by the fix, not on the audit tracker itself.

### 11.7 Start Pilot for local or remote testing

```text
Start the full Pilot stack and return testing URLs; use pilot-self-run.
```

Expected behavior:

- Checks whether Pilot ports are already occupied.
- Stops stale Pilot processes when appropriate.
- Starts the stack using repository scripts.
- Verifies server/UI health.
- Returns the current URLs and Pilot Settings values.

Safety notes:

- Do not use this on a shared environment without accepting that stale Pilot processes may be stopped.
- Verify the returned Tailscale/LAN/local URLs before sending them to another tester.
- For persistent manual dev servers, prefer tmux.

---

## 12. Safety model

### 12.1 Edit ownership

Only these agents should edit files:

```text
implementer
maintainer
build-fixer
e2e-runner
docs-updater
```

All scouts and reviewers are read-only.

### 12.2 Secret handling

Never read, write, log, or commit:

```text
.env
.env.* except .env.example/.env.sample
*.pem
*.key
id_rsa
id_ed25519
.npmrc
.pypirc
provider tokens
API keys
cookies
bearer tokens
```

Use redacted examples only:

```bash
cp .env.example .env
```

### 12.3 Destructive commands

The guardrail plugin blocks destructive commands by default. If a destructive action is genuinely required, get explicit human approval and document rollback first.

Blocked examples:

```bash
rm -rf ...
git reset --hard
git clean -fd
git push --force
DROP TABLE ...
TRUNCATE TABLE ...
```

### 12.4 Long-running dev servers

Use tmux:

```bash
tmux new-session -d -s pilot-dev "npm run dev"
tmux attach -t pilot-dev
```

Do not let OpenCode start persistent dev servers in a normal foreground tool call.

---

## 13. Maintaining the workflow

When changing `.opencode/**`, always run:

```bash
npm run check:opencode
```

For plugin/tool changes, also run:

```bash
npm run build -w benchtest
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

When adding a new agent:

1. Add `.opencode/agents/<name>.md`.
2. Give it the smallest useful permission set.
3. Add `steps` to bound loops.
4. Add routing in `orchestrator.md` only if it should be selected automatically.
5. Add or update a skill only if the agent needs reusable domain guidance.
6. Add it to `benchtest/config.ts` if workflow metrics should classify its phase.
7. Update this guide.

When adding a new command:

1. Add `.opencode/commands/<name>.md`.
2. Use clear frontmatter: `description`, `agent`, optional `model`, optional `subtask`.
3. Use `$ARGUMENTS` when the command accepts user input.
4. Document exact examples in this guide.
5. Run `npm run check:opencode`.

When adding a new skill:

1. Add `.opencode/skills/<name>/SKILL.md`.
2. Include frontmatter with `name`, `description`, and `compatibility: opencode`.
3. Keep the playbook narrow enough that agents load it only when relevant.
4. State whether the skill is read-only or operational.
5. Document any commands it may run and whether it can stop processes, write files, or touch networked services.
6. Update the skills table, prompt examples, and recipes in this guide.
7. If automatic selection is desired, update the relevant agent operating rules.
8. Run `npm run check:opencode`.

When adding a new custom tool:

1. Add or update `.opencode/tools/<namespace>.ts`.
2. Export each tool with `tool(...)`.
3. Remember that multiple exports become `<filename>_<export>` tool names.
4. Keep tool output compact and deterministic.
5. Do not perform edits from custom tools unless the tool is explicitly designed and permissioned for that.
6. Run `npm run check:opencode`.

When adding a new plugin:

1. Add `.opencode/plugins/<name>.ts`.
2. Keep hooks cheap. Hooks run around tool calls and can affect every interaction.
3. Make metric/logging plugins gated by environment variables.
4. Avoid duplicate plugin loading from both config and `.opencode/plugins/`.
5. Document hooks, warnings/blocks, and environment gates in this guide.
6. Run `npm run check:opencode`.

---

## 14. Fast command reference

### Shell

```bash
# setup
npm install
cp opencode.json.example opencode.json
$EDITOR opencode.json

# launch
opencode
opencode /path/to/opencode-pilot
opencode run "Triage the current diff and propose verification gates."

# verification
npm run check:opencode
npm run check:opencode-inventory
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick

# targeted workspace gates
npm run typecheck -w shared
npm run typecheck -w server
npm run typecheck -w ui
npm run typecheck -w e2e
npm run test -w ui
npm run test:e2e
```

### OpenCode TUI

```text
/triage current diff
/context current diff
/plan <task>
/implement <task>
/verify
/verify quick
/verify full
/verify pre-pr
/preflight
/review current diff
/perf current diff
/fix-build <failing command and first useful error>
/e2e <user flow>
/docs <documentation task>
/setup-n9router
/bench latest metrics
```

### Skill prompts

```text
Use audit-tracker to identify the next unresolved critical audit item.
Start the full Pilot stack and return testing URLs; use pilot-self-run.
```

### Non-interactive OpenCode

```bash
opencode run --agent orchestrator "Use pilot_changed_files and pilot_risk_scan to classify the current diff. Do not edit."
opencode run --agent context-pack-builder "Build a context pack for improving terminal SSE cleanup."
opencode run --agent verifier "Use pilot_verify_plan, then run the narrowest verification gates."
opencode run --agent maintainer "Update the OpenCode workflow guide after skill changes."
opencode run --agent workflow-profiler "Analyze latest benchtest output and report reviewer fanout regressions."
```
