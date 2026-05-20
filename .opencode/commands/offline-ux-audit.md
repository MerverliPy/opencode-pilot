---
description: Audit offline, reconnect, stale-data, cached-content, retry, sync, and failure-recovery UX for PWA and mobile web app flows.
agent: pwa-ui-designer
---
Run an offline UX audit.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the target flow or surface.
2. Decide whether offline UX is applicable, not applicable, or needs evidence.
3. Separate known facts from assumptions.
4. Inspect only relevant UI state, data-loading, route, component, app shell, and PWA files.
5. Do not invent caching, service worker, sync, or retry behavior.
6. Use the `offline-state-design` skill.
7. Review:
   - offline state
   - reconnecting state
   - stale-data state
   - cached-content state
   - retry state
   - sync pending state
   - sync failed state
   - form draft or data-loss risk
   - duplicate submission risk
   - user-facing copy
8. Do not edit files unless explicitly approved.
9. Keep recommendations UI-scoped unless the user requests architecture.
Output format:
## Offline UX audit
- Surface:
- Offline relevance: applicable / not applicable / needs evidence
- Known facts:
- Assumptions:
## State map
| State | Current behavior or evidence | Risk | Recommended UX |
|---|---|---|---|
| Offline | | | |
| Reconnecting | | | |
| Stale data | | | |
| Retry | | | |
| Sync pending | | | |
| Sync failed | | | |
## Findings
| Priority | Finding | Why it matters | Suggested fix |
|---|---|---|---|
## Recommended UX copy
Provide concise offline, reconnect, stale-data, and retry copy when relevant.
## Approval needed
State whether changes require UI edits, state-management edits, service worker changes, or backend coordination.
