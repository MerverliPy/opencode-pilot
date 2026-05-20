---
description: Review design tokens, components, spacing, typography, states, themes, and UI consistency.
agent: pwa-ui-designer
---

Run a design-system polish review.

User request or target:
$ARGUMENTS

Follow this workflow:

1. Identify the target page, component set, theme, token system, or UI scope.
2. Separate known facts from assumptions.
3. Detect the styling system from evidence:
   - Tailwind
   - CSS variables
   - theme object
   - component library
   - CSS modules
   - global CSS
   - inline styles
   - other project convention
4. Inspect only relevant design-token, theme, component, style, route, and layout files.
5. Review:
   - typography scale and hierarchy
   - spacing scale and layout rhythm
   - color usage
   - surface hierarchy
   - radius, border, shadow, and elevation consistency
   - component variants
   - hover, focus, active, disabled, loading, empty, error, and selected states
   - dark/light behavior if supported
   - responsive density
6. Recommend concrete improvements.
7. Do not create a new design system from scratch unless explicitly requested.
8. Do not add dependencies without approval.
9. Do not edit files unless the user explicitly approves implementation.

Output format:

## Design-system review

- Scope:
- Styling system detected:
- Design primitives found:
- Known facts:
- Assumptions:

## Findings

| Area | Issue | Recommendation | Priority |
|---|---|---|---|

## Suggested polish pass

- Typography:
- Spacing:
- Color/surfaces:
- Components:
- States:
- Responsive behavior:

## Implementation notes

- Files likely involved:
- What should not change:
- Dependency risk:
- Approval needed:

## Validation checklist

- Token reuse:
- Component consistency:
- Accessibility:
- Responsive behavior:
- Performance-sensitive UI: