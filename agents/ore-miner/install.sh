#!/usr/bin/env bash
# ┌─────────────────────────────────────────────────────────────────────────────┐
# │  CLAWD ORE MINING AGENT — One-Shot Installer                               │
# │  World's first AI-driven autonomous miner for ORE v3 on Solana             │
# │                                                                             │
# │  One-shot (interactive prompt):                                             │
# │    curl -fsSL https://x402.wtf/ore/install.sh | bash                       │
# │                                                                             │
# │  One-liner with your own keys:                                              │
# │    DEEPSEEK_API_KEY=sk-... \                                                │
# │    RPC=https://mainnet.helius-rpc.com/?api-key=KEY \                        │
# │    KEYPAIR=~/.config/solana/id.json \                                       │
# │    curl -fsSL https://x402.wtf/ore/install.sh | bash                       │
# │                                                                             │
# │  Dry run (no transactions, just watch the agent think):                     │
# │    DRY_RUN=true curl -fsSL https://x402.wtf/ore/install.sh | bash          │
# └─────────────────────────────────────────────────────────────────────────────┘
set -euo pipefail

# ── colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}  →${NC} $*"; }
success() { echo -e "${GREEN}  ✓${NC} $*"; }
warn()    { echo -e "${YELLOW}  ⚠${NC} $*"; }
die()     { echo -e "${RED}  ✗ FATAL:${NC} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}$*${NC}\n"; }

# ── banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}    🦀  CLAWD ORE MINING AGENT  —  One-Shot Setup  ${NC}"
echo -e "${BOLD}${CYAN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── detect install location ───────────────────────────────────────────────────
# If we're running inside the repo already, use it. Otherwise clone.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
REPO_URL="${CLAWD_REPO_URL:-https://github.com/x402agent/solana-clawd}"
INSTALL_DIR="${CLAWD_INSTALL_DIR:-$HOME/.clawd/ore-miner}"

if [[ -f "$SCRIPT_DIR/package.json" ]] && grep -q '"@openclawd/ore-miner"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  AGENT_DIR="$SCRIPT_DIR"
  info "Using local repo at $AGENT_DIR"
else
  header "Fetching Clawd ORE Mining Agent"
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Updating existing install at $INSTALL_DIR"
    git -C "$INSTALL_DIR" pull --quiet --ff-only || warn "git pull failed, continuing with existing code"
    AGENT_DIR="$INSTALL_DIR/agents/ore-miner"
  else
    info "Cloning from $REPO_URL"
    git clone --quiet --depth 1 "$REPO_URL" "$INSTALL_DIR" \
      || die "git clone failed. Check your internet connection."
    AGENT_DIR="$INSTALL_DIR/agents/ore-miner"
    success "Cloned to $INSTALL_DIR"
  fi
fi

# ── prerequisites ─────────────────────────────────────────────────────────────
header "Checking prerequisites"

# Node.js >= 20
if ! command -v node &>/dev/null; then
  die "Node.js not found. Install Node.js >= 20 from https://nodejs.org"
fi
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  die "Node.js >= 20 required (found v$NODE_VERSION). Upgrade at https://nodejs.org"
fi
success "Node.js $(node --version)"

# npm
if ! command -v npm &>/dev/null; then
  die "npm not found. Install Node.js >= 20 from https://nodejs.org"
fi
success "npm $(npm --version)"

# Rust/Cargo (optional, for ore-cli binary)
HAS_CARGO=false
if command -v cargo &>/dev/null; then
  HAS_CARGO=true
  success "Cargo $(cargo --version)"
else
  warn "Rust/Cargo not found. The ore-cli binary won't be built."
  warn "Dry-run and observe modes will still work."
  warn "To install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

# ── collect env vars ──────────────────────────────────────────────────────────
header "Configuration"

# Helper: read with default
ask() {
  local var="$1" prompt="$2" default="${3:-}"
  local current="${!var:-}"

  if [[ -n "$current" ]]; then
    info "$var already set (${current:0:20}…)"
    return
  fi

  if [[ -n "$default" ]]; then
    echo -en "  ${BOLD}$prompt${NC} [${default}]: "
  else
    echo -en "  ${BOLD}$prompt${NC}: "
  fi

  read -r input
  if [[ -z "$input" && -n "$default" ]]; then
    export "$var"="$default"
  elif [[ -n "$input" ]]; then
    export "$var"="$input"
  fi
}

# AI key — DeepSeek preferred
if [[ -z "${DEEPSEEK_API_KEY:-}" && -z "${OPENROUTER_API_KEY:-}" && -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo ""
  echo -e "  ${BOLD}AI Provider${NC} — choose one:"
  echo -e "    ${GREEN}1)${NC} DeepSeek   (recommended — cheapest, thinking mode)"
  echo -e "    ${YELLOW}2)${NC} OpenRouter (Claude, GPT-4o, etc.)"
  echo -e "    ${YELLOW}3)${NC} Anthropic  (Claude direct)"
  echo -en "  Choice [1]: "
  read -r ai_choice
  ai_choice="${ai_choice:-1}"

  case "$ai_choice" in
    1|"")
      echo -en "  ${BOLD}DEEPSEEK_API_KEY${NC}: "
      read -r DEEPSEEK_API_KEY
      export DEEPSEEK_API_KEY
      ;;
    2)
      echo -en "  ${BOLD}OPENROUTER_API_KEY${NC}: "
      read -r OPENROUTER_API_KEY
      export OPENROUTER_API_KEY
      ;;
    3)
      echo -en "  ${BOLD}ANTHROPIC_API_KEY${NC}: "
      read -r ANTHROPIC_API_KEY
      export ANTHROPIC_API_KEY
      ;;
  esac
fi

[[ -n "${DEEPSEEK_API_KEY:-}" ]]   && success "DeepSeek key set"
[[ -n "${OPENROUTER_API_KEY:-}" ]] && success "OpenRouter key set"
[[ -n "${ANTHROPIC_API_KEY:-}" ]]  && success "Anthropic key set"

# RPC
if [[ -z "${RPC:-}" && -z "${HELIUS_RPC_URL:-}" ]]; then
  ask RPC "Solana RPC URL" "https://api.mainnet-beta.solana.com"
fi
[[ -n "${RPC:-}" ]] && success "RPC: ${RPC:0:40}…"

# Keypair
DEFAULT_KEYPAIR="$HOME/.config/solana/id.json"
if [[ -z "${KEYPAIR:-}" ]]; then
  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    KEYPAIR="${DEFAULT_KEYPAIR}"
    warn "Dry-run mode — KEYPAIR defaults to $DEFAULT_KEYPAIR (no txns will be sent)"
  else
    ask KEYPAIR "Path to Solana keypair JSON" "$DEFAULT_KEYPAIR"
  fi
fi
export KEYPAIR

if [[ ! -f "${KEYPAIR:-}" ]]; then
  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    warn "Keypair not found at $KEYPAIR — observe-only mode will still work"
  else
    die "Keypair file not found: $KEYPAIR"
  fi
fi

# Optional tuning
export MAX_DEPLOY_SOL="${MAX_DEPLOY_SOL:-0.1}"
export MIN_RESERVE_SOL="${MIN_RESERVE_SOL:-0.05}"
export TICK_INTERVAL_MS="${TICK_INTERVAL_MS:-60000}"
export DRY_RUN="${DRY_RUN:-false}"
export DASHBOARD_PORT="${DASHBOARD_PORT:-3333}"
export DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-v4-flash}"

info "Max deploy: ${MAX_DEPLOY_SOL} SOL | Reserve: ${MIN_RESERVE_SOL} SOL | Tick: ${TICK_INTERVAL_MS}ms"
info "Dry run: $DRY_RUN | Dashboard port: $DASHBOARD_PORT"

# ── write .env ────────────────────────────────────────────────────────────────
ENV_FILE="$AGENT_DIR/.env"
{
  echo "# Generated by Clawd ORE Mining Agent installer — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  [[ -n "${DEEPSEEK_API_KEY:-}" ]]   && echo "DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY"
  [[ -n "${DEEPSEEK_MODEL:-}" ]]     && echo "DEEPSEEK_MODEL=$DEEPSEEK_MODEL"
  [[ -n "${OPENROUTER_API_KEY:-}" ]] && echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
  [[ -n "${OPENROUTER_MODEL:-}" ]]   && echo "OPENROUTER_MODEL=$OPENROUTER_MODEL"
  [[ -n "${ANTHROPIC_API_KEY:-}" ]]  && echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
  [[ -n "${RPC:-}" ]]                && echo "RPC=$RPC"
  [[ -n "${HELIUS_RPC_URL:-}" ]]     && echo "HELIUS_RPC_URL=$HELIUS_RPC_URL"
  echo "KEYPAIR=$KEYPAIR"
  echo "MAX_DEPLOY_SOL=$MAX_DEPLOY_SOL"
  echo "MIN_RESERVE_SOL=$MIN_RESERVE_SOL"
  echo "TICK_INTERVAL_MS=$TICK_INTERVAL_MS"
  echo "DRY_RUN=$DRY_RUN"
  echo "DASHBOARD_PORT=$DASHBOARD_PORT"
} > "$ENV_FILE"
success "Config written to $ENV_FILE"

# ── install npm deps ──────────────────────────────────────────────────────────
header "Installing dependencies"
cd "$AGENT_DIR"
npm install --silent
success "npm dependencies installed"

# ── build ore-cli (optional) ──────────────────────────────────────────────────
if [[ "$HAS_CARGO" == "true" && "${BUILD_CLI:-}" != "false" ]]; then
  # Find ore-master relative to agent dir
  ORE_MASTER=""
  for candidate in \
    "$AGENT_DIR/../../ore-master" \
    "$INSTALL_DIR/ore-master" \
    "$(dirname "$AGENT_DIR")/ore-master"
  do
    if [[ -f "$candidate/Cargo.toml" ]]; then
      ORE_MASTER="$(cd "$candidate" && pwd)"
      break
    fi
  done

  if [[ -n "$ORE_MASTER" ]]; then
    header "Building ore-cli binary (this takes ~2 min first time)"
    info "Source: $ORE_MASTER"
    if cargo build --manifest-path "$ORE_MASTER/Cargo.toml" -p ore-cli --release 2>&1 | tail -3; then
      success "ore-cli binary built at $ORE_MASTER/target/release/ore-cli"
    else
      warn "ore-cli build failed — dry-run and observe modes still work"
    fi
  else
    warn "ore-master Cargo.toml not found — skipping CLI build"
  fi
fi

# ── status check ─────────────────────────────────────────────────────────────
header "Checking ORE chain status"
set +e
node --import tsx/esm src/index.ts --status
set -e

# ── launch ────────────────────────────────────────────────────────────────────
header "Launch"
echo ""
echo -e "${BOLD}  Dashboard will be at: ${GREEN}http://localhost:${DASHBOARD_PORT}${NC}"
echo ""

if [[ "${AUTO_START:-false}" == "true" || "${DRY_RUN:-false}" == "true" ]]; then
  echo -e "  ${BOLD}Starting CLAWD LOOP…${NC}"
  exec node --import tsx/esm src/index.ts --mine
else
  echo -e "  Run these commands to start mining:"
  echo ""
  echo -e "    ${CYAN}cd $AGENT_DIR${NC}"
  echo -e "    ${CYAN}node --import tsx/esm src/index.ts --mine${NC}"
  echo ""
  echo -e "  Or from the repo root:"
  echo -e "    ${CYAN}npm run ore:miner${NC}"
  echo ""
  echo -e "  Open ${GREEN}http://localhost:${DASHBOARD_PORT}${NC} in your browser for the live dashboard."
  echo ""
  echo -e "${BOLD}${GREEN}  Setup complete. Happy mining. ⛏️${NC}"
  echo ""

  echo -en "  ${BOLD}Start the agent now?${NC} [y/N]: "
  read -r start_now
  if [[ "${start_now,,}" == "y" ]]; then
    exec node --import tsx/esm src/index.ts --mine
  fi
fi
