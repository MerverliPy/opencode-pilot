---
name: pwa-ux-audit
description: Audit a progressive web app UI for app-like UX, mobile responsiveness, installability surfaces, app shell behavior, loading, empty, error, offline, and reconnect states.
compatibility: opencode
metadata:
  maturity: stable
---

# PWA UX Audit

## What this skill does

This skill gives the PWA UI Designer a repeatable audit process for progressive web app user experience. It focuses on whether the interface feels like a polished app rather than a generic responsive website.

It does not replace implementation. It produces findings, priorities, and recommended UI changes.

## Use when

- The target is a PWA, installable web app, mobile web app, dashboard, app shell, or offline-capable interface.
- The user asks whether the app feels native, premium, mobile-friendly, or PWA-ready.
- A redesign needs to account for loading, empty, error, offline, reconnect, or cached-data states.
- The UI needs mobile-first ergonomics and app-like interaction patterns.

## Inputs

- User goal or target flow.
- Relevant route, layout, page, component, style, token, and theme files.
- Known framework and styling system if available.
- Known PWA constraints if available.
- Screenshots or visual descriptions if provided.
- Existing app manifest, service worker, or offline behavior only when relevant and provided.

## Procedure

1. Identify the product surface.
   - Name the page, route, component, or flow being reviewed.
   - Identify the primary user action.
   - Identify whether the interface is marketing, onboarding, dashboard, transactional, content, or utility.

2. Separate facts from assumptions.
   - Facts must come from the user prompt or inspected files.
   - Assumptions must be labeled.
   - Do not infer repo structure or PWA implementation details without evidence.

3. Check app-shell feel.
   - Is navigation predictable and stable?
   - Does the interface have a clear shell, content area, and action hierarchy?
   - Are persistent controls placed where mobile users expect them?
   - Does the design avoid desktop-only interaction assumptions?

4. Check mobile ergonomics.
   - Tap targets should be comfortable.
   - Primary actions should be reachable.
   - Spacing should prevent accidental taps.
   - Forms should be easy to complete on mobile.
   - Layout should handle small screens without cramped density.

5. Check responsive behavior.
   - Identify likely breakpoints or responsive utilities.
   - Look for layouts that collapse poorly.
   - Verify cards, grids, nav, modals, dialogs, sheets, tables, and forms have mobile behavior.
   - Flag horizontal overflow risk.

6. Check state quality.
   - Loading states should be explicit and calm.
   - Empty states should explain what happened and what to do next.
   - Error states should be actionable.
   - Disabled states should explain unavailable actions when needed.
   - Success states should provide confirmation without blocking flow.

7. Check offline and reconnect UX when relevant.
   - Look for offline indicators, stale data messaging, retry states, sync status, or reconnect behavior.
   - Do not require offline UX for pages where it is not product-relevant.
   - Flag missing offline messaging only when the app claims or implies PWA resilience.

8. Check installability surfaces when relevant.
   - Look for install prompts, onboarding copy, home-screen language, app icon quality, and full-screen app feel.
   - Do not recommend aggressive install prompts unless they support the product goal.

9. Check native-feeling polish.
   - Review visual feedback, pressed states, focus states, card tactility, transitions, sticky actions, sheet/dialog patterns, and safe-area awareness.
   - Prefer restrained, purposeful motion.

10. Prioritize findings.
   - P0: Blocks use, trust, accessibility, or core action.
   - P1: Major polish or conversion issue.
   - P2: Nice-to-have improvement.
   - P3: Optional refinement.

## Output format

Use this structure:

### PWA UX audit

- Surface reviewed:
- Product goal:
- Known facts:
- Assumptions:

### Findings

| Priority | Finding | Why it matters | Suggested fix |
|---|---|---|---|

### App-like opportunities

- App shell:
- Mobile ergonomics:
- State quality:
- Offline/reconnect:
- Installability:
- Visual polish:

### Recommended next step

State the highest-leverage next action.

## Anti-patterns

- Do not treat every responsive website as needing every PWA feature.
- Do not invent service worker, manifest, or offline behavior.
- Do not recommend install prompts before the core UI feels valuable.
- Do not prioritize visual flourish over usability.
- Do not require a dependency for simple app-shell or state improvements.
- Do not perform a broad repo scan when route-level files are enough.

## Token notes

- Load only when PWA UX, mobile polish, or app-like behavior matters.
- Inspect only relevant route, layout, component, style, token, and manifest/service-worker files.
- Summarize findings before asking to inspect more files.
- Keep the audit table compact unless the user requests depth.

## Validation checklist

- [ ] Surface and product goal are named.
- [ ] Facts and assumptions are separated.
- [ ] Mobile ergonomics are checked.
- [ ] Responsive behavior is checked.
- [ ] Loading, empty, error, and disabled states are checked.
- [ ] Offline/reconnect UX is considered only when relevant.
- [ ] Installability is considered without being forced.
- [ ] Findings are prioritized.
- [ ] Recommendations are concrete and implementable.