# Pilot

A web PWA for [OpenCode](https://opencode.ai) — connects to `opencode serve` over HTTP + SSE and delivers a full terminal-class interface in any browser.

```
               Dev mode:
┌─────────────────────┐     HTTP + SSE      ┌──────────────────────┐      ┌──────────────────────┐
│  Browser (PWA)      │ ──────────────────▶ │  Pilot Hono Server   │ ───▶ │  OpenCode Server     │
│  React + Vite       │  :5173 → :3201     │  proxy · auth · push │      │  :4096               │
│  theme tokens       │ ◀────────────────── │  tunnel · memory     │      │  (opencode serve)    │
└─────────────────────┘   events/responses  │  chat completions    │      └──────────────────────┘
                                             └──────────┬───────────┘
                                                        │                           ┌──────────────────────┐
                                                        ├── n9router chat ────────▶ │  n9router AI Router  │
                                                        │    POST /api/chat/        │  :20128 (Docker)     │
                                                        │    completions (SSE)      │  /v1/chat/completions │
                                                        │                           └──────────────────────┘
                                                        │
                                               Cloudflare Tunnel
                                                        │
                                                        ▼
                                              remote access via QR

               Production mode:
┌─────────────────────┐     HTTP + SSE      ┌──────────────────────┐      ┌──────────────────────┐
│  Browser (PWA)      │ ──────────────────▶ │  Pilot Hono Server   │ ───▶ │  OpenCode Server     │
│                     │  :3201              │  (serves UI + API)   │      │  :4096               │
└─────────────────────┘                     │  chat completions    │      └──────────────────────┘
                                             └──────────┬───────────┘
                                                        │
                                                        ├── n9router ───────────▶ n9router AI Router
                                                        │    /api/chat/               :20128
                                                        │    completions (SSE)
```

## Features

- **Session management** — create, resume, and switch between OpenCode sessions
- **Live message stream** — real-time SSE rendering of model output, tool calls, and code blocks
- **Terminal** — full xterm.js terminal emulator with PTY on the Hono server
- **File browser** — lazy-expanding tree with file search and text search (`GET /find`)
- **File viewer / editor** — CodeMirror with syntax highlighting
- **Diff viewer** — per-session unified diffs rendered with diff2html
- **Inline permission prompts** — allow/deny tool calls without leaving the chat
- **Push notifications** — Web Push via Hono server; works on iOS 16.4+ when pinned to home screen
- **Slash commands & @ mentions** — full command/file pickers
- **Model & agent switching** — switch models and build/plan mode from the toolbar
- **Remote access** — Cloudflare tunnel + QR code for connecting from any device
- **Direct n9router chat** — streaming chat UI that bypasses OpenCode agent protocol for simple conversations
- **Memory plugin** — server-side semantic extraction and injection across sessions
- **Dark + light themes** — system-aware via `prefers-color-scheme`; indigo-500 accent
- **Design system** — reusable Button, Input, Card components extracted with theme tokens (rem-based spacing, radii, font sizes)

## Tech Stack

| Concern            | Choice                                               |
| ------------------ | ---------------------------------------------------- |
| Frontend framework | React 19 + Vite 6                                    |
| Language           | TypeScript                                           |
| Components         | Custom UI components (`ui/src/components/ui/`)       |
| Styling            | Theme tokens + CSS custom properties + inline styles |
| State              | Zustand                                              |
| SSE                | Native `EventSource`                                 |
| Terminal           | xterm.js + node-pty (server-side PTY)                |
| Code editor        | CodeMirror 6                                         |
| Diff rendering     | diff2html                                            |
| Fonts              | System font stacks via `theme.ts` (sans + monospace) |
| Server             | Hono (proxy, auth, push, tunnel, memory, n9router chat) |
| Memory storage     | better-sqlite3 (server-side)                         |
| Remote access      | Cloudflare tunnel                                    |

## Quick Start Guide

### Prerequisites

- **Node.js >= 20**
- A running **`opencode serve`** instance (e.g. `opencode serve --hostname 0.0.0.0 --port 4096`)

### 1. Install

```bash
# Clone and install all workspace dependencies
npm install
```

### 2. Start the server

```bash
npm start
```

The Hono server starts on `http://localhost:3201`, serving the built UI and proxying all API calls to OpenCode.

Auth is REQUIRED by default. All sensitive routes return 401 unless a valid
`Authorization: Bearer <token>` header is sent. Set a token:

```bash
PILOT_AUTH_TOKEN="your-secret-token" npm start
```

For local development only, auth can be disabled:

```bash
PILOT_AUTH_DISABLE=1 npm start
```

The `/health` endpoint and static frontend remain public.

### 3. Open the app

Navigate to `http://localhost:3201` in any browser. On first launch, enter your OpenCode server URL (e.g. `http://192.168.1.x:4096`).

### 4. Start chatting

Create a new session and send a message. SSE streams responses in real time. Use `/` for slash commands and `@` to mention files.

### 5. Remote access (optional)

```bash
npx pilot tunnel
```

This starts a Cloudflare Quick Tunnel and prints a QR code. Scan it from any device to access Pilot remotely — no port forwarding or cloud account needed.

### 6. Persistent server (systemd)

Run Pilot as a systemd user service for auto-start on boot:

```bash
# Create the service file
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/pilot-server.service << 'EOF'
[Unit]
Description=Pilot Server
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/calvin/pilot
Environment=PORT=3201
Environment=OPENCODE_URL=http://100.81.83.98:4096
Environment=CORS_ORIGINS=http://localhost:5173,http://localhost:3201,http://100.81.83.98:5173,http://100.81.83.98:3201
ExecStart=/home/calvin/pilot/server/node_modules/.bin/tsx /home/calvin/pilot/server/src/cli.ts --port 3201
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable and start
systemctl --user daemon-reload
systemctl --user enable --now pilot-server

# Check status
systemctl --user status pilot-server
```

On Tailscale, components are accessible at:
- Pilot UI (dev): `http://100.81.83.98:5173`
- Pilot Server: `http://100.81.83.98:3201`
- OpenCode Server: `http://100.81.83.98:4096`
- n9router: `http://100.81.83.98:20128`
- Pilot Direct Chat API: `POST http://100.81.83.98:3201/api/chat/completions`

---

## Configuration Guide

### Environment variables

| Variable          | Default                  | Description                                      |
| ----------------- | ------------------------ | ------------------------------------------------ |
| `PILOT_AUTH_DISABLE`| (unset)                  | Disable auth for local dev (set to 1)            |
| `PORT`            | `3201`                   | HTTP port for the Pilot Hono server              |
| `HOSTNAME`        | `0.0.0.0`                | Bind address                                     |
| `OPENCODE_URL`    | `http://:4096`           | Upstream OpenCode server URL                     |
| `VAPID_SUBJECT`   | (auto)                   | Web Push contact (mailto: or URL)                |
| `VAPID_PUBLIC`    | (generated)              | VAPID public key for Web Push                    |
| `VAPID_PRIVATE`   | (generated)              | VAPID private key for Web Push                   |
| `PILOT_AUTH_TOKEN`| (none)                   | Bearer token for API auth (required by default)  |
| `CORS_ORIGINS`    | `http://localhost:5173`  | Comma-separated allowed origins                  |
| `RATE_LIMIT_MAX`  | `100`                    | Max requests per minute                          |
| `BODY_LIMIT_SIZE` | `10`                     | Max body size in MB                              |
| `N9ROUTER_URL`    | `http://localhost:20128/v1`| n9router base URL for direct chat completions     |
| `N9ROUTER_API_KEY`| (none)                   | n9router API key (optional for local deployments) |

All variables are optional. Set them in a `.env` file at the project root or pass them inline.

### Development mode

```bash
# Terminal 1 — Hono server with hot reload
npm run dev:server

# Terminal 2 — Vite dev server with HMR on :5173
npm run dev:ui

# Or both at once
npm run dev
```

In dev mode, the Vite dev server proxies API calls to the Hono server on `:3201`.

### Available npm scripts

| Script               | Workspace | Description                            |
| -------------------- | --------- | -------------------------------------- |
| `npm start`          | server    | Start production server                |
| `npm run dev`        | —         | Start dev servers (server + UI)        |
| `npm run build`      | —         | Build all workspaces                   |
| `npm run typecheck`  | —         | Run tsc --noEmit across all workspaces |
| `npm run lint`       | ui        | ESLint check                           |
| `npm test`           | ui        | Run Jest test suite                    |
| `npm run test:e2e`   | e2e       | Run Playwright E2E tests (UI-only)     |
| `npm run test:e2e:fullstack` | e2e | Run E2E tests with Hono + Vite   |
| `npm run test -w e2e -- <spec>` | e2e | Run single E2E spec             |
| `npm run test -w e2e -- --debug` | e2e | Run E2E in debug mode         |
| `npm run test -w e2e -- --ui` | e2e | Open Playwright interactive UI    |
| `npm run test -w e2e -- --headed` | e2e | Run E2E in headed browser     |
| `npm run test -w e2e -- --update-snapshots` | e2e | Rebaseline visual snapshots |
| `npm run dev:server` | server    | Start Hono server with tsx watch       |
| `npm run dev:ui`     | ui        | Start Vite dev server                  |
| `docker compose -f docker/docker-compose.yml up -d` | — | Start n9router (port 20128) |
| `docker compose --profile tunnel up -d` | — | n9router + Cloudflare tunnel |
| `docker compose --profile full-stack up -d` | — | n9router + Pilot server |

### n9router integration

Pilot works with [n9router](https://9router.com) as an AI routing gateway. Configure the n9router URL and API key in the Settings page to:

- Browse available models and combos
- Switch between providers (Anthropic, OpenAI, Gemini, etc.)
- View per-model usage stats and cost estimates
- Enable/disable the Cloudflare tunnel from the UI

#### Docker setup (recommended)

The easiest way to run n9router alongside Pilot:

```bash
# Start n9router on port 20128
docker compose -f docker/docker-compose.yml up -d

# With Cloudflare tunnel for remote access
docker compose --profile tunnel up -d

# With Pilot server (full-stack testing)
docker compose --profile full-stack up -d
```

Copy `docker/.env.example` to `docker/.env` to configure API keys and ports. n9router is also accessible over Tailscale at `http://100.81.83.98:20128`.

For full documentation see [`MEMORY.md`](MEMORY.md) and the n9router skill at `.opencode/skills/n9router-workflow/SKILL.md`.

## Project Structure

```
pilot/
├── server/              # Hono server
│   └── src/
│       ├── index.ts     # App entry, routing
│       ├── proxy.ts     # OpenCode HTTP/SSE proxy
│       ├── auth.ts      # Bearer token auth
│       ├── push.ts      # Web Push relay
│       ├── tunnel.ts    # Cloudflare tunnel management
│       ├── git.ts       # Git operations
│       ├── terminal.ts  # PTY terminal bridge (WebSocket)
│       ├── rateLimit.ts # Rate limiting
│       ├── cli.ts       # CLI entry point (pilot start)
│       ├── memory/      # Memory plugin (SQLite, embeddings)
│       └── __tests__/   # Server test suite
├── ui/                  # React/Vite PWA frontend
│   └── src/
│       ├── App.tsx      # Router + layout
│       ├── pages/       # Route pages
│       ├── components/  # Reusable UI components
│       ├── store/       # Zustand state stores
│       ├── services/    # API client, SSE, auth, n9router
│       └── __tests__/   # Jest test suite
├── shared/src/          # Shared TypeScript types
├── e2e/                 # Playwright E2E tests
├── opencode-server/     # (deleted — replaced by real opencode serve)
├── docker/              # Docker config for n9router
├── docs/                # Documentation
│   └── briefings/       # Phase briefing cards (P0-P8)
└── .opencode/           # OpenCode agent/skill/command config
    ├── agents/          # Agent definitions
    ├── skills/          # Skill files
    ├── commands/        # Slash commands
    ├── plugins/         # OpenCode plugins
    └── rules/           # Policy files
```

## Architecture Flow

```
User types a message in the chat UI
         │
         ▼
Pilot UI (React/Vite) ─── POST /session/:id/prompt_async ──► Pilot Server (:3201)
         │                                                         │
         │  SSE /event ◄────────────────────────────────────────────┘
         │                                                         │
         │                                                    Proxy to OpenCode (:4096)
         │                                                         │
         │                                                    n9router AI (:20128)
         │                                                         │
         │                                                    Response streamed back
         ▼
Message rendered in real-time via SSE events
```
