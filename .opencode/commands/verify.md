---
description: Run targeted or full verification for the current Pilot workspace state.
agent: verifier
---

# /verify

Arguments:

- `quick`: root/package typecheck and build only.
- `full`: typecheck, build, lint, unit tests, and E2E when practical.
- `pre-pr`: full verification plus security audit.
- empty: choose the narrowest adequate gate from changed files.

Report exact command outcomes and stop on blocking failures.
