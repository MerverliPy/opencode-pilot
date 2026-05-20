---
name: design-system-polish
description: Review and improve UI consistency across design tokens, spacing, typography, color, surfaces, components, states, themes, and reusable frontend patterns.
compatibility: opencode
metadata:
  maturity: stable
---

# Design System Polish

## What this skill does

This skill reviews and improves the consistency and quality of a UI design system or design-system-like frontend code. It focuses on tokens, spacing, typography, surfaces, components, themes, and reusable patterns.

It works even if the project does not have a formal design system.

## Use when

- The UI feels inconsistent, generic, cluttered, or unpolished.
- The user asks for design-system review or component polish.
- The project uses tokens, themes, Tailwind config, CSS variables, component primitives, or reusable UI components.
- Multiple pages/components need a consistent visual language.
- The user wants a senior UI polish pass before shipping.

## Inputs

- Relevant UI components.
- Theme, token, CSS variable, Tailwind, or styling files if present.
- Existing brand constraints.
- Current page or flow being improved.
- Known framework and component system if available.

## Procedure

1. Identify the styling system.
   - Tailwind utilities
   - CSS variables
   - Theme object
   - Component library
   - CSS modules
   - Global CSS
   - Inline styles
   - Other project convention

2. Locate design primitives if available.
   - Colors
   - Typography
   - Spacing
   - Radius
   - Shadows
   - Borders
   - Motion
   - Breakpoints
   - Component variants

3. Review hierarchy.
   - Page title and section title relationships.
   - Primary, secondary, and tertiary actions.
   - Content grouping.
   - Scanability.
   - Visual weight.

4. Review spacing and layout rhythm.
   - Repeated spacing scale.
   - Container widths.
   - Gaps between sections and components.
   - Card padding.
   - Responsive density.

5. Review typography.
   - Font scale.
   - Font weight contrast.
   - Line height.
   - Label, helper, caption, and metadata treatment.
   - Mobile readability.

6. Review color and surface language.
   - Background hierarchy.
   - Card/surface contrast.
   - Border usage.
   - Elevation/shadow consistency.
   - Accent color restraint.
   - Dark/light compatibility if applicable.

7. Review component states.
   - Default
   - Hover
   - Active/pressed
   - Focus
   - Disabled
   - Loading
   - Empty
   - Error
   - Selected/current

8. Review reuse opportunities.
   - Identify repeated patterns.
   - Recommend extraction only when it reduces complexity.
   - Avoid premature abstraction for small one-off UI.

9. Recommend improvements.
   - Prefer token reuse.
   - Prefer small, reviewable diffs.
   - Avoid dependency additions unless clearly justified.

## Output format

### Design-system polish review

- Styling system detected:
- Design primitives found:
- Scope reviewed:

### Findings

| Area | Issue | Recommendation | Priority |
|---|---|---|---|

### Suggested polish pass

- Typography:
- Spacing:
- Color/surfaces:
- Components:
- States:
- Responsive behavior:

### Implementation notes

- Files likely involved:
- Risk:
- Approval needed:

## Anti-patterns

- Do not create a design system from scratch unless requested.
- Do not replace project conventions with personal preferences.
- Do not hardcode values when tokens exist.
- Do not over-abstract tiny repeated patterns.
- Do not add a component library to solve small polish issues.
- Do not ignore dark mode if the project already supports it.
- Do not make all surfaces look identical.

## Token notes

- Load only when consistency, tokens, components, or polish are relevant.
- Read token/theme/style files before changing visual values.
- Inspect only representative components unless broader inconsistency is proven.
- Summarize reusable decisions once and refer back to them.

## Validation checklist

- [ ] Styling system is identified from evidence or marked unknown.
- [ ] Existing tokens or conventions are reused where possible.
- [ ] Typography, spacing, color, surfaces, and states are reviewed.
- [ ] Responsive behavior is considered.
- [ ] Recommendations are concrete.
- [ ] Dependency additions are avoided unless approved.
- [ ] Implementation scope is reviewable.