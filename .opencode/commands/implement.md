---
description: Route a scoped implementation through the trusted implementer workflow.
agent: orchestrator
---

# /implement

Implement `$ARGUMENTS` using the standard workflow:

1. Scout relevant files.
2. Plan minimal diff.
3. Delegate edits to `implementer` or a specialized edit-capable subagent.
4. Run targeted verification.
5. Run review/security/audit subagents when relevant.

Do not use multiple edit-capable agents on overlapping files.
