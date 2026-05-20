---
description: Create a scoped visual regression verification plan for UI changes across responsive layouts, states, themes, and affected surfaces.
agent: pwa-ui-designer
---
Create a visual regression verification plan.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the UI change, planned change, or files changed.
2. Separate known facts from assumptions.
3. Identify affected surfaces:
   - routes
   - pages
   - components
   - shared layout
   - app shell
   - tokens
   - themes
   - states
4. Assign risk level:
   - low: isolated copy or small component polish
   - medium: page layout or component variant change
   - high: shared component, token, navigation, app shell, or responsive system change
5. Use the `visual-regression-checklist` skill.
6. Create a manual verification plan unless known visual regression tooling exists.
7. Do not invent test commands.
8. Do not run commands unless known and approved.
9. Include rollback signals.
Output format:
## Visual regression plan
- Scope:
- Risk level: low / medium / high
- Known facts:
- Assumptions:
## Surfaces to verify
| Surface | Viewport/state | Why it matters |
|---|---|---|
## Manual checklist
- [ ] Before/after comparison reviewed.
- [ ] Mobile layout checked.
- [ ] Tablet layout checked when relevant.
- [ ] Desktop layout checked.
- [ ] Loading state checked.
- [ ] Empty state checked.
- [ ] Error state checked.
- [ ] Focus state checked.
- [ ] Dark/light mode checked when supported.
- [ ] Offline/reconnect state checked when relevant.
- [ ] No unexpected horizontal overflow.
- [ ] No major layout shift.
- [ ] Primary CTA remains clear.
- [ ] Shared components still look consistent.
- [ ] App shell remains stable when relevant.
## Tooling notes
State known visual test commands or “No visual regression tooling identified.”
## Rollback signals
List the conditions that should block shipping or trigger revision.