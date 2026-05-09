# Pilot — Design Document

A React Native iOS client that reskins the OpenCode TUI for iPhone, connecting to a remote `opencode serve` instance over HTTP + SSE.

---

## 1. Goals

- Make using OpenCode on iPhone faster and more pleasant than SSH-ing into a server.
- Preserve the OpenCode TUI aesthetic (monospace, theme colors, status line) while using native iOS components for input, scrolling, and gestures.
- Solve the four pain points: session management, file browsing, push notifications, syntax highlighting.

## 2. Non-Goals

- Running OpenCode locally on the device.
- Replicating the TUI pixel-for-pixel inside a terminal emulator.
- Editing files directly via a write API (the OpenCode server has no write endpoint; edits happen through chat).
- Android support (single-platform for now).

## 3. Architecture

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

- The app talks **directly** to OpenCode's HTTP API. No middleware.
- A small Node relay on the server watches the SSE event stream and forwards `session.idle` transitions to Expo Push for background notifications (iOS does not keep SSE connections alive in the background).

## 4. Tech Stack

| Concern              | Choice                                  |
| -------------------- | --------------------------------------- |
| Framework            | Expo SDK (React Native), TypeScript     |
| Navigation           | Expo Router (file-based)                |
| State                | Zustand                                 |
| API client           | Custom `fetch()` wrapper (`OpencodeClient`) |
| SSE                  | `react-native-sse`                      |
| Syntax highlighting  | Custom lightweight tokenizer            |
| Fonts                | JetBrains Mono via `expo-font`          |
| Animations           | `react-native-reanimated` v4            |
| Drawer               | `@react-navigation/drawer`              |
| Secure storage       | `expo-secure-store`                     |
| Notifications        | `expo-notifications` + custom relay     |
| Haptics              | `expo-haptics`                          |

## 5. Navigation

```
[Server Setup]  (first run only, persisted in SecureStore)
       │
       ▼
[Drawer Navigator]
       │
       ├─ TUI Main (default route, auto-resumes last session)
       ├─ File Browser
       ├─ Diff Viewer
       └─ Settings

Modals (presented over any screen):
  - Session Picker
  - Slash Command Picker
  - File Mention Picker (@)
  - Model Picker
  - Agent Picker
  - File Viewer
```

The drawer is a slide-over (~80% width), dims content, swipe-to-dismiss.

## 6. TUI Main Screen

### Anatomy

```
┌─────────────────────────────────────┐
│ ☰   session title          ● busy  │  TopBar
├─────────────────────────────────────┤
│  user> add auth to /settings        │
│                                     │
│  ● Reading packages/auth/index.ts   │  ToolCall (collapsed)
│  ● Editing packages/settings/...    │
│                                     │  MessageStream
│  Done. Added JWT middleware to...   │
│                                     │
│  ┌── ts ───────────────────────┐    │  CodeBlock (long-press → copy)
│  │ export const middleware =   │    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│ > _                                 │  PromptInput
├─────────────────────────────────────┤
│  /  @  ⏎      sonnet-4.5  build     │  Toolbar
└─────────────────────────────────────┘
```

### Behavior

- **Top bar:** ☰ opens drawer; session title taps open Session Picker modal; status dot is tappable when busy → calls `POST /session/:id/abort`.
- **Message stream:** virtualized list rendered bottom-up. Each `Message` renders its `Part[]` — text, tool, code, file, reasoning. Tool calls collapsed by default, expand on tap.
- **Permission prompts:** when `session.permission.requested` event fires, render an inline card with Allow / Deny buttons → `POST /session/:id/permissions/:permissionID`.
- **Prompt input:** auto-growing TextInput, monospace, `>` prefix in muted color.
- **Toolbar:**
  - `/` → Slash Command Picker (uses `GET /command`)
  - `@` → File Mention Picker (uses `GET /find/file?query=`)
  - `⏎` → submit via `POST /session/:id/prompt_async`
  - Model chip → Model Picker modal (uses `GET /config/providers`)
  - Agent chip → Agent Picker modal (uses `GET /agent`); toggles build/plan
- **Real-time:** subscribe to `GET /event` SSE, dispatch updates into the Zustand session store.

## 7. Drawer Items

### 7.1 File Browser

- Tree from `GET /file?path=<dir>`, lazy expand.
- Search bar at top:
  - Default: file name search via `GET /find/file?query=`
  - Toggle to "text search" → `GET /find?pattern=`, results group by file with line previews.
- Tap file → File Viewer modal: `GET /file/content?path=`, syntax-highlighted, monospace.

### 7.2 Diff Viewer

- Lists files changed in **current session** via `GET /session/:id/diff`.
- Per-file unified diff with TUI green/red palette.
- Filter dropdown by message ID to scope diffs to a single turn.
- Long-press file → copy path; tap → expanded diff view.

### 7.3 Settings

- Servers: list configured servers (URL + optional basic auth), add/edit/delete, switch active.
- Notifications: enable toggle + push token display + relay setup help.
- Appearance: font size (theme switching planned).
- Session: auto-resume last (default on), default agent.
- About: version, links.

## 8. Theme

The app reads OpenCode's default TUI palette and uses it across all screens.

```ts
// theme/colors.ts
export const opencode = {
  background: '#0F0F0F',
  foreground: '#E5E5E5',
  muted: '#7A7A7A',
  border: '#2A2A2A',
  accent: '#FFB454',     // OpenCode orange
  success: '#7FBA8A',
  error: '#E06C75',
  warning: '#E5C07B',
  // syntax (matches TUI highlight)
  syntax: { keyword, string, number, comment, function, type, ... }
}
```

## 9. State (Zustand)

Three stores, deliberately small:

```
useServerStore      activeServer, servers[], setActive(), add(), remove()
useSessionStore     sessionID, messages, status, model, agent,
                    appendPart(), setStatus(), reset()
useUIStore          drawerOpen, modal, fontSize, theme
```

The SSE hook (`useEventStream`) writes directly into `useSessionStore` based on event type:
`message.part.updated` → upsert part; `session.updated` → update status; `permission.requested` → push prompt; etc.

## 10. API Layer

Custom REST client built on plain `fetch()` with:

- Base URL + basic auth header injection from active server config
- Typed errors
- Retry with backoff for idempotent GETs
- Single shared SSE connection per active session (auto-reconnect on disconnect)

```
services/api.ts        REST wrapper
services/sse.ts        useEventStream(serverConfig) hook
services/auth.ts       SecureStore get/set for server credentials
```

## 11. Push Notification Relay

A standalone Node script that lives on the OpenCode server. Run alongside `opencode serve`.

```
relay/
├── relay.js           subscribes to /event, posts to Expo Push API
├── README.md          setup instructions
└── relay.service      example systemd unit
```

Logic:
1. Connect to `http://localhost:4096/event` SSE.
2. Track per-session status. On transition `busy → idle` (and not user-initiated abort), post a notification to Expo Push API for every registered device token.
3. Device tokens are POSTed to a tiny endpoint the relay also serves, called by the app on first launch.

Notification payload includes `sessionID` so taps deep-link straight into that session via Expo Linking.

## 12. Project Structure

```
pilot/
├── app/
│   ├── _layout.tsx                # Root: server gate + theme provider
│   ├── setup.tsx                  # Server setup
│   ├── (main)/
│   │   ├── _layout.tsx            # Drawer navigator
│   │   ├── index.tsx              # TUI main
│   │   ├── files.tsx
│   │   ├── diff.tsx
│   │   └── settings.tsx
├── components/
│   ├── modals/
│   │   ├── SessionsModal.tsx
│   │   ├── SlashModal.tsx
│   │   ├── MentionModal.tsx
│   │   ├── ModelModal.tsx
│   │   ├── AgentModal.tsx
│   │   ├── FileViewModal.tsx
│   │   ├── WorkdirSheet.tsx
│   │   └── ModalShell.tsx
│   ├── tui/
│   │   ├── TopBar.tsx
│   │   ├── MessageStream.tsx
│   │   ├── MessagePart.tsx
│   │   ├── ToolCall.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── PermissionCard.tsx
│   │   ├── PromptInput.tsx
│   │   └── StatusBar.tsx
│   ├── drawer/
│   │   └── DrawerContent.tsx
│   └── shared/
│       ├── ErrorBadge.tsx
│       ├── ErrorBoundary.tsx
│       ├── Pill.tsx
│       └── Spinner.tsx
├── services/
│   ├── api.ts
│   ├── sse.ts
│   └── auth.ts
├── store/
│   ├── server.ts
│   ├── session.ts
│   └── ui.ts
├── theme/
│   ├── colors.ts
│   ├── fonts.ts
│   └── index.ts
├── assets/
│   └── fonts/JetBrainsMono-*.ttf
├── relay/
│   ├── relay.js
│   ├── README.md
│   └── relay.service
├── app.json
├── package.json
└── tsconfig.json
```

## 13. Build Phases

1. Scaffold Expo app, fonts, theme, secure storage, Server Setup screen.
2. API + SSE layer with typed client and reconnect.
3. TUI screen shell — TopBar, MessageStream (read-only), StatusBar.
4. Send + stream — PromptInput, prompt_async, live SSE rendering.
5. Drawer + File Browser (tree, search, viewer).
6. Diff Viewer.
7. Slash commands, @ mentions, model/agent pickers, inline permission prompts.
8. Settings + multi-server support.
9. Push notification relay + Expo Notifications wiring.
10. Polish — haptics, animations, copy actions, swipe gestures, error boundaries.

## 14. Open Risks

- **iOS background SSE:** confirmed unreliable; mitigated by relay + push.
- **SDK decision:** Verified in phase 2 — the app uses a custom `fetch()` wrapper with hand-written types instead of the Node-targeted `opencode-ai` SDK.
- **Token auth:** server only supports HTTP Basic Auth. We rely on TLS (recommend the user front the server with Caddy or run via Tailscale).
- **No file write API:** file editing remains via chat only. Documented as a deliberate non-goal.

## 15. Decisions Log

| Decision                          | Choice                            |
| --------------------------------- | --------------------------------- |
| Framework                         | Expo (managed)                    |
| TUI implementation                | Native re-creation, not emulator  |
| Theme                             | Match OpenCode default            |
| Drawer style                      | Slide-over                        |
| Default session                   | Auto-resume last                  |
| Permissions                       | Inline approval card              |
| Notifications transport           | Expo Push via Node SSE relay      |
| Build scope                       | All 10 phases end-to-end          |
