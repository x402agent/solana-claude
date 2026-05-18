#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Leviathan Runtime Bootstrap                                            ║
# ║  Sovereign AI Lobster Runtime — Solana-native agent stack               ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ║  Usage: bash leviathan.sh [--full]                                       ║
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

  🦞  Leviathan Runtime Bootstrap — Crustacean Automation
  ⚠  $CLAWD CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
  🌐  x402.wtf/automation  |  @clawddevs

BANNER
printf "${RESET}"

# ── Config ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
LOCAL_BIN_DIR="${HOME}/.local/bin"
LOCAL_BIN_TARGET="${LOCAL_BIN_DIR}/clawd-automaton"
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

# ── Check pnpm ────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  step "Installing pnpm"
  npm install -g pnpm 2>&1 | tail -1
fi
PNPM_VER="$(cd "${REPO_ROOT}" && pnpm --version 2>/dev/null)"
ok "pnpm ${PNPM_VER}"

# ── Install dependencies ─────────────────────────────────────────────────
step "Installing dependencies"
cd "${REPO_ROOT}"
pnpm install --frozen-lockfile 2>&1 | tail -2
ok "Dependencies installed"

# ── Build TypeScript ──────────────────────────────────────────────────────
step "Compiling TypeScript (dist/)"
pnpm build 2>&1 | tail -3
ok "TypeScript compiled"

mkdir -p "${LOCAL_BIN_DIR}"
ln -sf "${REPO_ROOT}/dist/index.js" "${LOCAL_BIN_TARGET}"
ok "CLI shim linked at ${LOCAL_BIN_TARGET}"

# ── Verify constitution ──────────────────────────────────────────────────
step "Verifying constitution integrity"
if [ ! -f "${REPO_ROOT}/three-laws.md" ]; then
  die "three-laws.md not found — constitution missing"
fi
CONSTITUTION_HASH=$(sha256sum "${REPO_ROOT}/three-laws.md" 2>/dev/null || shasum -a 256 "${REPO_ROOT}/three-laws.md" | cut -d' ' -f1)
ok "Constitution hash: ${CONSTITUTION_HASH:0:16}…"

# ── Full mode ─────────────────────────────────────────────────────────────
if $FULL_MODE; then
  step "Full mode: spawn identity + initialize runtime"
  echo ""

  if [ -z "${CREATOR_PUBKEY:-}" ]; then
    warn "CREATOR_PUBKEY not set — spawn will require --creator flag"
  fi

  # Build workspace sub-packages if they exist
  info "Building workspace packages…"
  for pkg in packages/*/; do
    if [ -f "${REPO_ROOT}/${pkg}package.json" ]; then
      info "Building ${pkg}…"
      pnpm --filter "${pkg}" build 2>&1 | tail -1 && ok "${pkg} built" || warn "${pkg} build failed (non-fatal)"
    fi
  done

  echo ""
  printf "  ${BOLD}Run now:${RESET}\n"
  printf "  ${CYAN}clawd-automaton --run${RESET}       — start the OODA agent loop\n"
  printf "  ${CYAN}clawd-automaton --status${RESET}    — check depth + balances\n"
  printf "  ${CYAN}clawd-automaton --goblin${RESET}    — devnet paper trading (Goblin mode)\n"
  printf "  ${CYAN}pnpm ooda${RESET}                   — run OODA loop directly\n"
  printf "  ${CYAN}pnpm dashboard:dev${RESET}          — launch dashboard UI\n"
  printf "  ${CYAN}../agents/agents-catalog.json${RESET}   — agent registry catalog\n"
  printf "  ${CYAN}../agents/templates/index.json${RESET} — template registry\n"
  printf "  ${CYAN}../agents/skills/index.json${RESET}    — formal skill hub\n"
  echo ""
fi

# ── Done ─────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}${GREEN}🦞  Crustacean Automation ready!${RESET}\n"
printf "  ${CYAN}clawd-automaton --run${RESET}       — start the agent loop\n"
printf "  ${CYAN}clawd-automaton --status${RESET}    — check depth + balances\n"
printf "  ${CYAN}clawd-automaton --goblin${RESET}    — devnet paper Goblin mode\n"
printf "  ${CYAN}clawd-automaton --provision${RESET} — provision API key via SIWE\n"
printf "  ${CYAN}pnpm ooda${RESET}                   — run OODA loop\n"
printf "  ${CYAN}pnpm dashboard:dev${RESET}          — launch dashboard\n"
printf "  ${CYAN}../agents/skills/README.md${RESET}    — full local skill library\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
printf "  ${YELLOW}Add ${LOCAL_BIN_DIR} to PATH if needed.${RESET}\n"
echo ""
