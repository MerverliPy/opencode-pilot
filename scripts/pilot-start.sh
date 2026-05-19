#!/usr/bin/env bash
# pilot-start.sh — full Pilot stack launcher
#
# Stops old processes, starts Pilot server + Vite UI, prints URLs.
# For remote iPhone testing: ensure Tailscale is running on this machine.
#
# Env vars (all optional — defaults below):
#   PILOT_PORT        Pilot server port (default 3201)
#   VITE_PORT         Vite dev server port (default 5173)
#   OPENCODE_URL      Upstream OpenCode URL (default http://100.81.83.98:4096)
#   SKIP_UI           Set to 1 to skip Vite dev server
#   N9ROUTER_API_KEY  n9router API key (optional, read from .env if not set)
#
# Usage:
#   scripts/pilot-start.sh              # default ports + IPs
#   PILOT_PORT=4000 scripts/pilot-start.sh
#   SKIP_UI=1 scripts/pilot-start.sh    # server only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Config ──
PILOT_PORT="${PILOT_PORT:-3201}"
VITE_PORT="${VITE_PORT:-5173}"
OPENCODE_URL="${OPENCODE_URL:-http://100.81.83.98:4096}"

# Detect IPs
TAILSCALE_IP="${TAILSCALE_IP:-}"
if [ -z "$TAILSCALE_IP" ] && command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
fi
[ -z "$TAILSCALE_IP" ] && TAILSCALE_IP="100.81.83.98"

LAN_IP="${LAN_IP:-}"
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
fi

echo ""
echo "=== Pilot Full Stack Launcher ==="
echo "Root:          $ROOT"
echo "Server port:   $PILOT_PORT"
echo "Vite port:     $VITE_PORT"
echo "OpenCode:      $OPENCODE_URL"
echo "Tailscale IP:  $TAILSCALE_IP"
echo "LAN IP:        $LAN_IP"
echo ""

# ── Step 1: Stop old processes ──
echo "--- Stopping old processes ---"
"$ROOT/scripts/pilot-stop.sh"
echo ""

# ── Step 2: Build shared (if needed) ──
if [ ! -f "$ROOT/shared/dist/index.js" ]; then
  echo "--- Building shared package ---"
  npm run build -w shared --prefix "$ROOT"
fi

# ── Step 3: Build server (if no dist) ──
if [ ! -f "$ROOT/server/dist/cli.js" ]; then
  echo "--- Building server ---"
  npm run build -w server --prefix "$ROOT"
fi

# ── Step 4: Start Pilot server ──
echo "--- Starting Pilot server on :$PILOT_PORT ---"
env \
  PORT="$PILOT_PORT" \
  OPENCODE_URL="$OPENCODE_URL" \
  N9ROUTER_API_KEY="${N9ROUTER_API_KEY:-$(grep N9ROUTER_API_KEY "$ROOT/.env" 2>/dev/null | cut -d= -f2-)}" \
  CORS_ORIGINS="http://localhost:$VITE_PORT,http://$TAILSCALE_IP:$VITE_PORT,http://$LAN_IP:$VITE_PORT,http://localhost:$PILOT_PORT,http://$TAILSCALE_IP:$PILOT_PORT,http://$LAN_IP:$PILOT_PORT" \
  node "$ROOT/server/dist/cli.js" \
    --port "$PILOT_PORT" \
  &>"$ROOT/server.log" &
SERVER_PID=$!
echo "  PID: $SERVER_PID"

# Wait for server to be ready
for i in $(seq 1 15); do
  if curl -sf "http://localhost:$PILOT_PORT/health" >/dev/null 2>&1; then
    echo "  ✓ Server ready"
    break
  fi
  sleep 1
done

# ── Step 5: Start Vite dev server (unless skipped) ──
if [ "${SKIP_UI:-0}" != "1" ]; then
  echo "--- Starting Vite UI on :$VITE_PORT ---"
  cd "$ROOT/ui"
  env \
    PROXY_TARGET="http://localhost:$PILOT_PORT" \
    npx vite --host 0.0.0.0 --port "$VITE_PORT" \
    &>"$ROOT/ui.log" &
  VITE_PID=$!
  echo "  PID: $VITE_PID"
  cd "$ROOT"

  for i in $(seq 1 10); do
    if curl -sf "http://localhost:$VITE_PORT" >/dev/null 2>&1; then
      echo "  ✓ Vite ready"
      break
    fi
    sleep 1
  done
fi

# ── URLs ──
echo ""
echo "══════════════════════════════════════════"
echo "  Pilot is running"
echo "══════════════════════════════════════════"
echo ""
echo "  UI (built):  http://$TAILSCALE_IP:$PILOT_PORT/   (server + UI)"
echo "  UI (dev):    http://$TAILSCALE_IP:$VITE_PORT/   (HMR + proxy)"
if [ "${SKIP_UI:-0}" != "1" ]; then
  echo "  Local:       http://localhost:$VITE_PORT/"
fi
echo "  API:         http://$TAILSCALE_IP:$PILOT_PORT/health"
echo "  OpenCode:    $OPENCODE_URL"
echo ""
echo "  Stop:        scripts/pilot-stop.sh"
echo "══════════════════════════════════════════"
echo ""

# ── Verify ──
echo "--- Quick health check ---"
curl -sf "http://localhost:$PILOT_PORT/health" && echo "  ✓ Pilot healthy" || echo "  ⚠ Pilot not responding"
if [ "${SKIP_UI:-0}" != "1" ]; then
  curl -sf "http://localhost:$VITE_PORT" >/dev/null 2>&1 && echo "  ✓ Vite responding" || echo "  ⚠ Vite not responding"
fi
