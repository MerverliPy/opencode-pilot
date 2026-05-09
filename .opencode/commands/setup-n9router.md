---
description: Connect OpenCode to a running n9router instance as an AI provider
disable-model-invocation: false
---

# Setup n9router

Connect this OpenCode workspace to a n9router instance so all agents and tools route through it.

## What this does

1. Verifies the n9router server is reachable
2. Lists available models (including combo routes)
3. Writes n9router as an `@ai-sdk/openai-compatible` provider into `~/.config/opencode/opencode.json`
4. Optionally updates the workspace `opencode.json` default model

## Instructions for the agent

Ask the user for:

- **n9router URL** — e.g. `http://localhost:20128` or `https://r1a2b3.9router.com`
- **API key** — leave blank if auth is disabled (`requireApiKey: false`)

Then run the following steps in order:

### Step 1 — Health check

```bash
curl -sf "${NINEROUTER_URL}/api/health"
```

Expected: `{"ok":true}` — if it fails, tell the user the server is not reachable and stop.

### Step 2 — Discover models

```bash
curl -sf -H "Authorization: Bearer ${NINEROUTER_KEY}" "${NINEROUTER_URL}/v1/models" | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
  d.data.slice(0,8).forEach(m=>console.log(m.id, m.owned_by || ''))"
```

Print the first 8 model IDs so the user can confirm they look correct.
Ask the user which model they want as the default (suggest the first combo or `anthropic/claude-sonnet-4` if present).

### Step 3 — Write provider config

Call the n9router OpenCode settings API to register it as a provider:

```bash
curl -sf -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${NINEROUTER_KEY}" \
  -d '{"action":"register","model":"<chosen-model>"}' \
  "${NINEROUTER_URL}/api/cli-tools/opencode-settings"
```

If that endpoint is unavailable, manually write the provider block to `~/.config/opencode/opencode.json`:

```json
{
  "providers": {
    "n9router": {
      "name": "n9router",
      "api": "@ai-sdk/openai-compatible",
      "url": "<NINEROUTER_URL>/v1",
      "options": {
        "apiKey": "<NINEROUTER_KEY>"
      }
    }
  },
  "model": "n9router/<chosen-model>"
}
```

### Step 4 — Update workspace model (optional)

Ask if the user wants to update the workspace `opencode.json` `model` field to `n9router/<chosen-model>`.
If yes, edit `.opencode/../opencode.json` (the workspace root `opencode.json`).

### Step 5 — Confirm

```bash
curl -sf -H "Authorization: Bearer ${NINEROUTER_KEY}" \
  "${NINEROUTER_URL}/v1/models" | node -e \
  "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
  console.log('Connected. '+d.data.length+' models available.')"
```

Print a summary: URL, chosen model, number of available models.

## Environment variables set after setup

```bash
export NINEROUTER_URL="<url>"       # used by 9router-* skills
export NINEROUTER_KEY="<key>"       # omit if auth disabled
```

Add these to your shell profile or `.env` to persist across sessions.
