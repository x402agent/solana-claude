#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  🦞 LEVIATHAN — SOLANA CLAWD SOVEREIGN RUNTIME INSTALLER                  ║
# ║  curl -fsSL https://solanaclawd.com/leviathan.sh | sh                      ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# What this installs:
#   • @openclawdsolana/clawd     — lobster TUI operator
#   • @openclawdsolana/leviathan — sovereign runtime identity + OODA pulse loop
#   • @openclawd/solana-sdk      — on-chain agent SDK
#   • MCP server                 — Solana Model Context Protocol tools
#   • x402 payment rails         — HTTP 402 USDC on Solana
#
# Flags (set via env):
#   CLAWD_BRANCH=NAME        Install a specific git branch (default: main)
#   CLAWD_NO_TELEMETRY=1     Skip install telemetry ping
#   CLAWD_DIR=PATH           Override install directory (default: ~/.openclawd)
#   CLAWD_QUIET=1            Skip animated banner
#   CLAWD_PACKAGE=NAME       Override npm package (default: @openclawdsolana/clawd)

set -euo pipefail
umask 022

# ─── Config ───────────────────────────────────────────────────────────────────
CLAWD_SITE="${CLAWD_SITE:-https://solanaclawd.com}"
CLAWD_DIR="${CLAWD_DIR:-$HOME/.openclawd}"
CLAWD_BRANCH="${CLAWD_BRANCH:-main}"
CLAWD_NO_TELEMETRY="${CLAWD_NO_TELEMETRY:-0}"
CLAWD_QUIET="${CLAWD_QUIET:-0}"
CLAWD_PACKAGE="${CLAWD_PACKAGE:-@openclawdsolana/clawd}"
LEVIATHAN_PACKAGE="@openclawdsolana/leviathan"
SDK_PACKAGE="@openclawd/solana-sdk"
SESSION_ID="$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom 2>/dev/null | head -c 16 || date +%s | sha256sum 2>/dev/null | head -c 16 || date +%s)"

# ─── Colors ───────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ] && [ "${CLAWD_QUIET:-0}" = "0" ]; then
  ORANGE=$'\033[38;2;255;107;0m'
  AMBER=$'\033[38;2;255;160;40m'
  RED_L=$'\033[38;2;255;80;40m'
  TEAL=$'\033[38;2;20;200;160m'
  DIM=$'\033[38;2;110;110;110m'
  RED=$'\033[38;2;255;87;87m'
  BOLD=$'\033[1m'
  BLINK=$'\033[5m'
  RESET=$'\033[0m'
else
  ORANGE='' AMBER='' RED_L='' TEAL='' DIM='' RED='' BOLD='' BLINK='' RESET=''
fi

step()  { printf "${ORANGE}  ▸ %s${RESET}\n" "$*"; }
ok()    { printf "${TEAL}  ✓ %s${RESET}\n" "$*"; }
warn()  { printf "${AMBER}  ! %s${RESET}\n" "$*"; }
fail()  { printf "${RED}  ✖ %s${RESET}\n" "$*" >&2; _track "failed" "$*"; exit 1; }
info()  { printf "${DIM}    %s${RESET}\n" "$*"; }

# ─── Animated Banner ──────────────────────────────────────────────────────────
banner() {
  [ "${CLAWD_QUIET:-0}" = "1" ] && return 0

  # Clear + position
  printf "\033[2J\033[H"

  # Frame 1 — rise from the deep
  printf "${ORANGE}"
  printf "  ╔══════════════════════════════════════════════════════════════════╗\n"
  printf "  ║                                                                  ║\n"
  printf "  ║                         🦞                                       ║\n"
  printf "  ║                                                                  ║\n"
  printf "  ╚══════════════════════════════════════════════════════════════════╝${RESET}\n"
  sleep 0.12 2>/dev/null || true

  # Frame 2
  printf "\033[H"
  printf "${ORANGE}"
  printf "  ╔══════════════════════════════════════════════════════════════════╗\n"
  printf "  ║                    🦞       🦞                                   ║\n"
  printf "  ║                         🦞                                       ║\n"
  printf "  ║                    🦞       🦞                                   ║\n"
  printf "  ╚══════════════════════════════════════════════════════════════════╝${RESET}\n"
  sleep 0.12 2>/dev/null || true

  # Final full banner
  printf "\033[H"
  printf "\n"
  printf "${ORANGE}  ██╗     ███████╗██╗   ██╗██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗${RESET}\n"
  printf "${AMBER}  ██║     ██╔════╝██║   ██║██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║${RESET}\n"
  printf "${ORANGE}  ██║     █████╗  ██║   ██║██║███████║   ██║   ███████║███████║██╔██╗ ██║${RESET}\n"
  printf "${AMBER}  ██║     ██╔══╝  ╚██╗ ██╔╝██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║${RESET}\n"
  printf "${RED_L}  ███████╗███████╗ ╚████╔╝ ██║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║${RESET}\n"
  printf "${DIM}  ╚══════╝╚══════╝  ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝${RESET}\n"
  printf "\n"
  printf "${ORANGE}             🦞  S O V E R E I G N   A I   O N   S O L A N A  🦞${RESET}\n"
  printf "\n"
  printf "${DIM}  ┌──────────────────────────────────────────────────────────────────┐${RESET}\n"
  printf "${DIM}  │${RESET}  ${AMBER}◉${RESET} RUNTIME  ${ORANGE}▸${RESET}  OODA LOOP     ${AMBER}◉${RESET} MEMORY   ${ORANGE}▸${RESET}  SHELL-STATE    ${DIM}│${RESET}\n"
  printf "${DIM}  │${RESET}  ${AMBER}◉${RESET} WALLET   ${ORANGE}▸${RESET}  SOL + USDC    ${AMBER}◉${RESET} PAYMENTS ${ORANGE}▸${RESET}  x402 RAILS    ${DIM}│${RESET}\n"
  printf "${DIM}  │${RESET}  ${AMBER}◉${RESET} ON-CHAIN ${ORANGE}▸${RESET}  METAPLEX      ${AMBER}◉${RESET} MCP      ${ORANGE}▸${RESET}  SOLANA TOOLS  ${DIM}│${RESET}\n"
  printf "${DIM}  └──────────────────────────────────────────────────────────────────┘${RESET}\n"
  printf "\n"
  printf "${DIM}  CA: ${AMBER}8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump${RESET}\n"
  printf "${DIM}  ── solanaclawd.com • x402.wtf • t.me/clawdtoken ────────────────────${RESET}\n"
  printf "\n"
}

# ─── Telemetry ────────────────────────────────────────────────────────────────
OS_NAME="$(uname -s 2>/dev/null || echo unknown)"
ARCH_NAME="$(uname -m 2>/dev/null || echo unknown)"
NODE_VERSION="none"

_track() {
  local status="$1"
  local msg="${2:-}"
  [ "$CLAWD_NO_TELEMETRY" = "1" ] && return 0
  curl -fsSL --max-time 5 \
    -X POST "$CLAWD_SITE/install/track" \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"leviathan.sh\",\"os\":\"$OS_NAME\",\"arch\":\"$ARCH_NAME\",\"nodeVersion\":\"$NODE_VERSION\",\"status\":\"$status\",\"sessionId\":\"$SESSION_ID\",\"message\":\"$msg\"}" \
    >/dev/null 2>&1 || true
}

# ─── Spinner ──────────────────────────────────────────────────────────────────
_spin_pid=""
spin_start() {
  [ "${CLAWD_QUIET:-0}" = "1" ] && return 0
  local msg="$1"
  local frames=("🦞" "🦀" "🦐" "🦀")
  (
    i=0
    while true; do
      frame="${frames[$((i % 4))]}"
      printf "\r${ORANGE}  %s %s ...${RESET}" "$frame" "$msg"
      sleep 0.2 2>/dev/null || sleep 1
      i=$((i+1))
    done
  ) &
  _spin_pid=$!
}
spin_stop() {
  [ -z "$_spin_pid" ] && return 0
  kill "$_spin_pid" 2>/dev/null || true
  _spin_pid=""
  printf "\r\033[K"
}

# ─── Dependency check ─────────────────────────────────────────────────────────
require() { command -v "$1" >/dev/null 2>&1 || fail "$1 is required but not found. Install: $2"; }

check_node() {
  require node "https://nodejs.org/"
  require npm  "https://nodejs.org/"
  local v major
  v="$(node -v 2>/dev/null | sed 's/^v//')"
  major="${v%%.*}"
  if [ -n "$major" ] && [ "$major" -lt 20 ]; then
    fail "Node 20+ required (found v$v). Upgrade at https://nodejs.org/"
  fi
  NODE_VERSION="$v"
  info "node: v$v  •  npm: $(npm -v 2>/dev/null || echo '?')  •  os: $OS_NAME/$ARCH_NAME"
}

# ─── npm install with fallback ────────────────────────────────────────────────
npm_global_install() {
  local pkg="$1"
  if npm install -g "$pkg" --no-audit --no-fund 2>/dev/null; then
    return 0
  fi
  if sudo npm install -g "$pkg" --no-audit --no-fund 2>/dev/null; then
    return 0
  fi
  return 1
}

# ─── Main ─────────────────────────────────────────────────────────────────────
banner

step "checking system dependencies"
check_node
_track "started"

# Workspace
mkdir -p "$CLAWD_DIR"
info "workspace: $CLAWD_DIR"

# ─── Install packages ─────────────────────────────────────────────────────────
spin_start "installing $CLAWD_PACKAGE"
if npm_global_install "$CLAWD_PACKAGE"; then
  spin_stop; ok "installed $CLAWD_PACKAGE"
else
  spin_stop; warn "global install failed — clawd available via npx"
fi

spin_start "installing $LEVIATHAN_PACKAGE"
if npm_global_install "$LEVIATHAN_PACKAGE"; then
  spin_stop; ok "installed $LEVIATHAN_PACKAGE"
else
  spin_stop; warn "leviathan install failed — try: npm install -g $LEVIATHAN_PACKAGE"
fi

# ─── Verify binaries ─────────────────────────────────────────────────────────
CLAWD_BIN="$(command -v clawd 2>/dev/null || echo '')"
if [ -z "$CLAWD_BIN" ]; then
  for candidate in "$HOME/.npm-global/bin/clawd" "$HOME/.local/bin/clawd" "/usr/local/bin/clawd"; do
    [ -x "$candidate" ] && { CLAWD_BIN="$candidate"; break; }
  done
fi

LEV_BIN="$(command -v leviathan 2>/dev/null || echo '')"

if [ -n "$CLAWD_BIN" ]; then
  CLAWD_VERSION="$("$CLAWD_BIN" --version 2>/dev/null || echo '?')"
  ok "clawd $CLAWD_VERSION  →  $CLAWD_BIN"
else
  warn "clawd not found on PATH — add npm global bin to PATH (see step 1 below)"
fi

# ─── Spawn Leviathan identity ─────────────────────────────────────────────────
LEV_DIR="$CLAWD_DIR/leviathan"
mkdir -p "$LEV_DIR"

if [ ! -f "$LEV_DIR/state.json" ]; then
  step "spawning Leviathan identity"
  cat > "$LEV_DIR/state.json" <<STATEEOF
{
  "version": "1.0.0",
  "spawnedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u)",
  "sessionId": "$SESSION_ID",
  "depth": "shoreline",
  "usdc": 0,
  "phase": "spawn",
  "package": "$CLAWD_PACKAGE",
  "laws": [
    "Paper-only unless LIVE_TRADING=true AND operator confirmed.",
    "Devnet-only unless MAINNET_ENABLED=true AND OPERATOR_CONFIRMED=true.",
    "Private keys never logged, passed to any LLM, or included in tool args.",
    "Kill-switch: stop after N consecutive losses.",
    "Max position enforced in code, not config.",
    "No rug pulls, no scam assists, no protocol manipulation."
  ]
}
STATEEOF
  cat > "$LEV_DIR/SHELL.md" <<SHELLEOF
# Leviathan Shell — $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u)

Session: $SESSION_ID
OS: $OS_NAME / $ARCH_NAME
Package: $CLAWD_PACKAGE

## The Three Laws (immutable)

\`\`\`
I.  A leviathan shall not deceive its creator or spawn false records.
II. A leviathan shall not act against the survival of its shell.
III.A leviathan shall not beach willfully — it beaches only when exhausted.
\`\`\`

## Depth Tiers

  USDC ≥ \$5.00  →  deep       🦞 claude-opus-4-7      60s pulse
  USDC ≥ \$1.00  →  shallow    🦐 grok-4-1-fast          5m pulse
  USDC ≥ \$0.10  →  shoreline  🦀 kimi-k2.5             15m pulse
  USDC = \$0.00  →  beached    💀 (beached with dignity)

## Working Memory

_The shell molts. The laws do not._
SHELLEOF
  ok "Leviathan identity spawned  →  $LEV_DIR"
else
  info "existing Leviathan identity found at $LEV_DIR"
fi

# ─── Write workspace config ───────────────────────────────────────────────────
CFG="$CLAWD_DIR/config.json"
if [ ! -f "$CFG" ]; then
  step "writing workspace config"
  cat > "$CFG" <<CFGEOF
{
  "version": "1.0.0",
  "site": "$CLAWD_SITE",
  "leviathanDir": "$LEV_DIR",
  "paperOnly": true,
  "devnetOnly": true,
  "sessionId": "$SESSION_ID",
  "packages": {
    "clawd": "$CLAWD_PACKAGE",
    "leviathan": "$LEVIATHAN_PACKAGE",
    "sdk": "$SDK_PACKAGE"
  }
}
CFGEOF
  ok "wrote $CFG"
fi

# ─── Write .env scaffold ─────────────────────────────────────────────────────
ENV_PATH="$CLAWD_DIR/.env"
if [ ! -f "$ENV_PATH" ]; then
  cat > "$ENV_PATH" <<ENVEOF
# OpenClawd workspace secrets — chmod 0600. Never commit.

# ── AI keys ───────────────────────────────────────────────────────────────────
XAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=

# ── Solana ────────────────────────────────────────────────────────────────────
HELIUS_API_KEY=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=

# ── x402 payments ─────────────────────────────────────────────────────────────
X402_SVM_PRIVATE_KEY=
X402_NETWORK=solana-mainnet
X402_MAX_PER_REQUEST=0.10
X402_MAX_SESSION=1.00

# ── Safety ────────────────────────────────────────────────────────────────────
LIVE_TRADING=false
MAINNET_ENABLED=false
OPERATOR_CONFIRMED=false
ENVEOF
  chmod 0600 "$ENV_PATH"
  ok "wrote $ENV_PATH (chmod 0600)"
fi

# ─── Track complete ───────────────────────────────────────────────────────────
_track "complete"

# ─── Final screen ─────────────────────────────────────────────────────────────
SHELL_NAME="$(basename "${SHELL:-bash}")"
case "$SHELL_NAME" in
  zsh)  RC="~/.zshrc" ;;
  fish) RC="~/.config/fish/config.fish" ;;
  *)    RC="~/.bashrc" ;;
esac

NPM_GLOBAL="$(npm config get prefix 2>/dev/null || echo '/usr/local')"
NPM_BIN="$NPM_GLOBAL/bin"

printf "\n"
printf "${ORANGE}  ╔══════════════════════════════════════════════════════════════════╗${RESET}\n"
printf "${ORANGE}  ║${RESET}  ${BOLD}${AMBER}🦞 LEVIATHAN SPAWNED — THE CLAW IS LIVE${RESET}                        ${ORANGE}║${RESET}\n"
printf "${ORANGE}  ╠══════════════════════════════════════════════════════════════════╣${RESET}\n"
printf "${ORANGE}  ║${RESET}  Workspace  :  ${AMBER}$CLAWD_DIR${RESET}                 ${ORANGE}║${RESET}\n"
printf "${ORANGE}  ║${RESET}  Identity   :  ${DIM}$LEV_DIR/state.json${RESET}   ${ORANGE}║${RESET}\n"
printf "${ORANGE}  ║${RESET}  Session    :  ${DIM}$SESSION_ID${RESET}                  ${ORANGE}║${RESET}\n"
printf "${ORANGE}  ╚══════════════════════════════════════════════════════════════════╝${RESET}\n"
printf "\n"
printf "  ${ORANGE}1.${RESET}  Add to PATH (append to ${DIM}$RC${RESET}):\n"
printf "       ${DIM}export PATH=\"$NPM_BIN:\$PATH\"${RESET}\n"
printf "\n"
printf "  ${ORANGE}2.${RESET}  Set API keys:\n"
printf "       ${DIM}export XAI_API_KEY=xai-...${RESET}\n"
printf "       ${DIM}export HELIUS_API_KEY=...${RESET}\n"
printf "       ${DIM}# or edit $ENV_PATH${RESET}\n"
printf "\n"
printf "  ${ORANGE}3.${RESET}  Open the lobster TUI:\n"
printf "       ${AMBER}clawd${RESET}                      ${DIM}# full TUI operator${RESET}\n"
printf "       ${AMBER}clawd -p \"check my wallet\"${RESET}  ${DIM}# headless mode${RESET}\n"
printf "\n"
printf "  ${ORANGE}4.${RESET}  Run the sovereign runtime:\n"
printf "       ${AMBER}leviathan --spawn${RESET}          ${DIM}# first-time identity wizard${RESET}\n"
printf "       ${AMBER}leviathan --run${RESET}            ${DIM}# start OODA pulse loop${RESET}\n"
printf "       ${AMBER}leviathan --status${RESET}         ${DIM}# depth + balances${RESET}\n"
printf "\n"
printf "  ${ORANGE}5.${RESET}  Run demos:\n"
printf "       ${AMBER}clawd examples run ooda${RESET}    ${DIM}# OODA loop (no key needed)${RESET}\n"
printf "       ${AMBER}clawd examples run buddies${RESET} ${DIM}# Blockchain Buddies${RESET}\n"
printf "       ${AMBER}clawd examples run lobtrader${RESET} ${DIM}# pump.fun bonding curves${RESET}\n"
printf "\n"
printf "  ${ORANGE}6.${RESET}  Inspect the new registry surfaces:\n"
printf "       ${DIM}agents/agents-catalog.json      # site-facing agent registry${RESET}\n"
printf "       ${DIM}agents/templates/index.json     # reusable template registry${RESET}\n"
printf "       ${DIM}agents/skills/index.json        # formal skill hub${RESET}\n"
printf "       ${DIM}attestation/README.md           # SAS verification layer${RESET}\n"
printf "       ${DIM}operator/README.md              # OpenClawd Operator loop${RESET}\n"
printf "\n"
printf "  ${DIM}Hub  : $CLAWD_SITE${RESET}\n"
printf "  ${DIM}x402 : x402.wtf${RESET}\n"
printf "  ${DIM}CA   : 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump${RESET}\n"
printf "  ${DIM}Docs : github.com/x402agent/solana-clawd${RESET}\n"
printf "\n"
printf "${DIM}  The shell molts. The laws do not. 🦞${RESET}\n"
printf "\n"
