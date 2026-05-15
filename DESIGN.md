# Pilot — Design Document

A self-hosted web PWA that connects to a remote `opencode serve` instance over HTTP + SSE.
Built with React + Vite and served by a Hono Node.js server.

> **Migration complete (2026-05-13):** Pilot migrated from React Native / Expo to a web-first PWA.
> xterm.js, CodeMirror, diff2html, and Cloudflare tunnel are now all live.
> All five migration phases (M1–M5) are fully implemented.

---

## 1. Goals

- Replace the React Native app with a progressive web app that installs on iOS (16.4+) and Android from the browser — no App Store required.
- Preserve the OpenCode TUI aesthetic: monospace, dark-by-default, status lines, minimal chrome.
- Enable power features that were blocked by React Native: embedded terminal (xterm.js), file editor (CodeMirror), Git diff viewer (diff2html), Cloudflare tunnel + QR access.
- Keep the memory plugin as Pilot's key competitive differentiator — port it server-side.
- Maintain parity with existing React Native features: SSE streaming, session management, file browser, permission prompts, push notifications.

## 2. Non-Goals

- Running OpenCode locally on the device.
- iOS/Android native shell (no Expo, no Capacitor, no React Native wrapper).
- iOS-specific features: home screen widget, Apple Watch companion, Siri Shortcuts, Face ID/Touch ID. Permanently deferred.
- Electron or Tauri desktop shell (web-only for now; can add later without code changes).

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Browser / PWA                        │
│   React + Vite  ·  shadcn/ui  ·  Tailwind              │
│   xterm.js  ·  CodeMirror 6  ·  diff2html              │
└──────────────────────┬─────────────────────────────────┘
                       │  HTTP + SSE + WebSocket
                       ▼
┌────────────────────────────────────────────────────────┐
│                  Pilot Server (Hono)                    │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  OpenCode  │  │  Auth    │  │  Memory Plugin      │ │
│  │  Proxy     │  │  Session │  │  (better-sqlite3)   │ │
│  └────────────┘  └──────────┘  └─────────────────────┘ │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  Terminal  │  │  Web     │  │  Cloudflare Tunnel  │ │
│  │  (node-pty)│  │  Push    │  │  (cloudflared)      │ │
│  └────────────┘  └──────────┘  └─────────────────────┘ │
└──────────────────────┬─────────────────────────────────┘
                       │  HTTP + SSE
                       ▼
┌────────────────────────────────────────────────────────┐
│              opencode serve                            │
│              --hostname 0.0.0.0 --port 4096            │
└────────────────────────────────────────────────────────┘
```

The Pilot server is the single backend process. It:

- Proxies all OpenCode API calls (avoids CORS, centralizes auth)
- Serves the compiled Vite frontend as static files
- Enforces bearer token authentication on all sensitive routes (PILOT_AUTH_TOKEN env var; disabled when unset)
- Bridges xterm.js ↔ node-pty over WebSocket for terminal access
- Relays SSE `session.idle` events to Web Push (background notifications)
- Runs the memory plugin: extraction, injection, semantic search, SQLite storage
- Optionally starts a Cloudflare tunnel and broadcasts the QR access URL

---

## 4. Tech Stack

### Frontend

| Concern       | Choice                                      | Notes                                         |
| ------------- | ------------------------------------------- | --------------------------------------------- |
| Framework     | React 19 + TypeScript                       | Preserves Zustand stores + services layer     |
| Bundler       | Vite 6                                      | Fast HMR, native ESM, PWA plugin              |
| Components    | shadcn/ui + Radix UI                        | Accessible unstyled primitives, full Tailwind |
| Styling       | Tailwind CSS v4                             | CSS variables for theme tokens                |
| State         | Zustand (existing stores transfer ~95%)     |                                               |
| Routing       | React Router v7                             | Replaces Expo Router                          |
| Virtual lists | @tanstack/react-virtual                     | Replaces FlatList                             |
| Terminal      | xterm.js + @xterm/addon-fit                 | WebSocket → node-pty                          |
| Editor        | CodeMirror 6                                | Better mobile touch than Monaco               |
| Diff viewer   | diff2html                                   | Syntax-highlighted unified/side-by-side       |
| Markdown      | react-markdown + rehype-highlight           |                                               |
| Animations    | CSS transitions + Framer Motion (selective) |                                               |
| PWA           | vite-plugin-pwa + Workbox                   | Cache-first app shell, network-first API      |

### Server

| Concern         | Choice                       | Notes                                      |
| --------------- | ---------------------------- | ------------------------------------------ |
| Runtime         | Node.js 20+                  |                                            |
| Framework       | Hono                         | TypeScript-first, fast, built-in SSE/proxy |
| Database        | better-sqlite3               | Replaces expo-sqlite for memory plugin     |
| Terminal bridge | node-pty                     | Requires native compilation                |
| Push relay      | web-push (VAPID)             | Replaces Expo Push relay                   |
| Tunnel          | cloudflared (programmatic)   |                                            |
| Git             | simple-git + GitHub REST API |                                            |

### Monorepo Layout

```
pilot/
├── server/                  # Hono server
│   ├── src/
│   │   ├── index.ts         # Entry point, route wiring
│   │   ├── proxy.ts         # OpenCode API proxy
│   │   ├── auth.ts          # Bearer token auth (env-driven PILOT_AUTH_TOKEN)
│   │   ├── terminal.ts      # node-pty WebSocket bridge
│   │   ├── push.ts          # Web Push relay
│   │   ├── tunnel.ts        # Cloudflare tunnel manager
│   │   └── memory/          # Memory plugin (ported from plugin/memory/)
│   │       ├── db.ts
│   │       ├── extraction.ts
│   │       ├── injection.ts
│   │       ├── embeddings/
│   │       └── ...
│   └── package.json
│
├── ui/                      # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/           # Route-level components
│   │   │   ├── Chat.tsx
│   │   │   ├── Sessions.tsx
│   │   │   ├── Files.tsx
│   │   │   ├── Terminal.tsx
│   │   │   ├── Diff.tsx
│   │   │   ├── Memory.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/      # Shared UI components
│   │   ├── store/           # Zustand stores (ported from store/)
│   │   ├── services/        # API + SSE clients (ported from services/)
│   │   ├── hooks/
│   │   └── theme/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── shared/
│   └── types.ts             # Shared TypeScript types
│
├── package.json             # npm workspaces root
├── DESIGN.md
├── TASKS.md
└── README.md
```

---

## 5. Visual Design

### 5.1 Color Tokens

All tokens are CSS custom properties defined on `:root` and overridden in `[data-theme="light"]`.

```css
/* Dark (default) */
:root {
  --bg-base: zinc-950 /* #09090b  — page background          */
    --bg-surface: zinc-900 /* #18181b  — cards, panels, sidebars   */
    --bg-elevated: zinc-800 /* #27272a  — modals, dropdowns          */
    --bg-hover: zinc-800 /* #27272a  — interactive hover          */
    --border: zinc-800 /* #27272a  — default border             */
    --border-subtle: zinc-900 /* #18181b  — dividers                   */
    --text-primary: zinc-50 /* #fafafa  — headings, active labels     */
    --text-secondary: zinc-400 /* #a1a1aa  — body text, descriptions    */
    --text-muted: zinc-600 /* #52525b  — placeholders, metadata     */
    --text-code: zinc-300 /* #d4d4d8  — inline code                */
    --accent: indigo-500 /* #6366f1  — primary actions, links     */
    --accent-hover: indigo-400 /* #818cf8  — accent hover               */
    --accent-muted: indigo-950 /* #1e1b4b  — accent tinted surfaces     */
    --success: emerald-500 --warning: amber-500 --error: red-500 --info: sky-500;
}

/* Light */
[data-theme="light"] {
  --bg-base: zinc-50 --bg-surface: white --bg-elevated: zinc-100
    --bg-hover: zinc-100 --border: zinc-200 --border-subtle: zinc-100
    --text-primary: zinc-900 --text-secondary: zinc-600 --text-muted: zinc-400
    --text-code: zinc-700 --accent: indigo-600 --accent-hover: indigo-500
    --accent-muted: indigo-50;
}
```

Theme is applied via `data-theme` attribute on `<html>`, initialized from `localStorage` with `prefers-color-scheme` fallback. No flash-of-unstyled-content: inline script in `<head>` sets the attribute before paint.

### 5.2 Typography

| Role            | Font stack                                              | Weight   | Notes                             |
| --------------- | ------------------------------------------------------- | -------- | --------------------------------- |
| UI text         | `system-ui, -apple-system, sans-serif`                  | 400, 500 | Labels, nav, descriptions         |
| Headings        | `system-ui, -apple-system, sans-serif`                  | 600      | Page titles, section headers      |
| Code / terminal | `ui-monospace, 'Cascadia Code', 'Source Code Pro', ...` | 400, 500 | All code blocks, terminal, editor |
| Inline code     | `ui-monospace, 'Cascadia Code', 'Source Code Pro', ...` | 400      | `backtick` spans in messages      |

Base size: 14px. Line height: 1.5. Fonts are defined in `ui/src/theme.ts` as CSS font-family stacks.

### 5.3 Spacing & Radius

- Base unit: 4px (Tailwind default)
- Sidebar width: 240px (collapsed: 56px icon-only)
- Panel min-width: 320px
- Border radius: `rounded-md` (6px) for inputs/buttons, `rounded-lg` (8px) for cards/panels, `rounded-xl` (12px) for modals
- Scrollbars: thin, `--bg-elevated` track, `--border` thumb

---

## 6. Navigation Architecture

### 6.1 Desktop Layout (≥ 768px)

```
┌────────────────────────────────────────────────────────────────┐
│  Titlebar: [≡] Pilot · [server name] · [session title]  [⚙ ●] │
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                       │
│  Sidebar │  Main Content Area                                    │
│  240px   │                                                       │
│          │                                                       │
│  [💬]    │                                                       │
│  Chat    │                                                       │
│          │                                                       │
│  [☰]     │                                                       │
│  Sessions│                                                       │
│          │                                                       │
│  [📁]    │                                                       │
│  Files   │                                                       │
│          │                                                       │
│  [>_]    │                                                       │
│  Terminal│                                                       │
│          │                                                       │
│  [⑂]     │                                                       │
│  Diff    │                                                       │
│          │                                                       │
│  [🧠]    │                                                       │
│  Memory  │                                                       │
│          │                                                       │
│  ────    │                                                       │
│  [⚙]    │                                                       │
│  Settings│                                                       │
│          │                                                       │
└──────────┴─────────────────────────────────────────────────────┘
```

- Sidebar is persistent, not overlapping.
- Active item: `--accent` left border + `--accent-muted` background.
- Collapse toggle (≡) shrinks to 56px icon-only strip.
- Server selector lives in the titlebar (replaces the bottom server picker from mobile).

### 6.2 Mobile Layout (< 768px)

```
┌──────────────────────────────┐
│  [≡] Pilot  [session title] [⚙]│
├──────────────────────────────┤
│                              │
│  Main Content Area           │
│  (full width)                │
│                              │
│                              │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│  [💬]  [☰]  [📁]  [>_]  [🧠]  │
└──────────────────────────────┘
```

- Bottom tab bar replaces sidebar on mobile.
- Hamburger (≡) opens full sidebar as slide-in drawer (overlapping, with backdrop).
- All tap targets ≥ 44px.

---

## 7. Screen Wireframes

### 7.1 Chat

````
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  ┌───────────────────────────────────────────────┐  │
│          │  │ Session: "Refactor auth module"  [↗ share]    │  │
│          │  └───────────────────────────────────────────────┘  │
│          │                                                       │
│          │  ┌─ user ──────────────────────────────────────────┐ │
│          │  │ Can you extract the JWT logic into its own file? │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ assistant ─────────────────────────────────────┐ │
│          │  │ Sure. I'll create `src/lib/jwt.ts`.              │ │
│          │  │                                                   │ │
│          │  │  ┌─ tool: write_file ────────────────────────┐   │ │
│          │  │  │ src/lib/jwt.ts                  [allow ✓] │   │ │
│          │  │  └───────────────────────────────────────────┘   │ │
│          │  │                                                   │ │
│          │  │  ```typescript                                    │ │
│          │  │  export function signJWT(payload) { ... }        │ │
│          │  │  ```                                             │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ thinking ── ● ● ● ─────────────────────────────┐ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ input ─────────────────────────────────────────┐ │
│          │  │ /                                               │ │
│          │  │                               [@] [⊕] [▶ Send] │ │
│          │  └─────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
````

**Behavior:**

- Message list is virtualized (`@tanstack/react-virtual`).
- Tool-use cards inline within the assistant turn: icon + path + allow/deny toggle.
- Streaming: characters append in real time via SSE `message.updated` events.
- Thinking indicator: three animated dots while `status === "running"`.
- Input: `<textarea>` auto-grows to 5 lines then scrolls. `/` triggers slash-command autocomplete popup. `@` triggers file mention popup.
- Cost + token count shown in collapsed footer (expandable).

### 7.2 Sessions

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Sessions                          [+ New Session]  │
│          │  ┌─────────────────────────────────────────────────┐ │
│          │  │ 🔵 Refactor auth module                          │ │
│          │  │    2 mins ago · claude-sonnet-4 · $0.012        │ │
│          │  ├─────────────────────────────────────────────────┤ │
│          │  │ ○  Fix SSE reconnection bug                     │ │
│          │  │    Yesterday · claude-sonnet-4 · $0.034         │ │
│          │  ├─────────────────────────────────────────────────┤ │
│          │  │ ○  Add memory plugin tests                      │ │
│          │  │    2 days ago · claude-haiku · $0.003           │ │
│          │  └─────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

**Behavior:**

- Active session has a filled circle indicator.
- Tap/click a session to navigate to Chat with that session loaded.
- Long-press (mobile) or right-click (desktop) → context menu: Rename, Share, Delete.
- "New Session" button calls `POST /session` and navigates to Chat.
- Session list subscribes to SSE for live status updates.

### 7.3 Files

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Files  /home/calvin/pilot              [⌕ Search]  │
│          │  ┌─────────────────────────────────────────────────┐ │
│          │  │ 📁 src/                                          │ │
│          │  │   📁 components/                                 │ │
│          │  │     📄 Chat.tsx                      4.2 KB      │ │
│          │  │     📄 SessionList.tsx               2.1 KB      │ │
│          │  │   📁 store/                                      │ │
│          │  │     📄 session.ts                    1.8 KB      │ │
│          │  │ 📄 package.json                      0.9 KB      │ │
│          │  │ 📄 vite.config.ts                    0.4 KB      │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ Preview pane ──────────────────────────────────┐ │
│          │  │  Chat.tsx                                        │ │
│          │  │  ─────────────────────────────────────────────  │ │
│          │  │  1  import { useSessionStore } from '../store'  │ │
│          │  │  2  ...                                          │ │
│          │  └─────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

**Behavior:**

- Tree is lazy-loaded; `GET /files?path=` returns directory listings.
- Clicking a file opens it in the CodeMirror preview pane (read-only by default).
- Language detection from extension → CodeMirror language pack loaded on demand.
- Search: full-text search via `GET /files/search?q=` against the server working directory.
- Files are read-only in the UI (edits happen through chat per the OpenCode model).

### 7.4 Terminal

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Terminal  bash                  [+ New] [× Close]  │
│          │  ╔═════════════════════════════════════════════════╗ │
│          │  ║ ~/pilot $ npm test                              ║ │
│          │  ║ > pilot@0.1.0 test                              ║ │
│          │  ║ > jest --coverage                               ║ │
│          │  ║                                                 ║ │
│          │  ║ PASS  src/services/__tests__/api.test.ts        ║ │
│          │  ║ PASS  src/store/__tests__/session.test.ts       ║ │
│          │  ║                                                 ║ │
│          │  ║ Test Suites: 12 passed, 12 total               ║ │
│          │  ║ Tests:       498 passed, 498 total             ║ │
│          │  ║                                                 ║ │
│          │  ║ ~/pilot $ █                                     ║ │
│          │  ╚═════════════════════════════════════════════════╝ │
└──────────┴─────────────────────────────────────────────────────┘
```

**Behavior:**

- xterm.js renders inside a `<div>` with `@xterm/addon-fit` for responsive sizing.
- WebSocket connection to `ws://localhost:PORT/terminal` — server spawns a shell via `node-pty`.
- Multiple terminal tabs supported (each is an independent pty).
- Terminal font: JetBrains Mono 13px. Color scheme matches `--bg-base` and token colors.
- Clipboard: Ctrl+C / Ctrl+V work natively inside the terminal canvas.

### 7.5 Diff / Git

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Diff                                               │
│          │  ┌─ Changed files ──────────────────────────────┐   │
│          │  │ M  src/lib/jwt.ts          [view diff ▼]     │   │
│          │  │ A  src/lib/__tests__/jwt.test.ts              │   │
│          │  │ M  src/middleware/auth.ts                     │   │
│          │  └──────────────────────────────────────────────┘   │
│          │                                                       │
│          │  ┌─ src/lib/jwt.ts ────────────────────────────────┐ │
│          │  │ @@ -1,8 +1,24 @@                               │ │
│          │  │  import { SignJWT } from 'jose'                │ │
│          │  │ +                                              │ │
│          │  │ +export interface JWTPayload { ... }           │ │
│          │  │ +                                              │ │
│          │  │ +export async function signJWT(               │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │  [Stage All]  [Commit message ________________] [✓]  │
└──────────┴─────────────────────────────────────────────────────┘
```

**Behavior:**

- `simple-git` on the server powers `GET /git/status`, `GET /git/diff`, `POST /git/commit`, `POST /git/push`.
- diff2html renders unified diffs with syntax highlighting.
- Stage/unstage individual files or all changes.
- Commit message input + commit button calls `POST /git/commit`.
- Push button calls `POST /git/push` (opens auth modal for token if needed).
- "Create PR" button opens the GitHub PR creation flow (requires GitHub token in settings).

### 7.6 Memory

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Memory                          [+ Add] [⬇ Export] │
│          │  ┌─ Filter ────────────────────────────────────────┐ │
│          │  │ [All ▾]  [Preferences] [Facts] [Skills] [Arch.] │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │  ┌─ Search ───────────────────────────────────────┐  │
│          │  │ 🔍 Search memories...                          │  │
│          │  └────────────────────────────────────────────────┘  │
│          │                                                       │
│          │  ┌─────────────────────────────────────────────────┐ │
│          │  │ [Preference]  Prefers TypeScript over JavaScript │ │
│          │  │ confidence: 0.91 · 3 days ago          [⋯] [×]  │ │
│          │  ├─────────────────────────────────────────────────┤ │
│          │  │ [Fact]  Works in ~/pilot on a Linux server      │ │
│          │  │ confidence: 0.87 · 1 week ago          [⋯] [×]  │ │
│          │  ├─────────────────────────────────────────────────┤ │
│          │  │ [Skill]  Uses Zustand for state management      │ │
│          │  │ confidence: 0.79 · 5 days ago          [⋯] [×]  │ │
│          │  └─────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

**Behavior:**

- Category filter pills: All / Preferences / Facts / Skills / Architecture / Decisions.
- Search bar does semantic search (embed query, cosine similarity against stored embeddings).
- Each card: category badge, content text, confidence score, timestamp, edit (⋯) and delete (×) actions.
- Edit opens inline textarea.
- Archive (soft delete) available from the ⋯ menu.
- Export downloads a JSON file of all memories for the current server.
- Confidence threshold slider in Settings controls extraction cutoff (default 0.65).

### 7.7 Settings

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Sidebar  │  Settings                                           │
│          │  ┌─ Servers ───────────────────────────────────────┐ │
│          │  │ ● localhost:4096        [Edit] [Remove]         │ │
│          │  │ ○ 192.168.1.42:4096     [Edit] [Remove]         │ │
│          │  │                                  [+ Add Server] │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ Appearance ────────────────────────────────────┐ │
│          │  │ Theme:    [System ▾]  Dark  Light               │ │
│          │  │ Font size: [14px ▾]                             │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ Memory Plugin ─────────────────────────────────┐ │
│          │  │ Extraction confidence threshold:  [0.65 ────●─] │ │
│          │  │ Embedding provider:  [OpenAI ▾]                 │ │
│          │  │ OpenAI API key:      [•••••••••••]  [Show]      │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ Access ────────────────────────────────────────┐ │
│          │  │ Cloudflare Tunnel:  [● Active]  [Stop]          │ │
│          │  │ Tunnel URL:         https://xyz.trycloudflare.com│ │
│          │  │                     [Copy] [Show QR]            │ │
│          │  └─────────────────────────────────────────────────┘ │
│          │                                                       │
│          │  ┌─ Notifications ─────────────────────────────────┐ │
│          │  │ Web Push:  [Enable Push Notifications]          │ │
│          │  └─────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 8. PWA Specification

### Manifest (`/manifest.webmanifest`)

```json
{
  "name": "Pilot",
  "short_name": "Pilot",
  "description": "OpenCode client — web PWA",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Service Worker (Workbox via `vite-plugin-pwa`)

- **App shell**: cache-first for all static assets (`/assets/*`, fonts).
- **API routes**: network-first with 3s timeout fallback to cache for `GET` requests.
- **SSE / WebSocket**: bypass service worker entirely.
- **Offline page**: custom `/offline.html` shown when API is unreachable.

### iOS Install

- `<meta name="apple-mobile-web-app-capable" content="yes">` for standalone mode.
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`.
- First-visit banner (custom, not the browser default) with "Add to Home Screen" instructions — shown once, dismissible, stored in `localStorage`.
- Push notifications require iOS 16.4+ with PWA installed to home screen.

### Web Push

- VAPID keys stored server-side in `server/.env`.
- `POST /push/subscribe` saves `PushSubscription` to SQLite.
- Server watches OpenCode SSE for `session.idle` events; calls `web-push.sendNotification()`.
- Notification payload: `{ title: "Pilot", body: "Session ready", data: { sessionId } }`.
- Click opens `/chat?session=<id>` (or focuses existing tab via `clients.matchAll`).

---

## 9. Key Architectural Decisions

| Decision               | Choice                                                          | Rationale                                                                                     |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Web framework          | React + Vite (not SolidJS)                                      | Zustand stores and services transfer ~95%; familiar component model reduces rewrite risk      |
| Backend framework      | Hono (not Express)                                              | TypeScript-first, built-in SSE/proxy/WebSocket support, faster cold start                     |
| Credentials            | httpOnly session cookies (not localStorage)                     | Browser cannot access httpOnly cookies via JS — XSS-safe. Replaces Expo SecureStore           |
| Memory plugin location | Server-side (`better-sqlite3`)                                  | Off-device storage: more secure, no device storage limits, works across browsers/devices      |
| Terminal               | xterm.js + node-pty (not CodeSandbox's sandpack)                | Full shell access is the use case; sandpack is for preview environments only                  |
| File editor            | CodeMirror 6 (not Monaco)                                       | Better mobile touch events, smaller bundle (~500KB vs 5MB), good enough for read-only preview |
| iOS native features    | Permanently deferred                                            | Widget, Watch, Siri, Face ID require native compilation — incompatible with web-only approach |
| Repo structure         | In-place monorepo pivot (not parallel repo)                     | Preserves git history, issues, and existing tests that transfer                               |
| Test strategy          | Port service/store tests; rebuild component tests incrementally | RN component tests are tied to React Native testing library — not transferable                |

---

## 10. Migration History — Phases Completed (2026-05-13)

All five migration phases were implemented between 2026-05-12 and 2026-05-13.

### Phase 1 — Repo Restructure

Converted to npm workspaces. Removed Expo/RN files. Scaffolded Hono server + Vite React app. Added `pilot start` CLI.

Files removed: `app/`, `app.json`, `eas.json`, `expo-env.d.ts`, `babel.config.js`, all `expo-*` deps.
Files added: `server/`, `ui/`, `shared/types.ts`, root `package.json` with workspaces.

### Phase 2 — Core Chat Parity

SSE via native `EventSource`. Session management. Message stream rendering. Prompt input. Permission cards. Mobile-first layout.

All existing Zustand stores + `services/api.ts` + `services/sse.ts` ported to web.

### Phase 3 — PWA + Remote Access

Web app manifest. Service worker (Workbox). Cloudflare tunnel manager + QR code. Web Push relay. iOS install banner.

### Phase 4 — Power Features

xterm.js terminal + node-pty WebSocket bridge. CodeMirror file viewer. diff2html Git UI. Multi-session tabs.

### Phase 5 — Memory Plugin Port

Ported `plugin/memory/` to `server/src/memory/`. Replaced `expo-sqlite` with `better-sqlite3`. Ported semantic search. Rebuilt Memory UI screen in React.

---

_Last updated: 2026-05-13_
