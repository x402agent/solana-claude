#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OpenClawd — one-shot installer                                         ║
# ║  curl -fsSL https://solanaclawd.com/install.sh | bash                   ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

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

# ── Bitwarden Secrets Manager (bws) config + flags ────────────────────────────
CLAWD_DIR="${HOME}/.clawd"
BWS_TOKEN_FILE="${BWS_TOKEN_FILE:-$CLAWD_DIR/bws-access-token}"
BWS_PROJECT_ID="${BWS_PROJECT_ID:-}"
BWS_BRANCH="${SOLANA_CLAWD_BWS_BRANCH:-main}"
BWS_DO_INSTALL=0
BWS_DO_SEED=0
BWS_DO_SAVE_TOKEN=0
BWS_OVERWRITE=0
BWS_DISABLED="${SOLANA_CLAWD_BWS:-1}"; [ "$BWS_DISABLED" = "0" ] && BWS_DISABLED=1 || BWS_DISABLED=0

for arg in "$@"; do
  case "$arg" in
    --bws-install) BWS_DO_INSTALL=1 ;;
    --bws-token=*) export BWS_ACCESS_TOKEN="${arg#--bws-token=}" ;;
    --bws-project=*) BWS_PROJECT_ID="${arg#--bws-project=}" ;;
    --bws-save-token) BWS_DO_SAVE_TOKEN=1 ;;
    --bws-seed) BWS_DO_SEED=1 ;;
    --bws-overwrite) BWS_OVERWRITE=1 ;;
    --no-bws) BWS_DISABLED=1 ;;
    *) : ;;  # ignore unknown flags (installer is permissive)
  esac
done
[ -n "$BWS_PROJECT_ID" ] && export BWS_PROJECT_ID
export BWS_TOKEN_FILE

# Source the shared Bitwarden helper library. Prefer a local checkout; when
# running via `curl | bash`, fetch it from the repo (single source of truth).
load_bitwarden_lib() {
  [ "$BWS_DISABLED" = "1" ] && return 1
  local local_lib raw tmp
  for local_lib in \
    "$(dirname "$0" 2>/dev/null)/../scripts/bitwarden-secrets.sh" \
    "./scripts/bitwarden-secrets.sh"; do
    if [ -f "$local_lib" ]; then
      # shellcheck source=/dev/null
      . "$local_lib" && return 0
    fi
  done
  command -v curl >/dev/null 2>&1 || { warn "curl needed to fetch Bitwarden helper; skipping"; return 1; }
  raw="https://raw.githubusercontent.com/x402agent/solana-clawd/${BWS_BRANCH}/scripts/bitwarden-secrets.sh"
  tmp="$(mktemp "${TMPDIR:-/tmp}/bwslib.XXXXXX")" || return 1
  if curl -fsSL "$raw" -o "$tmp" 2>/dev/null && [ -s "$tmp" ]; then
    # shellcheck source=/dev/null
    . "$tmp" && { rm -f "$tmp"; return 0; }
  fi
  rm -f "$tmp"
  warn "could not load Bitwarden helper from $raw"
  return 1
}

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

# SolanaTracker (OODA loop example)
# SOLANA_TRACKER_API_KEY=
ENV
  ok "Created ${ENV_FILE}"
  warn "Fill in your XAI_API_KEY (minimum) before starting clawd"
else
  info "~/.clawd/.env already exists — skipping"
fi
chmod 0600 "${ENV_FILE}" 2>/dev/null || true

# ── Bitwarden Secrets Manager (optional secret manager) ───────────────────────
step "Secret manager (Bitwarden Secrets Manager)"
if [ "$BWS_DISABLED" = "1" ]; then
  info "Bitwarden integration disabled (--no-bws / SOLANA_CLAWD_BWS=0)"
elif load_bitwarden_lib; then
  if [ "$BWS_DO_INSTALL" = "1" ]; then
    bws_ensure_cli || warn "bws CLI not available; continuing"
  fi
  if [ "$BWS_DO_SAVE_TOKEN" = "1" ] && [ -n "${BWS_ACCESS_TOKEN:-}" ]; then
    bws_save_token "$BWS_TOKEN_FILE" "$BWS_ACCESS_TOKEN" || warn "could not save token"
  fi
  if [ "$BWS_DO_SEED" = "1" ]; then
    bws_have_cli || bws_ensure_cli || warn "bws CLI required to seed; skipping"
    bws_seed_env_file "$ENV_FILE" "$BWS_OVERWRITE" || warn "secret seed failed"
  fi

  # Write a runtime-injecting wrapper: `clawd-secure` runs clawd under `bws run`
  # so secrets are pulled fresh from Bitwarden and never persisted.
  if bws_token_present || [ "$BWS_DO_SAVE_TOKEN" = "1" ]; then
    mkdir -p "$CLAWD_DIR/bin"
    {
      printf '#!/usr/bin/env bash\nset -euo pipefail\n'
      printf '# clawd-secure — run any clawd CLI with Bitwarden secret injection.\n'
      printf '# Usage: clawd-secure [clawd|clawd-perps|clawd-tui|...] [args]\n'
      bws_launcher_prelude "$ENV_FILE" "$BWS_TOKEN_FILE" "$BWS_PROJECT_ID"
      printf 'CMD="${1:-clawd}"; shift 2>/dev/null || true\n'
      printf 'set -- "$CMD" "$@"\n'
      bws_launcher_exec
    } > "$CLAWD_DIR/bin/clawd-secure"
    chmod +x "$CLAWD_DIR/bin/clawd-secure"
    ok "Wrote runtime-injection wrapper: $CLAWD_DIR/bin/clawd-secure"
  fi

  if bws_token_present; then
    ok "Bitwarden token configured — use 'clawd-secure clawd' for runtime injection"
  else
    info "No token yet. Set BWS_ACCESS_TOKEN (or --bws-token=...) then re-run with --bws-seed/--bws-save-token"
  fi
else
  info "Bitwarden helper not loaded; enable with: BWS_ACCESS_TOKEN=... bash install.sh --bws-install --bws-save-token"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}🦞  OpenClawd installed!${RESET}\n\n"

printf "  ${BOLD}Quick start:${RESET}\n"
printf "  ${CYAN}1.${RESET} Edit ${BOLD}${ENV_FILE}${RESET} → add your ${BOLD}XAI_API_KEY${RESET}\n"
printf "  ${CYAN}2.${RESET} Run   ${BOLD}clawd${RESET}            — interactive Grok/xAI TUI\n"
printf "  ${CYAN}3.${RESET} Run   ${BOLD}clawd --help${RESET}     — all options\n"
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

printf "  ${BOLD}Secret manager (Bitwarden Secrets Manager):${RESET}\n"
printf "  ${CYAN}export BWS_ACCESS_TOKEN=...${RESET}   # machine-account token\n"
printf "  ${CYAN}bash install.sh --bws-install --bws-save-token --bws-seed${RESET}\n"
printf "  Then run with runtime secret injection (no plaintext on disk):\n"
printf "  ${CYAN}~/.clawd/bin/clawd-secure clawd${RESET}     # = bws run -- clawd\n"
printf "  Disable anytime with ${BOLD}--no-bws${RESET} or ${BOLD}SOLANA_CLAWD_BWS=0${RESET}.\n"
printf "\n"

printf "  ${BOLD}Links:${RESET}\n"
printf "  Website:  ${CYAN}https://solanaclawd.com${RESET}\n"
printf "  X:        ${CYAN}https://x.com/clawddevs${RESET}\n"
printf "  Telegram: ${CYAN}https://t.me/clawdbot_sol_bot${RESET}\n"
printf "  Hotline:  909-413-5567\n"
printf "  CA:       8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\n"
printf "\n"

printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n\n"
