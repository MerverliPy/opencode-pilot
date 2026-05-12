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

| Concern            | Choice                                          |
| ------------------ | ----------------------------------------------- |
| Frontend framework | React 19 + Vite 6                               |
| Language           | TypeScript                                      |
| Components         | shadcn/ui + Radix UI primitives                 |
| Styling            | Tailwind CSS v4                                 |
| State              | Zustand                                         |
| SSE                | Native `EventSource`                            |
| Terminal           | xterm.js + node-pty (server-side PTY)           |
| Code editor        | CodeMirror 6                                    |
| Diff rendering     | diff2html                                       |
| Fonts              | Geist Sans (UI), JetBrains Mono (code/terminal) |
| Server             | Hono (proxy, auth, push, tunnel, memory)        |
| Memory storage     | better-sqlite3 (server-side)                    |
| Remote access      | Cloudflare tunnel                               |

## Prerequisites

- Node.js >= 20
- A running `opencode serve` instance

## Getting Started

```bash
# Install all workspace dependencies
npm install

# Start the Hono server (proxies OpenCode + serves the UI)
npm start
```

Open `http://localhost:3000` in any browser. On first launch, enter your OpenCode server URL
(e.g. `http://192.168.1.x:4096`). For remote access, run `pilot tunnel` to generate a QR code.

## Project Structure

```
pilot/
├── server/              # Hono server
│   └── src/
│       ├── index.ts     # App entry, routing
│       ├── proxy.ts     # OpenCode HTTP/SSE proxy
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
└── shared/
    └── types.ts         # Shared TypeScript types
```

## Documentation

- [`DESIGN.md`](DESIGN.md) — Full architecture, screen wireframes, navigation, API layer, state design, and decisions log
- [`TASKS.md`](TASKS.md) — Active migration agenda (M1–M5)
- [`BENCH.md`](BENCH.md) — Benchmark and audit suite documentation

## Non-Goals

- Running OpenCode locally on-device
- Direct file editing (edits go through chat; OpenCode's server has no write endpoint)

## License

MIT
