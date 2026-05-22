---
description: Run a report-only visual/mobile clickable UI audit with evidence.
agent: visual-ui-auditor
---

Run a report-only visual functional audit for the Pilot UI.

Use `$ARGUMENTS` as optional input. It may include:
- target URL, for example `--url http://localhost:43173`
- route scope, for example `--routes /,/chat,/settings`
- soft mode, for example `--soft`
- output directory, for example `--out dogfood-output/visual-functional-audit`

Default command:

npm run qa:visual-functional -- --url http://localhost:43173 --soft

Required behavior:

1. Load the `visual-functional-audit` skill.
2. Confirm this is audit/report-only mode.
3. Ask before running browser automation.
4. Prefer the deterministic Playwright audit runner.
5. Do not edit source files.
6. Do not read secrets or `.env` files.
7. After execution, summarize:
   - target URL
   - artifact directory
   - route coverage
   - viewport coverage
   - clickable counts
   - P0/P1/P2/P3 findings
   - screenshots and report paths
   - recommended fix plan
8. If runtime execution was not performed, say so explicitly and provide the exact command to run.
