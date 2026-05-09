#!/usr/bin/env bash
# bench.sh — One-shot Pilot benchmark runner
#
# Execution order (optimised for wall-clock time):
#   1. Phase 2  — Load test (~85 s), runs solo (longest phase)
#   2. Phases 1, 3, 4 — Correctness, SSE, Memory run in parallel (~17 s)
#   3. Merge four JSON result files into one, generate HTML report
#
# With --fast: skip Phase 2, run Phases 1+3+4 in parallel only.
#
# Usage:
#   ./bench.sh [--url http://host:port] [--vus N] [--fast]
#              [--user u] [--pass p]
#
# Defaults:
#   --url  http://100.81.83.98:4096
#   --vus  25

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────

URL="http://100.81.83.98:4096"
VUS=25
USER_ARG=""
PASS_ARG=""
FAST=0

# ─── Parse args ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)  URL="$2";      shift 2 ;;
    --vus)  VUS="$2";      shift 2 ;;
    --user) USER_ARG="$2"; shift 2 ;;
    --pass) PASS_ARG="$2"; shift 2 ;;
    --fast) FAST=1;        shift   ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ─── Paths ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date +%Y-%m-%d-%H-%M)"

JSON_FILE="${SCRIPT_DIR}/pilot-audit-${TIMESTAMP}.json"
JSON_CORRECTNESS="/tmp/pilot-correctness.json"
JSON_LOAD="/tmp/pilot-load.json"
JSON_SSE="/tmp/pilot-sse.json"
JSON_MEMORY="/tmp/pilot-memory.json"
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
  [ $FAST -eq 1 ] && echo -e "  ${YELLOW}fast mode: load test skipped${RESET}"
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

# ─── Wipe temp JSON from any previous run ────────────────────────────────────

rm -f "$JSON_FILE" "$JSON_CORRECTNESS" "$JSON_LOAD" "$JSON_SSE" "$JSON_MEMORY"

banner

EXIT_CORRECTNESS=0
EXIT_LOAD=0
EXIT_SSE=0
EXIT_MEMORY=0

# ─── Phase 2: Load Test (solo — must finish before parallel phases) ───────────

if [ $FAST -eq 0 ]; then
  section "Phase 2 / 4 — Load Test  (peak ${VUS} VUs, ~85 s)"

  node "${SCRIPT_DIR}/pilot-load.mjs" \
    --url "$URL" \
    --vus "$VUS" \
    --out "$JSON_LOAD" \
    ${AUTH_FLAGS} || EXIT_LOAD=$?

  if [ $EXIT_LOAD -eq 0 ]; then
    ok "Load test completed"
  else
    fail "Load test encountered errors (results still recorded)"
  fi
else
  info "Load test skipped (--fast)"
fi

# ─── Phases 1, 3, 4 — run in parallel ────────────────────────────────────────

section "Phases 1, 3, 4 — Correctness · SSE · Memory  (parallel)"
info "Starting three suites concurrently — output will be interleaved…"
echo ""

node "${SCRIPT_DIR}/pilot-bench.mjs" \
  --url "$URL" \
  --out "$JSON_CORRECTNESS" \
  ${AUTH_FLAGS} &
PID_CORRECTNESS=$!

node "${SCRIPT_DIR}/pilot-sse-bench.mjs" \
  --url "$URL" \
  --out "$JSON_SSE" \
  ${AUTH_FLAGS} &
PID_SSE=$!

node "${SCRIPT_DIR}/pilot-memory-bench.mjs" \
  --url "$URL" \
  --out "$JSON_MEMORY" \
  ${AUTH_FLAGS} &
PID_MEMORY=$!

wait $PID_CORRECTNESS || EXIT_CORRECTNESS=1
if [ $EXIT_CORRECTNESS -eq 0 ]; then ok "Correctness suite passed"; else fail "Correctness suite had failures (continuing)"; fi

wait $PID_SSE || EXIT_SSE=1
if [ $EXIT_SSE -eq 0 ]; then ok "SSE & flow suite passed"; else fail "SSE & flow suite had failures (continuing)"; fi

wait $PID_MEMORY || EXIT_MEMORY=1
if [ $EXIT_MEMORY -eq 0 ]; then ok "Memory plugin suite passed"; else fail "Memory plugin suite had failures (continuing)"; fi

# ─── Merge JSON results ───────────────────────────────────────────────────────

section "Merging Results"

node -e "
  const fs   = require('fs');
  const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
  const merged = Object.assign(
    read('${JSON_CORRECTNESS}'),
    read('${JSON_LOAD}'),
    read('${JSON_SSE}'),
    read('${JSON_MEMORY}')
  );
  fs.writeFileSync('${JSON_FILE}', JSON.stringify(merged, null, 2));
"

ok "Results merged → ${JSON_FILE}"

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

OVERALL=$((EXIT_CORRECTNESS + EXIT_LOAD + EXIT_SSE + EXIT_MEMORY))
if [ $OVERALL -ne 0 ]; then
  echo -e "${YELLOW}  One or more suites reported failures — check the report for details.${RESET}"
  exit 1
fi
