#!/usr/bin/env bash
# opencode-audit.sh
# Audit OpenCode/.opencode configs for noisy hooks, terminal/TUI overlap risks,
# interactive package prompts, and generated-bundle leakage.
#
# Usage:
#   bash opencode-audit.sh [repo_path]
#   chmod +x opencode-audit.sh && ./opencode-audit.sh [repo_path]
#
# Examples:
#   ./opencode-audit.sh /home/calvin/pilot
#   ./opencode-audit.sh

set -uo pipefail

VERSION="1.0.0"
REPO="${1:-$(pwd)}"
HOME_OPENCODE="${HOME}/.opencode"
REPORT_DIR="${HOME}/opencode-audit-reports"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="${REPORT_DIR}/opencode-audit-${STAMP}.txt"

mkdir -p "$REPORT_DIR"

# ---------- formatting ----------
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  RED="$(printf '\033[31m')"
  YELLOW="$(printf '\033[33m')"
  GREEN="$(printf '\033[32m')"
  BLUE="$(printf '\033[34m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""; DIM=""; RED=""; YELLOW=""; GREEN=""; BLUE=""; RESET=""
fi

INFO=0
WARN=0
FAIL=0

log() {
  printf "%s\n" "$*" | tee -a "$REPORT" >/dev/null
}

section() {
  log ""
  log "================================================================================"
  log "$1"
  log "================================================================================"
}

ok() {
  INFO=$((INFO+1))
  log "[OK]   $1"
}

warn() {
  WARN=$((WARN+1))
  log "[WARN] $1"
}

fail() {
  FAIL=$((FAIL+1))
  log "[FAIL] $1"
}

note() {
  log "       $1"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

safe_find() {
  # Usage: safe_find base args...
  local base="$1"; shift
  [ -d "$base" ] || return 0
  find "$base" "$@" 2>/dev/null || true
}

rg_like() {
  # Grep fallback. Usage: rg_like PATTERN PATH...
  local pattern="$1"; shift
  if have rg; then
    rg -n --hidden --no-heading --color never "$pattern" "$@" 2>/dev/null || true
  else
    grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
      --exclude-dir=.next --exclude-dir=coverage -E "$pattern" "$@" 2>/dev/null || true
  fi
}

json_check() {
  local file="$1"
  if have jq; then
    jq empty "$file" >/dev/null 2>&1
  elif have python3; then
    python3 - "$file" >/dev/null 2>&1 <<'PY'
import json, sys
with open(sys.argv[1], "rb") as f:
    json.load(f)
PY
  else
    return 2
  fi
}

json_minify_oneline_score() {
  # Flags very long one-line JSON or JS-like config dumps.
  local file="$1"
  local max_line
  max_line="$(awk '{ if (length($0)>m) m=length($0) } END { print m+0 }' "$file" 2>/dev/null || echo 0)"
  printf "%s" "$max_line"
}

is_probably_generated_bundle() {
  local file="$1"

  # Cheap heuristics for minified/vendor bundles likely to pollute terminal if printed.
  # Return 0 if suspicious.
  local size maxline hits
  size="$(wc -c <"$file" 2>/dev/null || echo 0)"
  maxline="$(json_minify_oneline_score "$file")"
  hits="$(grep -Eoc "__webpack_require__|sourceMappingURL|webpackJsonp|function\(.*\)\{|module\.exports|exports\." "$file" 2>/dev/null || true)"

  if [ "${size:-0}" -gt 500000 ] && [ "${maxline:-0}" -gt 2000 ]; then
    return 0
  fi
  if [ "${maxline:-0}" -gt 10000 ]; then
    return 0
  fi
  if [ "${hits:-0}" -ge 20 ] && [ "${size:-0}" -gt 200000 ]; then
    return 0
  fi
  return 1
}

print_match_block() {
  local title="$1"
  local content="$2"
  if [ -n "$content" ]; then
    warn "$title"
    printf "%s\n" "$content" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
  else
    ok "$title: none found"
  fi
}

# ---------- start ----------
{
  echo "OpenCode Audit Report"
  echo "Version: ${VERSION}"
  echo "Generated: $(date)"
  echo "Host: $(hostname 2>/dev/null || echo unknown)"
  echo "User: $(id -un 2>/dev/null || echo unknown)"
  echo "Repo argument: ${REPO}"
  echo "Home OpenCode dir: ${HOME_OPENCODE}"
  echo "Report path: ${REPORT}"
} > "$REPORT"

printf "%s\n" "${BOLD}OpenCode audit starting...${RESET}"
printf "Report: %s\n" "$REPORT"

# ---------- normalize paths ----------
if [ ! -d "$REPO" ]; then
  fail "Repo path does not exist: $REPO"
  note "Run as: bash opencode-audit.sh /home/calvin/pilot"
  printf "\nReport written to: %s\n" "$REPORT"
  exit 2
fi

REPO="$(cd "$REPO" && pwd -P)"
REPO_OPENCODE="${REPO}/.opencode"
REPO_CLAUDE="${REPO}/.claude"
HOME_CLAUDE="${HOME}/.claude"

AUDIT_DIRS=()
[ -d "$REPO_OPENCODE" ] && AUDIT_DIRS+=("$REPO_OPENCODE")
[ -d "$HOME_OPENCODE" ] && AUDIT_DIRS+=("$HOME_OPENCODE")
[ -d "$REPO_CLAUDE" ] && AUDIT_DIRS+=("$REPO_CLAUDE")
[ -d "$HOME_CLAUDE" ] && AUDIT_DIRS+=("$HOME_CLAUDE")

# ---------- system / terminal ----------
section "1. Terminal and TUI environment"

log "Repo: $REPO"
log "Shell: ${SHELL:-unknown}"
log "TERM: ${TERM:-unset}"
log "COLORTERM: ${COLORTERM:-unset}"
log "TMUX: ${TMUX:+yes}"
log "SSH: ${SSH_CONNECTION:+yes}"

if stty size >/dev/null 2>&1; then
  read -r LINES COLS < <(stty size)
  log "Terminal size: ${LINES} rows x ${COLS} cols"
  if [ "${LINES:-0}" -lt 24 ]; then
    warn "Terminal has fewer than 24 rows. Full-screen TUIs can overlap, especially with a mobile keyboard open."
  else
    ok "Terminal row count is acceptable."
  fi
  if [ "${COLS:-0}" -lt 80 ]; then
    warn "Terminal has fewer than 80 columns. Long model/status lines will wrap."
  else
    ok "Terminal column count is acceptable."
  fi
else
  warn "Could not read terminal size with stty."
fi

if [ -n "${TMUX:-}" ]; then
  ok "tmux detected."
  if have tmux; then
    tmux display-message -p "tmux client: #{client_width}x#{client_height}, pane: #{pane_width}x#{pane_height}, status: #{status}" \
      2>/dev/null | tee -a "$REPORT" >/dev/null || true
    STATUS="$(tmux show-options -gv status 2>/dev/null || true)"
    if [ "$STATUS" = "on" ]; then
      warn "tmux status bar is enabled. It reduces usable TUI height."
      note "Temporary test: tmux set -g status off"
    fi
  fi
fi

case "${TERM:-}" in
  dumb|unknown|"")
    fail "TERM is '${TERM:-unset}'. This can break TUI rendering."
    ;;
  xterm*|screen*|tmux*|alacritty*|foot*|wezterm*|linux)
    ok "TERM value looks usable."
    ;;
  *)
    warn "TERM value is uncommon: ${TERM:-unset}"
    ;;
esac

# ---------- directories ----------
section "2. OpenCode / Claude config directories"

if [ "${#AUDIT_DIRS[@]}" -eq 0 ]; then
  fail "No .opencode or .claude directories found in repo or home."
  note "Checked: $REPO_OPENCODE, $HOME_OPENCODE, $REPO_CLAUDE, $HOME_CLAUDE"
else
  ok "Found config directories:"
  for d in "${AUDIT_DIRS[@]}"; do
    note "$d"
  done
fi

# ---------- config inventory ----------
section "3. Config inventory"

for d in "${AUDIT_DIRS[@]}"; do
  log ""
  log "Files under $d:"
  safe_find "$d" -maxdepth 4 -type f \
    ! -path '*/node_modules/*' \
    ! -path '*/.git/*' \
    -printf '%p\t%k KB\n' | sort | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
done

# ---------- JSON syntax ----------
section "4. JSON syntax validation"

JSON_FILES=()
while IFS= read -r f; do JSON_FILES+=("$f"); done < <(
  for d in "${AUDIT_DIRS[@]}" "$REPO"; do
    [ -d "$d" ] || continue
    safe_find "$d" -maxdepth 4 -type f \( -name '*.json' -o -name '*.jsonc' \) \
      ! -path '*/node_modules/*' ! -path '*/.git/*'
  done | sort -u
)

if [ "${#JSON_FILES[@]}" -eq 0 ]; then
  warn "No JSON/JSONC files found to validate."
else
  for f in "${JSON_FILES[@]}"; do
    case "$f" in
      *.jsonc)
        warn "Skipping JSONC strict validation: $f"
        ;;
      *)
        if json_check "$f"; then
          ok "Valid JSON: $f"
          maxline="$(json_minify_oneline_score "$f")"
          if [ "${maxline:-0}" -gt 5000 ]; then
            warn "Very long line in JSON config: $f"
            note "Max line length: $maxline"
          fi
        else
          fail "Invalid JSON: $f"
        fi
        ;;
    esac
  done
fi

# ---------- noisy hooks / scripts ----------
section "5. Noisy hook and command-output risks"

SEARCH_PATHS=()
[ -d "$REPO_OPENCODE" ] && SEARCH_PATHS+=("$REPO_OPENCODE")
[ -d "$HOME_OPENCODE" ] && SEARCH_PATHS+=("$HOME_OPENCODE")
[ -d "$REPO_CLAUDE" ] && SEARCH_PATHS+=("$REPO_CLAUDE")
[ -d "$HOME_CLAUDE" ] && SEARCH_PATHS+=("$HOME_CLAUDE")

if [ "${#SEARCH_PATHS[@]}" -eq 0 ]; then
  warn "No config paths to scan for hooks."
else
  matches="$(rg_like '(^|[;&|[:space:]])(echo|printf|cat|tee|less|more|head|tail|sed|awk|grep|rg|jq|node|python|python3|bun|deno|npx|npm|pnpm|yarn)([[:space:]]|$)' "${SEARCH_PATHS[@]}")"
  print_match_block "Commands that can print into the TUI" "$matches"

  matches="$(rg_like 'Formatted:|\[Hook\]|console\.log|process\.stdout|process\.stderr|print\(|puts\(|System\.out' "${SEARCH_PATHS[@]}")"
  print_match_block "Explicit logging/status output in configs or hooks" "$matches"

  matches="$(rg_like 'prettier|eslint|biome|rome|ruff|black|gofmt|go fmt|cargo fmt|stylua|shfmt' "${SEARCH_PATHS[@]}")"
  print_match_block "Formatter/linter commands found" "$matches"

  matches="$(rg_like 'npx[[:space:]]+[^-]|npm[[:space:]]+exec|pnpm[[:space:]]+dlx|yarn[[:space:]]+dlx|bunx' "${SEARCH_PATHS[@]}")"
  print_match_block "Commands that may auto-install or prompt interactively" "$matches"

  matches="$(rg_like '>/dev/null|2>/dev/null|>>/tmp|>>[[:space:]]*[^[:space:]]+\.log|--silent|--quiet|--yes|--no-install|CI=1' "${SEARCH_PATHS[@]}")"
  if [ -n "$matches" ]; then
    ok "Found some output-suppression/noninteractive patterns:"
    printf "%s\n" "$matches" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
  else
    warn "No output-suppression patterns found in hook/config files."
    note "Hooks should usually redirect formatter output to a log file or /dev/null."
  fi
fi

# ---------- generated bundle risks ----------
section "6. Generated bundle / huge-file leakage risks"

BUNDLE_PATTERNS='*.min.js|*.bundle.js|*-bundle.js|bundle.*.js|swagger-ui*.js|*.map'
BUNDLE_FILES=()

while IFS= read -r f; do BUNDLE_FILES+=("$f"); done < <(
  safe_find "$REPO" -type f \
    \( -name '*.min.js' -o -name '*.bundle.js' -o -name '*-bundle.js' -o -name 'bundle.*.js' -o -name 'swagger-ui*.js' -o -name '*.map' \) \
    ! -path '*/node_modules/*' ! -path '*/.git/*' 2>/dev/null | sort
)

if [ "${#BUNDLE_FILES[@]}" -eq 0 ]; then
  ok "No obvious generated JS bundle/source-map files found outside node_modules."
else
  warn "Generated/minified files found outside node_modules:"
  for f in "${BUNDLE_FILES[@]}"; do
    size="$(wc -c <"$f" 2>/dev/null || echo 0)"
    maxline="$(json_minify_oneline_score "$f")"
    note "$f (${size} bytes, max line ${maxline})"
  done
  note "Agents/hooks should not cat/read these into the terminal."
fi

SUSPICIOUS_LARGE=()
while IFS= read -r f; do
  if is_probably_generated_bundle "$f"; then
    SUSPICIOUS_LARGE+=("$f")
  fi
done < <(
  safe_find "$REPO" -type f \
    \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' -o -name '*.json' -o -name '*.yaml' -o -name '*.yml' \) \
    ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/.next/cache/*' 2>/dev/null | sort
)

if [ "${#SUSPICIOUS_LARGE[@]}" -gt 0 ]; then
  warn "Suspicious large/minified files that could cause terminal dumps:"
  for f in "${SUSPICIOUS_LARGE[@]}"; do
    note "$f"
  done
else
  ok "No suspicious large/minified source files detected outside ignored directories."
fi

# ---------- ignore files ----------
section "7. Ignore coverage"

IGNORE_FILES=(
  "$REPO/.gitignore"
  "$REPO/.opencodeignore"
  "$REPO_OPENCODE/.ignore"
  "$REPO_OPENCODE/ignore"
)

RECOMMENDED_IGNORES=(
  "node_modules/"
  "dist/"
  "build/"
  "coverage/"
  ".next/"
  ".nuxt/"
  ".cache/"
  "*.min.js"
  "*.bundle.js"
  "*-bundle.js"
  "*.map"
)

found_ignore=0
for f in "${IGNORE_FILES[@]}"; do
  if [ -f "$f" ]; then
    found_ignore=1
    ok "Found ignore file: $f"
    for pat in "${RECOMMENDED_IGNORES[@]}"; do
      if grep -Fxq "$pat" "$f" 2>/dev/null; then
        :
      else
        warn "Missing recommended ignore pattern in $f: $pat"
      fi
    done
  fi
done

if [ "$found_ignore" -eq 0 ]; then
  warn "No common ignore files found."
  note "Consider creating .gitignore or .opencodeignore with generated/vendor patterns."
fi

# ---------- package dependency checks ----------
section "8. Package and formatter dependency checks"

if [ -f "$REPO/package.json" ]; then
  ok "Found package.json: $REPO/package.json"

  if have node; then
    NODE_VER="$(node --version 2>/dev/null || true)"
    ok "node available: $NODE_VER"
  else
    warn "node not found in PATH."
  fi

  for bin in prettier eslint biome; do
    if [ -x "$REPO/node_modules/.bin/$bin" ]; then
      ok "Local $bin installed: node_modules/.bin/$bin"
    elif grep -q "\"$bin\"" "$REPO/package.json" 2>/dev/null; then
      warn "$bin appears in package.json but local binary not found."
      note "Run from repo: npm install"
    else
      note "$bin not declared in package.json."
    fi
  done

  if grep -q '"prettier"' "$REPO/package.json" 2>/dev/null && [ ! -x "$REPO/node_modules/.bin/prettier" ]; then
    warn "Prettier is declared but not installed locally. npx may prompt inside OpenCode."
  fi
else
  warn "No package.json found at repo root."
fi

if have npx; then
  ok "npx available."
  note "For hooks, prefer: npx --no-install prettier ..."
else
  note "npx not found."
fi

# ---------- opencode-specific config excerpts ----------
section "9. OpenCode config excerpts"

for f in \
  "$REPO/opencode.json" \
  "$REPO_OPENCODE/settings.json" \
  "$REPO_OPENCODE/opencode.json" \
  "$HOME_OPENCODE/settings.json" \
  "$HOME_OPENCODE/opencode.json"
do
  if [ -f "$f" ]; then
    ok "Config file: $f"
    matches="$(rg_like '"hook|hooks|formatter|command|cmd|model|agent|permission|tool|path|cwd|directory|repo' "$f")"
    if [ -n "$matches" ]; then
      printf "%s\n" "$matches" | sed 's/^/       /' | tee -a "$REPORT" >/dev/null
    fi
  fi
done

# ---------- remediation snippets ----------
section "10. Suggested fixes"

cat <<'EOF' | tee -a "$REPORT" >/dev/null
A. Make hooks quiet.

Bad:
  prettier --write "$file"
  echo "[Hook] Formatted: $file"

Better:
  npx --no-install prettier --write "$file" >>/tmp/opencode-hooks.log 2>&1

Print only on failure:
  npx --no-install prettier --write "$file" >>/tmp/opencode-hooks.log 2>&1 || {
    echo "[Hook failed] prettier: $file" >&2
    exit 1
  }

B. Avoid interactive package installation inside OpenCode.

From repo:
  npm install
  npm install -D prettier

Hook command:
  ./node_modules/.bin/prettier --write "$file" >>/tmp/opencode-hooks.log 2>&1

C. Reduce mobile terminal overlap.

Inside tmux:
  tmux set -g status off
  tmux refresh-client -S

After corruption:
  reset
  clear

D. Add ignore patterns.

Recommended:
  node_modules/
  dist/
  build/
  coverage/
  .next/
  .nuxt/
  .cache/
  *.min.js
  *.bundle.js
  *-bundle.js
  *.map
EOF

# ---------- summary ----------
section "11. Summary"

log "OK/info count: $INFO"
log "Warnings: $WARN"
log "Failures: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  log "Result: FAILURES FOUND"
elif [ "$WARN" -gt 0 ]; then
  log "Result: WARNINGS FOUND"
else
  log "Result: CLEAN"
fi

printf "\n%sAudit complete.%s\n" "$BOLD" "$RESET"
printf "Report written to: %s\n" "$REPORT"
printf "Warnings: %s | Failures: %s\n" "$WARN" "$FAIL"

if [ "$WARN" -gt 0 ] || [ "$FAIL" -gt 0 ]; then
  printf "\nMost useful next command:\n"
  printf "  sed -n '1,260p' %q\n" "$REPORT"
fi

exit 0
