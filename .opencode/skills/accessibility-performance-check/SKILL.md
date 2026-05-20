---
name: accessibility-performance-check
description: Validate frontend UI work for accessibility, semantic structure, keyboard behavior, responsive performance, motion safety, layout stability, and dependency restraint.
compatibility: opencode
metadata:
  maturity: stable
---

# Accessibility Performance Check

## What this skill does

This skill validates UI design and frontend implementation decisions against accessibility and performance-sensitive frontend standards. It is intended as a final check before recommending or completing UI changes.

## Use when

- Finalizing UI implementation.
- Reviewing a page, component, or flow for accessibility.
- Reviewing responsive behavior or mobile PWA polish.
- Considering animation, image-heavy layouts, custom controls, modals, dialogs, menus, forms, or dependency additions.
- The user asks for a shipping checklist.

## Inputs

- Relevant UI files.
- Component code.
- Styling files.
- Design direction or implementation plan.
- Known framework and component library if available.
- Any available test or lint commands if provided by the repo or user.

## Procedure

1. Check semantic structure.
   - Prefer native elements.
   - Verify headings are logical.
   - Use landmarks where appropriate.
   - Avoid div-only controls.

2. Check keyboard behavior.
   - Interactive elements must be reachable.
   - Focus order should match visual order.
   - Focus states should be visible.
   - Menus, dialogs, popovers, and tabs should support expected keyboard behavior.

3. Check labels and names.
   - Buttons and links should have clear accessible names.
   - Icon-only controls need labels.
   - Inputs need labels.
   - Errors should be associated with fields when possible.

4. Check color and contrast.
   - Text should have sufficient contrast.
   - UI state should not rely on color alone.
   - Disabled text should remain understandable.
   - Focus indicators should be visible.

5. Check motion safety.
   - Avoid excessive motion.
   - Prefer subtle transitions.
   - Respect reduced-motion patterns when present.
   - Do not use animation to hide usability issues.

6. Check responsive behavior.
   - Small screens must not require horizontal scrolling.
   - Tap targets should be comfortable.
   - Cards, tables, nav, dialogs, and forms need mobile behavior.
   - Content should remain readable at narrow widths.

7. Check loading, empty, and error states.
   - Loading states should not cause layout shift.
   - Empty states should be useful.
   - Errors should be recoverable.
   - Disabled states should be understandable.

8. Check performance-sensitive choices.
   - Avoid unnecessary dependencies.
   - Avoid heavy animation libraries unless approved.
   - Avoid image-heavy sections without optimization.
   - Avoid layout shift.
   - Prefer CSS and existing components for simple effects.
   - Avoid unnecessary client-side complexity.

9. Check PWA-specific risks when relevant.
   - Offline/reconnect states.
   - App-shell stability.
   - Safe-area behavior.
   - Touch ergonomics.
   - Install prompt restraint.

10. Provide validation status.
   - Pass: acceptable.
   - Warn: acceptable with named risk.
   - Fail: should revise before shipping.

## Output format

### Accessibility and performance check

- Scope:
- Status: pass/warn/fail
- Known facts:
- Assumptions:

### Checklist

| Area | Status | Notes |
|---|---|---|
| Semantics | pass/warn/fail | |
| Keyboard/focus | pass/warn/fail | |
| Labels/names | pass/warn/fail | |
| Contrast/state clarity | pass/warn/fail | |
| Motion safety | pass/warn/fail | |
| Responsive behavior | pass/warn/fail | |
| Loading/empty/error states | pass/warn/fail | |
| Performance-sensitive choices | pass/warn/fail | |
| PWA-specific UX | pass/warn/fail/not applicable | |

### Required fixes

List only fixes needed before shipping.

### Recommended follow-ups

List optional improvements.

## Anti-patterns

- Do not claim compliance without evidence.
- Do not require ARIA when native semantics solve the issue.
- Do not ignore keyboard behavior for custom controls.
- Do not approve low-contrast visual designs.
- Do not add libraries for simple transitions.
- Do not mark PWA-specific UX as failed when the surface is not PWA-relevant.
- Do not run unavailable commands or invent test results.

## Token notes

- Load near the end of audit, redesign, or implementation.
- Read only the relevant UI and style files.
- Keep status tables compact.
- Do not repeat the whole design rationale; validate the current plan or diff.

## Validation checklist

- [ ] Status is pass, warn, or fail.
- [ ] Accessibility checks are evidence-based.
- [ ] Performance-sensitive risks are named.
- [ ] Responsive behavior is considered.
- [ ] PWA-specific UX is marked not applicable when irrelevant.
- [ ] Required fixes are separated from optional follow-ups.