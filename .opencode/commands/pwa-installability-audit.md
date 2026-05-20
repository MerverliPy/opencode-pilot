---
description: Audit PWA installability UX, manifest evidence, icon readiness, standalone app-window feel, and install prompt restraint.
agent: pwa-ui-designer
---
Run a PWA installability audit.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the PWA surface:
   - app shell
   - landing page
   - onboarding
   - settings
   - install prompt
   - launch screen
   - navigation shell
2. Separate known facts from assumptions.
3. Inspect only relevant manifest, public asset, app shell, install prompt, route, layout, and component files.
4. Do not invent manifest, service worker, icon, or install behavior.
5. Use the `pwa-installability-check` skill.
6. Review:
   - manifest evidence when available
   - app name and short name evidence when available
   - start URL and scope evidence when available
   - display mode evidence when available
   - icon/brand readiness when available
   - standalone app-window feel
   - install prompt timing and restraint
   - first launch and return experience
7. Do not edit files unless explicitly approved.
8. Do not modify PWA configuration unless explicitly approved.
Output format:
## PWA installability audit
- Surface:
- Status: pass / warn / fail / needs evidence
- Known facts:
- Assumptions:
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
## Approval needed
State whether any manifest, icon, service worker, dependency, or UI file changes require approval.
