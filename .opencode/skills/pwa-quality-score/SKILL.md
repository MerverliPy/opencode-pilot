---
name: pwa-quality-score
description: Score a PWA UI surface for reliable, responsive, installable, app-like, offline-aware, accessible, and performance-sensitive user experience.
compatibility: opencode
metadata:
  maturity: stable
---
# PWA Quality Score
## What this skill does
This skill scores a PWA or mobile web app UI surface against practical PWA quality expectations: reliability, responsiveness, app-like feel, installability, offline/reconnect states, performance-sensitive UI, and accessibility.
It complements `pwa-ux-audit` by producing a simple quality score and prioritized improvement list.
## Use when
- The user asks whether a PWA feels ready.
- `/ui-scorecard`, `/ship-ui`, or `/pwa-installability-audit` needs PWA scoring.
- A mobile web app or app shell needs quality validation.
- A redesign claims to make the app feel native or installable.
- A release candidate needs PWA-specific confidence.
## Inputs
- Target PWA surface, app shell, route, or component.
- Relevant manifest/app-shell evidence if available.
- Relevant offline/reconnect behavior if available.
- Relevant UI code, styles, tokens, or state components.
- Design memory if available.
- User-stated PWA goals.
## Procedure
1. Identify the PWA surface.
2. Separate facts from assumptions.
3. Determine whether PWA scoring is applicable.
4. Score each category from 0 to 5.
5. Mark unknown evidence as 0 or needs evidence, not as pass.
6. Identify the top 3 improvements.
7. Recommend ship status.
## Score scale
```text
5 = Excellent; app-like and production-ready.
4 = Strong; minor improvement available.
3 = Acceptable but visibly improvable.
2 = Weak; notable PWA UX issue.
1 = Poor; blocks app-like trust or usability.
0 = Not enough evidence or not applicable.
```
## Score categories
- Reliability perception
- Responsive behavior
- Mobile ergonomics
- App-shell feel
- Navigation stability
- Loading states
- Empty states
- Error/retry states
- Offline/reconnect UX
- Installability UX
- Safe-area/app-window polish
- Performance-sensitive UI
- Accessibility
- Design-system consistency
- Overall PWA confidence
## Output format
## PWA quality score
- Surface:
- PWA relevance: applicable / not applicable / needs evidence
- Known facts:
- Assumptions:
| Category | Score | Evidence | Improvement |
|---|---:|---|---|
| Reliability perception | 0-5 | | |
| Responsive behavior | 0-5 | | |
| Mobile ergonomics | 0-5 | | |
| App-shell feel | 0-5 | | |
| Navigation stability | 0-5 | | |
| Loading states | 0-5 | | |
| Empty states | 0-5 | | |
| Error/retry states | 0-5 | | |
| Offline/reconnect UX | 0-5 | | |
| Installability UX | 0-5 | | |
| Safe-area/app-window polish | 0-5 | | |
| Performance-sensitive UI | 0-5 | | |
| Accessibility | 0-5 | | |
| Design-system consistency | 0-5 | | |
| Overall PWA confidence | 0-5 | | |
## Top 3 PWA improvements
1. 
2. 
3. 
## Ship recommendation
State one of:
- PWA-ready.
- PWA-ready with follow-ups.
- Improve before ship.
- Not enough evidence.
## Anti-patterns
- Do not invent manifest, service worker, or offline behavior.
- Do not force offline scoring on non-PWA surfaces.
- Do not treat installability as more important than core user value.
- Do not ignore mobile ergonomics.
- Do not approve app-like quality without loading/error/retry state review.
- Do not claim performance results without evidence.
## Token notes
- Load only when PWA quality scoring matters.
- Inspect only relevant app-shell, manifest, route, component, state, style, and token files.
- Use design memory to avoid repeating product-taste analysis.
- Keep scoring concise and evidence-based.
## Validation checklist
- [ ] PWA relevance is classified.
- [ ] Facts and assumptions are separated.
- [ ] Scores include evidence.
- [ ] Missing evidence is not treated as pass.
- [ ] Offline/installability are considered only when relevant.
- [ ] Top improvements are concrete.
