---
description: Review or apply n9router setup guidance for this OpenCode workflow.
agent: orchestrator
---

# /setup-n9router

Use the `n9router-workflow` skill.

Tasks may include:

- Explain current `n9router/*` model routing.
- Check `opencode.json` for n9router consistency.
- Provide setup commands or dashboard checklist.
- Validate model list with local curl commands when the user confirms n9router is running.

- Compare local `opencode.json` against `opencode.json.example` for structure.
- Verify `provider.options` contains `baseURL` but **no** `apiKey` — secrets must stay out of committed config. Add `apiKey` only to local (gitignored) `opencode.json`.
- Never write secrets into config files.
