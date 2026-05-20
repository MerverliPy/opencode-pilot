---
description: Review and improve a UI surface for mobile-first PWA ergonomics, tap targets, thumb reach, safe areas, responsive density, and mobile forms.
agent: pwa-ui-designer
---
Run a mobile-first UI pass.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the mobile surface, route, component, or flow.
2. Identify the primary mobile task and primary action.
3. Separate known facts from assumptions.
4. Inspect relevant layout, route, component, style, token, and breakpoint files only.
5. Review:
   - mobile layout hierarchy
   - tap target comfort
   - thumb-zone reachability
   - primary action placement
   - nav ergonomics
   - forms
   - cards/lists/tables
   - sticky actions
   - safe-area behavior when relevant
   - horizontal overflow risk
   - responsive density
   - app-shell feel
6. Use the `mobile-touch-ergonomics` skill.
7. Use `pwa-ux-audit` when the surface is PWA/app-shell relevant.
8. Ask before editing unless implementation has already been approved.
9. Avoid backend and dependency changes.
Output format before edits:
## Mobile-first review
- Surface:
- Primary mobile task:
- Known facts:
- Assumptions:
## Findings
| Priority | Finding | Risk | Suggested fix |
|---|---|---|---|
## Mobile-first recommendation
- Layout:
- Primary action:
- Navigation:
- Forms:
- Touch targets:
- Responsive density:
- PWA/app-shell notes:
## Implementation scope
- Files likely involved:
- What will not change:
- Approval needed:
If implementation is approved, finish with:
## Mobile-first implementation summary
- Files changed:
- Mobile UX impact:
- Accessibility notes:
- Responsive notes:
- Remaining risks:
