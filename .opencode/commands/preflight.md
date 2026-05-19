---
description: Run fast pre-PR workflow checks from changed files.
agent: verifier
---

# /preflight

Run fast pre-PR checks for `$ARGUMENTS` or the current diff.

1. Use `pilot_changed_files` and `pilot_verify_plan` when available.
2. Run the narrowest listed commands first.
3. Stop on the first blocking failure.
4. Escalate to broader commands only when changed files cross workspaces or narrow checks cannot prove the change.
5. Report exact command outcomes, skipped commands, and residual risk.

Do not run long E2E suites unless the risk scan includes `e2e-user-flow`, `terminal-stream`, `proxy-tunnel`, or the user explicitly asks.
