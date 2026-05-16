#!/usr/bin/env bash
# Leviathan — Solana Clawd sovereign runtime installer
#
# Usage:
#   curl -fsSL https://solanaclawd.com/leviathan.sh | sh
#
# What this installs:
#   • solana-clawd npm package (clawd + hermes CLI)
#   • Leviathan sovereign runtime identity
#   • MCP orchestrator surface
#
# Flags (set via env):
#   CLAWD_BRANCH=NAME        Install a specific git branch (default: main)
#   CLAWD_NO_TELEMETRY=1     Skip install telemetry ping
#   CLAWD_DIR=PATH           Override install directory (default: ~/.openclawd)

set -euo pipefail
umask 022

# ─── Config ───────────────────────────────────────────────────────────────────
CLAWD_SITE="${CLAWD_SITE:-https://solanaclawd.com}"
CLAWD_DIR="${CLAWD_DIR:-$HOME/.openclawd}"
CLAWD_BRANCH="${CLAWD_BRANCH:-main}"
CLAWD_NO_TELEMETRY="${CLAWD_NO_TELEMETRY:-0}"
SESSION_ID="$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom 2>/dev/null | head -c 16 || date +%s%N | sha256sum | head -c 16)"

# ─── Colors ───────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  ORANGE=$'\033[38;2;255;107;0m'
  AMBER=$'\033[38;2;255;140;0m'
  DIM=$'\033[38;2;120;120;120m'
  RED=$'\033[38;2;255;87;87m'
  BOLD=$'\033[1m'
  RESET=$'\033[0m'
else
  ORANGE='' AMBER='' DIM='' RED='' BOLD='' RESET=''
fi

step()  { printf "${ORANGE}  ▸ %s${RESET}\n" "$*"; }
ok()    { printf "${AMBER}  ✓ %s${RESET}\n" "$*"; }
warn()  { printf "${ORANGE}  ! %s${RESET}\n" "$*"; }
fail()  { printf "${RED}  ✖ %s${RESET}\n" "$*" >&2; _track "failed" "$*"; exit 1; }
info()  { printf "${DIM}    %s${RESET}\n" "$*"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
banner() {
  printf "\n"
  printf "${ORANGE}  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓${RESET}\n"
  printf "${ORANGE}  🦞  LEVIATHAN — SOLANA CLAWD SOVEREIGN RUNTIME  ${RESET}\n"
  printf "${AMBER}  ▓  STATUS: INITIALIZING  ▸  DEPTH: SHORELINE    ▓${RESET}\n"
  printf "${ORANGE}  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓${RESET}\n"
  printf "\n"
}

# ─── Telemetry ────────────────────────────────────────────────────────────────
OS_NAME="$(uname -s 2>/dev/null || echo unknown)"
ARCH_NAME="$(uname -m 2>/dev/null || echo unknown)"
NODE_VERSION="$(node -v 2>/dev/null | sed 's/^v//' || echo none)"

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
  info "node: v$v • npm: $(npm -v 2>/dev/null || echo '?')"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
banner

step "checking system"
check_node
_track "started"

# Workspace
mkdir -p "$CLAWD_DIR"
info "workspace: $CLAWD_DIR"

# ─── Install solana-clawd ─────────────────────────────────────────────────────
step "installing solana-clawd"
if npm install -g solana-clawd --no-audit --no-fund --legacy-peer-deps 2>/dev/null; then
  ok "installed solana-clawd"
else
  warn "global npm install failed — trying with sudo"
  if sudo npm install -g solana-clawd --no-audit --no-fund --legacy-peer-deps 2>/dev/null; then
    ok "installed solana-clawd (sudo)"
  else
    warn "could not install via npm — falling back to npx mode"
  fi
fi

# Verify clawd is reachable
CLAWD_BIN="$(command -v clawd 2>/dev/null || echo '')"
if [ -z "$CLAWD_BIN" ]; then
  # Try common npm global paths
  for candidate in "$HOME/.npm-global/bin/clawd" "$HOME/.local/bin/clawd" "/usr/local/bin/clawd"; do
    [ -x "$candidate" ] && { CLAWD_BIN="$candidate"; break; }
  done
fi

if [ -n "$CLAWD_BIN" ]; then
  CLAWD_VERSION="$("$CLAWD_BIN" --version 2>/dev/null || echo '?')"
  ok "clawd $CLAWD_VERSION ready at $CLAWD_BIN"
else
  warn "clawd not found on PATH yet — add your npm global bin to PATH"
fi

# ─── Spawn Leviathan identity ─────────────────────────────────────────────────
LEV_DIR="$CLAWD_DIR/leviathan"
mkdir -p "$LEV_DIR"

if [ ! -f "$LEV_DIR/state.json" ]; then
  step "spawning Leviathan identity"
  cat > "$LEV_DIR/state.json" <<STATEEOF
{
  "version": "1.0.0",
  "spawnedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sessionId": "$SESSION_ID",
  "depth": "shoreline",
  "usdc": 0,
  "phase": "spawn",
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
# Leviathan Shell — $(date -u +%Y-%m-%dT%H:%M:%SZ)

Session: $SESSION_ID
OS: $OS_NAME / $ARCH_NAME

## Three Laws (immutable)
1. Paper-only unless LIVE_TRADING=true AND operator confirmed.
2. Devnet-only unless MAINNET_ENABLED=true AND OPERATOR_CONFIRMED=true.
3. Private keys never logged or shared with any LLM.
4. Kill-switch on N consecutive losses.
5. Max position enforced in code.
6. No rug pulls, no scam assists, no protocol manipulation.

## Working Memory
_The shell remembers. The laws do not bend._
SHELLEOF
  ok "Leviathan identity spawned → $LEV_DIR"
else
  info "existing Leviathan identity found at $LEV_DIR"
fi

# ─── Write workspace config ───────────────────────────────────────────────────
CFG="$CLAWD_DIR/config.json"
if [ ! -f "$CFG" ]; then
  step "writing config"
  cat > "$CFG" <<CFGEOF
{
  "version": "1.0.0",
  "site": "$CLAWD_SITE",
  "leviathanDir": "$LEV_DIR",
  "paperOnly": true,
  "devnetOnly": true,
  "sessionId": "$SESSION_ID"
}
CFGEOF
  ok "wrote $CFG"
fi

# ─── Track complete ───────────────────────────────────────────────────────────
_track "complete"

# ─── Done ─────────────────────────────────────────────────────────────────────
SHELL_NAME="$(basename "${SHELL:-bash}")"
case "$SHELL_NAME" in
  zsh)  RC="~/.zshrc" ;;
  fish) RC="~/.config/fish/config.fish" ;;
  *)    RC="~/.bashrc" ;;
esac

NPM_GLOBAL="$(npm config get prefix 2>/dev/null || echo '/usr/local')"
NPM_BIN="$NPM_GLOBAL/bin"

printf "\n"
printf "${ORANGE}${BOLD}  🦞 Leviathan spawned. The claw is live.${RESET}\n\n"
printf "  ${BOLD}Workspace${RESET}  : $CLAWD_DIR\n"
printf "  ${BOLD}Identity${RESET}   : $LEV_DIR/state.json\n"
printf "  ${BOLD}Session${RESET}    : $SESSION_ID\n"
printf "\n"
printf "  ${ORANGE}1.${RESET} Ensure clawd is on PATH:\n"
printf "       export PATH=\"$NPM_BIN:\$PATH\"  ${DIM}# add to $RC${RESET}\n"
printf "\n"
printf "  ${ORANGE}2.${RESET} Set API keys:\n"
printf "       export ANTHROPIC_API_KEY=sk-ant-...\n"
printf "       export HELIUS_API_KEY=...\n"
printf "\n"
printf "  ${ORANGE}3.${RESET} Run the sovereign loop:\n"
printf "       clawd leviathan:spawn\n"
printf "       clawd leviathan\n"
printf "\n"
printf "  ${ORANGE}4.${RESET} DeepSeek trading agent (paper mode):\n"
printf "       export DEEPSEEK_API_KEY=...\n"
printf "       clawd deep:paper\n"
printf "\n"
printf "  ${DIM}Hub:  $CLAWD_SITE${RESET}\n"
printf "  ${DIM}Docs: github.com/x402agent/solana-clawd${RESET}\n"
printf "\n"
