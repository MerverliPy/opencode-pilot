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

## Key rotation verification

When rotating the user API key (the `sk-*` token in `opencode.json`), test against the **chat completions endpoint**, not `/v1/models`. The models endpoint is intentionally public (OpenAI-compatible convention) even when `N9ROUTER_REQUIRE_API_KEY=true`.

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
