---
name: mobile-touch-ergonomics
description: Review mobile PWA interfaces for thumb-zone reachability, tap target comfort, safe-area behavior, responsive density, mobile forms, sticky actions, and gesture clarity.
compatibility: opencode
metadata:
  maturity: stable
---
# Mobile Touch Ergonomics
## What this skill does
This skill reviews mobile web and PWA interfaces for physical usability: tap targets, thumb reach, spacing, sticky actions, safe areas, forms, gestures, and responsive density.
It helps make a PWA feel like a practical native-quality mobile app instead of a desktop website squeezed onto a phone.
## Use when
- The target UI is mobile-first, responsive, or PWA-focused.
- The user asks for app-like mobile polish.
- The interface includes navigation, forms, cards, tables, bottom bars, modals, drawers, sticky actions, or gesture-like interactions.
- `/mobile-first-pass` is invoked.
- `/ship-ui` needs mobile validation.
## Inputs
- Target page, route, or component.
- Relevant layout and component files.
- Styling, token, breakpoint, or theme files if available.
- User-provided screenshots or device priorities if available.
- Known mobile constraints.
## Procedure
1. Identify the mobile surface.
   - Route or page
   - Primary user task
   - Primary action
   - Secondary actions
   - Navigation model
2. Separate facts from assumptions.
   - Do not assume device targets unless provided.
   - Label inferred mobile priorities.
3. Check tap target comfort.
   - Interactive elements should be easy to tap.
   - Avoid cramped icon buttons.
   - Avoid placing destructive actions too close to primary actions.
   - Ensure inline links and small controls have enough spacing.
4. Check thumb-zone reachability.
   - Primary actions should be reachable on common phone sizes.
   - Consider bottom actions for repeated mobile workflows.
   - Avoid placing critical actions only in distant top corners.
   - Avoid hiding frequent actions behind tiny menus.
5. Check navigation ergonomics.
   - Bottom nav, tabs, drawers, and headers should match task frequency.
   - Current location should be clear.
   - Back and close behavior should be predictable.
   - Sticky nav should not consume too much vertical space.
6. Check forms.
   - Labels should remain clear.
   - Inputs should be large enough.
   - Error messages should appear near fields.
   - Submit actions should remain discoverable.
   - Long forms should be grouped or stepped when appropriate.
7. Check responsive density.
   - Cards should not feel cramped.
   - Lists should balance scanability and space use.
   - Tables need mobile alternatives when necessary.
   - Avoid horizontal overflow.
8. Check safe-area and viewport behavior when relevant.
   - Bottom actions should avoid home indicator conflicts.
   - Full-height layouts should account for mobile browser chrome.
   - Fixed elements should not block content.
9. Check gesture clarity.
   - Do not rely on hidden gestures for core actions.
   - Swipe actions need visible alternatives.
   - Drag actions need accessible alternatives.
   - Avoid accidental destructive gestures.
10. Recommend fixes.
   - Prioritize fixes that improve task completion and reduce touch errors.
## Output format
## Mobile touch ergonomics review
- Surface:
- Primary mobile task:
- Known facts:
- Assumptions:
## Findings
| Priority | Finding | Risk | Recommended fix |
|---|---|---|---|
## Mobile polish pass
- Tap targets:
- Thumb reach:
- Navigation:
- Forms:
- Responsive density:
- Safe area:
- Gestures:
## Recommended next step
State the highest-leverage mobile improvement.
## Anti-patterns
- Do not assume desktop layouts are acceptable on mobile.
- Do not make icon-only controls tiny.
- Do not hide primary actions behind menus.
- Do not rely on gestures without visible alternatives.
- Do not use sticky elements that block content.
- Do not overcompress dense dashboard information.
## Token notes
- Load only for mobile, responsive, app-shell, or PWA ergonomics work.
- Inspect only relevant layout, component, style, and breakpoint files.
- Keep findings task-focused.
- Avoid full repo scans.
## Validation checklist
- [ ] Primary mobile task is identified.
- [ ] Tap target risks are reviewed.
- [ ] Thumb reach is considered.
- [ ] Navigation ergonomics are reviewed.
- [ ] Forms are reviewed when present.
- [ ] Responsive density is checked.
- [ ] Safe-area concerns are considered when relevant.
- [ ] Gesture alternatives are considered when relevant.