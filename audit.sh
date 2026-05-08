#!/usr/bin/env bash
# audit.sh — Pilot dev-server launcher with structured error logging
# Usage: ./audit.sh [expo start flags]
#   e.g. ./audit.sh --port 8081
#
# Output:
#   - All metro output with timestamps printed to stdout
#   - Structured log written to /tmp/pilot-audit.log
#   - On Ctrl+C: prints a summary of unique error signatures

set -euo pipefail

LOGFILE="/tmp/pilot-audit.log"
PILOT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOSTNAME_IP="${REACT_NATIVE_PACKAGER_HOSTNAME:-100.81.83.98}"

# ANSI colour helpers (only when stdout is a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
  GREEN='\033[0;32m'; DIM='\033[2m'; RESET='\033[0m'
else
  RED=''; YELLOW=''; CYAN=''; GREEN=''; DIM=''; RESET=''
fi

ts() { date '+%H:%M:%S'; }

banner() {
  echo -e "${CYAN}┌──────────────────────────────────────────┐${RESET}"
  echo -e "${CYAN}│  pilot audit — $(ts)                    │${RESET}"
  echo -e "${CYAN}│  log → ${LOGFILE}${RESET}"
  echo -e "${CYAN}│  host → ${HOSTNAME_IP}${RESET}"
  echo -e "${CYAN}└──────────────────────────────────────────┘${RESET}"
}

summary() {
  echo ""
  echo -e "${CYAN}══ AUDIT SUMMARY ══════════════════════════${RESET}"
  local total
  total=$(wc -l < "$LOGFILE" 2>/dev/null || echo 0)
  echo -e "  Total log lines : ${total}"

  echo ""
  echo -e "${RED}  ERRORS:${RESET}"
  grep -i '\[ERROR\]' "$LOGFILE" 2>/dev/null \
    | sed 's/^[0-9:]*  //' \
    | sort -u \
    | head -30 \
    | while IFS= read -r line; do echo -e "  ${RED}▸${RESET} $line"; done \
    || echo "  (none)"

  echo ""
  echo -e "${YELLOW}  WARNINGS:${RESET}"
  grep -i '\[WARN\]' "$LOGFILE" 2>/dev/null \
    | sed 's/^[0-9:]*  //' \
    | sort -u \
    | head -20 \
    | while IFS= read -r line; do echo -e "  ${YELLOW}▸${RESET} $line"; done \
    || echo "  (none)"

  echo ""
  echo -e "${DIM}  Full log: $LOGFILE${RESET}"
  echo -e "${CYAN}═══════════════════════════════════════════${RESET}"
}

# Truncate log on fresh start
: > "$LOGFILE"
echo "# Pilot audit log — started $(date)" >> "$LOGFILE"
echo "# REACT_NATIVE_PACKAGER_HOSTNAME=$HOSTNAME_IP" >> "$LOGFILE"
echo "" >> "$LOGFILE"

banner

# Trap Ctrl+C to print summary before exit
trap 'summary; exit 0' INT TERM

# Pipe expo start output through awk for timestamping + classification
REACT_NATIVE_PACKAGER_HOSTNAME="$HOSTNAME_IP" \
  npx expo start "$@" 2>&1 | awk -v logfile="$LOGFILE" -v red="$RED" -v yellow="$YELLOW" -v reset="$RESET" -v dim="$DIM" '
{
  # Build timestamp
  cmd = "date +%H:%M:%S"
  cmd | getline t
  close(cmd)

  line = $0
  out  = t "  " line

  # Classify
  level = "[INFO] "
  color = dim
  lower = tolower(line)
  if (lower ~ /error|typeerror|apierror|exception|crash|fatal|uncaught/) {
    level = "[ERROR]"
    color = red
  } else if (lower ~ /warn|warning|deprecat|failed|timeout|refused|econnreset|enotfound/) {
    level = "[WARN] "
    color = yellow
  }

  # Write to log file (no colour codes)
  print t "  " level " " line >> logfile

  # Print to stdout with colour
  print color out reset
}'

# If expo exits normally (not via Ctrl+C), still show summary
summary
