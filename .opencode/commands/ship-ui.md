---
description: Run the final UI ship gate across design direction, accessibility, PWA UX, mobile ergonomics, design-system consistency, and visual regression risk.
agent: pwa-ui-designer
---
Run the final UI ship gate for the requested UI work.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the UI change, target surface, and files changed or planned.
2. Separate known facts from assumptions.
3. Confirm the selected visual direction.
4. Confirm scope safety:
   - frontend UI only
   - no backend changes
   - no secrets
   - no deployment changes
   - no unapproved dependencies
5. Run or simulate task-force review using available instructions:
   - UI critic perspective
   - accessibility/performance reviewer perspective
   - design-system governor perspective
   - PWA release validator perspective
6. Use relevant skills on demand:
   - accessibility-performance-check
   - visual-regression-checklist
   - pwa-ux-audit
   - pwa-installability-check when relevant
   - offline-state-design when relevant
   - mobile-touch-ergonomics when relevant
   - design-system-polish when relevant
7. Do not edit files unless the user explicitly requests fixes after the ship review.
8. Do not run shell commands unless commands are known and approved.
9. Return pass, warn, or fail.
Output format:
## UI ship review
- Surface:
- Selected direction:
- Files reviewed:
- Status: pass / warn / fail
- Known facts:
- Assumptions:
## Task-force review
| Reviewer | Status | Notes | Required fix |
|---|---|---|---|
| UI critic | pass/warn/fail | | |
| Accessibility/performance | pass/warn/fail | | |
| Design-system governor | pass/warn/fail | | |
| PWA release validator | pass/warn/fail/not applicable | | |
| Visual regression | pass/warn/fail | | |
## Required fixes before ship
List only blockers.
## Shippable follow-ups
List non-blocking improvements.
## Validation checklist
- [ ] Visual direction is explicit.
- [ ] Primary action remains clear.
- [ ] Design tokens/components are consistent.
- [ ] Responsive behavior is acceptable.
- [ ] Keyboard/focus behavior is acceptable.
- [ ] Tap target risks are addressed.
- [ ] Loading, empty, error, and disabled states are handled.
- [ ] Offline/reconnect states are handled when relevant.
- [ ] Installability surfaces are handled when relevant.
- [ ] No dependency was added without approval.
- [ ] No backend, auth, billing, deployment, secret, or data-model changes were introduced.
- [ ] Remaining assumptions are named.
## Recommendation
State one of:
- Ready to ship.
- Ship with follow-ups.
- Revise before ship.