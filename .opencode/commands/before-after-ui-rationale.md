---
description: Explain the before/after design rationale for UI changes in plain language for review, handoff, and stakeholder clarity.
agent: pwa-ui-designer
---
Create a before/after UI rationale for the requested change.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the changed or proposed UI surface.
2. Inspect relevant files or provided diff/description only.
3. Read `docs/ui-design-memory.md` if available.
4. Separate known facts from assumptions.
5. Explain the previous UI weakness.
6. Explain the new design decision.
7. Explain why the change improves UX, PWA feel, accessibility, conversion, or consistency.
8. Name any tradeoffs.
9. Do not edit files unless explicitly requested.
Output format:
## Before/after UI rationale
- Surface:
- Selected direction:
- Known facts:
- Assumptions:
## Before
- What felt weak:
- What users might miss:
- What caused friction:
- What design-system or PWA issue existed:
## After
- What changed:
- Why it improves UX:
- Why it improves PWA/mobile feel:
- Why it improves accessibility:
- Why it improves visual hierarchy:
- Why it improves product clarity or conversion:
- Why it fits the design memory:
## Tradeoffs
- What became better:
- What risk remains:
- What should be watched in visual regression:
## Reviewer summary
Provide a concise stakeholder-friendly explanation in 3-5 bullets.
## Follow-up
State whether this change should update `docs/ui-design-memory.md`.
