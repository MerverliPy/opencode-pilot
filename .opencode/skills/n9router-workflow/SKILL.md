---

name: n9router-workflow
description: "Use for n9router-centered OpenCode workflow, model routing, setup checks, provider/combo assumptions, and preserving n9router as the agent director."
compatibility: opencode
---

# n9router workflow

## Principles

- Keep OpenCode model IDs on the `n9router/*` provider path unless explicitly asked to change providers.
- Use n9router as the routing layer for primary and subagent models.
- Use higher-capability routed models for orchestration, planning, implementation, architecture, and security.
- Use cheaper routed models for discovery, docs updates, and mechanical verification where adequate.

## Setup checks

Before changing routing, inspect:

- `opencode.json`
- `/setup-n9router` command output
- dashboard/API setup notes in the repo

Useful local checks when n9router is running:

```bash
curl http://localhost:20128/v1/models
curl http://localhost:20128/api/models
```

Do not embed provider credentials or dashboard passwords in config files.

## Agent routing policy

- Primary orchestration: `orchestrator`.
- Trusted edits: `implementer`, `maintainer`, `build-fixer`, `e2e-runner`, `docs-updater`.
- Read-only review/discovery: scouts, reviewers, auditors.
- High-risk MCPs remain disabled by default and are enabled only for the workflow that needs them.

## Key rotation

`docker/.env` holds server/container key. Local gitignored `opencode.json` may hold matching client key for OpenCode requests and must never be committed:

| File | Field | Purpose |
|------|-------|---------|
| `docker/.env` | `N9ROUTER_API_KEY` | n9router Docker container authenticates with this server key |
| `opencode.json` | `provider.n9router.options.apiKey` | Local gitignored OpenCode client may send matching Bearer token to n9router; never commit this file with real key |

### Automated rotation (recommended)

```bash
./scripts/rotate-n9router-key.sh                        # generate new random key
./scripts/rotate-n9router-key.sh "n9r_<your-key-hex>"  # use a specific key
./scripts/rotate-n9router-key.sh --dry-run              # preview without making changes
```

The script:

1. Generates a cryptographically random key (`n9r_` + 64 hex chars) or accepts one
2. Updates `docker/.env` → `N9ROUTER_API_KEY`
3. Updates local gitignored `opencode.json` → `provider.n9router.options.apiKey` when present for matching OpenCode requests
4. Restarts the n9router Docker container and waits for healthy
5. Runs `scripts/verify-key-rotation.sh` to confirm the new key works and the old key is rejected

### Manual rotation

If running the script isn't an option, rotate server key and update local client key only if needed:

1. **`docker/.env`**: set `N9ROUTER_API_KEY=<new-key>`
2. **Local gitignored `opencode.json`**: if OpenCode sends direct requests through n9router, set `provider.n9router.options.apiKey` to matching value; never commit file with real key
3. Restart the container: `docker compose -f docker/docker-compose.yml up -d --no-deps n9router`
4. Verify the new key against the **chat completions endpoint** (the models endpoint is intentionally public):

```bash
# New key → expect HTTP 200
curl -s -w "\nHTTP:%{http_code}" http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $NEW_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"ds/deepseek-v4-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'

# Old/revoked key → expect HTTP 401 with "Invalid API key"
curl -s -w "\nHTTP:%{http_code}" http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OLD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"ds/deepseek-v4-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'

# No auth → expect HTTP 401 with "Missing API key"
curl -s -w "\nHTTP:%{http_code}" http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"ds/deepseek-v4-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
```

Or use the verification script directly:

```bash
export NEW_KEY="n9r_..."
export OLD_KEY="n9r_..."
./scripts/verify-key-rotation.sh
```
