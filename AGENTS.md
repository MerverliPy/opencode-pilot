# Pilot OpenCode Instructions

## Project
Pilot is a TypeScript monorepo for an OpenCode PWA:

- `server/`: Hono + Node server, terminal/session/proxy/tunnel APIs, SQLite-backed memory modules.
- `ui/`: React + Vite PWA, Zustand stores, CodeMirror/xterm UI, Jest tests.
- `shared/`: shared TypeScript types.
- `e2e/`: Playwright end-to-end tests.

## Required workflow

1. Default to `@orchestrator` for task routing.
2. For feature work, use: discover -> plan -> implement -> verify -> review.
3. Use one edit-capable owner at a time. Do not let multiple agents edit the same files concurrently.
4. Keep diffs minimal. Prefer small, typed changes over broad refactors.
5. Before editing, inspect the relevant package scripts and nearby patterns.
6. After editing TypeScript, run the narrowest relevant verification first, then broader checks if needed.

## Core commands

```bash
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
```

Workspace-specific checks:

```bash
npm run typecheck -w server
npm run typecheck -w ui
npm run typecheck -w shared
npm run typecheck -w e2e
npm run test -w ui
npm run test -w e2e
```

> Use `/setup-n9router` for n9router setup.

## Policy

Detailed workflow, edit, verification, and security policies are in `.opencode/rules/pilot-core.md` — the canonical policy source. This file covers only repo orientation and commands.
