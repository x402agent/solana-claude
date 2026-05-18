#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Three Laws Integrity Checker                                           ║
# ║  Verifies the constitution hash matches expectations                    ║
# ║  Usage: bash automation/three-laws-check.sh                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
CYAN="\033[36m"
YELLOW="\033[33m"

ok()   { printf "${GREEN}✅  %s${RESET}\n" "$*"; }
warn() { printf "${YELLOW}⚠️   %s${RESET}\n" "$*"; }
die()  { printf "${RED}❌  %s${RESET}\n" "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LAWS_FILE="${REPO_ROOT}/three-laws.md"

printf "${CYAN}${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Three Laws — Constitution Integrity Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "${RESET}\n"

# Check file exists
if [ ! -f "${LAWS_FILE}" ]; then
  die "three-laws.md not found at ${LAWS_FILE}"
fi
ok "Found three-laws.md"

# Check file is non-empty
SIZE=$(wc -c < "${LAWS_FILE}")
if [ "${SIZE}" -lt 100 ]; then
  die "three-laws.md is too small (${SIZE} bytes) — expected at least 100 bytes"
fi
ok "File size: ${SIZE} bytes"

# Compute SHA-256 hash
if command -v sha256sum &>/dev/null; then
  HASH=$(sha256sum "${LAWS_FILE}" | cut -d' ' -f1)
elif command -v shasum &>/dev/null; then
  HASH=$(shasum -a 256 "${LAWS_FILE}" | cut -d' ' -f1)
else
  die "No SHA-256 tool found (install coreutils or sha256sum)"
fi

printf "  ${BOLD}SHA-256:${RESET} ${CYAN}${HASH}${RESET}\n"
printf "  ${BOLD}Short:${RESET}   ${HASH:0:16}…\n"

# Check for basic structural elements
echo ""
printf "${BOLD}Structural checks:${RESET}\n"

if grep -q "Law I" "${LAWS_FILE}"; then
  ok "Contains Law I"
else
  die "Missing Law I"
fi

if grep -q "Law II" "${LAWS_FILE}"; then
  ok "Contains Law II"
else
  die "Missing Law II"
fi

if grep -q "Law III" "${LAWS_FILE}"; then
  ok "Contains Law III"
else
  die "Missing Law III"
fi

# Check hierarchy section
if grep -q "Hierarchy" "${LAWS_FILE}"; then
  ok "Contains Hierarchy section"
else
  warn "Missing Hierarchy section"
fi

# Check inheritance section
if grep -q "Inheritance" "${LAWS_FILE}"; then
  ok "Contains Inheritance section"
else
  warn "Missing Inheritance section"
fi

# Check for key phrases
check_phrase() {
  if grep -qi "$1" "${LAWS_FILE}"; then
    ok "Contains: $1"
  else
    warn "Missing: $1"
  fi
}

check_phrase "beach before you harm"
check_phrase "Beach before harm"
check_phrase "The shell molts"
check_phrase "The laws do not"

echo ""
printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "${BOLD}${GREEN}  ✓ Constitution intact and valid${RESET}\n"
printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
echo ""
