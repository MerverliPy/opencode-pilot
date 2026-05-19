---
description: Review changed code using risk-based reviewer fanout instead of broad parallel review.
agent: orchestrator
---

# /review

Review `$ARGUMENTS` or the current git diff.

Route:

1. Use `pilot_changed_files` and `pilot_risk_scan` when available.
2. Always use `code-reviewer` for non-trivial behavior changes.
3. Use `typescript-reviewer` only when TypeScript, React, Hono, or shared contracts changed.
4. Use `api-contract-reviewer` for shared/server/UI boundary changes.
5. Use `security-auditor` for API, terminal, proxy, tunnel, auth/session, SQLite, filesystem, or secret-handling changes.
6. Use `terminal-stream-reviewer` for terminal, PTY, SSE, EventSource, WebSocket, stream cleanup, proxy, or tunnel changes.
7. Use `sqlite-memory-reviewer` for SQLite, persistence, migrations, memory repositories, or query changes.
8. Use `ui-render-reviewer` for React rendering, Zustand, xterm, CodeMirror, or UI state changes.
9. Use `performance-reviewer` for rendering, streaming, memory, query, or bundle-size risk.

Return prioritized actionable findings only. Do not invoke reviewers unrelated to the risk scan.
