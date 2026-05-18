#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OpenClawd Quickstart                                                   ║
# ║  Interactive guide to get you running fast                              ║
# ║  Usage: bash quickstart.sh                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
MAGENTA="\033[35m"

echo ""
printf "${BOLD}${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🦞  Crustacean Automation — Quickstart                     ║"
echo "║  Sovereign AI Lobster Runtime on Solana                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
printf "${RESET}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
LOCAL_BIN_DIR="${HOME}/.local/bin"
LOCAL_BIN_TARGET="${LOCAL_BIN_DIR}/clawd-automaton"

# ── Check Node.js ─────────────────────────────────────────────────────────
printf "${BOLD}[0/5] Checking prerequisites${RESET}\n"
if ! command -v node &>/dev/null; then
  printf "${RED}❌  Node.js not found. Install v20+ from https://nodejs.org${RESET}\n"
  exit 1
fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 20 ]; then
  printf "${RED}❌  Node.js v20+ required (found $(node --version))${RESET}\n"
  exit 1
fi
if ! command -v pnpm &>/dev/null; then
  printf "  Installing pnpm...\n"
  npm install -g pnpm 2>&1 | tail -1
fi
PNPM_VER="$(cd "${REPO_ROOT}" && pnpm --version 2>/dev/null)"
printf "  ✅ Node.js $(node --version) | pnpm ${PNPM_VER}\n"
echo ""

# ── Step 1: Install dependencies ──────────────────────────────────────────
printf "${BOLD}[1/5] Install dependencies${RESET}\n"
cd "${REPO_ROOT}"
pnpm install 2>&1 | tail -2
echo "  ✅ Dependencies installed"
echo ""

# ── Step 2: Build ──────────────────────────────────────────────────────────
printf "${BOLD}[2/5] Build TypeScript${RESET}\n"
pnpm build 2>&1 | tail -2
echo "  ✅ TypeScript compiled to dist/"
echo ""

# ── Step 2.5: Install local CLI shim ─────────────────────────────────────
mkdir -p "${LOCAL_BIN_DIR}"
ln -sf "${REPO_ROOT}/dist/index.js" "${LOCAL_BIN_TARGET}"
echo "  ✅ CLI shim linked at ${LOCAL_BIN_TARGET}"
echo ""

# ── Step 3: Verify constitution ────────────────────────────────────────────
printf "${BOLD}[3/5] Verify constitution${RESET}\n"
bash "${REPO_ROOT}/three-laws-check.sh" 2>&1 | tail -4
echo ""

# ── Step 4: Environment setup ──────────────────────────────────────────────
printf "${BOLD}[4/5] Environment variables${RESET}\n"
CLAWD_DIR="${HOME}/.clawd"
ENV_FILE="${CLAWD_DIR}/.env"

if [ ! -f "${ENV_FILE}" ]; then
  mkdir -p "${CLAWD_DIR}"
  cat > "${ENV_FILE}" << 'ENV'
# ╔══════════════════════════════════════════════════════════╗
# ║  OpenClawd environment — edit and restart                ║
# ╚══════════════════════════════════════════════════════════╝
# REQUIRED:
CLAWD_API_KEY=
# OPTIONAL:
# CLAWD_API_URL=https://api.x402.wtf
# HELIUS_API_KEY=
# SOLANA_RPC_URL=
# DFLOW_API_KEY=
# VULCAN_BIN=
ENV
  echo "  📝 Created ~/.clawd/.env — add your CLAWD_API_KEY"
else
  echo "  ✅ ~/.clawd/.env already exists"
fi
echo ""

# ── Step 5: Available commands ───────────────────────────────────────────
printf "${BOLD}[5/5] Available commands${RESET}\n"
echo ""
printf "  ${CYAN}clawd-automaton --run${RESET}       Start the OODA agent loop\n"
printf "  ${CYAN}clawd-automaton --status${RESET}    Show runtime status (TUI)\n"
printf "  ${CYAN}clawd-automaton --goblin${RESET}    Devnet paper Goblin trading mode\n"
printf "  ${CYAN}clawd-automaton --provision${RESET} Provision API key via SIWE\n"
printf "  ${CYAN}clawd-automaton --setup${RESET}     Re-run setup wizard\n"
echo ""
printf "  ${CYAN}pnpm ooda${RESET}                   Run OODA loop directly (dev)\n"
printf "  ${CYAN}pnpm goblin${RESET}                 Goblin mode (dev)\n"
printf "  ${CYAN}pnpm dashboard:dev${RESET}          Launch dashboard UI\n"
printf "  ${CYAN}pnpm test${RESET}                   Run tests\n"
echo ""

printf "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}${GREEN}║  🦞  Crustacean Automation ready!                           ║${RESET}\n"
printf "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
printf "  ${YELLOW}Add ${LOCAL_BIN_DIR} to PATH if needed.${RESET}\n"
echo ""
