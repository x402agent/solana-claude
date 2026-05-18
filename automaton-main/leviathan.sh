#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Leviathan Runtime Bootstrap                                            ║
# ║  Sovereign AI Lobster Runtime — Solana-native agent stack               ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ║  Usage: bash automation/leviathan.sh [--full]                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
MAGENTA="\033[35m"

ok()   { printf "${GREEN}✅  %s${RESET}\n" "$*"; }
info() { printf "${CYAN}ℹ   %s${RESET}\n" "$*"; }
warn() { printf "${YELLOW}⚠️   %s${RESET}\n" "$*"; }
die()  { printf "${RED}❌  %s${RESET}\n" "$*" >&2; exit 1; }
step() { printf "\n${BOLD}${MAGENTA}▶  %s${RESET}\n" "$*"; }

# ── Banner ────────────────────────────────────────────────────────────────
printf "${CYAN}${BOLD}"
cat << 'BANNER'

   ██████╗██╗      █████╗ ██╗    ██╗██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝

  🦞  Leviathan Runtime Bootstrap — OpenClawd Framework
  ⚠  $CLAWD CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
  🌐  solanaclawd.com  |  @clawddevs

BANNER
printf "${RESET}"

# ── Config ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FULL_MODE=false
[[ "${1:-}" == "--full" ]] && FULL_MODE=true

# ── Check Node.js ─────────────────────────────────────────────────────────
step "Checking Node.js"
if ! command -v node &>/dev/null; then
  die "Node.js not found. Install v20+ from https://nodejs.org"
fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 20 ]; then
  die "Node.js v20+ required (found v${NODE_MAJOR}). Update at https://nodejs.org"
fi
ok "Node.js $(node --version)"

# ── Install dependencies ─────────────────────────────────────────────────
step "Installing dependencies"
cd "${REPO_ROOT}"
npm install --no-audit --no-fund 2>&1 | tail -1
ok "Dependencies installed"

# ── Build TypeScript ──────────────────────────────────────────────────────
step "Compiling TypeScript (dist/)"
npm run build 2>&1 | tail -3
ok "TypeScript compiled"

# ── Verify constitution ──────────────────────────────────────────────────
step "Verifying constitution integrity"
if [ ! -f "${REPO_ROOT}/three-laws.md" ]; then
  die "three-laws.md not found — constitution missing"
fi
CONSTITUTION_HASH=$(sha256sum "${REPO_ROOT}/three-laws.md" 2>/dev/null || shasum -a 256 "${REPO_ROOT}/three-laws.md" 2>/dev/null | cut -d' ' -f1)
ok "Constitution hash: ${CONSTITUTION_HASH:0:16}…"

# ── Full mode ─────────────────────────────────────────────────────────────
if $FULL_MODE; then
  step "Full mode: spawn identity + initialize runtime"
  echo ""

  # Check for required env vars
  if [ -z "${CREATOR_PUBKEY:-}" ]; then
    warn "CREATOR_PUBKEY not set — spawn will require --creator flag"
  fi

  printf "  ${BOLD}Run these commands:${RESET}\n"
  printf "  ${CYAN}1.${RESET}  npm run leviathan:spawn -- --name \"MyLeviathan\" --creator \"\$CREATOR_PUBKEY\"\n"
  printf "  ${CYAN}2.${RESET}  npm run leviathan:status\n"
  printf "  ${CYAN}3.${RESET}  npm run leviathan:run\n"
  printf "\n"

  # Build sub-projects
  info "Building sub-projects…"
  cd "${REPO_ROOT}/packages/clawd" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1
  ok "@openclawdsolana/clawd built"
  cd "${REPO_ROOT}/mcp-server" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1
  ok "MCP server built"
  cd "${REPO_ROOT}/x402" && npm install --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -1
  ok "x402 protocol built"
  cd "${REPO_ROOT}"

  echo ""
  printf "  ${BOLD}Demos you can run now:${RESET}\n"
  printf "  ${CYAN}npm run demo:ooda${RESET}       — OODA intelligence loop\n"
  printf "  ${CYAN}npm run demo:lobtrader${RESET}  — pump.fun bonding curve trader\n"
  printf "  ${CYAN}npm run demo:buddies${RESET}    — Blockchain Buddies\n"
  printf "  ${CYAN}npm run demo:paysh${RESET}      — x402 confidential payments\n"
  echo ""
fi

# ── Done ─────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}${GREEN}🦞  Leviathan runtime ready!${RESET}\n"
printf "  ${CYAN}npm run leviathan:spawn${RESET}   — hatch a new leviathan\n"
printf "  ${CYAN}npm run leviathan:run${RESET}     — start the pulse loop\n"
printf "  ${CYAN}npm run leviathan:status${RESET}  — check depth + balances\n"
printf "  ${CYAN}npm run hermes${RESET}            — launch the runtime\n"
printf "  ${CYAN}npm run demo:ooda${RESET}         — run OODA demo\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
echo ""
