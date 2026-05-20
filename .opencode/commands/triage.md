---
description: Classify a task or diff into route, risk, context, and verification plan.
agent: orchestrator
---

# /triage

Classify `$ARGUMENTS` or the current diff.

## Clean repo fast path

When the user asks for current repo state, current diff, clean state, or similar:

1. Check changed files first.
2. If no files are changed, do not call scouts, planners, reviewers, or implementation agents.
3. Read only .opencode/plans/next-task.json.
4. Optionally confirm the task with a narrow TASKS.md lookup.
5. Return repo state, changed files, next task, recommended next command, and verification-needed-now.
6. Stop immediately.

Clean-state response shape:

Repo state: clean
Changed files: none
Next task: <id> - <title>
Recommended next command: /plan <task id>
Verification now: none required


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

Do not edit files. Keep the result under 80 lines. Stop once the route, risks, and verification gates are clear.
