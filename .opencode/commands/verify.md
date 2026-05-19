---
description: Run targeted or full verification for the current Pilot workspace state using changed-file-aware gates.
agent: verifier
---

# /verify

Arguments:

- `quick`: root/package typecheck and build only.
- `full`: typecheck, build, lint, unit tests, and E2E when practical.
- `pre-pr`: full verification plus security audit.
- empty: choose the narrowest adequate gate from changed files.

Workflow:

1. Use `pilot_changed_files` and `pilot_verify_plan` when available.
2. Run the narrowest command sequence first.
3. Stop on the first blocking failure and return the first useful error group.
4. Escalate to broader verification only when narrow gates are insufficient or the changed files cross workspace boundaries.
5. For `pre-pr`, include `pilot_risk_scan` and request security/performance review only when risk labels require it.

Report exact command outcomes, skipped commands, and the reason for any escalation.
