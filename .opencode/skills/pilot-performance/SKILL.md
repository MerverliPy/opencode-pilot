---
name: pilot-performance
description: "Use for Pilot performance reviews across React rendering, Zustand, terminal streaming, SQLite, server fanout, and bundle/build cost."
compatibility: opencode
---

# Pilot performance

## Primary risk surfaces

- React render churn from unstable dependencies, derived arrays, or expensive render-time transforms.
- Zustand selector over-subscription or mutation patterns that fan out updates.
- SSE/EventSource/WebSocket broadcast fanout and cleanup.
- terminal output retention, unbounded buffers, and high-frequency write loops.
- SQLite N+1 queries, unbounded reads, missing pagination, or missing indexes.
- CodeMirror/xterm rendering cost and large text payloads.
- Vite bundle/build regressions from eager imports.

## Review posture

Start from changed files. Do not review unrelated subsystems. Prefer measurable findings: unbounded data structure, missing cleanup, avoidable O(n) render path, repeated subscription, or broad import.

## Verification

- UI rendering/state: `npm run typecheck -w ui`, targeted Jest tests.
- Server streaming/query changes: `npm run typecheck -w server`.
- Cross-workspace performance risk: run the narrow gate first, then root `npm run build` only if needed.
