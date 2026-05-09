# n9router User Guide

**Version:** 0.4.26  
**Port (default):** 20128  
**Data directory (default):** `~/.n9router/`

---

## Table of Contents

1. [What is n9router?](#1-what-is-n9router)
2. [Installation](#2-installation)
3. [First-Run Setup](#3-first-run-setup)
4. [Dashboard Overview](#4-dashboard-overview)
5. [Providers](#5-providers)
6. [Models](#6-models)
7. [Combos](#7-combos)
8. [API Keys](#8-api-keys)
9. [Using n9router as an LLM Endpoint](#9-using-n9router-as-an-llm-endpoint)
10. [Connecting OpenCode](#10-connecting-opencode)
11. [Tunnels](#11-tunnels)
12. [Usage & Stats](#12-usage--stats)
13. [RTK Compression](#13-rtk-compression)
14. [Caveman Mode](#14-caveman-mode)
15. [Proxy Pools](#15-proxy-pools)
16. [Model Aliases & Custom Models](#16-model-aliases--custom-models)
17. [Media Providers](#17-media-providers)
18. [Settings Reference](#18-settings-reference)
19. [REST API Reference](#19-rest-api-reference)
20. [Data & Persistence](#20-data--persistence)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. What is n9router?

n9router is a self-hosted AI routing gateway. It acts as a single OpenAI-compatible HTTP endpoint that sits in front of 40+ AI providers — Anthropic, Google, OpenAI, Mistral, Ollama, Azure, Vertex, Cursor, and many more. Any tool that speaks the OpenAI chat completions API can point at n9router instead of pointing at each provider directly.

**Key capabilities:**

- **Provider unification** — one endpoint, one API key, all your providers
- **Combo routing** — define groups of models with automatic fallback or round-robin rotation
- **Account fallback** — add multiple accounts per provider; n9router retries failed requests on the next account automatically
- **Format translation** — accepts OpenAI, Anthropic Claude, and Gemini request formats; returns the correct response format for the caller
- **Tunnel** — expose your local n9router to the internet via Cloudflare Quick Tunnel (no account needed) or Tailscale Funnel
- **Usage tracking** — per-provider, per-model, per-API-key token counts and cost estimates
- **RTK compression** — compresses `tool_result` payloads before they are forwarded to providers, reducing token costs
- **Caveman mode** — injects a terse system prompt into every request to reduce verbosity
- **Proxy support** — per-connection and global outbound SOCKS/HTTP proxies
- **Media providers** — TTS, STT, image generation, embeddings, all behind the same endpoint

---

## 2. Installation

### Docker (recommended)

The Pilot repo ships a `docker/docker-compose.yml` that builds n9router from source.

```bash
# From the pilot/ directory:
unzip n9router-master.zip          # extracts to pilot/n9router-master/
cd docker/
docker compose up -d --build
```

n9router will be available at `http://localhost:20128`.

Data is persisted in a Docker volume named `n9router-data`. To inspect or back it up:

```bash
docker volume inspect n9router-data
```

To stop:

```bash
docker compose down
```

To upgrade (rebuild after updating source):

```bash
docker compose up -d --build
```

**Environment overrides** — create `docker/.env` before starting:

```env
NINEROUTER_PORT=20128           # host port to expose
NINEROUTER_REQUIRE_API_KEY=false
DEBUG=false
```

### From source (npm / bun)

```bash
cd n9router-master/
npm install
npm run build
npm start           # listens on PORT (default 20128)
```

For development (hot reload):

```bash
npm run dev
```

### Key environment variables

| Variable                  | Description                          | Default               |
| ------------------------- | ------------------------------------ | --------------------- |
| `PORT`                    | Listening port                       | `20128`               |
| `HOSTNAME`                | Bind address                         | `0.0.0.0`             |
| `DATA_DIR`                | Where db.json, usage.json, logs live | `~/.n9router/`        |
| `JWT_SECRET`              | Secret for dashboard session JWTs    | — (required)          |
| `INITIAL_PASSWORD`        | Password for the first login         | — (required)          |
| `REQUIRE_API_KEY`         | Enforce Bearer API key on `/v1/*`    | `false`               |
| `ENABLE_REQUEST_LOGS`     | Log full request/response bodies     | `false`               |
| `ENABLE_TRANSLATOR`       | Enable the translator subsystem      | `false`               |
| `NEXT_TELEMETRY_DISABLED` | Opt out of Next.js telemetry         | set to `1`            |
| `TUNNEL_WORKER_URL`       | Tunnel registration worker           | `https://9router.com` |

---

## 3. First-Run Setup

1. Open `http://localhost:20128` in a browser.
2. If `INITIAL_PASSWORD` was set, log in with that password. Otherwise you will be prompted to set a password on first access (any value for current password is accepted on first run).
3. You will be dropped into the **Dashboard**.

The dashboard requires login by default. To disable login for a trusted local network, go to **Settings → Require Login** and turn it off.

---

## 4. Dashboard Overview

The web dashboard is available at `http://localhost:20128`. Main sections:

| Route                            | Purpose                                            |
| -------------------------------- | -------------------------------------------------- |
| `/dashboard`                     | Overview — active requests, recent usage           |
| `/dashboard/providers`           | Add/manage/test provider connections               |
| `/dashboard/providers/new`       | Add a new provider                                 |
| `/dashboard/combos`              | Create and manage combo routing groups             |
| `/dashboard/quota`               | Per-provider quota and rate limit status           |
| `/dashboard/usage`               | Token and cost analytics (time-series charts)      |
| `/dashboard/endpoint`            | Copy the endpoint URL and configure API key        |
| `/dashboard/settings/pricing`    | Override per-model pricing for cost calculation    |
| `/dashboard/cli-tools`           | Connect OpenCode, Claude Code, Cursor, Codex, etc. |
| `/dashboard/proxy-pools`         | Manage outbound SOCKS/HTTP proxy pools             |
| `/dashboard/mitm`                | MITM proxy configuration (for Antigravity IDE)     |
| `/dashboard/translator`          | Request/response translator debug UI               |
| `/dashboard/media-providers/web` | Web-based TTS/STT/image media                      |

---

## 5. Providers

### What is a provider?

A provider is one credential (API key, OAuth token, or session cookie) for one AI service. You can add **multiple accounts** for the same provider — n9router will automatically route around rate limits and failures.

### Adding a provider

**Via the Dashboard:**

1. Go to **Dashboard → Providers → + New Provider**.
2. Select the provider type from the list.
3. Fill in the required fields:
   - **Name** — a friendly label (e.g., "Anthropic Primary")
   - **API Key** — your provider API key
   - **Priority** — lower number = tried first (default: 1)
4. Click **Save**. n9router will test the connection immediately.

**Via the API:**

```bash
curl -X POST http://localhost:20128/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "name": "Anthropic Primary",
    "apiKey": "sk-ant-...",
    "priority": 1
  }'
```

### Provider types

n9router supports three categories:

**API key providers** (standard):

| Provider ID    | Service                        |
| -------------- | ------------------------------ |
| `anthropic`    | Anthropic Claude (direct)      |
| `openai`       | OpenAI                         |
| `gemini`       | Google Gemini (API key)        |
| `mistral`      | Mistral AI                     |
| `deepseek`     | DeepSeek                       |
| `groq`         | Groq                           |
| `together`     | Together AI                    |
| `fireworks`    | Fireworks AI                   |
| `cohere`       | Cohere                         |
| `xai`          | xAI Grok                       |
| `perplexity`   | Perplexity AI                  |
| `openrouter`   | OpenRouter                     |
| `azure`        | Azure OpenAI                   |
| `vertex`       | Google Vertex AI               |
| `qwen`         | Alibaba Qwen                   |
| `ollama-local` | Local Ollama (no key required) |

**OAuth providers** (browser-based login):

- `cursor` — Cursor Pro subscription
- `kiro` — Amazon Kiro subscription
- `antigravity` / `gemini-cli` — Google OAuth (Gemini CLI / Antigravity IDE)

**Custom compatible nodes** (see section 5.2):

- OpenAI-compatible
- Anthropic-compatible
- Custom embedding

### Adding multiple accounts

Add the same provider type multiple times, each with a different API key and a different **Name**. When one account hits a rate limit or returns an error, n9router automatically retries with the next available account in priority order.

**Example — three Anthropic accounts:**

```bash
# Account 1 (highest priority)
curl -X POST http://localhost:20128/api/providers \
  -d '{ "provider": "anthropic", "name": "Anthropic A", "apiKey": "sk-ant-A", "priority": 1 }'

# Account 2
curl -X POST http://localhost:20128/api/providers \
  -d '{ "provider": "anthropic", "name": "Anthropic B", "apiKey": "sk-ant-B", "priority": 2 }'

# Account 3
curl -X POST http://localhost:20128/api/providers \
  -d '{ "provider": "anthropic", "name": "Anthropic C", "apiKey": "sk-ant-C", "priority": 3 }'
```

If account A returns a 429, n9router instantly retries with account B. If B also fails, it retries with C.

### Custom OpenAI-compatible nodes

If you run your own OpenAI-compatible server (e.g., vLLM, LiteLLM, another n9router), add it as a **Provider Node** first:

1. Go to **Dashboard → Providers → Provider Nodes → + New Node**.
2. Fill in Base URL, API key, and the model IDs the server supports.
3. The node then appears as a selectable provider when adding a connection.

Only **one connection** is allowed per custom node.

### Testing providers

After adding a provider, click **Test** on the provider card. n9router sends a minimal request to the provider and reports the response time and status. Providers with `testStatus: "error"` are still used for routing but will immediately fail and trigger fallback to the next account.

### Removing a provider

On the provider card in the dashboard, click the delete icon. If the provider is part of an active combo, remove it from the combo first.

---

## 6. Models

### Model ID format

Models are referred to as `provider/model-id`, for example:

- `anthropic/claude-opus-4`
- `openai/gpt-4o`
- `gemini/gemini-2.0-flash`
- `ollama-local/llama3.2`

When you call n9router's endpoint, pass the full `provider/model-id` string as the `model` field.

### Listing available models

```bash
# OpenAI-compatible model list
curl http://localhost:20128/v1/models

# Internal model list (includes metadata)
curl http://localhost:20128/api/models
```

The `/v1/models` endpoint returns all models across all configured providers plus combo models (with `owned_by: "combo"`).

### Disabling models

In **Dashboard → Providers → [provider card] → Models**, individual models can be toggled on or off. Disabled models are excluded from `/v1/models` responses and cannot be routed to.

### Custom models

If your provider supports models not in n9router's built-in list, add them in **Dashboard → Providers → [provider] → + Custom Model**. Provide the model ID, display name, and type (`chat` or `embedding`).

---

## 7. Combos

A **combo** is a named group of models with automatic routing. When a client sends `model: "my-combo"` (no slash), n9router looks up the combo and routes through its member models.

### Creating a combo

**Via Dashboard → Combos → + New Combo:**

1. Enter a name (alphanumeric, underscores, hyphens, dots — e.g., `fast-reasoning`).
2. Add models in order — this is the fallback order.
3. Choose a strategy (see below).
4. Save.

**Via API:**

```bash
curl -X POST http://localhost:20128/api/combos \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fast-reasoning",
    "models": [
      "anthropic/claude-opus-4",
      "openai/gpt-4o",
      "gemini/gemini-2.0-flash"
    ]
  }'
```

The combo `fast-reasoning` is now callable as `model: "fast-reasoning"` from any client.

### Combo strategies

**Fallback (default):**

Try models in order. On error, move to the next model. Stop at the first success. Best for reliability — always tries your preferred model first.

**Round-robin:**

Rotate the starting model each N requests (configurable via `comboStickyRoundRobinLimit`). Distributes load across models. Useful when all models are equally capable and you want to spread token usage.

Change the default strategy in **Settings → Combo Strategy**.

Per-combo strategy overrides can be set in **Settings → Combo Strategies** (a map of combo name → strategy).

### Fallback error handling

When a model in a combo fails:

- **Transient errors** (502/503/504 with a cooldown ≤ 5 seconds): n9router waits the cooldown period, then tries the next model.
- **All models exhausted**: returns HTTP 503 with the error from the last attempt.

The error response includes a `Retry-After` header calculated from the earliest time any model will become available again.

### Viewing combos

```bash
curl http://localhost:20128/api/combos
```

Combos also appear in `/v1/models` with `owned_by: "combo"`.

---

## 8. API Keys

API keys let you control who can call n9router's `/v1/*` inference endpoints. Each key can be named (e.g., per client tool or user).

### Enabling key enforcement

In **Settings → Require API Key**, enable the toggle. Once enabled, all requests to `/v1/chat/completions`, `/v1/messages`, `/v1/embeddings`, etc. must include:

```
Authorization: Bearer <your-key>
```

Requests without a valid key receive HTTP 401.

### Creating a key

**Via Dashboard → Endpoint → API Keys → + New Key:**

Enter a name and click Create. The full key is shown once — copy it immediately.

**Via API (requires dashboard auth):**

```bash
curl -X POST http://localhost:20128/api/keys \
  -H "Content-Type: application/json" \
  -d '{ "name": "opencode-local" }'
```

Response:

```json
{ "key": "sk_9r_xxxxxxxxxxxx", "name": "opencode-local", "id": "..." }
```

### Listing keys

```bash
curl http://localhost:20128/api/keys
```

Key values are **never returned** after creation — only the name and ID.

### Revoking a key

```bash
curl -X DELETE http://localhost:20128/api/keys/<id>
```

Or use the delete button in the dashboard.

### Usage per key

The `/api/usage/stats` response includes a `byApiKey` breakdown showing token consumption per key per model.

---

## 9. Using n9router as an LLM Endpoint

n9router exposes three inference endpoints:

| Endpoint                        | Format                  | Use when                 |
| ------------------------------- | ----------------------- | ------------------------ |
| `POST /api/v1/chat/completions` | OpenAI Chat Completions | Most tools (default)     |
| `POST /api/v1/messages`         | Anthropic Claude        | Claude-native clients    |
| `POST /api/v1/responses`        | OpenAI Responses API    | OpenAI Responses clients |
| `POST /api/v1/embeddings`       | OpenAI Embeddings       | Embedding queries        |

### Basic chat request

```bash
curl http://localhost:20128/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_9r_xxxx" \
  -d '{
    "model": "anthropic/claude-opus-4",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

### Using a combo

```bash
curl http://localhost:20128/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fast-reasoning",
    "messages": [{ "role": "user", "content": "Explain recursion." }]
  }'
```

### Streaming

Add `"stream": true` to the request body. n9router returns standard SSE (`text/event-stream`) regardless of the upstream provider's native streaming format.

### Supported input formats

n9router auto-detects the request format:

- **OpenAI Chat Completions** — `messages` array with `role`/`content`
- **OpenAI Responses API** — `input[]` array format (detected automatically)
- **Anthropic Claude** — requests sent to `/api/v1/messages`
- **Gemini** — requests sent with Gemini-style body

All formats are translated to the target provider's native format before dispatch, and the response is translated back.

---

## 10. Connecting OpenCode

### Automatic setup (recommended)

n9router has a built-in OpenCode settings writer. Use the `/setup-n9router` slash command in OpenCode (included in this repo's `.opencode/commands/`), or call the API directly:

```bash
curl -X POST http://localhost:20128/api/cli-tools/opencode-settings \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "http://localhost:20128",
    "apiKey": "sk_9r_xxxx",
    "models": ["anthropic/claude-opus-4", "openai/gpt-4o"],
    "activeModel": "anthropic/claude-opus-4"
  }'
```

This writes the following into your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "sk_9r_xxxx"
      },
      "models": {
        "anthropic/claude-opus-4": { "name": "anthropic/claude-opus-4" },
        "openai/gpt-4o": { "name": "openai/gpt-4o" }
      }
    }
  },
  "model": "9router/anthropic/claude-opus-4"
}
```

OpenCode will now route all requests through n9router.

### Manual setup

Edit `~/.config/opencode/opencode.json`:

```json
{
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "sk_9r_xxxx"
      },
      "models": {
        "anthropic/claude-opus-4": { "name": "anthropic/claude-opus-4" }
      }
    }
  },
  "model": "9router/anthropic/claude-opus-4"
}
```

### Setting a subagent model

To route OpenCode's subagents (e.g., `@explorer`) through a cheaper/faster model:

```bash
curl -X POST http://localhost:20128/api/cli-tools/opencode-settings \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "http://localhost:20128",
    "activeModel": "anthropic/claude-opus-4",
    "subagentModel": "gemini/gemini-2.0-flash"
  }'
```

This sets `config.agent.explorer.model = "9router/gemini/gemini-2.0-flash"`.

### Checking the current OpenCode config

```bash
curl http://localhost:20128/api/cli-tools/opencode-settings
```

Response includes:

- `installed` — whether opencode.json exists
- `has9Router` — whether n9router is already configured
- `opencode.models` — all models currently registered
- `opencode.activeModel` — the currently active model
- `opencode.baseURL` — the configured base URL

### Removing n9router from OpenCode

Remove a specific model:

```bash
curl -X DELETE "http://localhost:20128/api/cli-tools/opencode-settings?model=openai/gpt-4o"
```

Remove n9router entirely:

```bash
curl -X DELETE http://localhost:20128/api/cli-tools/opencode-settings
```

### Pilot (iOS client)

If using Pilot (the iOS companion app in this repo), configure n9router in:

**Settings → n9router → URL** (e.g., `http://192.168.1.x:20128`)  
**Settings → n9router → API Key** (optional for local deployments)

Once configured:

- The **Model picker** shows a "n9router combos" section alongside OpenCode providers.
- The **Usage dashboard** (`Settings → n9router → usage dashboard`) shows 24h stats pulled live from n9router.
- The **Tunnel toggle** lets you enable/disable the Cloudflare tunnel directly from the app.

---

## 11. Tunnels

Tunnels expose your local n9router to the internet, enabling mobile apps, remote machines, or collaborators to reach it without port forwarding or VPN.

### Cloudflare Quick Tunnel

No Cloudflare account needed. n9router spawns a `cloudflared` process that opens an outbound-only tunnel.

**How to enable:**

Dashboard → **Settings → Tunnel → Enable Tunnel** (or toggle in Pilot → Settings → n9router → Tunnel).

Or via API:

```bash
curl -X POST http://localhost:20128/api/tunnel/enable
```

**How it works:**

1. n9router downloads `cloudflared` if not already present.
2. `cloudflared` opens a Quick Tunnel and provides a random `trycloudflare.com` URL.
3. n9router generates a persistent `shortId` and registers it with `9router.com`.
4. The public URL becomes `https://r{shortId}.9router.com` — stable across restarts.
5. n9router probes the public URL to confirm DNS propagation before reporting success.

**Check tunnel status:**

```bash
curl http://localhost:20128/api/tunnel/status
```

```json
{
  "tunnel": {
    "enabled": true,
    "running": true,
    "tunnelUrl": "https://abc123.trycloudflare.com",
    "shortId": "abc123",
    "publicUrl": "https://rabc123.9router.com"
  }
}
```

**Disable tunnel:**

```bash
curl -X POST http://localhost:20128/api/tunnel/disable
```

### Tailscale Funnel

Requires a Tailscale account and the `tailscale` CLI installed on the host.

Enable in **Settings → Tunnel → Tailscale**.

The Tailscale Funnel URL is stable and tied to your Tailscale network name.

### Accessing n9router remotely

Once the tunnel is active, use the `publicUrl` as the `baseURL` in any client:

```json
{
  "baseURL": "https://rabc123.9router.com/v1",
  "apiKey": "sk_9r_xxxx"
}
```

---

## 12. Usage & Stats

n9router tracks every request with token counts, costs, and provider information.

### Dashboard

Go to **Dashboard → Usage** for:

- Time-series charts (hourly for 24h, daily for 7d/30d/60d)
- Breakdown by provider, model, account, and API key
- Cost estimates (based on public pricing, customizable in **Settings → Pricing**)

### API

```bash
curl "http://localhost:20128/api/usage/stats?period=24h"
```

Valid periods: `24h`, `7d`, `30d`, `60d`, `all`.

**Response shape:**

```json
{
  "totalRequests": 150,
  "totalPromptTokens": 2400000,
  "totalCompletionTokens": 600000,
  "totalCachedTokens": 180000,
  "totalCost": 18.42,
  "byProvider": {
    "anthropic": {
      "requests": 100,
      "promptTokens": 1600000,
      "completionTokens": 400000,
      "cachedTokens": 180000,
      "cost": 12.80
    }
  },
  "byModel": {
    "claude-opus-4 (anthropic)": {
      "requests": 100,
      "promptTokens": 1600000,
      "completionTokens": 400000,
      "cost": 12.80,
      "lastUsed": "2026-05-08T12:00:00Z"
    }
  },
  "recentRequests": [
    {
      "timestamp": "2026-05-08T12:34:56Z",
      "model": "claude-opus-4",
      "provider": "anthropic",
      "promptTokens": 8192,
      "completionTokens": 512,
      "status": "ok"
    }
  ],
  "last10Minutes": [ ... ]
}
```

### Raw log

```bash
curl http://localhost:20128/api/usage/logs
```

Returns the last 200 lines of `~/.n9router/log.txt`:

```
08-05-2026 12:34:56 | claude-opus-4 | ANTHROPIC | Anthropic Primary | 8192 | 512 | OK
```

### Customising pricing

If a model's pricing is not in n9router's built-in table, or if your contracted rates differ from public pricing, override them in **Dashboard → Settings → Pricing**:

```bash
curl -X PATCH http://localhost:20128/api/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "anthropic": {
      "claude-opus-4": { "input": 15.0, "output": 75.0, "cached": 1.875 }
    }
  }'
```

Prices are in USD per million tokens.

---

## 13. RTK Compression

RTK (Request Token Kompressor) compresses `tool_result` content in requests before forwarding them to providers. When your AI tool makes many tool calls, prior results can accumulate into very large context windows. RTK shrinks them.

### What RTK compresses

RTK detects the type of content in each tool result and applies the appropriate filter:

- **`git-diff`** — strips unchanged context lines, keeps only diff hunks
- **`git-status`** — strips "nothing to commit" boilerplate
- **`grep`** — deduplicates repeated patterns
- **`find`** / **`ls`** / **`tree`** — strips filesystem noise
- **`dedup-log`** — deduplicates repeated log lines
- **`smart-truncate`** — fallback truncation for very large unrecognised content

RTK never compresses error traces (`is_error: true`) and never increases the size of content (if compression would make it larger, the original is kept).

### Enabling RTK

In **Dashboard → Settings → RTK → Enable**. Takes effect immediately (no restart required).

Or via API:

```bash
curl -X PATCH http://localhost:20128/api/settings \
  -H "Content-Type: application/json" \
  -d '{ "rtkEnabled": true }'
```

### Viewing RTK savings

When RTK is active, n9router logs compression results for each request:

```
[RTK] saved 4096B / 8192B (50.0%) via git-diff hits=3
```

This appears in the n9router server log (stdout).

---

## 14. Caveman Mode

Caveman mode injects a terse system prompt into every request, instructing the model to use minimal words, skip explanations, and avoid preambles. Useful when you want faster, shorter responses.

### Levels

| Level   | Behaviour                                         |
| ------- | ------------------------------------------------- |
| `lite`  | Slightly terser — fewer pleasantries              |
| `full`  | Short answers only — no explanations unless asked |
| `ultra` | Extreme terseness — code only, no prose           |

### Enabling

**Dashboard → Settings → Caveman Mode → Enable**, then choose level.

Via API:

```bash
curl -X PATCH http://localhost:20128/api/settings \
  -H "Content-Type: application/json" \
  -d '{ "cavemanEnabled": true, "cavemanLevel": "full" }'
```

Caveman mode is also available in OpenCode via the `/caveman` slash command (included in this repo), which sets it client-side without touching n9router's settings.

---

## 15. Proxy Pools

Proxy pools let you route outbound provider requests through SOCKS5 or HTTP proxies. Useful for geo-restriction bypass or network isolation.

### Creating a proxy pool

**Dashboard → Proxy Pools → + New Pool:**

```bash
curl -X POST http://localhost:20128/api/proxy-pools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "US Residential",
    "proxyUrl": "socks5://user:pass@proxy.example.com:1080",
    "type": "socks5"
  }'
```

### Assigning a pool to a provider

When adding or editing a provider connection, set `proxyPoolId` to the pool's ID. That connection's requests will always route through the pool.

### Global outbound proxy

To route **all** outbound requests through one proxy (regardless of per-connection settings):

**Dashboard → Settings → Outbound Proxy:**

```bash
curl -X PATCH http://localhost:20128/api/settings \
  -d '{
    "outboundProxyEnabled": true,
    "outboundProxyUrl": "socks5://proxy.internal:1080",
    "outboundNoProxy": "localhost,127.0.0.1"
  }'
```

Global proxy settings apply immediately without a restart.

---

## 16. Model Aliases & Custom Models

### Model aliases

Give a long model ID a short alias for convenience:

```bash
curl -X PUT http://localhost:20128/api/models \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-opus-4",
    "alias": "opus"
  }'
```

Now you can send `"model": "opus"` in requests and n9router will resolve it.

### Custom models

If your provider supports models not in n9router's built-in catalogue:

**Dashboard → Providers → [provider] → Custom Models → + Add:**

- **Model ID** — the exact ID the provider API expects (e.g., `ft:gpt-4o-2024-08-06:my-org::abc123`)
- **Display name** — friendly label
- **Type** — `chat` or `embedding`

---

## 17. Media Providers

n9router supports several media capabilities beyond text generation.

### Text-to-Speech (TTS)

Endpoint: `POST /api/v1/audio/speech`

Supported engines:

- **OpenAI TTS** (`tts-1`, `tts-1-hd`)
- **ElevenLabs**
- **Google TTS**
- **Microsoft Edge TTS**
- **OpenRouter TTS**
- **Inworld**
- **Local device** (browser-based)

Configure TTS providers in **Dashboard → Media Providers → TTS**.

### Speech-to-Text (STT)

Endpoint: `POST /api/v1/audio/transcriptions`

Standard OpenAI Whisper-compatible endpoint. Configure in **Dashboard → Media Providers → STT**.

### Embeddings

Endpoint: `POST /api/v1/embeddings`

Routes to any configured embedding provider (OpenAI, Gemini, custom compatible). Specify the provider in the `model` field using `provider/model-id` syntax.

### Image Generation

Endpoint: `POST /api/v1/images/generations`

Supported engines:

- **ComfyUI** — local Stable Diffusion workflows
- **Stable Diffusion WebUI** — local A1111/Forge
- **FAL.ai**
- **Stability AI**
- **Black Forest Labs** (FLUX)
- **RunwayML**
- **HuggingFace Inference**
- **Gemini image**
- **Anthropic image**
- **NanoBanana**

Configure in **Dashboard → Media Providers → Image**.

### Web search

Endpoint: `POST /api/v1/search`

Routes search queries to configured search providers.

---

## 18. Settings Reference

All settings are accessible at `GET /api/settings` and modifiable via `PATCH /api/settings`.

### Core

| Setting                 | Type | Default | Description                           |
| ----------------------- | ---- | ------- | ------------------------------------- |
| `requireLogin`          | bool | `true`  | Require dashboard login               |
| `requireApiKey`         | bool | `false` | Require Bearer key on `/v1/*`         |
| `tunnelEnabled`         | bool | `false` | Cloudflare tunnel enabled             |
| `tailscaleEnabled`      | bool | `false` | Tailscale Funnel enabled              |
| `tunnelDashboardAccess` | bool | `true`  | Allow dashboard access via tunnel URL |

### Routing

| Setting                      | Type   | Default      | Description                                                   |
| ---------------------------- | ------ | ------------ | ------------------------------------------------------------- |
| `stickyRoundRobinLimit`      | int    | `3`          | Requests before account rotation                              |
| `comboStrategy`              | string | `"fallback"` | Global combo strategy: `"fallback"` or `"round-robin"`        |
| `comboStickyRoundRobinLimit` | int    | `1`          | Combo round-robin sticky count                                |
| `comboStrategies`            | object | `{}`         | Per-combo strategy overrides: `{ "my-combo": "round-robin" }` |
| `providerStrategies`         | object | `{}`         | Per-provider account rotation overrides                       |

### Features

| Setting                   | Type   | Default  | Description                                      |
| ------------------------- | ------ | -------- | ------------------------------------------------ |
| `rtkEnabled`              | bool   | `false`  | Enable RTK tool result compression               |
| `cavemanEnabled`          | bool   | `false`  | Inject terse system prompt                       |
| `cavemanLevel`            | string | `"full"` | Caveman intensity: `"lite"`, `"full"`, `"ultra"` |
| `observabilityEnabled`    | bool   | `true`   | Track usage history                              |
| `observabilityMaxRecords` | int    | `1000`   | Max history entries in memory                    |
| `enableRequestLogs`       | bool   | `false`  | Log full request/response bodies                 |

### Outbound proxy

| Setting                | Type   | Default | Description                      |
| ---------------------- | ------ | ------- | -------------------------------- |
| `outboundProxyEnabled` | bool   | `false` | Use global outbound proxy        |
| `outboundProxyUrl`     | string | `""`    | Proxy URL (e.g., `socks5://...`) |
| `outboundNoProxy`      | string | `""`    | Comma-separated bypass list      |

### Password

To change the dashboard password:

```bash
curl -X PATCH http://localhost:20128/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old-password",
    "newPassword": "new-password"
  }'
```

---

## 19. REST API Reference

All endpoints are available at `http://localhost:20128`. Dashboard-management endpoints require session auth (cookie). Inference endpoints (`/v1/*`) optionally require a Bearer API key.

### Health

```
GET  /api/health
→ { ok: true }
```

### Providers

```
GET    /api/providers
POST   /api/providers              body: { provider, name, apiKey, priority, ... }
GET    /api/providers/:id
PATCH  /api/providers/:id          body: partial provider fields
DELETE /api/providers/:id
POST   /api/providers/:id/test     → { testStatus, latencyMs }
GET    /api/providers/:id/models   → model list for this provider
```

### Provider Nodes (custom compatible nodes)

```
GET    /api/provider-nodes
POST   /api/provider-nodes         body: { name, baseUrl, apiKey, models: [] }
GET    /api/provider-nodes/:id
PATCH  /api/provider-nodes/:id
DELETE /api/provider-nodes/:id
POST   /api/provider-nodes/validate
```

### Combos

```
GET    /api/combos
POST   /api/combos                 body: { name, models: [], kind? }
GET    /api/combos/:id
PATCH  /api/combos/:id
DELETE /api/combos/:id
```

### Models

```
GET    /api/models                 → internal model list
GET    /v1/models                  → OpenAI-compatible model list
PUT    /api/models                 body: { model, alias }
GET    /api/models/availability    → per-model availability status
POST   /api/models/test            body: { model }
GET    /api/models/custom          → custom model list
POST   /api/models/custom          body: { providerAlias, id, type, name }
GET    /api/models/disabled        → list of disabled model IDs
PATCH  /api/models/disabled        body: { model, disabled: true/false }
```

### API Keys

```
GET    /api/keys
POST   /api/keys                   body: { name }
DELETE /api/keys/:id
POST   /api/keys/:id/reset-usage
GET    /api/keys/:id/usage
```

### Usage

```
GET    /api/usage/stats?period=24h   → aggregated stats
GET    /api/usage/logs               → raw log.txt
GET    /api/usage/chart?period=7d    → time-series chart data
GET    /api/usage/history            → raw history array
GET    /api/usage/providers          → per-provider breakdown
GET    /api/usage/request-logs       → recent request log entries
GET    /api/usage/stream             → SSE stream of live usage events
```

### Settings

```
GET    /api/settings
PATCH  /api/settings                 body: partial settings
GET    /api/settings/database        → db.json export
POST   /api/settings/proxy-test      body: { url }
```

### Tunnel

```
GET    /api/tunnel/status
POST   /api/tunnel/enable
POST   /api/tunnel/disable
POST   /api/tunnel/tailscale-enable
POST   /api/tunnel/tailscale-disable
GET    /api/tunnel/tailscale-check
POST   /api/tunnel/tailscale-install
POST   /api/tunnel/tailscale-login
```

### OpenCode Integration

```
GET    /api/cli-tools/opencode-settings
POST   /api/cli-tools/opencode-settings   body: { baseUrl, apiKey, models, activeModel, subagentModel }
PATCH  /api/cli-tools/opencode-settings   body: { clearActiveModel: true }
DELETE /api/cli-tools/opencode-settings?model=<id>
```

### Proxy Pools

```
GET    /api/proxy-pools
POST   /api/proxy-pools             body: { name, proxyUrl, type }
GET    /api/proxy-pools/:id
PATCH  /api/proxy-pools/:id
DELETE /api/proxy-pools/:id
POST   /api/proxy-pools/:id/test
```

### Pricing

```
GET    /api/pricing
PATCH  /api/pricing                 body: { provider: { model: { input, output, cached } } }
```

### Inference (OpenAI-compatible)

```
POST   /api/v1/chat/completions     OpenAI Chat format
POST   /api/v1/messages             Anthropic Claude format
POST   /api/v1/responses            OpenAI Responses API format
POST   /api/v1/embeddings
POST   /api/v1/audio/speech
POST   /api/v1/audio/transcriptions
POST   /api/v1/images/generations
POST   /api/v1/search
GET    /api/v1/models
```

### Misc

```
GET    /api/version
POST   /api/shutdown                Graceful shutdown
POST   /api/auth/login              body: { password }
POST   /api/auth/logout
GET    /api/init                    First-run check
```

---

## 20. Data & Persistence

n9router stores all state in two JSON files in `DATA_DIR` (default `~/.n9router/`):

### `db.json` — Configuration database

Contains all providers, combos, API keys, settings, model aliases, custom models, proxy pools. Backed up automatically before every write. If the file is corrupt, n9router auto-recovers from `db.json.backup`.

**Manual backup:**

```bash
curl http://localhost:20128/api/settings/database > n9router-backup.json
```

**File locking:** n9router uses `proper-lockfile` with 15 retries and up to 3 seconds of wait time to prevent concurrent write corruption.

### `usage.json` — Usage history

Contains the raw request history (up to 10,000 entries) and pre-aggregated daily summaries. This file grows over time. It is not included in the `db.json` export.

### `log.txt` — Request log

Rolling text log of the last 200 requests:

```
dd-mm-yyyy h:m:s | model | PROVIDER | accountName | promptTokens | completionTokens | STATUS
```

### Docker volume

When running via Docker, both files live in the `n9router-data` volume:

```bash
docker volume inspect n9router-data
# Note the Mountpoint, then:
ls /var/lib/docker/volumes/n9router-data/_data/
# db.json  usage.json  log.txt  mitm/
```

---

## 21. Troubleshooting

### n9router not responding

```bash
# Check if container is running
docker ps --filter name=n9router

# Check health
curl http://localhost:20128/api/health

# View logs
docker logs n9router --tail 50
```

### Provider returning errors

1. Go to **Dashboard → Providers** and click **Test** on the failing provider.
2. Check the error message — common causes:
   - **401** — API key expired or incorrect
   - **429** — Rate limited. n9router applies exponential backoff automatically; add more accounts to increase throughput.
   - **403** — Account suspended or plan limit reached
3. If using OAuth (Cursor, Kiro, Gemini CLI), the token may need to be refreshed — click **Re-authenticate**.

### Combo always falls through to the last model

- Check that all models in the combo have active, working provider connections.
- In **Dashboard → Quota**, check if any providers are currently rate-limited.
- If using `round-robin`, call `PATCH /api/settings { "comboStrategy": "fallback" }` to test.

### OpenCode not using n9router

```bash
# Verify the config is written correctly
curl http://localhost:20128/api/cli-tools/opencode-settings | jq .

# Check opencode.json directly
cat ~/.config/opencode/opencode.json | jq .provider
```

The provider key must be `"9router"` with `"npm": "@ai-sdk/openai-compatible"` and the correct `baseURL`.

### Tunnel URL not working

```bash
curl http://localhost:20128/api/tunnel/status | jq .tunnel
```

- If `running: false` — the `cloudflared` process crashed. Disable and re-enable the tunnel.
- If `publicUrl` is set but not reachable — DNS propagation can take up to 60 seconds after first enable.
- Confirm the Docker container has outbound internet access: `docker exec n9router wget -qO- https://google.com`.

### High token usage / unexpected costs

1. Enable RTK: `PATCH /api/settings { "rtkEnabled": true }` — reduces tool result payload sizes.
2. Enable Caveman mode to get shorter responses.
3. Review **Dashboard → Usage → By Model** to identify the most expensive models and swap them for cheaper alternatives in your combos.
4. Check `byApiKey` to identify which client tool is sending the most requests.

### Database corruption

If n9router fails to start with a JSON parse error:

```bash
# If running in Docker
docker exec n9router cat /app/data/db.json.backup > /tmp/db-restore.json
# Then copy the backup over the corrupt file
docker exec n9router cp /app/data/db.json.backup /app/data/db.json
docker restart n9router
```

### Resetting to defaults

Stop n9router, delete `DATA_DIR/db.json`, and restart. All providers, combos, and settings will be reset. Usage history in `usage.json` is preserved.

```bash
docker stop n9router
docker run --rm -v n9router-data:/data alpine rm /data/db.json
docker start n9router
```
