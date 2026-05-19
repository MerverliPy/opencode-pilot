---
description: Classify a task or diff into route, risk, context, and verification plan.
agent: orchestrator
---

# /triage

Classify `$ARGUMENTS` or the current diff.

Use `change-classifier` first. Use these custom tools when available:

- `pilot_changed_files`
- `pilot_risk_scan`
- `pilot_verify_plan`
- `pilot_repo_map`

Return:

1. Affected workspaces.
2. Files and symbols to inspect.
3. Agent route.
4. Risk labels.
5. Verification gates.
6. Context budget.

Do not edit files. Keep the result under 100 lines.
