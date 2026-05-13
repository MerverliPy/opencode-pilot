---
description: Fix build, TypeScript, lint, or import failures with minimal diffs.
agent: implementer
---

# /fix-build

Use `build-fixer` for `$ARGUMENTS` or the current failing command.

Workflow:

1. Reproduce or parse the failure.
2. Fix one root cause at a time.
3. Re-run the failed command.
4. Stop if product behavior or architecture judgment is needed.

Do not perform opportunistic refactors.
