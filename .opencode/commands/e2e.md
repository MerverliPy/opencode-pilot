---
description: Create, run, or debug Playwright E2E tests for a specified Pilot user flow.
agent: orchestrator
---

# /e2e

Use `e2e-runner` for `$ARGUMENTS`.

Default behavior:

1. Identify existing specs and target flow.
2. Add/modify the smallest test needed.
3. Run targeted Playwright spec when practical.
4. Report trace/screenshot/video artifact paths on failure.

Do not start persistent dev servers without explicit approval.
