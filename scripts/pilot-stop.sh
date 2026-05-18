#!/usr/bin/env bash
# pilot-stop.sh — kill any running Pilot server + Vite UI processes
set -e

echo "=== Pilot Stop ==="

stopped=0

# Kill by port
for port in 3201 5173; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing process(es) on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
    stopped=1
  fi
done

# Kill by process name (fallback)
pkill -f "pilot.*cli.js" 2>/dev/null || true
pkill -f "pilot.*cli.ts" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

sleep 1

# Verify
remaining=""
for port in 3201 5173; do
  if lsof -ti :$port >/dev/null 2>&1; then
    remaining="$remaining $port"
  fi
done

if [ -n "$remaining" ]; then
  echo "⚠ Ports still in use:$remaining"
else
  echo "✓ All Pilot processes stopped"
fi
