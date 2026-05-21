# Pilot — Self-Run Guide

How to start the full Pilot stack and access it from iPhone / remote devices.

## Quick start

```bash
./scripts/pilot-start.sh
```

This stops any old processes, builds if needed, starts the server and UI, prints URLs.

## Stop

```bash
./scripts/pilot-stop.sh
```

---

## What runs

| Service | Port | Role |
|---------|------|------|
| Pilot server (Hono) | 3201 | Proxies to OpenCode, serves built UI |
| Vite dev server | 5173 | Hot-reload UI with proxy to Pilot |
| OpenCode | 4096 | Upstream AI agent engine (external process) |

The Pilot server proxies `/session`, `/api`, `/file`, `/git`, `/event`, `/terminal/ws` etc. to OpenCode.

---

## URLs

| Purpose | URL |
|---------|-----|
| **UI (built, single origin)** | `http://<IP>:3201/` — **use this in Settings** |
| UI (dev, HMR) | `http://<IP>:5173/` |
| API health check | `http://<IP>:3201/health` |
| OpenCode direct | `http://<IP>:4096/` |

> Replace `<IP>` with your Tailscale IP (`100.81.83.98`) or LAN IP.

---

## In Pilot Settings (Add Server)

After opening the UI, go to Settings → Servers → **+ Add Server**:

| Field | Value |
|-------|-------|
| Name | `Pilot` (or anything) |
| URL | `http://<IP>:3201` |
| Username | *(leave empty)* |
| Password | *(leave empty)* |

Then click **activate**.

> ⚠️ Do NOT use port 4096. The browser blocks cross-origin API calls to a different port. Port 3201 is same-origin because the UI is loaded from there.

---

## iPhone / remote access

1. **Same WiFi**: Use LAN IP → example `http://172.24.236.105:3201`
2. **Anywhere (Tailscale)**: Use Tailscale IP → example `http://100.81.83.98:3201`

Both devices must be on the same Tailscale network.

---

## Auth

Pilot server Bearer token auth is **required by default**. To run without auth for local testing:

```bash
PILOT_AUTH_DISABLE=1 npm start
```

To set a token instead:

1. Set `PILOT_AUTH_TOKEN=your-token` in `.env`
| `PILOT_AUTH_DISABLE` | *(unset)* | Disable auth for local dev (set to 1) |
2. The client sends `Authorization: Bearer <token>` — the Settings UI doesn't expose this yet.

---

## Manual start (without scripts)

```bash
# 1. Stop anything on these ports
scripts/pilot-stop.sh
# or:
lsof -ti :3201 :5173 | xargs kill -9

# 2. Start server
OPENCODE_URL=http://100.81.83.98:4096 \
CORS_ORIGINS=http://localhost:5173,http://100.81.83.98:5173,http://100.81.83.98:3201 \
node server/dist/cli.js --port 3201 &

# 3. Start Vite (from ui/ directory)
cd ui
PROXY_TARGET=http://localhost:3201 npx vite --host 0.0.0.0 --port 5173 &
```

---

## Env vars

Set in `.env` (sourced by scripts) or inline:

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | 3201 | Pilot server listen port |
| `OPENCODE_URL` | `http://100.81.83.98:4096` | Upstream OpenCode |
| `CORS_ORIGINS` | localhost + 100.81.83.98 on 5173/3201 | Allowed origins |
| `PILOT_AUTH_TOKEN` | *(unset)* | Bearer token for API auth (required by default) |
| `PILOT_AUTH_DISABLE` | *(unset)* | Disable auth for local dev (set to 1) |
| `N9ROUTER_API_KEY` | *(set in .env)* | n9router API key |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "no server configured" in Files/Diff/Memory | Go to Settings, add server with URL `http://<IP>:3201`, click activate |
| Chat load failure / API errors | Check server URL is port 3201 (not 4096 — CORS blocks cross-port) |
| Port already in use | Run `scripts/pilot-stop.sh` first |
| Server returns HTML instead of JSON | `OPENCODE_URL` not set — server didn't register proxy routes |
| 401 Unauthorized | Auth is required by default. Set `PILOT_AUTH_TOKEN` or `PILOT_AUTH_DISABLE=1` for dev |
| `PILOT_AUTH_DISABLE` | *(unset)* | Disable auth for local dev (set to 1) |
