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
#   SOLANA_CLAWD_MCP_SKIP_PACKAGES=1
#                                    Skip packages/* and Perps package builds.
#   SOLANA_CLAWD_MCP_SKIP_PROTOCOL=1
#                                    Skip packages/clawd-protocol build probe.

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
NODE_MAX_MAJOR_WITH_PACKAGES=22
QUIET=0
SKIP_BUILD=0
SKIP_PACKAGES="${SOLANA_CLAWD_MCP_SKIP_PACKAGES:-0}"
SKIP_PROTOCOL="${SOLANA_CLAWD_MCP_SKIP_PROTOCOL:-0}"
NODE_PACKAGE_DIRS=(
  "packages/agentwallet"
  "packages/clawd"
  "packages/clawd-perps"
  "packages/clawd-sdk"
  "packages/clawd-wallet"
  "packages/cli-standalone"
  "perps/clawd-agents-perps"
)
PROTOCOL_DIR="packages/clawd-protocol"

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
  cat <<USAGE
One-shot installer for the solana-clawd MCP server.

Usage:
  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash

Flags:
  --branch=NAME        Install a branch or tag. Default: main
  --install-dir=PATH   Install root. Default: \$HOME/.solana-clawd-mcp
  --bin-dir=PATH       Launcher directory. Default: \$HOME/.local/bin
  --repo-url=URL       Git repository URL.
  --skip-build         Do not run npm install/build.
  --skip-packages      Do not install/build packages/* and Perps packages.
  --skip-protocol      Do not probe/build packages/clawd-protocol.
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
    --skip-packages) SKIP_PACKAGES=1 ;;
    --skip-protocol) SKIP_PROTOCOL=1 ;;
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

validate_node_version() {
  NODE_MAJOR="$(node_major)"
  [ "$NODE_MAJOR" -ge "$NODE_MIN_MAJOR" ] || fail "Node.js $NODE_MIN_MAJOR+ is required. Found $(node --version)."

  if [ "$SKIP_BUILD" != "1" ] && [ "$SKIP_PACKAGES" != "1" ] && [ "$NODE_MAJOR" -gt "$NODE_MAX_MAJOR_WITH_PACKAGES" ]; then
    fail "Full package injection requires Node.js 20-22 because this repo declares engines >=20 <23. Found $(node --version). Use Node 22 LTS or rerun with --skip-packages for MCP-only install."
  fi
}

resolve_mcp_dir() {
  if [ -d "$REPO_DIR/MCP" ]; then
    printf '%s\n' "$REPO_DIR/MCP"
    return
  fi
  if [ -d "$REPO_DIR/mcp" ]; then
    printf '%s\n' "$REPO_DIR/mcp"
    return
  fi
  fail "MCP package not found under $REPO_DIR."
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
  MCP_DIR="$(resolve_mcp_dir)"
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

install_node_package() {
  pkg_rel="$1"
  pkg_abs="$REPO_DIR/$pkg_rel"

  if [ ! -f "$pkg_abs/package.json" ]; then
    warn "Skipping $pkg_rel; package.json not found."
    return
  fi

  info "Installing package dependencies: $pkg_rel"
  if [ -f "$pkg_abs/package-lock.json" ]; then
    npm --prefix "$pkg_abs" ci --legacy-peer-deps
  else
    npm --prefix "$pkg_abs" install --legacy-peer-deps
  fi

  info "Building package: $pkg_rel"
  npm --prefix "$pkg_abs" run build --if-present
}

build_local_packages() {
  if [ "$SKIP_BUILD" = "1" ] || [ "$SKIP_PACKAGES" = "1" ]; then
    warn "Skipping local package install/build."
    return
  fi

  for pkg in "${NODE_PACKAGE_DIRS[@]}"; do
    install_node_package "$pkg"
  done
}

build_protocol_package() {
  protocol_abs="$REPO_DIR/$PROTOCOL_DIR"

  if [ "$SKIP_BUILD" = "1" ] || [ "$SKIP_PROTOCOL" = "1" ]; then
    warn "Skipping clawd-protocol build probe."
    return
  fi

  if [ ! -f "$protocol_abs/Cargo.toml" ]; then
    warn "Skipping $PROTOCOL_DIR; Cargo.toml not found."
    return
  fi

  if command -v anchor >/dev/null 2>&1; then
    info "Building Anchor protocol package: $PROTOCOL_DIR"
    (cd "$protocol_abs" && anchor build)
    return
  fi

  if command -v cargo >/dev/null 2>&1; then
    info "Building Rust protocol package with cargo: $PROTOCOL_DIR"
    cargo build --manifest-path "$protocol_abs/Cargo.toml"
    return
  fi

  warn "Skipping $PROTOCOL_DIR build; install Anchor or Rust cargo to build the on-chain protocol."
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

write_node_launcher() {
  name="$1"
  entry="$2"

  if [ ! -f "$entry" ]; then
    warn "Skipping launcher $name; missing $entry"
    return
  fi

  cat >"$BIN_DIR/$name" <<LAUNCHER
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="\${SOLANA_CLAWD_MCP_ENV:-$ENV_FILE}"
if [ -f "\$ENV_FILE" ]; then
  set -a
  . "\$ENV_FILE"
  set +a
fi
exec node "$entry" "\$@"
LAUNCHER
  chmod +x "$BIN_DIR/$name"
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

  write_node_launcher "agentwallet" "$REPO_DIR/packages/agentwallet/dist/cli.js"
  write_node_launcher "clawd" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-code" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-leviathan" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-perps" "$REPO_DIR/packages/clawd-perps/dist/cli.js"
  write_node_launcher "clawd-standalone" "$REPO_DIR/packages/cli-standalone/index.js"
  write_node_launcher "clawd-agents-perps" "$REPO_DIR/perps/clawd-agents-perps/dist/cli.js"
  ok "Injected local package launchers into $BIN_DIR"
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

Injected local packages:
  packages/agentwallet
  packages/clawd
  packages/clawd-perps
  packages/clawd-protocol
  packages/clawd-sdk
  packages/clawd-wallet
  packages/cli-standalone
  perps/clawd-agents-perps

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

  validate_node_version

  info "Installing solana-clawd MCP"
  info "repo: $REPO_URL"
  info "branch: $BRANCH"
  info "install root: $(abs_path "$INSTALL_ROOT")"

  clone_or_update
  MCP_DIR="$(resolve_mcp_dir)"
  build_local_packages
  build_protocol_package
  build_mcp
  write_env_file
  write_launchers
  print_client_config
}

main "$@"
