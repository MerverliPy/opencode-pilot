---
name: visual-functional-audit
description: Run a report-only Pilot UI audit that inventories and exercises visible interactive controls across mobile viewports, checks clipping, overflow, tap targets, accessibility signals, and returns artifact-backed findings.
compatibility: opencode
metadata:
  maturity: beta
---

# Visual Functional Audit

## What this skill does

This skill defines the evidence-first procedure for auditing the Pilot UI on mobile and responsive screens. It verifies clickable controls, route rendering, layout fit, viewport clipping, tap target quality, and basic accessibility signals.

## Use when

- The user asks to test every clickable button or UI control.
- The user asks whether the UI works on mobile.
- The user asks whether layout content is cut off.
- The user asks for a functional visual audit.
- The user asks for evidence-backed UI optimization recommendations.

## Inputs

- Target URL, default: `http://localhost:43173`
- Route list, default: Pilot E2E route list
- Viewport list, default: 320x568, 375x667, 390x844, 430x932, 768x1024
- Output directory, default: `dogfood-output/visual-functional-audit`
- Optional authenticated or seeded test state, never real secrets

## Procedure

1. Confirm the audit is report-only.
2. Confirm the browser automation command before running it.
3. Run the deterministic audit first:
   - `npm run qa:visual-functional -- --url http://localhost:43173 --soft`
4. Inspect the generated artifacts:
   - `report.md`
   - `report.json`
   - `clicks.jsonl`
   - `console-errors.jsonl`
   - `screenshots/`
   - `failures/`
5. Verify route coverage.
6. Verify viewport coverage.
7. Review every clickable result.
8. Confirm skipped controls have a valid reason:
   - file upload
   - external navigation
   - dangerous action
   - disabled by design
9. Review layout findings:
   - horizontal overflow
   - clipped interactive elements
   - fixed or sticky elements outside viewport
   - controls hidden behind bottom navigation
10. Review mobile tap target findings.
11. Review console and page errors.
12. Create a prioritized fix plan.
13. Recommend follow-up agents only when needed.

## Output format

Return:

Audit status: pass | warn | fail

Target:
- URL:
- Output directory:
- Command:

Coverage:
- Routes:
- Viewports:
- Clickables tested:
- Clickables skipped:

Critical findings:
- P0:
- P1:
- P2:
- P3:

Evidence:
- Markdown report:
- JSON report:
- Screenshot directory:
- Failure directory:

Recommended next fixes:
1. Highest impact fix
2. Next fix
3. Next validation command

## Anti-patterns

- Do not edit UI code during the audit.
- Do not call many UI agents before evidence exists.
- Do not treat a screenshot-only pass as functional proof.
- Do not claim every button works if skipped controls lack reasons.
- Do not ignore 320px width.
- Do not hide P1 overflow or cutoff defects as polish issues.
- Do not read or request real credentials.

## Token notes

- Load this skill only for visual/mobile UI audits.
- Summarize JSONL artifacts instead of pasting full logs.
- Report top findings first.
- Delegate only after evidence is generated.
- Keep screenshots as file paths, not inline base64.

## Validation checklist

- [ ] Route coverage is listed.
- [ ] Viewport coverage is listed.
- [ ] Clickable inventory count is listed.
- [ ] Every clickable is passed, failed, skipped, or intentionally disabled.
- [ ] Horizontal overflow is checked.
- [ ] Mobile clipping is checked.
- [ ] Tap target issues are checked.
- [ ] Console and page errors are checked.
- [ ] Screenshots are captured.
- [ ] P0/P1/P2/P3 findings are prioritized.
- [ ] No source files were edited by the auditor.
