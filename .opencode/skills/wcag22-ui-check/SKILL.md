---
name: wcag22-ui-check
description: Review UI work against WCAG 2.2-oriented concerns including focus visibility, focus not obscured, target size, dragging alternatives, redundant entry, and accessible authentication.
compatibility: opencode
metadata:
  maturity: stable
---
# WCAG 2.2 UI Check
## What this skill does
This skill reviews UI work against WCAG 2.2-oriented accessibility concerns, especially areas commonly missed during modern app and PWA design.
It is not a legal certification. It is a practical UI review checklist for design and frontend implementation.
## Use when
- Finalizing UI implementation.
- Reviewing forms, authentication, onboarding, dashboards, app shells, dialogs, custom controls, drag/drop, or mobile interactions.
- `/ship-ui` needs accessibility hardening.
- A UI change affects focus behavior, input flows, touch targets, or authentication.
- The user asks for WCAG 2.2 review.
## Inputs
- Target surface or component.
- Relevant UI/component code.
- Styling files if needed.
- Interaction behavior description if available.
- Known accessibility constraints.
- Existing test results if provided.
## Procedure
1. Identify the UI surface.
2. Separate facts from assumptions.
3. Review baseline accessibility:
   - Semantic structure
   - Keyboard reachability
   - Logical focus order
   - Visible focus
   - Accessible names
   - Form labels
   - Error messages
   - Color contrast
   - Non-color state indicators
4. Review WCAG 2.2-oriented concerns:
   - Focus not obscured
   - Focus appearance
   - Dragging alternatives
   - Target size minimum
   - Consistent help when help exists
   - Redundant entry avoidance
   - Accessible authentication
5. Review mobile/PWA-specific accessibility:
   - Touch target comfort
   - Safe-area conflicts
   - Sticky controls blocking focus or content
   - Reduced-motion safety
   - Offline/reconnect messaging clarity
6. Classify each finding:
   - Blocker
   - Important
   - Nice-to-have
   - Not applicable
7. Provide required fixes and optional improvements.
## Output format
## WCAG 2.2 UI check
- Surface:
- Status: pass / warn / fail / needs evidence
- Known facts:
- Assumptions:
| Area | Status | Evidence | Required fix |
|---|---|---|---|
| Semantics | pass/warn/fail/not applicable | | |
| Keyboard reachability | pass/warn/fail/not applicable | | |
| Focus order | pass/warn/fail/not applicable | | |
| Focus visibility | pass/warn/fail/not applicable | | |
| Focus not obscured | pass/warn/fail/not applicable | | |
| Accessible names | pass/warn/fail/not applicable | | |
| Form labels/errors | pass/warn/fail/not applicable | | |
| Color/non-color state indicators | pass/warn/fail/not applicable | | |
| Dragging alternatives | pass/warn/fail/not applicable | | |
| Target size | pass/warn/fail/not applicable | | |
| Consistent help | pass/warn/fail/not applicable | | |
| Redundant entry | pass/warn/fail/not applicable | | |
| Accessible authentication | pass/warn/fail/not applicable | | |
| Motion safety | pass/warn/fail/not applicable | | |
## Required fixes before ship
List blocking or important fixes.
## Optional accessibility polish
List non-blocking improvements.
## Anti-patterns
- Do not claim WCAG compliance without evidence.
- Do not treat this as legal certification.
- Do not require ARIA where native HTML works.
- Do not ignore keyboard users.
- Do not hide focus states for aesthetics.
- Do not use drag-only interactions.
- Do not make authentication depend only on memory puzzles when alternatives are possible.
- Do not rely on color alone to communicate state.
## Token notes
- Load only for accessibility review or final UI ship gates.
- Inspect only relevant UI and style files.
- Keep the table compact.
- Mark items not applicable when the surface does not involve them.
- Do not repeat the entire UI audit.
## Validation checklist
- [ ] Status is evidence-based.
- [ ] WCAG 2.2-oriented areas are explicitly considered.
- [ ] Not-applicable items are marked clearly.
- [ ] Required fixes are separated from optional polish.
- [ ] No compliance claim is made without proof.
