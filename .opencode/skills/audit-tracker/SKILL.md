---
name: audit-tracker
description: "Invoke via / to read the Pilot Critical Deep Audit tracker and identify the next unfinished task. The skill reads PILOT_CRITICAL_DEEP_AUDIT.md, finds the first uncompleted finding, and returns exactly what to work on next with file, line, and fix guidance. Optimized for minimal token use."
compatibility: opencode
---

# Audit Tracker

## Purpose

Read `PILOT_CRITICAL_DEEP_AUDIT.md` and find the next unfinished task based on:
1. Scan for first `[ ]` (uncompleted) item, ordered by severity: Critical > High > Medium > Low
2. Return: sprint, ID, severity, file, line, issue description, and fix hint
3. If a task is marked `[~]` (working), note it and skip to next `[ ]`

## Behavior

When the user invokes `/`:

1. **Read** `PILOT_CRITICAL_DEEP_AUDIT.md` in the repo root.
2. **Find** the first `- [ ]` line within the highest uncompleted sprint. Priority order: SPRINT 1 (Critical) → SPRINT 2 (High) → SPRINT 3 (Medium) → SPRINT 4 (Low).
3. **Skip** any line with `[~]` (in progress) or `[x]` (done).
4. **Return** a compact summary (max 3 lines):

```
NEXT: Sprint 1 C1 — server/src/terminal.ts:39 — PTY env leak secrets. Filter process.env to safe vars.
READY: 18 more criticals, 50 high remaining.
```

If all items in a sprint are `[x]`, report the sprint as complete and move to the next.

If ALL items across all sprints are `[x]`, report: `AUDIT COMPLETE. All 150+ findings resolved.`

## Verification

None. This skill is read-only and only directs the next action.

## Meta

- **Token strategy:** Only the first uncompleted finding is returned. No full file read, no broad context.
- **Edge cases:** If the doc is missing, report `PILOT_CRITICAL_DEEP_AUDIT.md not found. Run a deep audit first.`
