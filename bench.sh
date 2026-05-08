#!/usr/bin/env bash
# bench.sh — One-shot Pilot benchmark runner
#
# Runs all three benchmark suites in sequence, merges results into a single
# JSON file, then generates a self-contained HTML audit report.
#
# Usage:
#   ./bench.sh [--url http://host:port] [--vus N]
#
# Defaults:
#   --url  http://100.81.83.98:4096
#   --vus  25
#
# Output:
#   /tmp/pilot-results.json        — merged raw results
#   ./pilot-audit-YYYY-MM-DD-HH-MM.html — HTML audit report (path printed)

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────

URL="http://100.81.83.98:4096"
VUS=25
USER_ARG=""
PASS_ARG=""

# ─── Parse args ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)  URL="$2";      shift 2 ;;
    --vus)  VUS="$2";      shift 2 ;;
    --user) USER_ARG="$2"; shift 2 ;;
    --pass) PASS_ARG="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ─── Paths ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="/tmp/pilot-results.json"
TIMESTAMP="$(date +%Y-%m-%d-%H-%M)"
HTML_FILE="${SCRIPT_DIR}/pilot-audit-${TIMESTAMP}.html"

# ─── ANSI ────────────────────────────────────────────────────────────────────

if [ -t 1 ]; then
  CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'
  YELLOW='\033[1;33m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
else
  CYAN=''; GREEN=''; RED=''; YELLOW=''; BOLD=''; DIM=''; RESET=''
fi

banner() {
  echo -e "${CYAN}${BOLD}"
  echo    "╔══════════════════════════════════════════════╗"
  echo    "║           Pilot Benchmark Runner             ║"
  echo    "╚══════════════════════════════════════════════╝${RESET}"
  echo -e "  ${DIM}target  :${RESET} ${URL}"
  echo -e "  ${DIM}peak VUs:${RESET} ${VUS}"
  echo -e "  ${DIM}json    :${RESET} ${JSON_FILE}"
  echo -e "  ${DIM}report  :${RESET} ${HTML_FILE}"
  echo ""
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}══ $1 ══${RESET}"
}

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; }
info() { echo -e "  ${DIM}$1${RESET}"; }

# ─── Build auth flags ─────────────────────────────────────────────────────────

AUTH_FLAGS=""
[ -n "$USER_ARG" ] && AUTH_FLAGS="--user ${USER_ARG} --pass ${PASS_ARG}"

# ─── Wipe JSON from any previous run ─────────────────────────────────────────

rm -f "$JSON_FILE"

banner

# ─── Phase 1: Correctness ─────────────────────────────────────────────────────

section "Phase 1 / 3 — Correctness Suite"

EXIT_CORRECTNESS=0
node "${SCRIPT_DIR}/pilot-bench.mjs" \
  --url "$URL" \
  --json "$JSON_FILE" \
  ${AUTH_FLAGS} || EXIT_CORRECTNESS=$?

if [ $EXIT_CORRECTNESS -eq 0 ]; then
  ok "Correctness suite passed"
else
  fail "Correctness suite had failures (continuing to next phase)"
fi

# ─── Phase 2: Load Test ───────────────────────────────────────────────────────

section "Phase 2 / 3 — Load Test  (peak ${VUS} VUs)"

EXIT_LOAD=0
node "${SCRIPT_DIR}/pilot-load.mjs" \
  --url "$URL" \
  --vus "$VUS" \
  --out "$JSON_FILE" \
  ${AUTH_FLAGS} || EXIT_LOAD=$?

if [ $EXIT_LOAD -eq 0 ]; then
  ok "Load test completed"
else
  fail "Load test encountered errors (results still recorded)"
fi

# ─── Phase 3: SSE & Flow ──────────────────────────────────────────────────────

section "Phase 3 / 3 — SSE Stress & App Flow Simulation"

EXIT_SSE=0
node "${SCRIPT_DIR}/pilot-sse-bench.mjs" \
  --url "$URL" \
  --out "$JSON_FILE" \
  ${AUTH_FLAGS} || EXIT_SSE=$?

if [ $EXIT_SSE -eq 0 ]; then
  ok "SSE & flow suite passed"
else
  fail "SSE & flow suite had failures (results still recorded)"
fi

# ─── Generate HTML report ─────────────────────────────────────────────────────

section "Generating Audit Report"

REPORT_PATH="$(node "${SCRIPT_DIR}/audit-report.mjs" \
  --in  "$JSON_FILE" \
  --out "$HTML_FILE")"

ok "Report generated"
echo ""
echo -e "${BOLD}${GREEN}Audit report:${RESET}"
echo -e "  ${BOLD}${REPORT_PATH}${RESET}"
echo ""

# ─── Exit code ────────────────────────────────────────────────────────────────

OVERALL=$((EXIT_CORRECTNESS + EXIT_LOAD + EXIT_SSE))
if [ $OVERALL -ne 0 ]; then
  echo -e "${YELLOW}  One or more suites reported failures — check the report for details.${RESET}"
  exit 1
fi
