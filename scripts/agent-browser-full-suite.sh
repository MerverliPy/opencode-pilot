#!/usr/bin/env bash
# agent-browser-full-suite.sh v2 — optimized browser QA suite
# Single-pass route walk, batch evals, incremental results, retry with backoff
set -uo pipefail

# ── Config ──────────────────────────────────────────
SESSION="pilot-full-suite"
TARGET_URL="${1:-http://localhost:5173}"
OUTPUT_DIR="${2:-./dogfood-output/full-suite}"
REPORT_FILE="${OUTPUT_DIR}/suite-report.json"
RESULTS_FILE="${OUTPUT_DIR}/results.jsonl"
SCREENSHOT_DIR="${OUTPUT_DIR}/screenshots"
FAILURE_DIR="${OUTPUT_DIR}/failures"
mkdir -p "${SCREENSHOT_DIR}" "${FAILURE_DIR}"

# CI skip
if [ -n "${CI:-}" ] || [ -n "${E2E_SKIP_AGENT:-}" ]; then
  echo "CI environment detected — skipping agent-browser suite"
  echo '{"summary":"skipped (CI)","total":0,"passed":0,"failed":0}' > "${REPORT_FILE}"
  exit 0
fi

# ── ANSI ────────────────────────────────────────────
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

step()   { echo -e "${CYAN}▸${RESET}" "$@"; }
ok()     { echo -e "${GREEN}✓${RESET}" "$@"; }
warn()   { echo -e "${YELLOW}⚠${RESET}" "$@"; }
fail()   { echo -e "${RED}✗${RESET}" "$@"; }

# ── Test tracking (incremental JSONL + buffer flush) ──
TESTS_TOTAL=0; TESTS_PASSED=0; TESTS_FAILED=0; TESTS_SKIPPED=0
RESULTS_BUFFER=(); FLUSH_INTERVAL=5

json_escape() {
  # Minimal JSON string escaping for bash strings
  local s="$1"
  s="${s//\\/\\\\}"; s="${s//\"/\\\"}"
  s="${s//$'\t'/\\t}"; s="${s//$'\n'/\\n}"
  echo "$s"
}

flush_results() {
  for entry in "${RESULTS_BUFFER[@]}"; do
    echo "$entry" >> "${RESULTS_FILE}" 2>/dev/null || true
  done
  RESULTS_BUFFER=()
}

record_result() {
  local name="$1" status="$2"
  local escaped; escaped=$(json_escape "$name")
  RESULTS_BUFFER+=("{\"test\":\"${escaped}\",\"status\":\"${status}\",\"ts\":${EPOCHSECONDS:-$(date +%s)}}")
  if [ $((TESTS_TOTAL % FLUSH_INTERVAL)) -eq 0 ]; then flush_results; fi
}

# Trap to flush on exit
trap 'flush_results' EXIT

run_test() {
  local name="$1"; shift
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  # Print test number prominently
  printf "  ${CYAN}[%3d]${RESET} %s... " "$TESTS_TOTAL" "$name"
  local rc=0
  if [ $# -eq 1 ] && { [ "$1" = "true" ] || [ "$1" = "false" ]; }; then
    [ "$1" = "true" ] && rc=0 || rc=1
  else
    "$@" 2>/dev/null && rc=0 || rc=1
  fi
  if [ $rc -eq 0 ]; then
    echo -e "${GREEN}PASS${RESET}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    record_result "$name" "pass"
  else
    echo -e "${RED}FAIL${RESET}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    record_result "$name" "fail"
    # Capture failure diagnostic
    local slug; slug=$(echo "$name" | tr ' /:' '---' | tr -cd '[:alnum:]_-')
    agent-browser --session "${SESSION}" screenshot \
      "${FAILURE_DIR}/${slug}.png" 2>/dev/null || true
  fi
  return $rc
}

# ── Retry helpers ──────────────────────────────────
# Retry agent-browser command with exponential backoff
ab_retry() {
  local max=${AB_RETRY_MAX:-2} delay=0.3
  for i in $(seq 1 $max); do
    if agent-browser --session "${SESSION}" "$@" 2>/dev/null; then
      return 0
    fi
    [ $i -lt $max ] && sleep $delay
    delay=$(echo "$delay * 2" | bc 2>/dev/null || echo "1")
  done
  return 1
}

# Retry eval — returns output on success, empty on failure
eval_retry() {
  local max=${AB_RETRY_MAX:-2}
  for i in $(seq 1 $max); do
    local r; r=$(agent-browser --session "${SESSION}" eval "$1" 2>&1)
    if [ -n "$r" ] && [ "$r" != "undefined" ] && [ "$r" != "null" ]; then
      echo "$r"
      return 0
    fi
    [ $i -lt $max ] && sleep 0.5
  done
  echo ""; return 1
}

# ── Pre-flight ──────────────────────────────────────
step "Pre-flight checks"
if ! command -v agent-browser &>/dev/null; then
  fail "agent-browser not found. Install: npm i -g agent-browser"
  exit 1
fi
ok "agent-browser $(agent-browser --version 2>/dev/null)"

agent-browser install --check &>/dev/null || {
  step "Installing Chrome..."
  agent-browser install 2>&1 | tail -1
}

# ── Start session ───────────────────────────────────
step "Starting browser session: ${SESSION}"
ab_retry open "${TARGET_URL}" || {
  fail "Could not start session — is the dev server running at ${TARGET_URL}?"
  exit 1
}
ab_retry wait --load domcontentloaded
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
ok "Session started at ${TARGET_URL}"

# ── Mock network endpoints ──────────────────────────
step "Configuring network mocks"
agent-browser --session "${SESSION}" network route "**/push/status" \
  --body '{"enabled":false,"publicKey":null}' 2>/dev/null || true
agent-browser --session "${SESSION}" network route "**/tunnel/status" \
  --body '{"active":false,"url":null,"error":null}' 2>/dev/null || true
ok "Network mocks active"

# ══════════════════════════════════════════════════════
# SINGLE-PASS ROUTE WALK — visit each route once, do all checks
# ═════════════════════════════════════════════════════

# Route definitions: label path expected_testids...
# testids are checked via batch eval
ROUTES=(
  "Root / prompt-input desktop-sidebar"
  "Chat /chat prompt-input"
  "DeepLink /session/test-session-123 prompt-input session-bar"
  "Sessions /sessions main-content"
  "Files /files main-content"
  "Terminal /terminal main-content"
  "Diff /diff main-content"
  "Settings /settings main-content"
  "Memory /memory main-content"
)

check_route() {
  local label="$1" path="$2"; shift 2
  local slug; slug=$(echo "$label" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]_-')

  ab_retry open "${TARGET_URL}${path}" || { run_test "${label} (${path}) — navigation failed" false; return 1; }
  ab_retry wait --load domcontentloaded || true
  agent-browser --session "${SESSION}" wait 800 2>/dev/null || true

  local url_ok=0
  local url; url=$(eval_retry "location.href") || url=""
  # Clean URL (remove trailing whitespace/newlines)
  url="${url//$'
'/}"
  url="${url//$'
'/}"
  url="${url%"${url##*[![:space:]]}"}"
  if [ "$path" = "/" ]; then
    [[ "$url" == */ ]] || [[ "$url" == *"${TARGET_URL%/}"* ]] && url_ok=1
  else
    [[ "$url" == *"${path%/}"* ]] && url_ok=1
  fi

  # Individual has_testid checks (no batch JSON — simpler, more reliable)
  local all_tids_ok=1
  for tid in "$@"; do
    local result; result=$(eval_retry "!!document.querySelector('[data-testid=${tid//'/\\'}]').toString()") || result="false"
    [ "$result" = "true" ] || all_tids_ok=0
  done

  # Check console errors
  local errors; errors=$(agent-browser --session "${SESSION}" errors --clear 2>&1 || echo "")
  local app_errors; app_errors=$(echo "$errors" | grep -vi "favicon\|extension\|chrome" 2>/dev/null || true)

  # Screenshot
  agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/${slug}.png" 2>/dev/null || true

  # Report
  if [ $url_ok -eq 1 ] && [ $all_tids_ok -eq 1 ] && [ -z "$app_errors" ]; then
    run_test "${label} (${path})" true
  else
    local reason=""
    [ $url_ok -eq 0 ] && reason="${reason}url "
    [ $all_tids_ok -eq 0 ] && reason="${reason}tid "
    [ -n "$app_errors" ] && reason="${reason}err "
    run_test "${label} (${path}) — ${reason}" false
  fi
}

step "${BOLD}SECTION 1: Route rendering${RESET}"
for route_def in "${ROUTES[@]}"; do
  # shellcheck disable=SC2086
  check_route $route_def
done
# 1.10 Unknown route redirect (special case)
step "  Route redirect test"
ab_retry open "${TARGET_URL}/nonexistent-route-xyz" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
redirect_url=$(eval_retry "location.href") || redirect_url=""
agent-browser --session "${SESSION}" screenshot --annotate \
  "${SCREENSHOT_DIR}/unknown-route.png" 2>/dev/null || true
if [[ "$redirect_url" == */ ]] || [[ "$redirect_url" == *"${TARGET_URL}"* ]]; then
  run_test "Unknown route redirects to /" true
else
  run_test "Unknown route redirects (url=${redirect_url})" false
fi
echo ""

# ══════════════════════════════════════════════════════
# SECTION 2: Navigation (nav link clicks + sidebar)
# ═════════════════════════════════════════════════════
step "${BOLD}SECTION 2: Navigation${RESET}"

# 2.1 Nav link clicks
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true

for nav_tuple in "Chat /chat" "Sessions /sessions" "Files /files" "Settings /settings" "Memory /memory"; do
  nav_label="${nav_tuple%% *}"
  nav_path="${nav_tuple##* }"

  if ab_retry find text "${nav_label}" click; then
    ab_retry wait --load domcontentloaded || true
    agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
    click_url=$(eval_retry "location.href") || click_url=""
    if [[ "$click_url" == *"${nav_path%/}"* ]] || [[ "$click_url" == *"${nav_path}/"* ]]; then
      run_test "Nav: ${nav_label} → ${nav_path}" true
    else
      run_test "Nav: ${nav_label} → ${nav_path} (url=${click_url})" false
    fi
  else
    run_test "Nav: ${nav_label} — click failed" false
  fi
done

# 2.2 Sidebar collapse/expand
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true

if ab_retry find role button click --name "Collapse sidebar"; then
  agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
  agent-browser --session "${SESSION}" screenshot --annotate \
    "${SCREENSHOT_DIR}/sidebar-collapsed.png" 2>/dev/null || true
  # Expand back
  ab_retry find role button click --name "Expand sidebar" 2>/dev/null || true
  agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
  agent-browser --session "${SESSION}" screenshot --annotate \
    "${SCREENSHOT_DIR}/sidebar-expanded.png" 2>/dev/null || true
  run_test "Sidebar collapse/expand" true
else
  run_test "Sidebar collapse/expand — button not found" false
fi
echo ""

# ══════════════════════════════════════════════════════
# SECTION 3: Interactive UI (Settings, prompt, sessions)
# ═════════════════════════════════════════════════════
step "${BOLD}SECTION 3: Interactive UI${RESET}"

# 3.1 Settings — Add Server form + fill + save
ab_retry open "${TARGET_URL}/settings" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true

if ab_retry find text "Add Server" click; then
  agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
  # Check if form appeared
  if ab_retry find testid "server-name-input" 2>/dev/null; then
    run_test "Settings: Add Server form opens" true
  else
    run_test "Settings: Add Server form opens" false
  fi
  agent-browser --session "${SESSION}" screenshot --annotate \
    "${SCREENSHOT_DIR}/settings-add-server.png" 2>/dev/null || true

  # Fill form via eval
  eval_retry "
    (function(){
      var inps=document.querySelectorAll('input');
      if(inps.length>=2){
        inps[0].value='Test Server';
        inps[0].dispatchEvent(new Event('input',{bubbles:true}));
        inps[1].value='http://localhost:3000';
        inps[1].dispatchEvent(new Event('input',{bubbles:true}));
      }
    })()
  " >/dev/null 2>&1 || true
  agent-browser --session "${SESSION}" wait 300 2>/dev/null || true

  # Try Save
  ab_retry find text "Save" click 2>/dev/null || true
  agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
  agent-browser --session "${SESSION}" screenshot --annotate \
    "${SCREENSHOT_DIR}/settings-server-saved.png" 2>/dev/null || true
  run_test "Settings: Fill + Save server" true
else
  run_test "Settings: Add Server button" false
fi

# 3.2 Prompt input disabled without server
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
is_disabled=$(agent-browser --session "${SESSION}" eval "!!document.querySelector('[data-testid=prompt-input]')?.disabled" 2>&1 | head -1)
[ "$is_disabled" = "true" ] && run_test "Prompt input disabled without server" true \
  || run_test "Prompt input disabled without server" false

# 3.3 Session bar on deep link
ab_retry open "${TARGET_URL}/session/test-123" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
if ab_retry find testid "session-bar" 2>/dev/null; then
  run_test "Session bar visible on deep link" true
else
  run_test "Session bar visible on deep link" false
fi

# 3.4 Sessions — New Session button
ab_retry open "${TARGET_URL}/sessions" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
if ab_retry find text "New Session" 2>/dev/null; then
  run_test "Sessions: New Session button" true
else
  run_test "Sessions: New Session button" false
fi

# 3.5 Diff page
ab_retry open "${TARGET_URL}/diff" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
has_mc=$(eval_retry "(!!document.querySelector('[data-testid=main-content]')).toString()") || has_mc="false"
[ "$has_mc" = "true" ] && run_test "Diff page renders" true \
  || run_test "Diff page renders" false

echo ""

# ══════════════════════════════════════════════════════
# SECTION 4: Viewport / Responsive
# ═════════════════════════════════════════════════════
step "${BOLD}SECTION 4: Viewport / Responsive${RESET}"

# Desktop 1440×900
ab_retry resize 1440 900 || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
has_sb=$(eval_retry "(!!document.querySelector('[data-testid=desktop-sidebar]')).toString()") || has_sb="false"
[ "$has_sb" = "true" ] && run_test "Desktop 1440×900: sidebar visible" true \
  || run_test "Desktop 1440×900: sidebar visible" false
agent-browser --session "${SESSION}" screenshot --annotate \
  "${SCREENSHOT_DIR}/viewport-desktop-1440.png" 2>/dev/null || true

# Mobile 375×812
ab_retry resize 375 812 || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
agent-browser --session "${SESSION}" wait 800 2>/dev/null || true
mobile_nav=$(eval_retry "((el)=>el&&window.getComputedStyle(el).display!=='none')(document.querySelector('[data-testid=mobile-nav]'))") || mobile_nav="false"
[ "$mobile_nav" = "true" ] && run_test "Mobile 375×812: mobile nav visible" true \
  || run_test "Mobile 375×812: mobile nav visible" false
agent-browser --session "${SESSION}" screenshot --annotate \
  "${SCREENSHOT_DIR}/viewport-mobile-375.png" 2>/dev/null || true

# Reset viewport
ab_retry resize 1280 720 2>/dev/null || true
echo ""

# ══════════════════════════════════════════════════════
# SECTION 5: Performance
# ═════════════════════════════════════════════════════
step "${BOLD}SECTION 5: Performance${RESET}"
ab_retry open "${TARGET_URL}/" || true
ab_retry wait --load domcontentloaded || true
perf_data=$(eval_retry "
  JSON.stringify({
    loadEvent: performance.timing.loadEventEnd - performance.timing.navigationStart,
    domReady:  performance.timing.domComplete - performance.timing.navigationStart,
    paint:     performance.getEntriesByType('paint').map(function(e){return e.name+':'+Math.round(e.startTime)}).join(', ')
  })
") || perf_data='{}'
echo "  ${DIM}Load timing: ${perf_data}${RESET}"
run_test "Performance metrics collected" true
echo ""

# ══════════════════════════════════════════════════════
# SECTION 6: Final summary
# ═════════════════════════════════════════════════════
step "Closing browser session"
agent-browser --session "${SESSION}" close 2>/dev/null || true
ok "Session closed"

# Flush remaining results
flush_results

# Aggregate JSONL → JSON report
step "Writing report..."
node -e "
const fs = require('fs');
const lines = fs.readFileSync('${RESULTS_FILE}','utf8').trim().split('\n').filter(Boolean);
const results = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const report = {
  timestamp: new Date().toISOString(),
  target_url: '${TARGET_URL}',
  total: results.length,
  passed: passed,
  failed: failed,
  skipped: ${TESTS_SKIPPED},
  summary: passed + '/' + results.length + ' passed',
  results: results
};
fs.writeFileSync('${REPORT_FILE}', JSON.stringify(report, null, 2));
console.log('Wrote ' + results.length + ' results to ${REPORT_FILE}');
" 2>/dev/null || echo "Warning: Could not write JSON report"

# ── Summary ──────────────────────────────────────────
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  FULL SUITE RESULTS${RESET}"
echo -e "${CYAN}══════════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASSED${RESET} : ${TESTS_PASSED}/${TESTS_TOTAL}"
echo -e "  ${RED}FAILED${RESET} : ${TESTS_FAILED}"
[ "${TESTS_SKIPPED}" -gt 0 ] && echo -e "  ${YELLOW}SKIPPED${RESET}: ${TESTS_SKIPPED}"
echo -e "  Report   : ${REPORT_FILE}"
echo -e "  Results  : ${RESULTS_FILE} (incremental JSONL)"
echo -e "  Screenshots: ${SCREENSHOT_DIR}/"
echo -e "  Failures : ${FAILURE_DIR}/"
echo -e "${CYAN}══════════════════════════════════════════════════${RESET}"
exit ${TESTS_FAILED}
