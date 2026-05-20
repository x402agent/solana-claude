#!/usr/bin/env bash
# One-shot installer for the solana-clawd MCP server.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash
#
# Environment overrides:
#   SOLANA_CLAWD_MCP_REPO_URL     Git repository to clone.
#   SOLANA_CLAWD_MCP_BRANCH       Git branch or tag to install.
#   SOLANA_CLAWD_MCP_HOME         Install root.
#   SOLANA_CLAWD_MCP_BIN_DIR      Directory for launcher scripts.
#   SOLANA_CLAWD_MCP_ENV          Environment file loaded by launchers.

set -euo pipefail
umask 022

REPO_URL="${SOLANA_CLAWD_MCP_REPO_URL:-https://github.com/x402agent/solana-clawd.git}"
BRANCH="${SOLANA_CLAWD_MCP_BRANCH:-main}"
INSTALL_ROOT="${SOLANA_CLAWD_MCP_HOME:-$HOME/.solana-clawd-mcp}"
REPO_DIR="$INSTALL_ROOT/solana-clawd"
MCP_DIR="$REPO_DIR/mcp"
BIN_DIR="${SOLANA_CLAWD_MCP_BIN_DIR:-$HOME/.local/bin}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/solana-clawd-mcp"
ENV_FILE="${SOLANA_CLAWD_MCP_ENV:-$CONFIG_DIR/.env}"
STDIO_BIN="$BIN_DIR/solana-clawd-mcp"
HTTP_BIN="$BIN_DIR/solana-clawd-mcp-http"
NODE_MIN_MAJOR=20
QUIET=0
SKIP_BUILD=0

if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  GREEN=$'\033[32m'
  CYAN=$'\033[36m'
  YELLOW=$'\033[33m'
  RED=$'\033[31m'
  BOLD=$'\033[1m'
  RESET=$'\033[0m'
else
  GREEN='' CYAN='' YELLOW='' RED='' BOLD='' RESET=''
fi

info() { [ "$QUIET" = "1" ] || printf "${CYAN}  %s${RESET}\n" "$*"; }
ok() { printf "${GREEN}  OK ${RESET}%s\n" "$*"; }
warn() { printf "${YELLOW}  ! ${RESET}%s\n" "$*"; }
fail() { printf "${RED}  ERROR ${RESET}%s\n" "$*" >&2; exit 1; }

usage() {
  sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
  cat <<USAGE

Flags:
  --branch=NAME        Install a branch or tag. Default: main
  --install-dir=PATH   Install root. Default: \$HOME/.solana-clawd-mcp
  --bin-dir=PATH       Launcher directory. Default: \$HOME/.local/bin
  --repo-url=URL       Git repository URL.
  --skip-build         Do not run npm install/build.
  --quiet              Reduce output.
  -h, --help           Show this help.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --branch=*) BRANCH="${arg#--branch=}" ;;
    --install-dir=*) INSTALL_ROOT="${arg#--install-dir=}" ;;
    --bin-dir=*) BIN_DIR="${arg#--bin-dir=}" ;;
    --repo-url=*) REPO_URL="${arg#--repo-url=}" ;;
    --skip-build) SKIP_BUILD=1 ;;
    --quiet|-q) QUIET=1 ;;
    -h|--help) usage; exit 0 ;;
    *) warn "Ignoring unknown flag: $arg" ;;
  esac
done

REPO_DIR="$INSTALL_ROOT/solana-clawd"
MCP_DIR="$REPO_DIR/mcp"
STDIO_BIN="$BIN_DIR/solana-clawd-mcp"
HTTP_BIN="$BIN_DIR/solana-clawd-mcp-http"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found."
}

abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    ~*) printf '%s\n' "$1" ;;
    *) printf '%s\n' "$PWD/$1" ;;
  esac
}

node_major() {
  node --version | sed 's/^v//' | cut -d. -f1
}

clone_or_update() {
  mkdir -p "$INSTALL_ROOT"

  if [ -d "$REPO_DIR/.git" ]; then
    info "Updating $REPO_DIR"
    git -C "$REPO_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$REPO_DIR" checkout -q "$BRANCH" 2>/dev/null || git -C "$REPO_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
    git -C "$REPO_DIR" reset --hard -q "origin/$BRANCH" 2>/dev/null || true
    return
  fi

  if [ -e "$REPO_DIR" ]; then
    fail "$REPO_DIR exists but is not a git checkout. Move it or set SOLANA_CLAWD_MCP_HOME."
  fi

  info "Cloning $REPO_URL#$BRANCH into $REPO_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
}

build_mcp() {
  [ -d "$MCP_DIR" ] || fail "MCP package not found at $MCP_DIR"
  cd "$MCP_DIR"

  if [ "$SKIP_BUILD" = "1" ]; then
    warn "Skipping npm install/build by request."
    return
  fi

  info "Installing Node dependencies"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  info "Building MCP server"
  npm run build

  [ -f "$MCP_DIR/dist/index.js" ] || fail "Build did not create dist/index.js"
  [ -f "$MCP_DIR/dist/http.js" ] || fail "Build did not create dist/http.js"
}

write_env_file() {
  mkdir -p "$CONFIG_DIR"
  if [ -f "$ENV_FILE" ]; then
    info "Keeping existing env file at $ENV_FILE"
    return
  fi

  cat >"$ENV_FILE" <<'ENV'
# solana-clawd MCP environment.
# Uncomment and fill only the services you use.

# HELIUS_API_KEY=
# SOLANA_TRACKER_API_KEY=
# BIRDEYE_API_KEY=
# GATEWAY_URL=http://127.0.0.1:8080
# CLAWD_GATEWAY_URL=http://127.0.0.1:8080
# SOLANA_MCP_URL=
# MCP_API_KEY=
# PORT=3001
ENV
  ok "Created env file: $ENV_FILE"
}

write_launchers() {
  mkdir -p "$BIN_DIR"

  cat >"$STDIO_BIN" <<LAUNCHER
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="\${SOLANA_CLAWD_MCP_ENV:-$ENV_FILE}"
if [ -f "\$ENV_FILE" ]; then
  set -a
  . "\$ENV_FILE"
  set +a
fi
exec node "$MCP_DIR/dist/index.js" "\$@"
LAUNCHER

  cat >"$HTTP_BIN" <<LAUNCHER
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="\${SOLANA_CLAWD_MCP_ENV:-$ENV_FILE}"
if [ -f "\$ENV_FILE" ]; then
  set -a
  . "\$ENV_FILE"
  set +a
fi
exec node "$MCP_DIR/dist/http.js" "\$@"
LAUNCHER

  chmod +x "$STDIO_BIN" "$HTTP_BIN"
  ok "Installed launchers: $STDIO_BIN and $HTTP_BIN"
}

print_client_config() {
  cat <<EOF

${BOLD}solana-clawd MCP is installed.${RESET}

STDIO launcher:
  $STDIO_BIN

HTTP launcher:
  PORT=3001 $HTTP_BIN

Claude Desktop / Cursor / VS Code MCP config:
{
  "mcpServers": {
    "solana-clawd": {
      "command": "$STDIO_BIN"
    }
  }
}

Optional env file:
  $ENV_FILE

One-shot reinstall/update:
  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash

EOF

  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *) warn "$BIN_DIR is not on PATH. Use the absolute launcher path above or add it to PATH." ;;
  esac
}

main() {
  need_cmd git
  need_cmd node
  need_cmd npm

  NODE_MAJOR="$(node_major)"
  [ "$NODE_MAJOR" -ge "$NODE_MIN_MAJOR" ] || fail "Node.js $NODE_MIN_MAJOR+ is required. Found $(node --version)."

  info "Installing solana-clawd MCP"
  info "repo: $REPO_URL"
  info "branch: $BRANCH"
  info "install root: $(abs_path "$INSTALL_ROOT")"

  clone_or_update
  build_mcp
  write_env_file
  write_launchers
  print_client_config
}

main "$@"
