#!/usr/bin/env bash
# benchtest.sh — Benchtest orchestrator
#
# Runs benchtest scenarios and generates reports.
#
# Usage:
#   ./benchtest.sh [options]
#
# Options:
#   --scenario <name>   Scenario (code-review|bug-fix|refactor|e2e-test|docs-update|all)
#   --url <url>         OpenCode server URL
#   --api-key <key>     API key
#   --out <dir>         Output directory (default: ./benchtest-out)
#   --quick             Quick mode
#   --stress <n>        Stress test with N concurrent sessions
#   --baseline <file>   Baseline JSON for regression comparison
#   --verbose           Verbose logging

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date +%Y-%m-%d-%H-%M)"
OUT_DIR="${SCRIPT_DIR}/benchtest-out-${TIMESTAMP}"
FLAGS="--out ${OUT_DIR}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scenario) FLAGS="${FLAGS} --scenario $2";  shift 2 ;;
    --url)      FLAGS="${FLAGS} --url $2";        shift 2 ;;
    --api-key)  FLAGS="${FLAGS} --api-key $2";    shift 2 ;;
    --out)      OUT_DIR="$2"; FLAGS="${FLAGS} --out $2"; shift 2 ;;
    --quick)    FLAGS="${FLAGS} --quick";          shift   ;;
    --stress)   FLAGS="${FLAGS} --stress $2";     shift 2 ;;
    --baseline) FLAGS="${FLAGS} --baseline $2";   shift 2 ;;
    --verbose)  FLAGS="${FLAGS} --verbose";        shift   ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ANSI
if [ -t 1 ]; then
  CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'
  YELLOW='\033[1;33m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
else
  CYAN=''; GREEN=''; RED=''; YELLOW=''; BOLD=''; DIM=''; RESET=''
fi

banner() {
  echo -e "${CYAN}${BOLD}"
  echo    "╔══════════════════════════════════════════════╗"
  echo    "║       Pilot Benchtest Orchestrator           ║"
  echo    "╚══════════════════════════════════════════════╝${RESET}"
  echo -e "  ${DIM}out dir :${RESET} ${OUT_DIR}"
  echo ""
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}══ $1 ══${RESET}"
}

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; }
info() { echo -e "  ${DIM}$1${RESET}"; }

banner

# ─── Run benchtest ───────────────────────────────────────────────

section "Running Benchtest"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

node "${SCRIPT_DIR}/benchtest-run.mjs" ${FLAGS}
EXIT=$?

if [ $EXIT -eq 0 ]; then
  ok "All scenarios passed"
else
  fail "Some scenarios failed (check reports)"
fi

# ─── Summary ─────────────────────────────────────────────────────

section "Output"

echo ""
echo -e "${BOLD}${GREEN}Reports in:${RESET}"
echo -e "  ${BOLD}${OUT_DIR}${RESET}"
echo ""
ls -la "$OUT_DIR" 2>/dev/null | grep -E '\.(json|html)$' | awk '{print "  " $NF}'
echo ""
info "Open the .html files in a browser to view reports"

exit $EXIT
