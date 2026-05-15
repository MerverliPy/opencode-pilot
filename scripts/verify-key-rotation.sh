#!/usr/bin/env bash
# verify-key-rotation.sh
#
# Verify n9router API key rotation by testing against the chat completions
# endpoint (the only endpoint that validates user API keys).
#
# Usage:
#   export N9ROUTER_URL="http://localhost:20128/v1"
#   export NEW_KEY="sk-..."
#   export OLD_KEY="sk-..."
#   ./scripts/verify-key-rotation.sh
#
# Or pass as arguments:
#   ./scripts/verify-key-rotation.sh <n9router_url> <new_key> <old_key>
#
# Exit code: 0 = all checks pass, 1 = any check fails

set -euo pipefail

BASE_URL="${1:-${N9ROUTER_URL:-http://localhost:20128/v1}}"
NEW_KEY="${2:-${NEW_KEY:-}}"
OLD_KEY="${3:-${OLD_KEY:-}}"
MODEL="${MODEL:-ds/deepseek-v4-flash}"

PASS=0
FAIL=0

green() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
red()   { printf "  \033[31m✗\033[0m %s\n" "$1"; }
fail()  { FAIL=$((FAIL + 1)); red "$1"; }
pass()  { PASS=$((PASS + 1)); green "$1"; }

echo "=== n9router Key Rotation Verification ==="
echo "  URL:   $BASE_URL"
echo "  Model: $MODEL"
echo ""

# Build common curl args
CURL_ARGS=(-s -w "\nHTTP:%{http_code}" -o /dev/null)

# ─── Health check ────────────────────────────────────────────────────
echo "1. Basic connectivity"
if curl -sf "$(echo "$BASE_URL" | sed 's|/v1$||')/api/health" > /dev/null 2>&1; then
  pass "n9router is reachable"
else
  fail "n9router is NOT reachable at $BASE_URL"
fi

# ─── No auth → 401 ───────────────────────────────────────────────────
echo "2. No auth header"
HTTP=$(curl "${CURL_ARGS[@]}" "$BASE_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":1}" 2>&1 | tail -1 | cut -d: -f2)

if [ "$HTTP" = "401" ]; then
  pass "No auth → HTTP $HTTP (expected 401)"
else
  fail "No auth → HTTP $HTTP (expected 401)"
fi

# ─── Old/revoked key → 401 ───────────────────────────────────────────
if [ -n "$OLD_KEY" ]; then
  echo "3. Old/revoked key"
  HTTP=$(curl "${CURL_ARGS[@]}" "$BASE_URL/chat/completions" \
    -H "Authorization: Bearer $OLD_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":1}" 2>&1 | tail -1 | cut -d: -f2)

  if [ "$HTTP" = "401" ]; then
    pass "Old key → HTTP $HTTP (expected 401)"
  else
    fail "Old key → HTTP $HTTP (expected 401)"
  fi
else
  echo "3. Old/revoked key — SKIPPED (set OLD_KEY)"
fi

# ─── New key → 200 ───────────────────────────────────────────────────
if [ -n "$NEW_KEY" ]; then
  echo "4. New key"
  HTTP=$(curl "${CURL_ARGS[@]}" "$BASE_URL/chat/completions" \
    -H "Authorization: Bearer $NEW_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":1}" 2>&1 | tail -1 | cut -d: -f2)

  if [ "$HTTP" = "200" ]; then
    pass "New key → HTTP $HTTP (expected 200)"
  else
    fail "New key → HTTP $HTTP (expected 200)"
  fi
else
  echo "4. New key — SKIPPED (set NEW_KEY)"
fi

# ─── Summary ─────────────────────────────────────────────────────────
echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
