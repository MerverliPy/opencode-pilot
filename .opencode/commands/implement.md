---
description: Route a scoped implementation through classifier, context pack, trusted edits, targeted verification, and risk-based review.
agent: orchestrator
---

# /implement

Implement `$ARGUMENTS` using the performance-optimized Pilot workflow:

1. Classify the request or current diff with `change-classifier` and `pilot_changed_files` when available.
2. Build a compact handoff with `context-pack-builder` unless exact files and tests are already known.
3. Plan the minimal coherent diff and select one edit owner.
4. Delegate edits to `implementer` or a specialized edit-capable subagent.
5. Use `pilot_verify_plan` when available, then run the narrowest verification gate first.
6. Use `pilot_risk_scan` when available, then run only reviewers matching changed risk surfaces.

Do not use multiple edit-capable agents on overlapping files. Do not run broad verification until narrow gates are insufficient or fail in a way that requires a broader signal.
