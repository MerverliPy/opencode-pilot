#!/usr/bin/env bash
set -e

PORT="${PORT:-3002}"
OPENCODE_PORT="${OPENCODE_PORT:-20128}"  # n9router port (was 4096)
TAILSCALE_IP="${TAILSCALE_IP:-100.81.83.98}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Pilot Startup ==="
echo "Root dir:      $ROOT"
echo "Server port:   $PORT"
echo "n9router port: $OPENCODE_PORT"
echo "Tailscale IP:  $TAILSCALE_IP"

# Kill existing
echo "Cleaning up old processes..."
pkill -f "tsx.*src/cli.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start Pilot server (proxies to n9router at OPENCODE_PORT)
CORS_ORIGINS="http://localhost:5173,http://$TAILSCALE_IP:5173,http://localhost:$PORT,http://$TAILSCALE_IP:$PORT" \
  npx tsx "$ROOT/server/src/cli.ts" \
  --port "$PORT" \
  --opencode-url "http://localhost:$OPENCODE_PORT" \
  &>/tmp/pilot-server.log &
echo "Pilot server starting on :$PORT..."

sleep 2

# Start Vite dev server
cd "$ROOT/ui"
PROXY_TARGET="http://localhost:$PORT" \
  npx vite --host 0.0.0.0 \
  &>/tmp/pilot-ui.log &
echo "Vite UI starting on :5173..."

sleep 3

echo ""
echo "=== Ready ==="
echo "UI:       http://localhost:5173"
echo "          http://$TAILSCALE_IP:5173 (Tailscale)"
echo "API:      http://$TAILSCALE_IP:$PORT (configure in Settings)"
echo "n9router: http://$TAILSCALE_IP:$OPENCODE_PORT (model routing)"
echo ""
echo "Stop: pkill -f tsx.*src/cli.ts; pkill -f vite"