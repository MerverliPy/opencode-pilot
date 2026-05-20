---
name: pwa-installability-check
description: Check PWA installability-related UI, app manifest evidence, icon readiness, standalone app-window behavior, install prompt restraint, and app-shell polish.
compatibility: opencode
metadata:
  maturity: stable
---
# PWA Installability Check
## What this skill does
This skill checks whether a PWA surface supports a credible installable app experience. It focuses on user-facing installability quality, app-window polish, manifest evidence, icon readiness, and install prompt restraint.
It does not invent manifest or service worker behavior. It reports only what is supported by user input or inspected files.
## Use when
- The user asks whether the PWA is installable or app-store-like.
- A PWA app shell, landing page, onboarding flow, or settings screen mentions installation.
- The task involves manifest, icons, standalone display, app launch, or install prompts.
- `/pwa-installability-audit` is invoked.
- `/ship-ui` needs installability validation.
## Inputs
- Target page, route, or app shell.
- Relevant manifest file if available.
- Relevant service worker or PWA registration files if available.
- App icons or public asset references if available.
- Relevant UI files for install prompts, onboarding, settings, or app shell.
- User-provided constraints.
## Procedure
1. Identify the PWA surface.
   - App shell
   - Landing page
   - Onboarding
   - Settings
   - Install prompt
   - Launch screen
   - Navigation shell
2. Separate facts from assumptions.
   - Facts come from provided prompt or inspected files.
   - Assumptions must be labeled.
3. Check manifest evidence when available.
   - Name and short name
   - Start URL
   - Scope
   - Display mode
   - Theme/background color
   - Icons
   - Screenshots or related metadata if present
4. Check icon and brand readiness.
   - Icons should support app-like identity.
   - Icon usage should be visually consistent with the brand.
   - Do not claim icon sizes or completeness without file evidence.
5. Check standalone app-window behavior from UI evidence.
   - App shell should not rely on browser chrome.
   - Navigation should feel stable.
   - Critical actions should be visible and reachable.
   - Layout should work on mobile-sized app windows.
6. Check install prompt UX.
   - Install prompts should be timely and restrained.
   - Do not interrupt first-use value.
   - Explain the benefit of installing.
   - Provide dismiss or later behavior when appropriate.
   - Avoid repeated nagging.
7. Check launch and return experience.
   - First screen should communicate value quickly.
   - Returning users should have a clear path to the primary action.
   - Loading states should preserve app confidence.
8. Prioritize issues.
   - P0: Breaks or misrepresents installable experience.
   - P1: Major app-like trust issue.
   - P2: Polish or clarity issue.
   - P3: Optional improvement.
## Output format
## PWA installability check
- Surface:
- Known facts:
- Assumptions:
- Status: pass / warn / fail / needs evidence
## Findings
| Priority | Finding | Evidence | Recommendation |
|---|---|---|---|
## Installability UX notes
- Manifest evidence:
- Icon/brand readiness:
- Standalone app-window feel:
- Install prompt UX:
- Launch/return experience:
## Recommended next step
State the highest-leverage fix or validation step.
## Anti-patterns
- Do not invent manifest contents.
- Do not assume a service worker exists.
- Do not recommend aggressive install prompts.
- Do not treat installability as more important than first-use value.
- Do not modify PWA config unless explicitly approved.
- Do not require broad repo inspection when manifest and app-shell files are enough.
## Token notes
- Load only for installability or PWA release checks.
- Inspect manifest, app shell, install prompt, and public asset references first.
- Avoid reading unrelated routes.
- Keep findings evidence-based.
## Validation checklist
- [ ] Surface is identified.
- [ ] Manifest evidence is checked or marked unavailable.
- [ ] Install prompt behavior is reviewed when present.
- [ ] Standalone app-window UX is considered.
- [ ] Findings are evidence-based.
- [ ] Missing evidence is labeled clearly.
