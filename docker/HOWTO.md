# Pilot + n9router — Docker How-To Guide

## Prerequisites

```bash
# Docker Engine (Ubuntu/Debian)
sudo apt update && sudo apt install -y docker.io docker-compose-v2

# Clone the repo
git clone https://github.com/MerverliPy/opencode-pilot.git
cd opencode-pilot
```

---

## 1. Start n9router (Docker)

n9router is the AI model router. Run it in Docker:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Verify:
```bash
curl http://localhost:20128/api/health
# → {"ok":true}

curl http://localhost:20128/v1/models
# → {"object":"list","data":[{"id":"ds/deepseek-v4-flash",...}]}
```

**Access URLs:**
| Where | URL |
|-------|-----|
| Local | `http://localhost:20128` |
| Tailscale | `http://<YOUR_TAILSCALE_IP>:20128` |
| OpenCode API | `http://localhost:20128/v1` |

### With Cloudflare Tunnel

```bash
docker compose -f docker/docker-compose.yml --profile tunnel up -d
```

Requires `CLOUDFLARE_TUNNEL_TOKEN` set in `docker/.env`.

---

## 2. Start Pilot Server

### Option A: Native (on your dev machine)

```bash
# Start n9router first (step 1), then:
npm run dev:server      # Hono server on :3000
npm run dev:ui          # Vite UI on :5173 (separate terminal)
```

The server reads `OPENCODE_URL` from `.env`. Default for Docker n9router:

```env
OPENCODE_URL=http://localhost:20128
```

### Option B: Full-Stack Docker (everything in containers)

```bash
docker compose -f docker/docker-compose.yml --profile full-stack up -d
```

This starts n9router + Pilot server. The Pilot server auto-discovers n9router via Docker DNS (`http://n9router:20128`).

---

## 3. Running E2E Tests

### UI-Only Tests (no upstream needed)

```bash
npm run test:e2e
```

Tests the PWA UI shell (routes, viewports, console, accessibility, screenshots).

### Full-Stack Tests (with Docker n9router)

```bash
# Terminal 1: Start n9router
docker compose -f docker/docker-compose.yml up -d

# Terminal 2: Run full-stack tests
E2E_FULL_STACK=1 OPENCODE_URL=http://localhost:20128 npm run test:e2e:fullstack
```

Full-stack tests verify: SSE event flow, terminal WebSocket, session lifecycle, permission cards, tunnel controls.

---

## 4. Tailscale Access

The Docker containers bind to `0.0.0.0`, making them reachable via any network interface including Tailscale.

| Service | Tailscale URL |
|---------|---------------|
| n9router | `http://100.81.83.98:20128` |
| n9router API | `http://100.81.83.98:20128/v1` |
| Pilot Server | `http://100.81.83.98:3000` |
| Pilot API | `http://100.81.83.98:3000/api` |

To change the Tailscale IP, set `TAILSCALE_IP` env var before running:

```bash
export TAILSCALE_IP=<YOUR_TAILSCALE_IP>
scripts/start.sh
```

---

## 5. OpenCode Config

Copy the example config and update the n9router URL:

```bash
cp opencode.json.example opencode.json
# Edit opencode.json → set provider.n9router.options.baseURL
```

```json
{
  "provider": {
    "n9router": {
      "options": {
        "baseURL": "http://localhost:20128/v1"
      }
    }
  }
}
```

`opencode.json` is in `.gitignore` — your local config stays private.

---

## 6. Useful Commands

```bash
# ─── Docker ────────────────────────────────────────────────────────
docker compose -f docker/docker-compose.yml ps          # Check status
docker compose -f docker/docker-compose.yml logs -f      # Stream logs
docker compose -f docker/docker-compose.yml down         # Stop
docker compose -f docker/docker-compose.yml down -v      # Stop + wipe data

# ─── n9router ─────────────────────────────────────────────────────
curl http://localhost:20128/api/health                   # Health check
curl http://localhost:20128/v1/models                    # Model list

# ─── E2E Tests ────────────────────────────────────────────────────
npm run test:e2e                                         # UI-only (fast)
npm run test:e2e:fullstack                               # Full-stack
npx playwright test --headed                             # With browser
npx playwright test --ui                                 # Playwright UI mode

# ─── Debug ────────────────────────────────────────────────────────
npx playwright show-report e2e/playwright-report/        # HTML report
tail -f /tmp/pilot-server.log                            # Server logs
```

---

## 7. Architecture

```
┌──────────────────┐     HTTP      ┌──────────────────┐
│  Your Machine    │──────────────▶│  n9router (Docker)│
│  Pilot UI (Vite) │              │  :20128           │
│  Hono Server     │  proxy /api  │  AI model routing │
│  :3000 / :5173   │◀─────────────│  OpenAI, Claude,  │
└──────────────────┘              │  Gemini, etc.     │
         │                        └──────────────────┘
         │ Cloudflare Tunnel
         ▼
  Remote access via QR
```

---

## 8. Troubleshooting

| Problem | Check |
|---------|-------|
| Docker build fails | `ping registry.npmjs.org` — Docker needs internet |
| n9router not starting | `docker compose logs n9router` — check for port conflicts on :20128 |
| `OPENCODE_URL` not working | Verify n9router is healthy: `curl localhost:20128/api/health` |
| CORS errors in browser | Add your origin to `CORS_ORIGINS` in `.env` |
| Port conflict when running n9router natively + Docker | Stop native: `pkill -f n9router` or use `N9ROUTER_PORT=20129` |
| Screenshot tests fail in CI | Baselines generated on dev machine — use `--update-snapshots` to re-generate |
