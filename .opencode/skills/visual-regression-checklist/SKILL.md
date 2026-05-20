---
name: visual-regression-checklist
description: Create a scoped visual regression verification checklist for UI changes, covering before/after review, responsive breakpoints, states, themes, accessibility, and rollback risk.
compatibility: opencode
metadata:
  maturity: stable
---
# Visual Regression Checklist
## What this skill does
This skill creates a scoped visual regression plan for UI changes. It helps verify that a redesign, polish pass, or component update did not break important layouts, states, themes, or responsive behavior.
It does not require a specific screenshot or testing tool. It can produce a manual checklist or adapt to existing visual test tooling when known.
## Use when
- UI changes affect shared components, layouts, tokens, or multiple routes.
- The user asks for visual regression planning.
- `/visual-regression-plan` is invoked.
- `/ship-ui` needs final visual verification.
- A redesign may affect responsive layouts or state quality.
## Inputs
- Files changed or planned.
- Target route, component, or flow.
- Known breakpoints or device targets.
- Existing screenshot/visual test tooling if available.
- Theme modes if supported.
- Critical states to verify.
## Procedure
1. Identify scope.
   - Files changed
   - Routes affected
   - Components affected
   - Shared tokens affected
   - User flows affected
2. Separate facts from assumptions.
   - Do not invent visual test tooling.
   - Mark unknown routes or breakpoints clearly.
3. Identify review surfaces.
   - Desktop
   - Tablet
   - Mobile
   - Narrow mobile
   - Light theme
   - Dark theme
   - Authenticated state
   - Empty state
   - Loading state
   - Error state
   - Offline state when relevant
   - Focus/keyboard state
4. Identify risk level.
   - Low: isolated component or copy change.
   - Medium: page layout or component variant change.
   - High: shared component, token, app shell, navigation, or responsive system change.
5. Create manual verification checklist.
   - Before/after visual comparison.
   - Responsive checks.
   - State checks.
   - Theme checks.
   - Accessibility spot checks.
   - Browser/app-window checks when relevant.
6. Adapt to existing tooling when known.
   - If visual regression tools exist, reference them.
   - Do not invent commands.
   - Do not run commands unless explicitly approved and known.
7. Define rollback signal.
   - Name what would require reverting or revising.
## Output format
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
## Tooling notes
State known visual test commands or “No visual regression tooling identified.”
## Rollback signals
List the conditions that should block shipping or trigger revision.
## Anti-patterns
- Do not invent visual test tools or commands.
- Do not require full-app visual testing for tiny isolated changes.
- Do not ignore mobile.
- Do not ignore state changes.
- Do not approve shared-token changes without broader surface review.
- Do not claim visual regression passed without evidence.
## Token notes
- Load after implementation planning or before ship.
- Use changed files and likely affected surfaces to scope review.
- Keep checklist proportional to change risk.
- Avoid broad route enumeration unless a shared primitive changed.
## Validation checklist
- [ ] Scope is explicit.
- [ ] Risk level is assigned.
- [ ] Responsive surfaces are included.
- [ ] UI states are included.
- [ ] Theme behavior is included when relevant.
- [ ] Tooling is not invented.
- [ ] Rollback signals are clear.
