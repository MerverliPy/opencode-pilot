#!/usr/bin/env bash
# opencode-audit-v1.1.sh
# Same purpose as v1.0, but avoids dumping ~/.opencode/node_modules bundles into the report.

set -uo pipefail

REPO="${1:-$(pwd)}"
REPORT_DIR="${HOME}/opencode-audit-reports"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="${REPORT_DIR}/opencode-audit-v1.1-${STAMP}.txt"
mkdir -p "$REPORT_DIR"

INFO=0; WARN=0; FAIL=0

log(){ printf "%s\n" "$*" | tee -a "$REPORT" >/dev/null; }
ok(){ INFO=$((INFO+1)); log "[OK]   $1"; }
warn(){ WARN=$((WARN+1)); log "[WARN] $1"; }
fail(){ FAIL=$((FAIL+1)); log "[FAIL] $1"; }
section(){ log ""; log "================================================================================"; log "$1"; log "================================================================================"; }
have(){ command -v "$1" >/dev/null 2>&1; }

rg_safe() {
  local pattern="$1"; shift
  if have rg; then
    rg -n --hidden --no-heading --color never \
      -g '!**/node_modules/**' \
      -g '!**/.git/**' \
      -g '!**/dist/**' \
      -g '!**/build/**' \
      -g '!**/.next/**' \
      -g '!**/coverage/**' \
      "$pattern" "$@" 2>/dev/null || true
  else
    grep -RInE "$pattern" "$@" 2>/dev/null | \
      grep -Ev '/(node_modules|\.git|dist|build|\.next|coverage)/' || true
  fi
}

{
  echo "OpenCode Audit Report v1.1"
  echo "Generated: $(date)"
  echo "Repo argument: $REPO"
  echo "Report path: $REPORT"
} > "$REPORT"

if [ ! -d "$REPO" ]; then
  fail "Repo path does not exist: $REPO"
  exit 2
fi

REPO="$(cd "$REPO" && pwd -P)"
paths=()
[ -d "$REPO/.opencode" ] && paths+=("$REPO/.opencode")
[ -d "$HOME/.opencode" ] && paths+=("$HOME/.opencode")
[ -d "$HOME/.claude" ] && paths+=("$HOME/.claude")

section "1. Terminal"
log "TERM: ${TERM:-unset}"
log "TMUX: ${TMUX:+yes}"
if stty size >/dev/null 2>&1; then
  read -r rows cols < <(stty size)
  log "Terminal size: ${rows} rows x ${cols} cols"
  [ "$rows" -lt 24 ] && warn "Terminal has fewer than 24 rows." || ok "Terminal row count is acceptable."
  [ "$cols" -lt 80 ] && warn "Terminal has fewer than 80 columns." || ok "Terminal column count is acceptable."
fi

section "2. High-signal noisy OpenCode plugin findings"
for p in "${paths[@]}"; do log "Scanning: $p"; done

matches="$(rg_safe 'console\.(log|warn|error).*(\[Hook\]|\[SessionStart\]|\[SessionEnd\]|\[PreCompact\]|Formatted:)' "${paths[@]}")"
if [ -n "$matches" ]; then
  warn "Hook/session console output found"
  printf "%s\n" "$matches" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
else
  ok "No high-signal hook/session console output found."
fi

matches="$(rg_safe 'npx[[:space:]]+prettier|npx[[:space:]]+eslint|npx[[:space:]]+tsx|npx[[:space:]]+playwright|pnpm[[:space:]]+dlx|bunx' "${paths[@]}")"
if [ -n "$matches" ]; then
  warn "Potential interactive package-exec commands found"
  printf "%s\n" "$matches" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
else
  ok "No obvious interactive package-exec commands found."
fi

section "3. JSON validation"
json_files="$(find "$REPO" "$HOME/.opencode" "$HOME/.claude" -maxdepth 4 -type f -name '*.json' \
  ! -path '*/node_modules/*' ! -path '*/.git/*' 2>/dev/null | sort -u)"
if [ -z "$json_files" ]; then
  warn "No JSON files found."
else
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if have jq; then
      jq empty "$f" >/dev/null 2>&1 && ok "Valid JSON: $f" || fail "Invalid JSON: $f"
    elif have python3; then
      python3 - "$f" >/dev/null 2>&1 <<'PY' && ok "Valid JSON: $f" || fail "Invalid JSON: $f"
import json, sys
json.load(open(sys.argv[1], "rb"))
PY
    fi
  done <<< "$json_files"
fi

section "4. Ignore coverage"
if [ -f "$REPO/.gitignore" ]; then
  ok "Found: $REPO/.gitignore"
  for pat in "build/" "coverage/" ".next/" ".nuxt/" ".cache/" "*.min.js" "*.bundle.js" "*-bundle.js" "*.map"; do
    grep -Fxq "$pat" "$REPO/.gitignore" || warn "Missing .gitignore pattern: $pat"
  done
else
  warn "Missing repo .gitignore"
fi

section "5. Generated bundles outside ignored dirs"
bundles="$(find "$REPO" -type f \( -name '*.min.js' -o -name '*.bundle.js' -o -name '*-bundle.js' -o -name '*.map' \) \
  ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' ! -path '*/build/*' ! -path '*/.next/*' 2>/dev/null | sort)"
if [ -n "$bundles" ]; then
  warn "Generated/minified files found outside ignored dirs"
  printf "%s\n" "$bundles" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
else
  ok "No generated/minified files found outside ignored dirs."
fi

section "6. Summary"
log "OK/info count: $INFO"
log "Warnings: $WARN"
log "Failures: $FAIL"
[ "$FAIL" -gt 0 ] && log "Result: FAILURES FOUND" || { [ "$WARN" -gt 0 ] && log "Result: WARNINGS FOUND" || log "Result: CLEAN"; }

printf "Audit v1.1 complete. Report: %s\n" "$REPORT"
