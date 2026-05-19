---
name: pilot-self-run
description: "Use when the user asks to run the full Pilot stack, start the repo, provide URLs for testing, or launch Pilot for iPhone/remote access. Handles checking for previous runs, killing old processes, starting server + UI, and outputting connection URLs."
compatibility: opencode
---

# Pilot Self-Run

Start the full Pilot stack (server + UI) and provide connection URLs.

## Workflow

When this skill is loaded, the orchestrator should:

### 1. Check if already running

```bash
# Check if processes exist on Pilot ports
ss -tlnp 'sport = :3201 or sport = :5173' 2>/dev/null || lsof -i :3201 -i :5173 2>/dev/null
```

If any process is found → proceed to step 2 (kill).  
If nothing is running → skip to step 3 (start).

### 2. Kill previous run

```bash
bash scripts/pilot-stop.sh
```

Verify ports are free:
```bash
ss -tlnp 'sport = :3201' | grep LISTEN && echo "STILL IN USE" || echo "FREE"
```

### 3. Start the stack

**Use the script (preferred):**
```bash
bash scripts/pilot-start.sh
```

If the script fails, check common issues:
- `OPENCODE_URL` is reachable
- Ports 3201 and 5173 are free (run `bash scripts/pilot-stop.sh`)
- `server/dist/cli.js` exists (run `npm run build -w server` if not)
- `ui/node_modules` is installed (run `npm install` if not)

### 4. Verify and output URLs

Verify:
```bash
curl -sf http://localhost:3201/health && echo "✓ Server OK"
curl -sf http://100.81.83.98:3201/ | head -c 50 && echo "... ✓ UI OK"
```

Output to user:

| URL | Purpose |
|-----|---------|
| `http://100.81.83.98:3201/` | **Main UI + API (use this in Settings)** |
| `http://100.81.83.98:5173/` | Dev UI with HMR |
| `http://100.81.83.98:4096/` | OpenCode upstream |
| `http://172.24.236.105:3201/` | Same over LAN |

**Server config the user should enter in Pilot Settings:**
- Name: `Pilot`
- URL: `http://100.81.83.98:3201`
- Username: *(empty)*
- Password: *(empty)*
- Then click **activate**

## Critical gotchas

1. **OPENCODE_URL must be set** — without it, the proxy routes (`/session`, `/api`, etc.) aren't registered and the server returns HTML for API calls.

2. **PILOT_AUTH_TOKEN must NOT be set** — the UI client sends Basic auth format, not Bearer. If auth is enabled, all API calls get 401. Comment it out in `.env`.

3. **Vite MUST run from `ui/` directory** — otherwise it can't find `vite.config.ts` or `index.html` and returns 404 for all routes.

4. **Server config URL must be port 3201** — the browser blocks cross-origin API calls to port 4096 (CORS). Port 3201 is same-origin since the UI loads from there.

5. **Tailscale IP** — `100.81.83.98` is the Tailscale IP. For LAN-only access use `172.24.236.105`. For localhost use `127.0.0.1`.

## Port map

| Port | Service | Notes |
|------|---------|-------|
| 3201 | Pilot server | Hono, proxy + static UI |
| 5173 | Vite dev server | HMR, proxies to :3201 |
| 4096 | OpenCode | Upstream AI engine |
