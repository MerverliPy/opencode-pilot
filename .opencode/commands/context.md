---
description: Build a compact handoff context pack for a Pilot task.
agent: context-pack-builder
subtask: true
---

# /context

Build a compact context pack for `$ARGUMENTS` or the current diff.

Use `pilot_repo_map`, `pilot_changed_files`, `pilot_risk_scan`, and `pilot_verify_plan` when available.

Return only:

- Task
- Files to read
- Symbols
- Existing patterns
- Tests
- Commands
- Constraints
- Risks
- Do not read

Do not edit files. Keep the output under 120 lines.
