---
description: Review changed code for correctness, maintainability, TypeScript quality, and security risk.
agent: orchestrator
---

# /review

Review `$ARGUMENTS` or current git diff.

Route:

1. `typescript-reviewer` for TS/React/Hono contract quality.
2. `code-reviewer` for general correctness and minimality.
3. `security-auditor` for API, terminal, proxy, tunnel, auth/session, SQLite, or secret-handling changes.
4. `performance-reviewer` when rendering, streaming, memory, or query performance is affected.

Return prioritized actionable findings only.
