---
name: offline-state-design
description: Design and review offline, reconnect, stale-data, cached-state, retry, sync, and failure-recovery UX for PWA and mobile web app interfaces.
compatibility: opencode
metadata:
  maturity: stable
---
# Offline State Design
## What this skill does
This skill designs and reviews offline-aware UX for PWAs and mobile web apps. It focuses on user-facing states: offline, reconnecting, stale data, retry, sync pending, failed sync, cached content, and recovery.
It does not invent service worker behavior or data-sync architecture. It translates available technical behavior into clear UX states.
## Use when
- A PWA or mobile web app should work during poor connectivity.
- The UI includes cached data, forms, uploads, messages, dashboards, tasks, or transactional flows.
- The user asks about offline UX, reconnect behavior, sync status, or retry states.
- `/offline-ux-audit` is invoked.
- `/ship-ui` needs offline/reconnect validation.
## Inputs
- Target flow or surface.
- Available network/offline behavior from user prompt or files.
- Relevant UI components.
- Relevant data-loading or state-management files if needed.
- Known constraints around caching, retry, sync, or service workers.
## Procedure
1. Identify whether offline UX is relevant.
   - Offline UX is relevant for app shells, dashboards, forms, tasks, messages, content readers, field-work apps, and data-entry flows.
   - Offline UX may be not applicable for purely static marketing pages.
2. Separate facts from assumptions.
   - Do not assume caching, queues, service workers, or sync behavior exists.
   - Mark missing technical evidence clearly.
3. Identify critical user actions.
   - Read existing content
   - Submit data
   - Save draft
   - Upload media
   - Send message
   - Refresh data
   - Retry failed request
   - Continue task after reconnect
4. Map UX states.
   - Online
   - Loading
   - Offline
   - Stale data
   - Reconnecting
   - Sync pending
   - Sync failed
   - Retry available
   - Empty due to no data
   - Empty due to no connection
   - Error unrelated to connection
5. Design user messaging.
   - Explain what happened.
   - Explain what the user can still do.
   - Explain what will happen on reconnect.
   - Avoid technical jargon.
   - Avoid blame or panic language.
6. Review action safety.
   - Prevent accidental data loss.
   - Preserve drafts when relevant.
   - Make retry explicit.
   - Show pending changes when relevant.
   - Avoid duplicate submissions.
7. Review visual treatment.
   - Offline indicators should be noticeable but not alarming.
   - Stale-data labels should be clear.
   - Retry actions should be visible.
   - Skeletons should not imply live data when offline.
8. Prioritize fixes.
   - P0: Data loss, blocked recovery, or misleading state.
   - P1: User cannot understand connection state or next action.
   - P2: Polish issue.
   - P3: Optional clarity improvement.
## Output format
## Offline state design review
- Surface:
- Offline relevance: applicable / not applicable / needs evidence
- Known facts:
- Assumptions:
## State map
| State | User message | Available actions | Risk |
|---|---|---|---|
| Online | | | |
| Offline | | | |
| Reconnecting | | | |
| Stale data | | | |
| Sync pending | | | |
| Sync failed | | | |
## Findings
| Priority | Finding | Why it matters | Suggested fix |
|---|---|---|---|
## Recommended UX copy
Provide concise copy for offline, reconnecting, retry, and stale-data states when relevant.
## Anti-patterns
- Do not invent offline capabilities.
- Do not hide failed sync.
- Do not show infinite loading when offline.
- Do not use the same empty state for no data and no connection.
- Do not let users submit duplicate actions during reconnect.
- Do not use scary error language for normal connection loss.
## Token notes
- Load only when offline, reconnect, cached, or sync UX matters.
- Inspect only state and UI files related to the target flow.
- Keep state maps compact.
- Do not dive into service worker internals unless the user asks or UI behavior depends on them.
## Validation checklist
- [ ] Offline relevance is determined.
- [ ] Missing technical evidence is labeled.
- [ ] States are mapped separately.
- [ ] User messages are clear.
- [ ] Data-loss risk is considered.
- [ ] Retry and recovery paths are explicit.
- [ ] Recommendations are UI-scoped.
