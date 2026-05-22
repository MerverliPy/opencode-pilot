# Visual Functional Audit

This document explains the Pilot visual/mobile functional audit system.

## Purpose

The audit verifies that the Pilot UI is usable on mobile and responsive screens. It checks routes, layout fit, horizontal overflow, clipped controls, tap targets, visible interactive elements, click behavior, console errors, page errors, and screenshot evidence.

## OpenCode entry point

Use:

/visual-functional-audit --url http://localhost:43173 --soft

The OpenCode command delegates to `visual-ui-auditor` and uses the `visual-functional-audit` skill.

## Direct shell entry point

Use:

npm run qa:visual-functional -- --url http://localhost:43173 --soft

The `--soft` flag writes findings without failing the process on P0/P1 defects.

## Useful options

Target URL:

npm run qa:visual-functional -- --url http://localhost:43173 --soft

Custom output directory:

npm run qa:visual-functional -- --url http://localhost:43173 --out dogfood-output/visual-functional-audit --soft

Custom route list:

npm run qa:visual-functional -- --url http://localhost:43173 --routes /,/chat,/settings --soft

Headed browser:

npm run qa:visual-functional -- --url http://localhost:43173 --headed --soft

## Output directory

Default:

dogfood-output/visual-functional-audit

Expected files:

- `run-metadata.json`
- `report.md`
- `report.json`
- `clicks.jsonl`
- `console-errors.jsonl`
- `page-errors.jsonl`
- `screenshots/`
- `failures/`

## Severity model

P0 blocks core usage.

Examples:
- app crash
- route unusable
- page error
- primary action impossible on mobile

P1 is a major mobile or functional defect.

Examples:
- horizontal overflow
- clipped nav or primary control
- click exception
- fixed or sticky element outside viewport

P2 is a functional or UX defect.

Examples:
- tap target below 44x44 CSS pixels
- click has no observable response
- weak state feedback

P3 is polish or optimization.

Examples:
- spacing inconsistency
- visual hierarchy refinement
- minor interaction polish

## Pass threshold

A release-ready pass should have:

- 0 P0 findings
- 0 unresolved P1 findings
- no unexplained horizontal overflow on mobile widths
- every visible interactive element classified as passed, failed, skipped, or disabled
- screenshots for route states and failures
- console and page errors recorded

## Safe skip reasons

The audit may skip:

- file upload controls
- external navigation
- destructive controls such as delete, reset, revoke, deploy, publish, archive, or disconnect
- disabled controls

Skipped controls must have a reason in `clicks.jsonl`.

## Important limitations

This audit tests the visible initial route state and safe interactions. It does not automatically authenticate with real accounts, mutate external services, delete data, publish packages, or bypass confirmation flows.

Authenticated flows should use seeded local test state or redacted test credentials configured outside the audit files.
