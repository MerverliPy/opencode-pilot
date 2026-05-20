---
name: audit-tracker
description: "Read the canonical Pilot TASKS.md agenda and return the next unfinished task with compact scope, validation, and routing notes. Legacy deep-audit files are reference-only."
compatibility: opencode
---

# Audit Tracker

## Purpose

Read `TASKS.md` and identify the next unfinished task from the canonical agenda.

`TASKS.md` is the human-maintained source of truth. `.opencode/plans/next-task.json` is only a generated machine pointer derived from it. Legacy files such as `PILOT_CRITICAL_DEEP_AUDIT.md` and `EXECUTION_FIXIT_PLAN.md` are reference-only unless the user explicitly asks for audit-remediation work.

## Behavior

1. Read `TASKS.md`.
2. Find the first unchecked task in the active work area.
3. Return a compact handoff with:
   - task id and title
   - active section or milestone
   - likely files to inspect
   - risk labels
   - verification gates
4. If `.opencode/plans/next-task.json` disagrees with `TASKS.md`, report the disagreement and prefer `TASKS.md`.

## Output format

```text
NEXT: <task id> — <title>
SOURCE: TASKS.md
ROUTE: <agent or command>
VERIFY: <narrowest likely commands>
NOTE: <one-line risk or missing-context note>
```

## Verification

This skill is read-only. Verification belongs to the implementation that follows.

## Token strategy

- Read only `TASKS.md` and, if needed, `.opencode/plans/next-task.json`.
- Do not read legacy audit trackers unless explicitly requested.
- Do not paste the full agenda.
