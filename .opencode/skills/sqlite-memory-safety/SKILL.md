---
name: sqlite-memory-safety
description: "Use for Pilot SQLite, memory repositories, persistence, migrations, query limits, retention, and storage safety review."
compatibility: opencode
---

# SQLite and memory safety

## Scope

Use this skill for changes touching memory modules, SQLite repositories, migrations, retention, pagination, search, or storage-backed APIs.

## Checklist

- Bound read APIs with explicit limits and stable ordering.
- Avoid N+1 reads in list/detail flows.
- Use parameterized SQL. Do not interpolate user-controlled values into SQL strings.
- Keep migrations compatible with existing data and define rollback or recovery expectations.
- Avoid unbounded in-memory caches or session maps.
- Confirm cleanup for stale terminal/session/memory records.
- Keep server response shapes compatible with UI consumers.

## Verification

Run `npm run typecheck -w server` first. Add targeted tests when repository behavior, migrations, or retention logic changes.
