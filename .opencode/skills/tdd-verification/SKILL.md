---

name: tdd-verification
description: "Use for test-first implementation, bug reproduction tests, targeted verification selection, Jest coverage, TypeScript typechecks, and final verification reports."
compatibility: opencode
---

# TDD and verification

## Bugfix loop

1. Write or identify a test that fails for the bug.
2. Confirm the failure is meaningful.
3. Apply the smallest code fix.
4. Re-run the failing test.
5. Run adjacent typecheck/build gate.

## Feature loop

1. Define input/output behavior and edge cases.
2. Add unit/component tests where behavior is deterministic.
3. Add integration/E2E tests only for cross-boundary behavior.
4. Implement until tests pass.
5. Refactor only while tests remain green.

## Command ladder

- UI unit: `npm run test -w ui -- <pattern>` when supported, otherwise `npm run test -w ui`.
- UI coverage: `npm run test:coverage -w ui`.
- Types: package-specific `npm run typecheck -w <workspace>` before root `npm run typecheck`.
- Build: package-specific build before root build.
- E2E: targeted Playwright spec before full `npm run test:e2e`.

## Report format

```text
VERIFICATION: PASS|FAIL|PARTIAL
Commands run:
- command: outcome
Failures:
- file:line — issue
Next gate:
- command or rationale for stopping
```
