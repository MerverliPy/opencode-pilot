---
description: Review changed code or a target flow for Pilot performance risks.
agent: performance-reviewer
subtask: true
---

# /perf

Review `$ARGUMENTS` or the current diff for performance risks.

Use `pilot_changed_files` and `pilot_risk_scan` when available. Focus only on relevant surfaces:

- React render churn
- Zustand selector over-subscription
- xterm or CodeMirror rendering cost
- SSE/EventSource/WebSocket fanout and cleanup
- terminal output retention
- SQLite query bounds and N+1 access
- Vite bundle/build regression

Return measurable findings only. Do not provide broad style advice.
