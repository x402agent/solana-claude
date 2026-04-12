#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  CLAWD Cloud OS CLI
#  Unified command center for SolanaOS + solana-clawd + xAI Grok
# ═══════════════════════════════════════════════════════════════════

CLAWD_API="https://solanaclawd.com/api"
CLAWD_DIR="${CLAWD_DIR:-$HOME/src/solana-clawd}"
SOLANAOS_BIN="${HOME}/.solanaos/bin/solanaos"

# ── Colors ──────────────────────────────────────────────────────────
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"
NC="\033[0m"

ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
info() { echo -e "  ${CYAN}→${NC} $*"; }
warn() { echo -e "  ${YELLOW}!${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; }

# ── Banner ──────────────────────────────────────────────────────────
print_banner() {
  echo -e "${BOLD}${CYAN}"
  cat <<'ART'
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/
ART
  echo -e "${NC}"
  echo -e "  ${BOLD}CLAWD Cloud OS CLI v2.0${NC}  ${DIM}· SolanaOS + solana-clawd + xAI Grok${NC}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════
#  COMMANDS
# ═══════════════════════════════════════════════════════════════════

cmd_setup() {
  echo -e "${BOLD}Setting up CLAWD Cloud OS...${NC}"
  echo ""

  local SCRIPT_DIR
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"

  if [ -f "$SCRIPT_DIR/bootstrap.sh" ]; then
    bash "$SCRIPT_DIR/bootstrap.sh"
  else
    info "Bootstrap script not found locally."
    info "Downloading and running bootstrap..."
    curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
  fi
}

cmd_install_go() {
  echo -e "${BOLD}Installing Go...${NC}"
  echo ""

  local SCRIPT_DIR
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"

  if [ -f "$SCRIPT_DIR/install-go.sh" ]; then
    bash "$SCRIPT_DIR/install-go.sh"
  else
    info "Downloading Go installer..."
    curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
  fi
}

cmd_doctor() {
  echo -e "${BOLD}System Check${NC}"
  echo ""

  # Go
  if command -v go >/dev/null 2>&1; then
    ok "Go          $(go version 2>/dev/null | awk '{print $3}')"
  else
    fail "Go          not found — run: ${YELLOW}clawd-cli install-go${NC}"
  fi

  # Node
  if command -v node >/dev/null 2>&1; then
    local NODE_V
    NODE_V="$(node -v)"
    local NODE_MAJOR
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
    if [ "$NODE_MAJOR" -ge 20 ]; then
      ok "Node        $NODE_V"
    else
      warn "Node        $NODE_V (need 20+)"
    fi
  else
    fail "Node        not found"
  fi

  # npm
  if command -v npm >/dev/null 2>&1; then
    ok "npm         $(npm -v)"
  else
    fail "npm         not found"
  fi

  # Git
  if command -v git >/dev/null 2>&1; then
    ok "git         $(git --version | awk '{print $3}')"
  else
    fail "git         not found"
  fi

  # curl
  if command -v curl >/dev/null 2>&1; then
    ok "curl        available"
  else
    fail "curl        not found"
  fi

  # jq (optional)
  if command -v jq >/dev/null 2>&1; then
    ok "jq          $(jq --version)"
  else
    warn "jq          not found (optional, for JSON output)"
  fi

  echo ""

  # SolanaOS
  if [ -x "$SOLANAOS_BIN" ]; then
    ok "SolanaOS    installed at $SOLANAOS_BIN"
  else
    fail "SolanaOS    not found — run: ${YELLOW}clawd-cli setup${NC}"
  fi

  # solana-clawd
  if [ -d "$CLAWD_DIR" ] && [ -f "$CLAWD_DIR/package.json" ]; then
    local CLAWD_V
    CLAWD_V="$(node -e "console.log(require('$CLAWD_DIR/package.json').version)" 2>/dev/null || echo 'unknown')"
    ok "solana-clawd v$CLAWD_V at $CLAWD_DIR"
  else
    fail "solana-clawd not found — run: ${YELLOW}clawd-cli setup${NC}"
  fi

  # Environment
  echo ""
  echo -e "${BOLD}Environment:${NC}"
  [ -n "${XAI_API_KEY:-}" ]             && ok "XAI_API_KEY             set" || warn "XAI_API_KEY             not set"
  [ -n "${HELIUS_API_KEY:-}" ]          && ok "HELIUS_API_KEY          set" || warn "HELIUS_API_KEY          not set"
  [ -n "${SOLANA_TRACKER_API_KEY:-}" ]  && ok "SOLANA_TRACKER_API_KEY  set" || warn "SOLANA_TRACKER_API_KEY  not set"

  # Platform
  echo ""
  echo -e "${BOLD}Platform:${NC}"
  info "OS:   $(uname -s) $(uname -r)"
  info "Arch: $(uname -m)"
  if [ -f /etc/e2b ]; then
    info "Env:  E2B Sandbox"
  elif [ -f /.dockerenv ]; then
    info "Env:  Docker"
  elif [ "$(uname)" = "Darwin" ]; then
    info "Env:  macOS"
  else
    info "Env:  Linux"
  fi
}

cmd_start() {
  echo -e "${BOLD}Starting CLAWD Cloud OS services...${NC}"
  echo ""

  if [ -x "$SOLANAOS_BIN" ]; then
    info "Starting SolanaOS server (port 7777)..."
    "$SOLANAOS_BIN" server &
    info "Starting SolanaOS daemon..."
    "$SOLANAOS_BIN" daemon &
    ok "SolanaOS started"
  else
    warn "SolanaOS not found — skipping"
  fi

  if [ -d "$CLAWD_DIR" ]; then
    info "Starting solana-clawd MCP server (port 3000)..."
    (cd "$CLAWD_DIR" && npm run mcp:http) &
    ok "solana-clawd MCP started"
  else
    warn "solana-clawd not found — skipping"
  fi

  echo ""
  ok "Services starting in background"
  echo -e "  ${DIM}SolanaOS UI:  http://localhost:7777${NC}"
  echo -e "  ${DIM}MCP Server:   http://localhost:3000/mcp${NC}"
}

cmd_stop() {
  echo -e "${BOLD}Stopping CLAWD Cloud OS services...${NC}"
  echo ""
  for PORT in 7777 3000; do
    local PIDS
    PIDS="$(lsof -ti:$PORT 2>/dev/null || true)"
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill 2>/dev/null && ok "Stopped process on port $PORT"
    fi
  done
}

cmd_status() {
  echo -e "${BOLD}CLAWD Cloud OS Status${NC}"
  echo ""

  # Remote API
  info "Checking solanaclawd.com..."
  local HTTP_CODE
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$CLAWD_API/status" 2>/dev/null || echo '000')"
  if [ "$HTTP_CODE" = "200" ]; then
    ok "API online ($CLAWD_API)"
    if command -v jq >/dev/null 2>&1; then
      curl -s "$CLAWD_API/status" | jq '.' 2>/dev/null || true
    fi
  else
    warn "API unreachable (HTTP $HTTP_CODE)"
  fi

  echo ""

  # Local services
  for PORT_NAME in "7777:SolanaOS" "3000:MCP Server"; do
    local PORT="${PORT_NAME%%:*}"
    local NAME="${PORT_NAME##*:}"
    if lsof -ti:"$PORT" >/dev/null 2>&1; then
      ok "$NAME running on port $PORT"
    else
      info "$NAME not running (port $PORT)"
    fi
  done
}

cmd_agents() {
  info "Listing registered agents..."
  if command -v jq >/dev/null 2>&1; then
    curl -s "$CLAWD_API/agents" | jq '.'
  else
    curl -s "$CLAWD_API/agents"
  fi
}

cmd_wallet() {
  info "Fetching wallet info..."
  if command -v jq >/dev/null 2>&1; then
    curl -s "$CLAWD_API/wallet" | jq '.'
  else
    curl -s "$CLAWD_API/wallet"
  fi
}

cmd_prices() {
  info "Live token prices..."
  if command -v jq >/dev/null 2>&1; then
    curl -s "$CLAWD_API/prices" | jq '.'
  else
    curl -s "$CLAWD_API/prices"
  fi
}

cmd_register() {
  info "Registering on Metaplex Agent Registry..."
  local TOOLS_DIR
  TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$TOOLS_DIR/clawd-register.ts" ]; then
    npx tsx "$TOOLS_DIR/clawd-register.ts"
  else
    echo "  Run: npx tsx clawd-register.ts"
    echo "  Requires: HELIUS_API_KEY"
  fi
}

cmd_connect() {
  info "Connecting to solanaclawd.com..."
  if command -v jq >/dev/null 2>&1; then
    curl -s -X POST "$CLAWD_API/connect" \
      -H "Content-Type: application/json" \
      -d '{"agent":"solana-clawd","version":"2.0"}' | jq '.'
  else
    curl -s -X POST "$CLAWD_API/connect" \
      -H "Content-Type: application/json" \
      -d '{"agent":"solana-clawd","version":"2.0"}'
  fi
}

cmd_demo() {
  if [ -d "$CLAWD_DIR" ]; then
    (cd "$CLAWD_DIR" && npm run demo)
  else
    fail "solana-clawd not found at $CLAWD_DIR"
  fi
}

cmd_birth() {
  if [ -d "$CLAWD_DIR" ]; then
    (cd "$CLAWD_DIR" && npm run birth)
  else
    fail "solana-clawd not found at $CLAWD_DIR"
  fi
}

cmd_help() {
  print_banner
  cat <<EOF
${BOLD}Usage:${NC} clawd-cli <command>

${BOLD}Bootstrap & Setup${NC}
  setup              One-shot bootstrap (Go + SolanaOS + solana-clawd)
  install-go         Install Go on any terminal (root or non-root)
  doctor             Check all prerequisites and system health

${BOLD}Service Management${NC}
  start              Start all services (SolanaOS + MCP)
  stop               Stop all services
  status             Check local + remote service status

${BOLD}Remote API (solanaclawd.com)${NC}
  agents             List registered agents
  wallet             View wallet info
  prices             Get live token prices
  register           Register on Metaplex Agent Registry
  connect            Connect to solanaclawd.com

${BOLD}solana-clawd${NC}
  demo               Run the animated walkthrough
  birth              Hatch a Blockchain Buddy

${BOLD}Examples${NC}
  ${DIM}# Fresh terminal? One command:${NC}
  clawd-cli setup

  ${DIM}# Just need Go?${NC}
  clawd-cli install-go

  ${DIM}# Check everything is working:${NC}
  clawd-cli doctor

  ${DIM}# Start the full stack:${NC}
  clawd-cli start

  ${DIM}# E2B sandbox quick start:${NC}
  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
  source ~/.bashrc
  clawd-cli setup

EOF
}

# ═══════════════════════════════════════════════════════════════════
#  DISPATCH
# ═══════════════════════════════════════════════════════════════════
case "${1:-help}" in
  setup)       cmd_setup ;;
  install-go)  cmd_install_go ;;
  doctor)      cmd_doctor ;;
  start)       cmd_start ;;
  stop)        cmd_stop ;;
  status)      cmd_status ;;
  agents)      cmd_agents ;;
  wallet)      cmd_wallet ;;
  prices)      cmd_prices ;;
  register)    cmd_register ;;
  connect)     cmd_connect ;;
  demo)        cmd_demo ;;
  birth)       cmd_birth ;;
  help|--help|-h)  cmd_help ;;
  *)
    fail "Unknown command: $1"
    echo ""
    cmd_help
    exit 1
    ;;
esac
