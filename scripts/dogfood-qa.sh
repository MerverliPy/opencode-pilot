#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# dogfood-qa.sh — Comprehensive QA suite for opencode-pilot
# Walks all PWA routes, captures annotated screenshots, interactive
# element snapshots, console errors/logs, perf timings, mobile viewport
# tests, and video recording.
# Usage: ./scripts/dogfood-qa.sh [url] [output-dir]

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

SESSION="pilot-qa"
TARGET_URL="${1:-http://localhost:5173}"
OUTPUT_DIR="${2:-./dogfood-output}"

SCREENSHOT_DIR="${OUTPUT_DIR}/screenshots"
VIDEO_DIR="${OUTPUT_DIR}/videos"
ERROR_LOG="${OUTPUT_DIR}/console-errors.log"
SNAPSHOT_LOG="${OUTPUT_DIR}/snapshots.log"
CONSOLE_LOG="${OUTPUT_DIR}/console-log.log"
PERF_LOG="${OUTPUT_DIR}/perf-timings.log"

# Pages to visit (relative paths appended to TARGET_URL)
PAGES=(
  "/"
  "/sessions"
  "/files"
  "/terminal"
  "/diff"
  "/settings"
  "/memory"
  "/chat"
)

# Friendly labels for each page (used in filenames and echo output)
PAGE_LABELS=(
  "chat"
  "sessions"
  "files"
  "terminal"
  "diff"
  "settings"
  "memory"
  "chat-alias"
)

# ── ANSI helpers ──────────────────────────────────────────────────────────────

if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; DIM='\033[2m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; DIM=''; BOLD=''; RESET=''
fi

step()  { echo -e "${CYAN}▸${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}⚠${RESET} $*"; }
fail()  { echo -e "${RED}✗${RESET} $*"; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────

if ! command -v agent-browser &>/dev/null; then
  fail "agent-browser not found. Install with: npm i -g agent-browser"
  exit 1
fi

# ── Create output directories ─────────────────────────────────────────────────

step "Creating output directories: ${OUTPUT_DIR}"
mkdir -p "${SCREENSHOT_DIR}" "${VIDEO_DIR}"
: > "${ERROR_LOG}"
: > "${SNAPSHOT_LOG}"
: > "${CONSOLE_LOG}"
: > "${PERF_LOG}"
: > "${CONSOLE_LOG}"
: > "${PERF_LOG}"
ok "Output directories ready"

# ── Helper: slugify a page label for filenames ────────────────────────────────

slugify() {
  echo "$1" | tr ' ' '-' | tr '[:upper:]' '[:lower:]'
}

# ── Helper: visit a page, screenshot, snapshot, check errors ─────────────────

# Globals used for summary
SCREENSHOTS_TAKEN=0
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
MOBILE_WIDTH=375
MOBILE_HEIGHT=812
FASTEST_PAGE=""
SLOWEST_PAGE=""
FASTEST_TIME=99999
SLOWEST_TIME=0

visit_page() {
  local label="$1"
  local path="$2"
  local slug
  slug=$(slugify "$label")

  step "Visiting ${BOLD}${label}${RESET} (${TARGET_URL}${path})"

  # Navigate to the page
  agent-browser --session "${SESSION}" open "${TARGET_URL}${path}" || {
    warn "Failed to open ${path}"
    return 1
  }

  # Wait for the page to settle (SPA navigation)
  agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || {
    # networkidle can time out on pages with persistent connections (e.g. terminal SSE);
    # fall back to a short static wait
    warn "networkidle wait timed out for ${path}, falling back to 2s wait"
    agent-browser --session "${SESSION}" wait 2000
  }

  # ── Annotated screenshot ──────────────────────────────────────────────────
  local screenshot_path="${SCREENSHOT_DIR}/${slug}.png"
  agent-browser --session "${SESSION}" screenshot --annotate "${screenshot_path}" 2>/dev/null || {
    warn "Screenshot failed for ${label}"
  }
  SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
  ok "Screenshot → ${screenshot_path}"

  # ── Interactive element snapshot ──────────────────────────────────────────
  local snapshot_output
  snapshot_output=$(agent-browser --session "${SESSION}" snapshot -i 2>/dev/null) || {
    warn "Snapshot failed for ${label}"
    snapshot_output="(snapshot unavailable)"
  }

  {
    echo "═══════════════════════════════════════════════════"
    echo "Page: ${label} (${path})"
    echo "═══════════════════════════════════════════════════"
    echo "${snapshot_output}"
    echo ""
  } >> "${SNAPSHOT_LOG}"
  ok "Snapshot logged for ${label}"

  # ── Console errors ──────────────────────────────────────────────────────
  local page_errors
  page_errors=$(agent-browser --session "${SESSION}" errors 2>/dev/null) || true

  if [ -n "${page_errors}" ]; then
    local error_count
    error_count=$(echo "${page_errors}" | grep -c '.' 2>/dev/null || echo 0)
    TOTAL_ERRORS=$((TOTAL_ERRORS + error_count))
    warn "Found ${error_count} error(s) on ${label}"
    {
      echo "── Errors on ${label} (${path}) ──"
      echo "${page_errors}"
      echo ""
    } >> "${ERROR_LOG}"
  else
    ok "No console errors on ${label}"
  fi

  # ── Console logs (warnings, info)
  local page_logs
  page_logs=$(agent-browser --session "${SESSION}" console 2>/dev/null) || true
  if [ -n "${page_logs}" ]; then
    local warn_count
    warn_count=$(echo "${page_logs}" | grep -ci "warn\|warning" 2>/dev/null || echo 0)
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warn_count))
    {
      echo "── Console logs on ${label} (${path}) ──"
      echo "${page_logs}"
      echo ""
    } >> "${CONSOLE_LOG}"
  fi

  # ── Performance timing
  local perf_data
  perf_data=$(agent-browser --session "${SESSION}" evaluate "JSON.stringify({domReady: performance.timing.domComplete - performance.timing.navigationStart, loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart})" 2>/dev/null) || perf_data="(unavailable)"
  {
    echo "── Perf timing on ${label} (${path}) ──"
    echo "${perf_data}"
    echo ""
  } >> "${PERF_LOG}"
  if [ "${perf_data}" != "(unavailable)" ] && [ -n "${perf_data}" ]; then
    local load_time
    load_time=$(echo "${perf_data}" | grep -oP '"loadTime":\K\d+' 2>/dev/null || echo 0)
    if [ "${load_time}" -gt 0 ] 2>/dev/null; then
      if [ "${load_time}" -lt "${FASTEST_TIME}" ]; then
        FASTEST_TIME="${load_time}"
        FASTEST_PAGE="${label}"
      fi
      if [ "${load_time}" -gt "${SLOWEST_TIME}" ]; then
        SLOWEST_TIME="${load_time}"
        SLOWEST_PAGE="${label}"
      fi
    fi
  fi
}

# ── Start session ─────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}┌──────────────────────────────────────────────────────┐${RESET}"
echo -e "${CYAN}│  opencode-pilot — Full QA Suite             │${RESET}"
echo -e "${CYAN}│  Target : ${BOLD}${TARGET_URL}${RESET}"
echo -e "${CYAN}│  Output : ${BOLD}${OUTPUT_DIR}${RESET}"
echo -e "${CYAN}│  Session: ${BOLD}${SESSION}${RESET}"
echo -e "${CYAN}└──────────────────────────────────────────────────────┘${RESET}"
echo ""

step "Starting agent-browser session: ${SESSION}"
# Opening any URL initialises the session daemon
agent-browser --session "${SESSION}" open "${TARGET_URL}" || {
  fail "Could not start agent-browser session — is the PWA running at ${TARGET_URL}?"
  exit 1
}
agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || \
  agent-browser --session "${SESSION}" wait 2000

# Start video recording if supported
agent-browser --session "${SESSION}" record --output "${VIDEO_DIR}" 2>/dev/null || {
  warn "Video recording not supported by this agent-browser version"
}

# ── Initial screenshot (landing page) ─────────────────────────────────────────

step "Taking initial annotated screenshot of landing page"
agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/00-initial.png" 2>/dev/null || {
  warn "Initial screenshot failed"
}
SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
ok "Initial screenshot → ${SCREENSHOT_DIR}/00-initial.png"

# ── Walk every page ───────────────────────────────────────────────────────────

step "Walking ${#PAGES[@]} pages…"

for i in "${!PAGES[@]}"; do
  visit_page "${PAGE_LABELS[$i]}" "${PAGES[$i]}"
  echo ""
done

# ── Interactive tests ─────────────────────────────────────────────────────────

step "Running interactive element tests…"

# ── Test 1: Sidebar collapse/expand ──────────────────────────────────────────
# Navigate to chat page first so sidebar is visible
step "  Test: Sidebar collapse/expand"
agent-browser --session "${SESSION}" open "${TARGET_URL}/" 2>/dev/null || true
agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || \
  agent-browser --session "${SESSION}" wait 2000

# Find and click the sidebar toggle button
sidebar_snapshot=$(agent-browser --session "${SESSION}" snapshot -i 2>/dev/null || echo "")

# Look for a sidebar toggle — common patterns: button with "sidebar" or menu icon
# We try the most common refs; if the sidebar toggle isn't found we skip gracefully
if echo "${sidebar_snapshot}" | grep -qi 'sidebar\|menu\|toggle.*side\|hamburger'; then
  # Try to find the toggle ref
  toggle_ref=$(echo "${sidebar_snapshot}" | grep -i 'sidebar\|menu\|toggle.*side\|hamburger' | head -1 | grep -oP '@e\d+' || true)
  if [ -n "${toggle_ref}" ]; then
    step "    Clicking sidebar toggle: ${toggle_ref}"
    agent-browser --session "${SESSION}" click "${toggle_ref}" 2>/dev/null || warn "Could not click sidebar toggle"
    agent-browser --session "${SESSION}" wait 1000
    agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/interactive-sidebar-collapsed.png" 2>/dev/null || true
    SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
    ok "    Sidebar collapsed screenshot taken"

    # Expand again
    agent-browser --session "${SESSION}" click "${toggle_ref}" 2>/dev/null || true
    agent-browser --session "${SESSION}" wait 1000
    agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/interactive-sidebar-expanded.png" 2>/dev/null || true
    SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
    ok "    Sidebar expanded screenshot taken"
  else
    warn "    Sidebar toggle ref not found — skipping collapse/expand test"
  fi
else
  warn "    No sidebar toggle detected in snapshot — skipping collapse/expand test"
fi

# ── Test 2: Settings form fill ────────────────────────────────────────────────
step "  Test: Settings form interaction"
agent-browser --session "${SESSION}" open "${TARGET_URL}/settings" 2>/dev/null || true
agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || \
  agent-browser --session "${SESSION}" wait 2000

settings_snapshot=$(agent-browser --session "${SESSION}" snapshot -i 2>/dev/null || echo "")

# Look for text inputs on the settings page
input_refs=$(echo "${settings_snapshot}" | grep -i 'input\|textbox\|textarea' | head -3 || true)
if [ -n "${input_refs}" ]; then
  # Get the first input ref
  first_input_ref=$(echo "${input_refs}" | head -1 | grep -oP '@e\d+' || true)
  if [ -n "${first_input_ref}" ]; then
    step "    Filling settings input: ${first_input_ref}"
    agent-browser --session "${SESSION}" fill "${first_input_ref}" "qa-test-value" 2>/dev/null || warn "Could not fill settings input"
    agent-browser --session "${SESSION}" wait 500
    agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/interactive-settings-fill.png" 2>/dev/null || true
    SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
    ok "    Settings form fill screenshot taken"
  else
    warn "    No input ref found on settings page — skipping form fill test"
  fi
else
  warn "    No inputs found on settings page — skipping form fill test"
fi

# ── Test 3: Navigation links ──────────────────────────────────────────────────
step "  Test: Navigation link clicks"
agent-browser --session "${SESSION}" open "${TARGET_URL}/" 2>/dev/null || true
agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || \
  agent-browser --session "${SESSION}" wait 2000

nav_snapshot=$(agent-browser --session "${SESSION}" snapshot -i 2>/dev/null || echo "")

# Find navigation links (links that point to internal pages)
nav_links=$(echo "${nav_snapshot}" | grep -i 'link\|a ' | head -5 || true)
if [ -n "${nav_links}" ]; then
  # Click the first nav link we find
  first_nav_ref=$(echo "${nav_links}" | head -1 | grep -oP '@e\d+' || true)
  if [ -n "${first_nav_ref}" ]; then
    step "    Clicking navigation link: ${first_nav_ref}"
    agent-browser --session "${SESSION}" click "${first_nav_ref}" 2>/dev/null || warn "Could not click nav link"
    agent-browser --session "${SESSION}" wait --load networkidle 2>/dev/null || \
      agent-browser --session "${SESSION}" wait 2000
    agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/interactive-nav-click.png" 2>/dev/null || true
    SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
    ok "    Navigation click screenshot taken"
  else
    warn "    No nav link ref found — skipping navigation test"
  fi
else
  warn "    No navigation links found — skipping navigation test"
fi

echo ""
ok "Interactive tests complete"

# ── Error boundary test
step "  Test: Error boundary (non-existent route)"
agent-browser --session "${SESSION}" open "${TARGET_URL}/nonexistent-route-xyz" 2>/dev/null || true
agent-browser --session "${SESSION}" wait 2000
agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/interactive-error-boundary.png" 2>/dev/null || true
SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
boundary_errors=$(agent-browser --session "${SESSION}" errors 2>/dev/null) || true
if [ -n "${boundary_errors}" ]; then
  warn "Errors detected on non-existent route"
else
  ok "Error boundary handled non-existent route cleanly"
fi

echo ""

# ── Mobile viewport tests
step "Running mobile viewport tests (${MOBILE_WIDTH}x${MOBILE_HEIGHT})…"
agent-browser --session "${SESSION}" resize "${MOBILE_WIDTH}" "${MOBILE_HEIGHT}" 2>/dev/null || {
  warn "Resize not supported — skipping mobile tests"
}
for mi in 0 1 3; do
  if [ "${mi}" -lt "${#PAGES[@]}" ]; then
    mlabel="${PAGE_LABELS[$mi]}"
    mpath="${PAGES[$mi]}"
    step "  Mobile: Visiting ${mlabel}"
    agent-browser --session "${SESSION}" open "${TARGET_URL}${mpath}" 2>/dev/null || true
    agent-browser --session "${SESSION}" wait 2000
    agent-browser --session "${SESSION}" screenshot --annotate "${SCREENSHOT_DIR}/mobile-${mlabel}.png" 2>/dev/null || true
    SCREENSHOTS_TAKEN=$((SCREENSHOTS_TAKEN + 1))
  fi
done
agent-browser --session "${SESSION}" resize 1280 720 2>/dev/null || true
ok "Mobile tests complete"

echo ""

# ── Close session ──────────────────────────────────────────────────────────────

step "Closing agent-browser session: ${SESSION}"
agent-browser --session "${SESSION}" close 2>/dev/null || true
ok "Session closed"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  QA SUMMARY${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "  Target URL    : ${TARGET_URL}"
echo -e "  Output dir    : ${OUTPUT_DIR}"
echo -e "  Screenshots   : ${SCREENSHOTS_TAKEN} files in ${SCREENSHOT_DIR}/"
echo -e "  Console errors: ${TOTAL_ERRORS} (see ${ERROR_LOG})"
echo -e "  Console warns : ${TOTAL_WARNINGS}"
echo -e "  Videos        : ${VIDEO_DIR}/"
echo -e "  Mobile tests  : 3 pages at ${MOBILE_WIDTH}x${MOBILE_HEIGHT}"
echo -e "  Snapshots     : ${SNAPSHOT_LOG}"
echo -e "  Perf timings  : ${PERF_LOG}"
echo ""

# List all screenshots taken
echo -e "${BOLD}Screenshots:${RESET}"
if [ -d "${SCREENSHOT_DIR}" ]; then
  for f in "${SCREENSHOT_DIR}"/*.png; do
    if [ -f "$f" ]; then
      size=$(du -h "$f" | cut -f1)
      echo -e "  ${GREEN}●${RESET} $(basename "$f") (${size})"
    fi
  done
else
  echo "  (none)"
fi

# List errors if any
echo ""
if [ -s "${ERROR_LOG}" ]; then
  echo -e "${RED}Console Errors Found:${RESET}"
  cat "${ERROR_LOG}"
else
  echo -e "${GREEN}No console errors detected.${RESET}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
if [ -n "${FASTEST_PAGE}" ]; then
  echo -e "${GREEN}Fastest page:${RESET} ${FASTEST_PAGE} (${FASTEST_TIME}ms)"
  echo -e "${RED}Slowest page:${RESET} ${SLOWEST_PAGE} (${SLOWEST_TIME}ms)"
  echo ""
fi
echo -e "${DIM}Tip: Review annotated screenshots for visual QA.${RESET}"
echo -e "${DIM}Tip: Check ${SNAPSHOT_LOG} for interactive element inventory.${RESET}"
echo -e "${DIM}Tip: Re-run with a different URL: ./scripts/dogfood-qa.sh http://localhost:3000${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"