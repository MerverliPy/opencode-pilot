---
description: Run a PWA redesign workflow with audit, visual directions, recommendation, and approval gate before edits.
agent: pwa-ui-designer
---

Run the PWA redesign workflow for the requested surface.

User request or target:
$ARGUMENTS

Follow this workflow:

1. Identify the target page, route, component, app shell, or flow.
2. Separate known facts from assumptions.
3. Inspect only relevant UI, route, layout, component, style, token, and theme files.
4. Diagnose the current UI.
5. Generate distinct visual directions:
   - Direction A: Safe polish
   - Direction B: Premium app-like PWA
   - Direction C: Bold differentiated concept
6. Recommend one direction.
7. Identify likely files involved.
8. Ask for approval before editing unless the user has already explicitly approved implementation.
9. If implementation is approved, keep changes scoped to frontend UI files only.
10. Do not add dependencies, rewrite large areas, or touch backend systems without explicit approval.

Output format before implementation:

## Redesign objective

One sentence.

## Current diagnosis

- Strengths:
- Weaknesses:
- Biggest opportunity:

## Direction A — Safe polish

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

## Direction B — Premium app-like PWA

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

## Direction C — Bold differentiated concept

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

## Recommendation

State the recommended direction and why.

## Proposed implementation scope

- Files likely involved:
- What will not be touched:
- Dependency changes:
- Approval needed:

If implementation is performed, finish with:

## Implementation summary

- Selected direction:
- Files changed:
- Design impact:
- Accessibility/performance notes:
- Validation checklist:
- Remaining risks: