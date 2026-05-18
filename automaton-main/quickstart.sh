#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OpenClawd Quickstart                                                   ║
# ║  Interactive guide to get you running fast                              ║
# ║  Usage: bash automation/quickstart.sh                                   ║
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
echo "║  🦞  OpenClawd Quickstart Guide                             ║"
echo "║  Sovereign AI Lobster Runtime on Solana                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
printf "${RESET}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Step 1: Install dependencies ──────────────────────────────────────
printf "${BOLD}[1/5] Install dependencies${RESET}\n"
cd "${REPO_ROOT}"
npm install --no-audit --no-fund 2>&1 | tail -1
echo "  ✅ Dependencies installed"
echo ""

# ── Step 2: Build ──────────────────────────────────────────────────────
printf "${BOLD}[2/5] Build TypeScript${RESET}\n"
npm run build 2>&1 | tail -1
echo "  ✅ TypeScript compiled to dist/"
echo ""

# ── Step 3: Verify constitution ────────────────────────────────────────
printf "${BOLD}[3/5] Verify constitution${RESET}\n"
bash "${SCRIPT_DIR}/three-laws-check.sh" 2>&1 | tail -3
echo ""

# ── Step 4: Environment setup ──────────────────────────────────────────
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
XAI_API_KEY=
# OPTIONAL:
# HELIUS_API_KEY=
# SOLANA_PRIVATE_KEY=
# OPENROUTER_API_KEY=
ENV
  echo "  📝 Created ~/.clawd/.env — add your XAI_API_KEY"
else
  echo "  ✅ ~/.clawd/.env already exists"
fi
echo ""

# ── Step 5: Available commands ───────────────────────────────────────
printf "${BOLD}[5/5] Available commands${RESET}\n"
echo ""
printf "  ${CYAN}npm run leviathan:spawn${RESET}     Hatch a leviathan\n"
printf "  ${CYAN}npm run leviathan:status${RESET}    Check depth + balances\n"
printf "  ${CYAN}npm run leviathan:run${RESET}       Start the pulse loop\n"
echo ""
printf "  ${CYAN}npm run demo:ooda${RESET}           OODA intelligence demo (no key)\n"
printf "  ${CYAN}npm run demo:lobtrader${RESET}      pump.fun trading demo (no key)\n"
printf "  ${CYAN}npm run demo:buddies${RESET}        Blockchain Buddies (no key)\n"
printf "  ${CYAN}npm run demo:paysh${RESET}          x402 payments demo (no key)\n"
echo ""
printf "  ${CYAN}npm run check${RESET}               TypeScript type checking\n"
printf "  ${CYAN}npm run test${RESET}                Run tests\n"
printf "  ${CYAN}npm run hermes${RESET}              Launch the runtime\n"
echo ""

printf "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}${GREEN}║  🦞  OpenClawd ready!                                       ║${RESET}\n"
printf "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
echo ""
