#!/usr/bin/env bash
# rotate-n9router-key.sh
#
# Rotate the n9router API key in all local config files, restart the
# n9router Docker container, and verify the new key works.
#
# Usage:
#   ./scripts/rotate-n9router-key.sh                            # generate a new key
#   ./scripts/rotate-n9router-key.sh <new_key>                  # use a specific key
#   ./scripts/rotate-n9router-key.sh --dry-run                  # preview changes only
#
# Requirements: python3, docker, curl, openssl
#
# Files updated:
#   docker/.env            ← N9ROUTER_API_KEY
#   opencode.json          ← provider.n9router.options.apiKey

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_ENV="$ROOT/docker/.env"
OPENCODE_JSON="$ROOT/opencode.json"
VERIFY_SCRIPT="$ROOT/scripts/verify-key-rotation.sh"
COMPOSE_FILE="$ROOT/docker/docker-compose.yml"

PASS=0
FAIL=0

green() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
red()   { printf "  \033[31m✗\033[0m %s\n" "$1"; }
fail()  { FAIL=$((FAIL + 1)); red "$1"; }
pass()  { PASS=$((PASS + 1)); green "$1"; }
info()  { printf "  \033[34mℹ\033[0m  %s\n" "$1"; }

NEW_KEY=""
DRY_RUN=false

# ─── Parse args ────────────────────────────────────────────────────────
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  elif [ -z "$NEW_KEY" ]; then
    NEW_KEY="$arg"
  fi
done

# ─── Preflight checks ──────────────────────────────────────────────────
echo "=== n9router Key Rotation ==="
echo ""
info "Project root: $ROOT"
echo ""

if ! command -v python3 &>/dev/null; then
  fail "python3 is required"
  exit 1
fi

if ! command -v openssl &>/dev/null; then
  fail "openssl is required"
  exit 1
fi

if [ "$DRY_RUN" = false ]; then
  if ! command -v docker &>/dev/null; then
    fail "docker is required"
    exit 1
  fi
fi

# Check that config files exist
for f in "$DOCKER_ENV" "$OPENCODE_JSON"; do
  if [ ! -f "$f" ]; then
    fail "Missing file: $f"
    exit 1
  fi
done

# ─── Step 1: Generate / read new key ───────────────────────────────────
echo "1. Key"
if [ -z "$NEW_KEY" ]; then
  NEW_KEY="n9r_$(openssl rand -hex 32)"
  info "Generated new key: $NEW_KEY"
else
  info "Using provided key: $NEW_KEY"
fi

# Validate format
if ! echo "$NEW_KEY" | grep -qE '^n9r_[a-f0-9]{64}$'; then
  info "Warning: key format is unusual (expected n9r_<64 hex chars>)"
fi

# Read old key from docker/.env for verification
OLD_KEY=""
if [ -f "$DOCKER_ENV" ]; then
  OLD_KEY=$(grep -oP '^N9ROUTER_API_KEY=\K.*' "$DOCKER_ENV" 2>/dev/null || true)
fi
if [ -z "$OLD_KEY" ]; then
  OLD_KEY=$(grep -oP '"apiKey":\s*"\K[^"]+' "$OPENCODE_JSON" 2>/dev/null || true)
fi
if [ -n "$OLD_KEY" ]; then
  info "Current key: ${OLD_KEY:0:20}..."
else
  info "No current key found (fresh setup)"
fi

pass "Key ready"

# ─── Step 2: Update docker/.env ────────────────────────────────────────
echo "2. Updating docker/.env..."
if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] Would update N9ROUTER_API_KEY=$NEW_KEY in $DOCKER_ENV"
else
  if grep -q '^N9ROUTER_API_KEY=' "$DOCKER_ENV" 2>/dev/null; then
    # Update existing line
    python3 -c "
import re
with open('$DOCKER_ENV', 'r') as f:
    content = f.read()
content = re.sub(r'^N9ROUTER_API_KEY=.*', 'N9ROUTER_API_KEY=$NEW_KEY', content, flags=re.MULTILINE)
with open('$DOCKER_ENV', 'w') as f:
    f.write(content)
" 2>/dev/null || {
      # Fallback: sed if python3 fails
      sed -i "s|^N9ROUTER_API_KEY=.*|N9ROUTER_API_KEY=$NEW_KEY|" "$DOCKER_ENV"
    }
  else
    echo "N9ROUTER_API_KEY=$NEW_KEY" >> "$DOCKER_ENV"
  fi
  # Verify
  UPDATED=$(grep -oP '^N9ROUTER_API_KEY=\K.*' "$DOCKER_ENV" 2>/dev/null || true)
  if [ "$UPDATED" = "$NEW_KEY" ]; then
    pass "docker/.env updated"
  else
    fail "docker/.env NOT updated (got: ${UPDATED:0:20}...)"
  fi
fi

# ─── Step 3: Update opencode.json ──────────────────────────────────────
echo "3. Updating opencode.json..."
if [ "$DRY_RUN" = true ]; then
  info "[DRY RUN] Would update apiKey in $OPENCODE_JSON"
else
  python3 -c "
import json
with open('$OPENCODE_JSON', 'r') as f:
    data = json.load(f)
if 'provider' in data and 'n9router' in data['provider'] and 'options' in data['provider']['n9router']:
    data['provider']['n9router']['options']['apiKey'] = '$NEW_KEY'
    with open('$OPENCODE_JSON', 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    print('Updated')
else:
    print('ERROR: provider.n9router.options not found in opencode.json')
    exit(1)
" 2>&1
  # Verify
  VERIFIED=$(python3 -c "
import json
with open('$OPENCODE_JSON') as f:
    data = json.load(f)
print(data.get('provider', {}).get('n9router', {}).get('options', {}).get('apiKey', 'NOT_FOUND'))
" 2>&1)
  if [ "$VERIFIED" = "$NEW_KEY" ]; then
    pass "opencode.json updated"
  else
    fail "opencode.json NOT updated (got: ${VERIFIED:0:20}...)"
  fi
fi

# ─── Step 4: Restart n9router Docker container ────────────────────────
if [ "$DRY_RUN" = false ]; then
  echo "4. Restarting n9router container..."
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^n9router$'; then
    docker compose -f "$COMPOSE_FILE" up -d --no-deps n9router 2>&1 || docker restart n9router 2>&1 || {
      fail "Failed to restart n9router container"
      info "Try: docker compose -f $COMPOSE_FILE up -d"
    }
    pass "n9router restart initiated"

    # Wait for healthy
    echo "   Waiting for container to become healthy..."
    HEALTHY=false
    for i in $(seq 1 15); do
      sleep 2
      STATUS=$(docker ps --filter "name=n9router" --format "{{.Status}}" 2>/dev/null || echo "")
      if echo "$STATUS" | grep -q "healthy"; then
        HEALTHY=true
        pass "Container healthy"
        break
      fi
    done
    if [ "$HEALTHY" = false ]; then
      fail "Container did not become healthy within 30s"
    fi
  else
    info "n9router container not running — skipping restart"
  fi
else
  echo "4. Restart n9router container — SKIPPED (--dry-run)"
fi

# ─── Step 5: Verify new key ────────────────────────────────────────────
if [ "$DRY_RUN" = false ] && [ -f "$VERIFY_SCRIPT" ]; then
  echo "5. Running key verification..."
  bash "$VERIFY_SCRIPT" "" "$NEW_KEY" "$OLD_KEY" 2>&1 || {
    fail "Key verification failed"
  }
elif [ "$DRY_RUN" = false ]; then
  echo "5. Key verification — SKIPPED (verify-key-rotation.sh not found)"
else
  echo "5. Key verification — SKIPPED (--dry-run)"
fi

# ─── Summary ───────────────────────────────────────────────────────────
echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "New API key: $NEW_KEY"
  echo ""
  echo "Files updated:"
  echo "  - $DOCKER_ENV"
  echo "  - $OPENCODE_JSON"
  echo ""
  echo "OpenCode may need to be restarted to pick up the new key."
fi

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
