# Pilot

A web PWA for [OpenCode](https://opencode.ai) — connects to `opencode serve` over HTTP + SSE and delivers a full terminal-class interface in any browser.

```
┌─────────────────────┐     HTTPS + SSE     ┌────────────────────────┐
│  Browser (PWA)      │ ──────────────────▶ │  opencode serve        │
│  React + Vite       │                     │  --hostname 0.0.0.0    │
│  shadcn/ui          │ ◀────────────────── │  --port 4096           │
└─────────┬───────────┘   events/responses  └────────────────────────┘
          │
          │ HTTP
          ▼
┌─────────────────────┐
│  Hono server        │  proxy · auth · Web Push · tunnel · memory
│  (pilot start)      │
└─────────────────────┘
          │
          │ Cloudflare Tunnel
          ▼
   remote access via QR
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
- **Memory plugin** — server-side semantic extraction and injection across sessions
- **Dark + light themes** — system-aware via `prefers-color-scheme`; indigo-500 accent

## Tech Stack

| Concern            | Choice                                               |
| ------------------ | ---------------------------------------------------- |
| Frontend framework | React 19 + Vite 6                                    |
| Language           | TypeScript                                           |
| Components         | shadcn/ui + Radix UI primitives                      |
| Styling            | Tailwind CSS v4                                      |
| State              | Zustand                                              |
| SSE                | Native `EventSource`                                 |
| Terminal           | xterm.js + node-pty (server-side PTY)                |
| Code editor        | CodeMirror 6                                         |
| Diff rendering     | diff2html                                            |
| Fonts              | System font stacks via `theme.ts` (sans + monospace) |
| Server             | Hono (proxy, auth, push, tunnel, memory)             |
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

The Hono server starts on `http://localhost:3000`, serving the UI and proxying all API calls to OpenCode.

### 3. Open the app

Navigate to `http://localhost:3000` in any browser. On first launch, enter your OpenCode server URL (e.g. `http://192.168.1.x:4096`).

### 4. Start chatting

Create a new session and send a message. SSE streams responses in real time. Use `/` for slash commands and `@` to mention files.

### 5. Remote access (optional)

```bash
npx pilot tunnel
```

This starts a Cloudflare Quick Tunnel and prints a QR code. Scan it from any device to access Pilot remotely — no port forwarding or cloud account needed.

---

## Configuration Guide

### Environment variables

| Variable        | Default     | Description                                     |
| --------------- | ----------- | ----------------------------------------------- |
| `PORT`          | `3000`      | HTTP port for the Pilot Hono server             |
| `HOSTNAME`      | `0.0.0.0`   | Bind address                                    |
| `OPENCODE_URL`  | (none)      | Default OpenCode server URL (overridable in UI) |
| `VAPID_SUBJECT` | (auto)      | Web Push contact (mailto: or URL)               |
| `VAPID_PUBLIC`  | (generated) | VAPID public key for Web Push                   |
| `VAPID_PRIVATE` | (generated) | VAPID private key for Web Push                  |

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

In dev mode, the Vite dev server proxies API calls to the Hono server on `:3000`.

### Available npm scripts

| Script               | Workspace | Description                            |
| -------------------- | --------- | -------------------------------------- |
| `npm start`          | server    | Start production server                |
| `npm run dev`        | —         | Start dev servers (server + UI)        |
| `npm run build`      | —         | Build all workspaces                   |
| `npm run typecheck`  | —         | Run tsc --noEmit across all workspaces |
| `npm run lint`       | ui        | ESLint check                           |
| `npm test`           | ui        | Run Jest test suite                    |
| `npm run test:e2e`   | e2e       | Run Playwright E2E tests (UI-only)      |
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
│       ├── proxy.ts     # OpenCode HTTP/SSE proxy (or n9router)
│       ├── auth.ts      # Session auth (httpOnly cookies)
│       ├── push.ts      # Web Push relay
│       ├── tunnel.ts    # Cloudflare tunnel + QR
│       ├── memory/      # Memory plugin (extraction, injection, SQLite)
│       └── cli.ts       # `pilot start` / `pilot tunnel` CLI
├── ui/                  # React + Vite frontend
│   └── src/
│       ├── pages/       # Chat, Files, Diff, Memory, Settings
│       ├── components/  # shadcn/ui + project components
│       ├── services/    # api.ts, sse.ts, auth.ts, logger.ts
│       ├── store/       # Zustand: server, session, ui, log
│       └── theme/       # colors.ts, fonts.ts
├── e2e/                  # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── tests/            # Journey-based test directories
│   │   ├── navigation/   # Route rendering, links, multi-page
│   │   ├── chat/         # Chat UI, permission cards, SSE flow
│   │   ├── settings/     # Server config, form input
│   │   ├── terminal/     # WebSocket terminal
│   │   ├── visual/       # Screenshots, visual regression
│   │   ├── viewport/     # Emulation, responsive layout
│   │   ├── diagnostics/  # Console, network, performance
│   │   └── accessibility/# WCAG 2.2 AA audits
│   ├── pages/            # Page Object Model (ChatPage, SettingsPage, etc.)
│   ├── fixtures/         # Custom fixtures (console tracking, viewports)
│   ├── utils/            # Shared routes, selectors, viewport presets
│   ├── docs/             # Quick-start and in-depth guides
│   └── screenshots/      # Route and element screenshots
├── docker/               # Docker setup for n9router
│   ├── docker-compose.yml
│   ├── n9router.Dockerfile
│   └── .env.example
├── scripts/
│   └── start.sh          # Dev startup: Pilot + Vite, defaults to n9router :20128
├── opencode.json.example # Per-developer n9router config template
└── shared/
    └── types.ts         # Shared TypeScript types
```

## Documentation

- **Quick Start Guide** (above) — Install, configure, and launch Pilot
- **Configuration Guide** (above) — Environment variables, scripts, n9router setup
- [`DESIGN.md`](DESIGN.md) — Full architecture, screen wireframes, navigation, API layer, state design, and decisions log
- [`TASKS.md`](TASKS.md) — Task agenda
- [`MEMORY.md`](MEMORY.md) — Memory plugin usage guide
- [`BENCH.md`](BENCH.md) — Benchmark and audit suite documentation

## Non-Goals

- Running OpenCode locally on-device
- Direct file editing (edits go through chat; OpenCode's server has no write endpoint)

## License

MIT
