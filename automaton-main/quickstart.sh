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
PERPS_PACKAGE="${PERPS_PACKAGE:-@openclawdsolana/clawd-perps}"
CLAWD_BACKROOM_URL="${CLAWD_BACKROOM_URL:-https://backrooms.x402.wtf}"

ensure_env_line() {
  local file="$1" key="$2" value="$3"
  if [ ! -f "$file" ] || ! grep -q "^${key}=" "$file" 2>/dev/null; then
    printf "%s=%s\n" "$key" "$value" >> "$file"
  fi
}

relay_perps_install() {
  [ "${CLAWD_PERPS_NO_RELAY:-0}" = "1" ] && return 0
  command -v curl >/dev/null 2>&1 || return 0
  local msg
  msg="🦞👑 AUTOMATION QUICKSTART PERPS RELAY
Local quickstart connected Phoenix/Vulcan perps.
Surface: clawd-perps perps vulcan context
Imperial loop: market → strategy → ledger → finalize."
  curl -fsS -m 5 -X POST "${CLAWD_BACKROOM_URL%/}/stream/human" \
    -H "Content-Type: application/json" \
    -d "$(node -e 'const msg=process.argv[1]; console.log(JSON.stringify({name:"automation-quickstart-perps",content:msg}))' "$msg")" \
    >/dev/null 2>&1 || true
}

bootstrap_perps() {
  [ "${CLAWD_NO_PERPS:-0}" = "1" ] && { echo "  ✅ Perps bootstrap skipped (CLAWD_NO_PERPS=1)"; return 0; }
  printf "${BOLD}[2.6/5] Phoenix/Vulcan perps${RESET}\n"

  npm install -g "$PERPS_PACKAGE" --no-audit --no-fund >/dev/null 2>&1 \
    && echo "  ✅ Installed $PERPS_PACKAGE" \
    || echo "  ⚠️  $PERPS_PACKAGE global install failed; use: npx $PERPS_PACKAGE"

  if [ -d "${SCRIPT_DIR}/../vulcan-cli-master" ] && command -v cargo >/dev/null 2>&1; then
    ( cd "${SCRIPT_DIR}/../vulcan-cli-master" && cargo build -p vulcan >/dev/null 2>&1 ) \
      && {
        install -m 0755 "${SCRIPT_DIR}/../vulcan-cli-master/target/debug/vulcan" "${LOCAL_BIN_DIR}/vulcan"
        echo "  ✅ Vulcan linked at ${LOCAL_BIN_DIR}/vulcan"
      } \
      || echo "  ⚠️  Vulcan build skipped; set VULCAN_BIN later"
  elif command -v vulcan >/dev/null 2>&1; then
    echo "  ✅ Vulcan found at $(command -v vulcan)"
  else
    echo "  ⚠️  Vulcan not found; set VULCAN_BIN after install"
  fi

  relay_perps_install
  echo ""
}

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
bootstrap_perps

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
# IMPERIAL_API_KEY=
ENV
  echo "  📝 Created ~/.clawd/.env — add your CLAWD_API_KEY"
else
  echo "  ✅ ~/.clawd/.env already exists"
fi
ensure_env_line "${ENV_FILE}" "CLAWD_PERPS_API_URL" "https://perp-api.phoenix.trade"
ensure_env_line "${ENV_FILE}" "CLAWD_PERPS_RPC_URL" "https://api.mainnet-beta.solana.com"
ensure_env_line "${ENV_FILE}" "CLAWD_PERPS_AGENT_PATH" "${SCRIPT_DIR}/../solana-python-agent/perps_agent.py"
ensure_env_line "${ENV_FILE}" "VULCAN_BIN" "${LOCAL_BIN_DIR}/vulcan"
ensure_env_line "${ENV_FILE}" "PHOENIX_DEFAULT_MODE" "paper"
ensure_env_line "${ENV_FILE}" "IMPERIAL_API_BASE" "https://api.imperial.space/api/v1"
ensure_env_line "${ENV_FILE}" "IMPERIAL_API_KEY" ""
ensure_env_line "${ENV_FILE}" "IMPERIAL_WALLET" ""
ensure_env_line "${ENV_FILE}" "IMPERIAL_PROFILE_INDEX" "0"
echo "  ✅ Phoenix perps env defaults ready"
echo ""

# ── Step 5: Available commands ───────────────────────────────────────────
printf "${BOLD}[5/5] Available commands${RESET}\n"
echo ""
printf "  ${CYAN}clawd-automaton --run${RESET}       Start the OODA agent loop\n"
printf "  ${CYAN}clawd-automaton --status${RESET}    Show runtime status (TUI)\n"
printf "  ${CYAN}clawd-automaton --goblin${RESET}    Devnet paper Goblin trading mode\n"
printf "  ${CYAN}clawd-automaton --provision${RESET} Provision API key via SIWE\n"
printf "  ${CYAN}clawd-automaton --setup${RESET}     Re-run setup wizard\n"
printf "  ${CYAN}clawd-perps perps vulcan context${RESET}  Phoenix/Vulcan perps health\n"
printf "  ${CYAN}clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5${RESET}\n"
echo ""
printf "  ${CYAN}pnpm ooda${RESET}                   Run OODA loop directly (dev)\n"
printf "  ${CYAN}pnpm goblin${RESET}                 Goblin mode (dev)\n"
printf "  ${CYAN}pnpm dashboard:dev${RESET}          Launch dashboard UI\n"
printf "  ${CYAN}pnpm test${RESET}                   Run tests\n"
echo ""
printf "  ${CYAN}../agents/agents-catalog.json${RESET}   Agent registry catalog\n"
printf "  ${CYAN}../agents/templates/index.json${RESET} Agent template registry\n"
printf "  ${CYAN}../agents/skills/index.json${RESET}    Formal skill hub\n"
printf "  ${CYAN}../agents/skills/README.md${RESET}    Full local skill library\n"
echo ""

printf "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}${GREEN}║  🦞  Crustacean Automation ready!                           ║${RESET}\n"
printf "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n"
echo ""
printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n"
printf "  ${YELLOW}Add ${LOCAL_BIN_DIR} to PATH if needed.${RESET}\n"
echo ""
