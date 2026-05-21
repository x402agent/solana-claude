#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OpenClawd — one-shot installer                                         ║
# ║  curl -fsSL https://solanaclawd.com/install.sh | bash                   ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

CLAWD_TERMINAL_URL="${CLAWD_TERMINAL_URL:-http://localhost:3000/terminal}"

# ── Terminal colours ──────────────────────────────────────────────────────────
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

# ── Banner ────────────────────────────────────────────────────────────────────
printf "${CYAN}${BOLD}"
cat << 'BANNER'

   ██████╗██╗      █████╗ ██╗    ██╗██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝

  🦞  OpenClawd — Sovereign AI Lobster Runtime on Solana
  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump

BANNER
printf "${RESET}"

# ── Node.js check ─────────────────────────────────────────────────────────────
step "Checking Node.js"

if ! command -v node &>/dev/null; then
  die "Node.js not found. Install v20+ from https://nodejs.org"
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 20 ]; then
  die "Node.js v20+ required (found v${NODE_MAJOR}). Update at https://nodejs.org"
fi

NODE_VER=$(node --version | sed 's/v//')
ok "Node.js ${NODE_VER}"

# ── npm check ─────────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  die "npm not found — it ships with Node.js. Please reinstall Node.js."
fi
ok "npm $(npm --version)"

# ── Install full Clawd npm surface ────────────────────────────────────────────
CLAWD_NPM_PACKAGES=(
  "@openclawdsolana/clawd"
  "@openclawdsolana/clawd-tui"
  "@openclawdsolana/clawd-sdk"
  "@openclawdsolana/clawd-standalone"
  "@openclawdsolana/clawd-wallet"
  "@openclawdsolana/clawd-perps"
  "clawd-automaton"
  "x402.wtf"
  "x402agent-nanoclawd-cli"
)

step "Installing Clawd npm packages"
info "Running: npm install -g ${CLAWD_NPM_PACKAGES[*]}"
npm install -g "${CLAWD_NPM_PACKAGES[@]}"
ok "Clawd npm packages installed"

# ── Verify binary is on PATH ──────────────────────────────────────────────────
step "Verifying installation"

for bin in clawd clawd-tui clawd-standalone clawd-perps clawd-automaton x402.wtf nanoclawd; do
  if command -v "$bin" &>/dev/null; then
    ok "$bin ready at $(command -v "$bin")"
  else
    warn "$bin not found in PATH after npm install"
  fi
done

if command -v clawd &>/dev/null; then
  CLAWD_VER=$(clawd --version 2>/dev/null || echo "unknown")
  ok "clawd ${CLAWD_VER} ready"
else
  warn "clawd not found in PATH. You may need to add npm's global bin directory."

  # Detect npm prefix and suggest fix
  NPM_PREFIX=$(npm config get prefix 2>/dev/null || true)
  if [ -n "${NPM_PREFIX}" ]; then
    BIN_PATH="${NPM_PREFIX}/bin"
    printf "\n  ${BOLD}Add to your shell profile (.zshrc / .bashrc):${RESET}\n"
    printf "  ${CYAN}export PATH=\"${BIN_PATH}:\$PATH\"${RESET}\n\n"
    printf "  Then reload with: ${BOLD}source ~/.zshrc${RESET}  (or restart terminal)\n"
  fi
fi

# ── Create ~/.clawd directory ─────────────────────────────────────────────────
step "Setting up ~/.clawd"

CLAWD_DIR="${HOME}/.clawd"
mkdir -p "${CLAWD_DIR}"
ok "Created ${CLAWD_DIR}"

# ── Write .env template if missing ───────────────────────────────────────────
ENV_FILE="${CLAWD_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" << 'ENV'
# ╔══════════════════════════════════════════════════════════╗
# ║  OpenClawd environment — edit and restart clawd          ║
# ╚══════════════════════════════════════════════════════════╝

# ── AI (required for interactive chat) ────────────────────
# xAI / Grok (primary) — https://console.x.ai
XAI_API_KEY=

# Alternative: OpenRouter (supports Claude, Llama, Gemini, etc.)
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL1=anthropic/claude-sonnet-4-6

# ── Solana onchain data ────────────────────────────────────
# Helius — free API key at https://helius.dev
# HELIUS_API_KEY=

# ── Solana RPC ─────────────────────────────────────────────
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# (use Helius RPC for better rate limits)

# ── x402 payments (agent-to-agent USDC micropayments) ─────
# X402_SVM_PRIVATE_KEY=   # base58 Solana keypair
# X402_NETWORK=solana-mainnet
# X402_MAX_PER_REQUEST=0.10   # $0.10 per request max
# X402_MAX_SESSION=1.00       # $1.00 session cap

# ── Optional services ──────────────────────────────────────
# Research API (AutoResearch Wiki examples)
# RESEARCH_API_URL=http://localhost:8000

# Orchestrator (orchestrator-client example)
# ORCHESTRATOR_URL=http://localhost:8787

# Local web terminal
CLAWD_TERMINAL_URL=${CLAWD_TERMINAL_URL}

# SolanaTracker (OODA loop example)
# SOLANA_TRACKER_API_KEY=
ENV
  ok "Created ${ENV_FILE}"
  warn "Fill in your XAI_API_KEY (minimum) before starting clawd"
else
  info "~/.clawd/.env already exists — skipping"
  if ! grep -q "^CLAWD_TERMINAL_URL=" "$ENV_FILE" 2>/dev/null; then
    printf "\n# Local web terminal\nCLAWD_TERMINAL_URL=%s\n" "$CLAWD_TERMINAL_URL" >> "$ENV_FILE"
    ok "CLAWD_TERMINAL_URL added to existing .env"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}🦞  OpenClawd installed!${RESET}\n\n"

printf "  ${BOLD}Quick start:${RESET}\n"
printf "  ${CYAN}1.${RESET} Edit ${BOLD}${ENV_FILE}${RESET} → add your ${BOLD}XAI_API_KEY${RESET}\n"
printf "  ${CYAN}2.${RESET} Run   ${BOLD}clawd${RESET}            — interactive Grok/xAI TUI\n"
printf "  ${CYAN}3.${RESET} Run   ${BOLD}clawd --help${RESET}     — all options\n"
printf "  ${CYAN}4.${RESET} Open  ${BOLD}${CLAWD_TERMINAL_URL}${RESET} — local browser terminal\n"
printf "\n"

printf "  ${BOLD}Examples (no key needed for most):${RESET}\n"
printf "  ${CYAN}clawd examples list${RESET}               — see all 9 demos\n"
printf "  ${CYAN}clawd examples run ooda${RESET}            — OODA trading loop\n"
printf "  ${CYAN}clawd examples run lobtrader${RESET}       — pump.fun bonding curves\n"
printf "  ${CYAN}clawd examples run buddies${RESET}         — Blockchain Buddies\n"
printf "  ${CYAN}clawd examples run x402sol${RESET}         — x402 USDC payments\n"
printf "\n"

printf "  ${BOLD}Install leviathan (advanced, spawns on-chain agent):${RESET}\n"
printf "  ${CYAN}npm install -g @openclawdsolana/leviathan${RESET}\n"
printf "  ${CYAN}leviathan --spawn${RESET}\n"
printf "\n"

printf "  ${BOLD}Links:${RESET}\n"
printf "  Terminal: ${CYAN}${CLAWD_TERMINAL_URL}${RESET}\n"
printf "  Website:  ${CYAN}https://solanaclawd.com${RESET}\n"
printf "  X:        ${CYAN}https://x.com/clawddevs${RESET}\n"
printf "  Telegram: ${CYAN}https://t.me/clawdbot_sol_bot${RESET}\n"
printf "  Hotline:  909-413-5567\n"
printf "  CA:       8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\n"
printf "\n"

printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n\n"
