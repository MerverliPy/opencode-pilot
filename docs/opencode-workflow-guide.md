# Pilot OpenCode Workflow Guide

This document explains the `.opencode` workflow used by Pilot: how OpenCode loads it, what each agent/command/tool/plugin/skill does, and the exact scripts to run for day-to-day work.

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
- Do not list project-local `.opencode/plugins/*` files in the `plugin` array. OpenCode auto-loads project plugins from `.opencode/plugins/`, and listing the same files manually can double-run hooks.

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

## 2. Load model: what OpenCode reads

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

## 3. High-level workflow

Use this path for normal engineering work:

```text
triage -> context -> plan -> implement -> verify -> review -> bench/profile when needed
```

Expanded:

1. **Triage**: classify the request or current diff into workspace, risk labels, agents, and verification gates.
2. **Context pack**: collect only files, symbols, tests, commands, and constraints needed by the next agent.
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

## 4. Agents

Agents are configured in `.opencode/agents/*.md`. Each agent has a mode, permission profile, optional model, and step budget.

### 4.1 Primary agents

| Agent | Edits files | Main use | Notes |
| --- | ---: | --- | --- |
| `orchestrator` | No | Default router and synthesizer | Step budget 10. Starts with classifier/context pack. |
| `implementer` | Yes | Main TypeScript/React/Hono implementation owner | Step budget 12. Uses context packs and targeted reviewers. |
| `verifier` | No | Build/type/test/lint gatekeeper | Step budget 8. Uses changed-file-aware verification. |
| `planner` | No | Implementation and migration planning | Use when changes are non-trivial. |
| `maintainer` | Yes | Docs/refactor/workflow maintenance | Use for deliberate workflow/doc upkeep. |

### 4.2 Discovery and routing agents

| Agent | Edits files | Use when |
| --- | ---: | --- |
| `change-classifier` | No | You need a fast route from a request or diff to workspaces, risk labels, agents, and gates. |
| `context-pack-builder` | No | The next agent needs compact, actionable context without rereading the repository. |
| `context-scout` | No | You need broader repository discovery, but still want bounded output. |
| `docs-scout` | No | The task requires external/OpenCode/n9router documentation lookup. |

### 4.3 Design, testing, and repair agents

| Agent | Edits files | Use when |
| --- | ---: | --- |
| `architect` | No | The design crosses packages or changes core boundaries. |
| `test-strategist` | No | You need a test plan or verification matrix. |
| `build-fixer` | Yes | Build/type/lint/import failures need a minimal fix. |
| `e2e-runner` | Yes | Playwright specs need to be created, modified, or debugged. |
| `docs-updater` | Yes | Existing docs/codemaps need source-of-truth updates. |

### 4.4 Reviewer agents

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

### 4.5 Direct agent scripts

Use these when you want to bypass slash commands and start from a known agent:

```bash
opencode run --agent orchestrator "Triage this task: add bounded pagination to memory search."
opencode run --agent verifier "Use changed files to propose and run the narrowest verification gate."
opencode run --agent performance-reviewer "Review the current diff for UI render and SSE performance risk."
opencode run --agent workflow-profiler "Analyze the latest benchtest output and identify workflow bottlenecks."
```

Prefer slash commands for normal work because they already encode the intended route.

---

## 5. Slash command surface

Commands live under `.opencode/commands/*.md`. In the TUI, type `/` followed by the command name.

### 5.1 Routing and context commands

#### `/triage`

Classifies a task or current diff into workspaces, file patterns, risk labels, route, verification, and context budget.

```text
/triage current diff
/triage add a memory search endpoint with bounded pagination
/triage review changes to server terminal streaming
```

Use before implementation when scope is unclear.

#### `/context`

Builds a compact context pack for the next agent. It should return only task, files, symbols, patterns, tests, commands, constraints, risks, and files not to read.

```text
/context current diff
/context improve terminal SSE cleanup
/context add a shared DTO consumed by server and UI
```

Use this when a task is broad enough that the implementer would otherwise scan too much.

#### `/plan`

Creates a compact implementation plan without editing.

```text
/plan add authenticated project switching to the UI and server
/plan migrate memory list APIs to cursor pagination
```

Required output includes goal/non-goals, files/symbols, agent route, implementation batches, verification gates, risks, and open questions.

### 5.2 Implementation and repair commands

#### `/implement`

Runs the full optimized implementation flow:

```text
/implement fix stale terminal SSE cleanup when a browser tab closes
/implement add a typed shared response for memory search results
/implement reduce Zustand subscription fanout in the terminal page
```

Flow:

```text
change-classifier -> context-pack-builder -> plan -> implementer -> pilot_verify_plan -> verifier -> risk-based reviewers
```

Rules:

- One edit-capable owner at a time.
- Minimal coherent diff.
- No broad verification until narrow gates are insufficient.
- Review only the risk surfaces that changed.

#### `/fix-build`

Uses `build-fixer` for TypeScript, build, lint, import, and dependency-resolution failures.

```text
/fix-build npm run check:opencode failed with TS errors
/fix-build npm run typecheck -w server failed
/fix-build current failing build output
```

Use this after a failed command. Paste only the first useful error group when possible.

#### `/docs`

Updates existing docs or codemaps from source-of-truth files.

```text
/docs update OpenCode workflow documentation after command changes
/docs refresh codemap for server terminal modules
```

Rules:

- Update existing docs first.
- Do not create new markdown files unless requested.
- Keep docs tied to package scripts and source imports.

### 5.3 Verification and review commands

#### `/verify`

Runs targeted or full verification through `verifier`.

```text
/verify
/verify quick
/verify full
/verify pre-pr
```

Modes:

| Argument | Behavior |
| --- | --- |
| empty | Choose narrowest adequate gate from changed files. |
| `quick` | Root/package typecheck and build only. |
| `full` | Typecheck, build, lint, unit tests, and E2E when practical. |
| `pre-pr` | Full verification plus risk-based security/performance review. |

#### `/preflight`

Fast pre-PR check from changed files.

```text
/preflight
/preflight current diff before opening a PR
```

It uses `pilot_changed_files` and `pilot_verify_plan`, then runs the narrowest sequence first. It avoids long E2E suites unless risk labels or the user request justify them.

#### `/review`

Risk-based review fanout.

```text
/review current diff
/review changes to shared API response and UI store
/review terminal proxy changes for security and cleanup
```

Reviewer routing:

| Risk label / change | Reviewer route |
| --- | --- |
| General behavior | `code-reviewer` |
| TS/React/Hono typing | `typescript-reviewer` |
| Shared/server/UI contracts | `api-contract-reviewer` |
| Auth/session/proxy/terminal/SQLite/secrets | `security-auditor` |
| PTY/SSE/EventSource/WebSocket/proxy/tunnel | `terminal-stream-reviewer` |
| SQLite/memory/migrations/query bounds | `sqlite-memory-reviewer` |
| React/Zustand/xterm/CodeMirror | `ui-render-reviewer` |
| Rendering/streaming/memory/query/bundle | `performance-reviewer` |

#### `/perf`

Focused performance review.

```text
/perf current diff
/perf terminal output retention and SSE fanout
/perf UI store selectors on the terminal page
```

It checks React render churn, Zustand over-subscription, xterm/CodeMirror cost, streaming fanout, terminal output retention, SQLite bounds, and Vite bundle/build regression.

### 5.4 E2E, setup, and profiling commands

#### `/e2e`

Creates, runs, or debugs Playwright E2E tests.

```text
/e2e add coverage for terminal reconnect after refresh
/e2e debug project switcher user flow
```

Do not start persistent dev servers without explicit approval. Use tmux for long-running dev servers when they are needed.

#### `/setup-n9router`

Reviews or applies n9router setup guidance.

```text
/setup-n9router explain current model routing
/setup-n9router check local opencode.json for n9router consistency
/setup-n9router validate local model list
```

Never write API keys or provider secrets into committed files.

#### `/bench`

Runs or analyzes OpenCode workflow benchmark metrics.

```text
/bench latest metrics
/bench compare reviewer fanout before and after the current change
/bench analyze RTK compression savings
```

When a fresh command is needed, the benchmark workflow starts from:

```bash
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

---

## 6. Custom deterministic tools

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

Non-interactive examples:

```bash
opencode run --agent orchestrator "Use pilot_changed_files and pilot_risk_scan to classify the current diff. Do not edit."
opencode run --agent verifier "Use pilot_verify_plan and run only the narrowest verification gates."
```

### 6.1 Risk labels emitted by custom tools

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
| `opencode-workflow` | Agent/command/plugin/skill/config risk. |
| `secrets` | Secret-path or credential handling risk. |
| `docs-only` | Documentation-only change. |
| `low-risk` | No specific high-risk surface detected. |

---

## 7. Skills

Skills are domain-specific playbooks in `.opencode/skills/<name>/SKILL.md`. Agents load them only when relevant.

| Skill | Use when |
| --- | --- |
| `workflow-routing` | Choosing agents, reviewers, and verification gates from changed files. |
| `pilot-architecture` | Navigating Pilot package boundaries and source layout. |
| `typescript-react-hono` | TypeScript, React, Vite, Hono implementation patterns. |
| `tdd-verification` | Test-first or behavior-changing work. |
| `security-review` | General app security review. |
| `server-boundary-security` | Hono routes, proxy, terminal, filesystem, auth/session, CORS, secrets. |
| `react-zustand-performance` | React, Zustand, xterm, CodeMirror, effects, selectors. |
| `sqlite-memory-safety` | SQLite, memory repositories, persistence, migrations, retention. |
| `terminal-sse-streaming` | Terminal, PTY, SSE, EventSource, WebSocket, proxy, tunnel. |
| `pilot-performance` | Cross-cutting Pilot performance review. |
| `e2e-playwright` | Browser flows, Playwright traces, screenshots, videos. |
| `n9router-workflow` | n9router model/provider setup and validation. |
| `codemap-maintenance` | Codemap/doc updates. |
| `plugin-safety` | OpenCode plugin/tool safety and hook behavior. |
| `benchtest-analysis` | Benchmark outputs, workflow metrics, RTK savings, fanout regressions. |

Prompt examples:

```text
/implement add bounded SQLite memory pagination; use sqlite-memory-safety
/review terminal SSE diff; use terminal-sse-streaming and server-boundary-security
/perf UI terminal page; use react-zustand-performance
/bench latest metrics; use benchtest-analysis
```

---

## 8. Plugins

Plugins live in `.opencode/plugins/*.ts` and are auto-loaded by OpenCode from the project plugin directory.

### 8.1 `tool-guardrails.ts`

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

### 8.2 `rtk-compressor.ts`

Hook: `tool.execute.after`.

Compresses large, repetitive, or low-signal tool output. It detects and summarizes formats such as git diffs, git status, grep results, find/tree/ls output, search lists, numbered reads, repeated logs, and long text output.

Outputs are annotated like:

```text
[RTK: <filter> <before>→<after> bytes (-<saved>)]
```

### 8.3 `build-log-compressor.ts`

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

### 8.4 `benchtest-metrics.ts`

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

---

## 9. Verification scripts

### 9.1 Full local verification

Use this before merging workflow or TypeScript changes:

```bash
npm run check:opencode
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

### 9.2 Shell script version

Copy/paste this when validating a PR:

```bash
#!/usr/bin/env bash
set -euo pipefail

npm run check:opencode
npm run typecheck
npm run build
npm run build -w benchtest
npm run benchtest:quick
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

### 9.3 Changed-file-aware manual verification

Use the OpenCode command first:

```text
/preflight
```

Then run the commands it recommends. Common mappings:

| Changed files | Narrow gate |
| --- | --- |
| `.opencode/**` | `npm run check:opencode` |
| `shared/src/**` | `npm run typecheck -w shared` |
| `server/**` | `npm run typecheck -w server` |
| `ui/**` | `npm run typecheck -w ui && npm run test -w ui` |
| `e2e/**` | `npm run typecheck -w e2e && npm run test:e2e` |
| `benchtest/**` | `npm run build -w benchtest && npm run benchtest:quick` |
| Cross-package | `npm run typecheck && npm run build` |

### 9.4 Build failure repair loop

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

## 10. Benchtest workflows

Benchtest requires compiled benchtest files:

```bash
npm run build -w benchtest
```

Quick benchmark:

```bash
npm run benchtest:quick
```

Quick benchmark with instrumentation:

```bash
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

Custom metrics file:

```bash
BENCHTEST_ENABLED=1 \
BENCHTEST_METRICS_OUT=/tmp/pilot-opencode-metrics.jsonl \
BENCHTEST_SESSION_ID="manual-$(date +%Y%m%d-%H%M%S)" \
npm run benchtest:quick
```

OpenCode analysis command:

```text
/bench latest metrics
```

Relevant benchmark scenarios include:

- `workflow-routing`
- `context-pack-size`
- `plugin-hook-overhead`
- `rtk-compression-savings`
- `verify-plan-accuracy`
- `reviewer-fanout-control`

Relevant thresholds include:

- routing classification latency
- context pack line budget
- plugin hook overhead
- RTK minimum savings ratio
- reviewer fanout maximum

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
5. Run `npm run check:opencode`.

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

### Non-interactive OpenCode

```bash
opencode run --agent orchestrator "Use pilot_changed_files and pilot_risk_scan to classify the current diff. Do not edit."
opencode run --agent context-pack-builder "Build a context pack for improving terminal SSE cleanup."
opencode run --agent verifier "Use pilot_verify_plan, then run the narrowest verification gates."
opencode run --agent workflow-profiler "Analyze latest benchtest output and report reviewer fanout regressions."
```
