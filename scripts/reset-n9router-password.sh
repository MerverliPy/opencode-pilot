#!/usr/bin/env bash
# reset-n9router-password.sh
#
# Reset the n9router admin dashboard password.
#
# The password is stored as a bcrypt hash. This script generates a new
# hash, updates the running container's db.json, restarts the container,
# and verifies the new password works.
#
# Usage:
#   ./scripts/reset-n9router-password.sh              # prompts interactively
#   ./scripts/reset-n9router-password.sh <new_password>  # non-interactive
#
# Requirements: python3 with bcrypt module, docker, curl

set -euo pipefail

N9ROUTER_DB="${N9ROUTER_DB:-$HOME/.n9router/db.json}"
N9ROUTER_CONTAINER="${N9ROUTER_CONTAINER:-n9router}"
N9ROUTER_URL="${N9ROUTER_URL:-http://100.81.83.98:20128}"

PASS=0
FAIL=0

green() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
red()   { printf "  \033[31m✗\033[0m %s\n" "$1"; }
fail()  { FAIL=$((FAIL + 1)); red "$1"; }
pass()  { PASS=$((PASS + 1)); green "$1"; }
info()  { printf "  \033[34mℹ\033[0m  %s\n" "$1"; }

# ─── Preflight checks ────────────────────────────────────────────────
echo "=== n9router Password Reset ==="
echo ""

if ! command -v python3 &>/dev/null; then
  fail "python3 is required"
  exit 1
fi

if ! python3 -c "import bcrypt" 2>/dev/null; then
  fail "python3 bcrypt module is required (pip install bcrypt)"
  exit 1
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$N9ROUTER_CONTAINER"; then
  fail "Container '$N9ROUTER_CONTAINER' is not running"
  exit 1
fi

# ─── Get new password ────────────────────────────────────────────────
if [ $# -ge 1 ]; then
  NEW_PASSWORD="$1"
else
  echo ""
  read -r -s -p "  Enter new n9router admin password: " NEW_PASSWORD
  echo ""
  read -r -s -p "  Confirm password: " CONFIRM_PASSWORD
  echo ""
  if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    fail "Passwords do not match"
    exit 1
  fi
fi

if [ -z "$NEW_PASSWORD" ]; then
  fail "Password cannot be empty"
  exit 1
fi

# Write password to temp file (safe for special chars)
PASSWORD_FILE=$(mktemp)
trap 'rm -f "$PASSWORD_FILE"' EXIT
printf "%s" "$NEW_PASSWORD" > "$PASSWORD_FILE"

# ─── Step 1: Generate bcrypt hash ────────────────────────────────────
echo ""
echo "1. Generating bcrypt hash..."
HASH=$(python3 /dev/stdin "$PASSWORD_FILE" << 'PYEOF'
import bcrypt, sys
with open(sys.argv[1], 'rb') as f:
    pw = f.read()
salt = bcrypt.gensalt(rounds=10, prefix=b'2b')
hashed = bcrypt.hashpw(pw, salt)
print(hashed.decode())
PYEOF
)

if [ -z "$HASH" ] || ! echo "$HASH" | grep -q '^\$2b\$'; then
  fail "Failed to generate bcrypt hash"
  exit 1
fi
pass "Bcrypt hash generated"
rm -f "$PASSWORD_FILE"

# ─── Step 2: Update db.json in the container ─────────────────────────
echo "2. Reading db.json from container..."
# Read current db.json from the container volume
docker exec "$N9ROUTER_CONTAINER" cat /data/db.json > "$N9ROUTER_DB" 2>/dev/null || {
  fail "Failed to read db.json from container"
  exit 1
}

# Backup
BACKUP="${N9ROUTER_DB}.bak.$(date +%s)"
cp "$N9ROUTER_DB" "$BACKUP"
info "Backup saved to $BACKUP"

# Write new hash
python3 /dev/stdin "$N9ROUTER_DB" "$HASH" << 'PYEOF'
import json, sys
db_path, new_hash = sys.argv[1], sys.argv[2]
with open(db_path, 'r') as f:
    data = json.load(f)
data.setdefault('settings', {})['password'] = new_hash
with open(db_path, 'w') as f:
    json.dump(data, f, indent=2)
print("  Password hash written to settings.password")
PYEOF

# Copy back into container
docker cp "$N9ROUTER_DB" "$N9ROUTER_CONTAINER:/data/db.json" > /dev/null 2>&1 || {
  fail "Failed to copy db.json into container"
  exit 1
}

# Verify inside container
docker exec "$N9ROUTER_CONTAINER" cat /data/db.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
h = d.get('settings', {}).get('password', '')
print(f'  Verified in container: {h[:25]}...' if h else '  WARNING: no password hash in container')
" 2>/dev/null

pass "db.json updated in container"

# ─── Step 3: Restart container ───────────────────────────────────────
echo "3. Restarting n9router container..."
docker restart "$N9ROUTER_CONTAINER" > /dev/null 2>&1 || {
  fail "Failed to restart container"
  exit 1
}
pass "Container restarted"

# ─── Step 4: Wait for healthy ────────────────────────────────────────
echo "4. Waiting for container to become healthy..."
HEALTHY=false
for i in $(seq 1 15); do
  sleep 2
  STATUS=$(docker ps --filter "name=$N9ROUTER_CONTAINER" --format "{{.Status}}" 2>/dev/null || echo "")
  echo "    [$i] $STATUS"
  if echo "$STATUS" | grep -q "healthy"; then
    HEALTHY=true
    pass "Container healthy"
    break
  fi
done

if [ "$HEALTHY" = false ]; then
  fail "Container did not become healthy within 30s"
  exit 1
fi

# ─── Step 5: Verify new password works ───────────────────────────────
echo "5. Verifying new password..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  "$N9ROUTER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"'"$NEW_PASSWORD"'"}' 2>&1)

if [ "$HTTP" = "200" ]; then
  pass "Login successful (HTTP $HTTP)"
elif [ "$HTTP" = "401" ]; then
  fail "Login rejected (HTTP $HTTP)"
  exit 1
else
  fail "Unexpected response (HTTP $HTTP)"
  exit 1
fi

# ─── Summary ─────────────────────────────────────────────────────────
echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
echo ""
echo "Admin dashboard: $N9ROUTER_URL/dashboard"
echo "Login with the new password."
echo ""
echo "Backup: $BACKUP"
echo "To revert: docker cp '$BACKUP' $N9ROUTER_CONTAINER:/data/db.json && docker restart $N9ROUTER_CONTAINER"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
