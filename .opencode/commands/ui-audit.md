---
description: Audit a UI or PWA surface for senior design, accessibility, responsiveness, and app-like polish.
agent: pwa-ui-designer
---

Run a senior UI/PWA audit for the requested surface.

User request or target:
$ARGUMENTS

Follow this workflow:

1. Identify the target surface, route, page, component, or flow.
2. Separate known facts from assumptions.
3. Inspect only relevant UI, layout, component, style, token, and theme files.
4. Do not edit files unless the user explicitly asks for implementation after the audit.
5. Evaluate:
   - visual hierarchy
   - spacing and layout rhythm
   - typography
   - color and contrast
   - component consistency
   - responsive behavior
   - mobile/touch ergonomics
   - loading, empty, disabled, and error states
   - PWA app-like feel when relevant
   - accessibility risks
   - performance-sensitive UI risks
6. Prioritize findings as P0, P1, P2, or P3.
7. Recommend the highest-leverage next action.

Output format:

## UI/PWA audit

- Surface reviewed:
- Product goal:
- Known facts:
- Assumptions:

## Priority findings

| Priority | Finding | Why it matters | Suggested fix |
|---|---|---|---|

## Recommended direction

State whether this needs safe polish, premium app-like PWA redesign, bold differentiated concept, or no redesign.

## Validation checklist

- Accessibility:
- Responsive behavior:
- PWA/mobile feel:
- Performance-sensitive UI:
- Design-system consistency:

Do not make backend, dependency, auth, deployment, secret, or infrastructure changes.