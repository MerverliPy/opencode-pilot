---
name: motion-interaction-polish
description: Review and design restrained UI motion, transitions, feedback, microinteractions, reduced-motion behavior, and performance-safe interaction polish.
compatibility: opencode
metadata:
  maturity: stable
---
# Motion Interaction Polish
## What this skill does
This skill improves UI interaction quality through restrained, purposeful motion and feedback. It helps the PWA UI Designer add premium feel without harming accessibility, performance, or clarity.
It does not recommend animation for decoration alone.
## Use when
- The user asks for premium polish, native-like feel, or microinteractions.
- A UI has hover, focus, active, pressed, loading, transition, drawer, modal, tab, menu, card, or navigation states.
- A redesign needs motion guidance.
- A proposed animation may affect accessibility or performance.
- `/component-polish` or `/ship-ui` needs interaction validation.
## Inputs
- Target component or flow.
- Existing animation or transition patterns.
- Styling or component files.
- Framework and styling system if known.
- Accessibility or reduced-motion constraints.
## Procedure
1. Identify the interaction surface.
   - Button
   - Card
   - Sheet
   - Modal
   - Menu
   - Navigation
   - Loading state
   - Page transition
   - Form feedback
   - Drag/swipe interaction
2. Separate facts from assumptions.
   - Do not assume animation libraries.
   - Do not assume reduced-motion support exists.
3. Identify the purpose of motion.
   - Feedback
   - Orientation
   - State transition
   - Continuity
   - Delight
   - Loading reassurance
   - Error recovery
4. Check restraint.
   - Motion should be subtle.
   - Motion should not slow task completion.
   - Motion should not distract from the primary action.
   - Avoid excessive delays.
5. Check accessibility.
   - Avoid motion that can trigger discomfort.
   - Provide reduced-motion alternatives where project patterns allow.
   - Do not rely on motion alone to communicate state.
   - Keep focus behavior clear.
6. Check performance.
   - Prefer opacity and transform where motion is needed.
   - Avoid heavy layout animations.
   - Avoid large animation libraries without approval.
   - Avoid animating expensive properties.
   - Avoid animation that causes layout shift.
7. Check interaction feedback.
   - Hover
   - Focus
   - Pressed
   - Disabled
   - Loading
   - Success
   - Error
   - Selected/current
8. Recommend motion tokens or patterns.
   - Use existing duration/easing values when available.
   - Keep new values minimal.
   - Document the intended feel.
## Output format
## Motion and interaction polish
- Surface:
- Motion purpose:
- Known facts:
- Assumptions:
## Findings
| Area | Finding | Recommendation | Risk |
|---|---|---|---|
## Suggested interaction treatment
- Hover:
- Focus:
- Pressed:
- Loading:
- State transition:
- Reduced motion:
- Performance note:
## Approval needed
State whether dependency, major behavior, or broad pattern changes need approval.
## Anti-patterns
- Do not animate for decoration alone.
- Do not add animation libraries for simple transitions.
- Do not hide state changes behind motion.
- Do not create motion that delays task completion.
- Do not animate layout-heavy properties without need.
- Do not ignore reduced-motion concerns.
- Do not replace clear hierarchy with flashy transitions.
## Token notes
- Load only when motion or interaction polish matters.
- Inspect only relevant component and style files.
- Avoid repeating the full UI audit.
- Keep recommendations implementable with existing project tools.
## Validation checklist
- [ ] Motion has a clear purpose.
- [ ] Reduced-motion concerns are considered.
- [ ] Performance-sensitive risks are named.
- [ ] Interaction states are covered.
- [ ] Dependency additions are avoided unless approved.
- [ ] Recommendations fit existing styling conventions.