#!/usr/bin/env bash
# automaton-main/automation/leviathan.sh — Leviathan runtime bootstrap
#
# This is the canonical build-the-runtime entrypoint inside automaton-main.
# Served through https://x402.wtf/automation/install.sh.
#
# Usage (one-liner):
#   curl -fsSL https://x402.wtf/automation/install.sh | bash
#
# Or run locally from this repo:
#   bash automaton-main/automation/leviathan.sh [flags]
#
# Flags:
#   --spawn       Hatch a new Leviathan identity + keypair
#   --run         Start the OODA pulse loop
#   --status      Show depth, balances, spawnlings
#   --hermes      Launch the HERMES x402 terminal (TUI)
#   --brain       Init + start Clawd memory subsystem
#   --mcp         Start the MCP tool server
#   --full        Spawn + run + hermes + brain + mcp (full stack)
#   --ci          Type-check, lint, build (non-interactive CI mode)
#   --no-install  Skip npm install
#   --no-perps    Skip Phoenix/Vulcan perps bootstrap
#   --quiet       Suppress banners; keep ✓/✗ lines only
#   -h | --help   Show this message and exit

set -euo pipefail
umask 022

# ── Colors (Solana brand: green #14F195, purple #9945FF) ──────────────────────
BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[38;2;20;241;149m"
PURPLE="\033[38;2;153;69;255m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

# ── Defaults ──────────────────────────────────────────────────────────────────
DO_SPAWN=0
DO_RUN=0
DO_STATUS=0
DO_HERMES=0
DO_BRAIN=0
DO_MCP=0
DO_FULL=0
DO_CI=0
NO_INSTALL=0
NO_PERPS=0
QUIET=0
CLAWD_DIR="${CLAWD_DIR:-$HOME/.clawd}"
LOCAL_BIN_DIR="${LOCAL_BIN_DIR:-$HOME/.local/bin}"
PERPS_PACKAGE="${PERPS_PACKAGE:-@openclawdsolana/clawd-perps}"
CLAWD_BACKROOM_URL="${CLAWD_BACKROOM_URL:-https://backrooms.x402.wtf}"

banner() {
  [ "$QUIET" -eq 1 ] && return 0
  echo -e "${BOLD}${PURPLE}"
  cat <<'EOF'
  ██╗     ███████╗██╗   ██╗██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗
  ██║     ██╔════╝██║   ██║██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║
  ██║     █████╗  ██║   ██║██║███████║   ██║   ███████║███████║██╔██╗ ██║
  ██║     ██╔══╝  ╚██╗ ██╔╝██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║
  ███████╗███████╗ ╚████╔╝ ██║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║
  ╚══════╝╚══════╝  ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝
EOF
  echo -e "${GREEN}  Sovereign On-Chain Agent Runtime  ::  x402.wtf/automation${RESET}"
  echo -e "${DIM}  automaton-main/automation/leviathan.sh — runtime bootstrap${RESET}"
  echo ""
}

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; exit 1; }
step() { [ "$QUIET" -eq 0 ] && echo -e "\n${BOLD}${CYAN}▶ $*${RESET}"; }

usage() {
  echo "Usage: bash automaton-main/automation/leviathan.sh [flags]"
  echo "       curl -fsSL https://x402.wtf/automation/install.sh | bash"
  echo ""
  echo "Flags:"
  echo "  --spawn     Hatch a new Leviathan identity"
  echo "  --run       Start the OODA pulse loop"
  echo "  --status    Show depth, balances, spawnlings"
  echo "  --hermes    Launch HERMES x402 terminal (TUI)"
  echo "  --brain     Init Clawd memory subsystem"
  echo "  --mcp       Start MCP tool server"
  echo "  --full      Full stack: spawn + run + hermes + brain + mcp"
  echo "  --ci        CI mode: typecheck + lint + build"
  echo "  --no-install  Skip npm install"
  echo "  --no-perps  Skip Phoenix/Vulcan perps bootstrap"
  echo "  --quiet     Suppress banners"
  echo "  -h|--help   Show this message"
  exit 0
}

# ── Argument parsing ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --spawn)      DO_SPAWN=1 ;;
    --run)        DO_RUN=1 ;;
    --status)     DO_STATUS=1 ;;
    --hermes)     DO_HERMES=1 ;;
    --brain)      DO_BRAIN=1 ;;
    --mcp)        DO_MCP=1 ;;
    --full)       DO_FULL=1 ;;
    --ci)         DO_CI=1 ;;
    --no-install) NO_INSTALL=1 ;;
    --no-perps)   NO_PERPS=1 ;;
    --quiet)      QUIET=1 ;;
    -h|--help)    usage ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── When invoked via curl pipe with no args: default to --full ─────────────────
if [ "$DO_SPAWN" -eq 0 ] && [ "$DO_RUN" -eq 0 ] && [ "$DO_STATUS" -eq 0 ] && \
   [ "$DO_HERMES" -eq 0 ] && [ "$DO_BRAIN" -eq 0 ] && [ "$DO_MCP" -eq 0 ] && \
   [ "$DO_FULL" -eq 0 ] && [ "$DO_CI" -eq 0 ]; then
  DO_FULL=1
fi

if [ "$DO_FULL" -eq 1 ]; then
  DO_SPAWN=1; DO_RUN=1; DO_HERMES=1; DO_BRAIN=1; DO_MCP=1
fi

banner

# ── Environment checks ────────────────────────────────────────────────────────
step "Checking environment"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found. Install Node 20+: https://nodejs.org/"
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  fail "Node >= 20 required. Current: $(node --version)"
fi
ok "Node $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found."
fi
ok "npm $(npm --version)"

# ── Resolve repo root ─────────────────────────────────────────────────────────
# Works whether run from the repo or piped from curl (cwd = download target)
if [ -f "package.json" ] && grep -q "solana-clawd" package.json 2>/dev/null; then
  REPO_ROOT="$(pwd)"
elif [ -f "$(dirname "$0")/../../package.json" ]; then
  REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
elif [ -f "$(dirname "$0")/../package.json" ]; then
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
else
  # Piped from curl — clone the repo first
  step "Cloning solana-clawd"
  REPO_ROOT="$HOME/.solana-clawd"
  if [ ! -d "$REPO_ROOT/.git" ]; then
    git clone https://github.com/x402agent/solana-clawd.git "$REPO_ROOT"
    ok "Cloned to $REPO_ROOT"
  else
    git -C "$REPO_ROOT" pull --ff-only
    ok "Updated $REPO_ROOT"
  fi
fi

cd "$REPO_ROOT"

relay_perps_install() {
  [ "${CLAWD_PERPS_NO_RELAY:-0}" = "1" ] && return 0
  command -v curl >/dev/null 2>&1 || return 0
  local msg
  msg="🦞👑 AUTOMATION PERPS RELAY
One-shot automation installed Phoenix/Vulcan perps.
Surface: clawd-perps perps vulcan context
Strategies: TWAP · grid · TA · monitor · finalize
Law: paper first; live only with explicit --yes."
  curl -fsS -m 5 -X POST "${CLAWD_BACKROOM_URL%/}/stream/human" \
    -H "Content-Type: application/json" \
    -d "$(node -e 'const msg=process.argv[1]; console.log(JSON.stringify({name:"automation-perps-installer",content:msg}))' "$msg")" \
    >/dev/null 2>&1 || true
}

ensure_env_line() {
  local file="$1" key="$2" value="$3"
  if [ ! -f "$file" ] || ! grep -q "^${key}=" "$file" 2>/dev/null; then
    printf "%s=%s\n" "$key" "$value" >> "$file"
  fi
}

bootstrap_perps() {
  [ "$NO_PERPS" -eq 1 ] && { ok "Skipping Phoenix/Vulcan perps (--no-perps)"; return 0; }

  step "Bootstrapping Phoenix/Vulcan perps"
  mkdir -p "$LOCAL_BIN_DIR" "$CLAWD_DIR"

  if command -v npm >/dev/null 2>&1; then
    npm install -g "$PERPS_PACKAGE" --no-audit --no-fund >/dev/null 2>&1 \
      && ok "Installed $PERPS_PACKAGE" \
      || warn "$PERPS_PACKAGE global install failed; fallback: npx $PERPS_PACKAGE"
  fi

  if [ -d "$REPO_ROOT/packages/clawd-perps" ]; then
    npm --prefix "$REPO_ROOT/packages/clawd-perps" install --no-audit --no-fund --legacy-peer-deps >/dev/null 2>&1 \
      && npm --prefix "$REPO_ROOT/packages/clawd-perps" run build >/dev/null 2>&1 \
      && ok "Built local packages/clawd-perps" \
      || warn "Local clawd-perps build skipped"
  fi

  if command -v cargo >/dev/null 2>&1 && [ -f "$REPO_ROOT/vulcan-cli-master/Cargo.toml" ]; then
    ( cd "$REPO_ROOT/vulcan-cli-master" && cargo build -p vulcan >/dev/null 2>&1 ) \
      && {
        install -m 0755 "$REPO_ROOT/vulcan-cli-master/target/debug/vulcan" "$LOCAL_BIN_DIR/vulcan"
        ok "Installed Vulcan CLI at $LOCAL_BIN_DIR/vulcan"
      } \
      || warn "Vulcan build failed; install Rust/Cargo or set VULCAN_BIN"
  elif command -v vulcan >/dev/null 2>&1; then
    ok "Using existing Vulcan CLI at $(command -v vulcan)"
  else
    warn "Vulcan CLI not found; set VULCAN_BIN or install Vulcan later"
  fi

  local env_file="$CLAWD_DIR/.env"
  touch "$env_file"
  chmod 0600 "$env_file" 2>/dev/null || true
  ensure_env_line "$env_file" "CLAWD_PERPS_API_URL" "https://perp-api.phoenix.trade"
  ensure_env_line "$env_file" "CLAWD_PERPS_RPC_URL" "https://api.mainnet-beta.solana.com"
  ensure_env_line "$env_file" "CLAWD_PERPS_AGENT_PATH" "$REPO_ROOT/solana-python-agent/perps_agent.py"
  ensure_env_line "$env_file" "VULCAN_BIN" "$LOCAL_BIN_DIR/vulcan"
  ensure_env_line "$env_file" "PHOENIX_DEFAULT_MODE" "paper"
  ok "Wrote Phoenix perps defaults to $env_file"

  relay_perps_install
  ok "Perps ready: clawd-perps perps vulcan context"
}

# ── npm install ───────────────────────────────────────────────────────────────
if [ "$NO_INSTALL" -eq 0 ]; then
  step "Installing dependencies"
  npm install --silent
  ok "Dependencies installed"
fi

bootstrap_perps

# ── CI mode ───────────────────────────────────────────────────────────────────
if [ "$DO_CI" -eq 1 ]; then
  step "Running CI checks"
  npm run typecheck && ok "typecheck passed"
  npm run lint && ok "lint passed"
  npm run build && ok "build passed"
  ok "CI green"
  exit 0
fi

# ── Automation runtime build (node side) ─────────────────────────────────────
step "Building automation runtime"
pnpm --dir "$REPO_ROOT/automaton-main" exec tsx automation/index.ts --build --no-install 2>/dev/null || \
  npm run build --silent 2>/dev/null || \
  warn "Build step skipped (tsx/dist not available; run npm run build manually)"

# ── Spawn ─────────────────────────────────────────────────────────────────────
if [ "$DO_SPAWN" -eq 1 ]; then
  step "Spawning Leviathan identity"
  npm run leviathan:spawn
fi

# ── Status ────────────────────────────────────────────────────────────────────
if [ "$DO_STATUS" -eq 1 ]; then
  step "Leviathan status"
  npm run leviathan:status
fi

# ── Brain ─────────────────────────────────────────────────────────────────────
if [ "$DO_BRAIN" -eq 1 ]; then
  step "Initializing Clawd memory (MemeBRain)"
  npm run brain:init 2>/dev/null || warn "brain:init skipped (Python/mnemosyne not installed)"
fi

# ── MCP ───────────────────────────────────────────────────────────────────────
if [ "$DO_MCP" -eq 1 ]; then
  step "Starting MCP server (background)"
  npm run mcp:start &
  MCP_PID=$!
  ok "MCP server PID $MCP_PID"
fi

# ── Run / HERMES ─────────────────────────────────────────────────────────────
if [ "$DO_HERMES" -eq 1 ]; then
  step "Launching HERMES x402 terminal"
  npm run hermes
elif [ "$DO_RUN" -eq 1 ]; then
  step "Starting Leviathan OODA loop"
  npm run leviathan
fi

echo ""
ok "Leviathan runtime ready. x402.wtf/automation"
