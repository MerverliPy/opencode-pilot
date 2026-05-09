# Pilot

A native iOS client for [OpenCode](https://opencode.ai) — connects to `opencode serve` over HTTP + SSE and re-creates the TUI experience with native iOS components.

```
┌──────────────────┐        HTTPS + SSE        ┌────────────────────────┐
│   Pilot (iOS)    │ ─────────────────────────▶│  opencode serve        │
│  React Native    │                           │  --hostname 0.0.0.0    │
│  Expo (managed)  │ ◀──────────────────────── │  --port 4096           │
└──────────────────┘     events / responses    └─────────┬──────────────┘
        ▲                                                │
        │ Expo Push                                      │ SSE
        │                                                ▼
┌──────────────────┐                           ┌────────────────────────┐
│  Expo Push API   │ ◀──────────────────────── │  relay.js (Node)       │
└──────────────────┘   POST /v2/push/send      │  on the same server    │
                                               └────────────────────────┘
```

## Features

- **Session management** — create, resume, and switch between OpenCode sessions
- **Live message stream** — real-time SSE rendering of model output, tool calls, and code blocks
- **File browser** — lazy-expanding tree with file search and text search (`GET /find`)
- **Diff viewer** — per-session unified diffs with TUI green/red palette
- **Inline permission prompts** — allow/deny tool calls without leaving the chat
- **Push notifications** — background idle alerts via a Node relay + Expo Push API
- **Slash commands & @ mentions** — full command/file picker pickers
- **Model & agent switching** — switch models and build/plan mode from the toolbar
- **OpenCode TUI aesthetic** — JetBrains Mono, dark theme, orange accent (`#FFB454`)

## Tech Stack

| Concern             | Choice                                |
| ------------------- | ------------------------------------- |
| Framework           | Expo SDK 54 (React Native, managed)   |
| Language            | TypeScript                            |
| Navigation          | Expo Router (file-based)              |
| State               | Zustand                               |
| SSE                 | react-native-sse                      |
| Syntax highlighting | Custom lightweight tokenizer          |
| Fonts               | JetBrains Mono via expo-font          |
| Animations          | react-native-reanimated v4            |
| Drawer              | @react-navigation/drawer              |
| Secure storage      | expo-secure-store                     |
| Notifications       | expo-notifications + Node relay       |
| Haptics             | expo-haptics                          |

## Prerequisites

- Node.js >= 18
- Expo Go app or an iOS simulator
- A running `opencode serve` instance reachable from your device

## Getting Started

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start
```

Scan the QR code with Expo Go or press `i` to open in an iOS simulator.

On first launch, enter your OpenCode server URL (e.g. `http://192.168.1.x:4096`). The app persists this in Secure Storage and connects automatically on subsequent launches.

## Push Notification Relay (optional)

The relay watches the OpenCode SSE stream and forwards `busy → idle` transitions to Expo Push so you get background notifications when the model finishes.

```bash
cd relay
npm install
EXPO_PUSH_TOKEN=<your-token> node relay.js
```

See [`relay/README.md`](relay/README.md) for full setup including systemd service configuration.

## Project Structure

```
pilot/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (server gate + theme)
│   ├── setup.tsx           # Server setup (first run)
│   └── (main)/             # Drawer group: TUI, files, diff, settings
├── components/
│   ├── tui/                # TopBar, MessageStream, ToolCall, CodeBlock, etc.
│   ├── drawer/             # DrawerContent, DrawerItem
│   └── shared/             # Spinner, Pill
├── plugin/                 # Memory plugin: extraction, injection, UI
│   └── memory/
├── services/               # api.ts, sse.ts, auth.ts, logger.ts
├── store/                  # Zustand: server, session, ui, log
├── theme/                  # colors.ts, fonts.ts
├── relay/                  # Node SSE → Expo Push relay
├── app.json                # Expo config (bundle ID: ai.opencode.pilot)
└── eas.json                # EAS Build config
```

## Documentation

- [`DESIGN.md`](DESIGN.md) — Full architecture, navigation, API layer, state design, and decisions log
- [`BENCH.md`](BENCH.md) — Benchmark and audit suite documentation

## Non-Goals

- Running OpenCode locally on-device
- Android support (iOS-only for now)
- Direct file editing (edits go through chat, as OpenCode's server has no write endpoint)

## License

MIT
