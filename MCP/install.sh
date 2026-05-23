#!/usr/bin/env bash
# One-shot installer for the solana-clawd MCP server.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash
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
MCP_DIR="$REPO_DIR/MCP"
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

# ── Bitwarden Secrets Manager (bws) ───────────────────────────────────────────
# At install time we can install the bws CLI, save a machine-account access
# token (0600), and seed the env file from a Secrets Manager project. Launchers
# then inject secrets at runtime via `bws run` so they never need to live in
# plaintext on disk.
BWS_TOKEN_FILE="${BWS_TOKEN_FILE:-$CONFIG_DIR/bws-access-token}"
BWS_PROJECT_ID="${BWS_PROJECT_ID:-}"
BWS_ACCESS_TOKEN_FLAG=""
BWS_DO_INSTALL=0       # --bws-install : install the bws CLI
BWS_DO_SEED=0          # --bws-seed    : seed env file from Bitwarden now
BWS_DO_SAVE_TOKEN=0    # --bws-save-token : persist token to BWS_TOKEN_FILE
BWS_OVERWRITE=0        # --bws-overwrite : overwrite existing env values on seed
BWS_DISABLED="${SOLANA_CLAWD_MCP_NO_BWS:-0}"  # --no-bws : disable entirely
NODE_PACKAGE_DIRS=(
  "packages/agentwallet"
  "packages/clawd"
  "packages/clawd-perps"
  "packages/clawd-sdk"
  "packages/clawd-wallet"
  "packages/cli-standalone"
  "Perps/clawd-agents-perps"
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
  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash

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

Bitwarden Secrets Manager (secret manager at install):
  --bws-install            Install the bws CLI if missing.
  --bws-token=TOKEN        Machine-account access token (or set BWS_ACCESS_TOKEN).
  --bws-project=ID         Restrict to one Secrets Manager project (BWS_PROJECT_ID).
  --bws-save-token         Persist the token to a 0600 file for launchers.
  --bws-seed               Seed the env file from Bitwarden now (fills blanks).
  --bws-overwrite          With --bws-seed, overwrite existing env values too.
  --no-bws                 Disable all Bitwarden integration.

  When a token is configured, launchers wrap node with \`bws run\` so secrets are
  injected fresh at runtime and never written to disk. Set BWS_SERVER_URL for
  self-hosted Bitwarden. Auto-detects BWS_ACCESS_TOKEN from the environment.
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
    --bws-install) BWS_DO_INSTALL=1 ;;
    --bws-token=*) BWS_ACCESS_TOKEN_FLAG="${arg#--bws-token=}" ;;
    --bws-project=*) BWS_PROJECT_ID="${arg#--bws-project=}" ;;
    --bws-save-token) BWS_DO_SAVE_TOKEN=1 ;;
    --bws-seed) BWS_DO_SEED=1 ;;
    --bws-overwrite) BWS_OVERWRITE=1 ;;
    --no-bws) BWS_DISABLED=1 ;;
    -h|--help) usage; exit 0 ;;
    *) warn "Ignoring unknown flag: $arg" ;;
  esac
done

# A --bws-token flag takes precedence as the access token for this run.
if [ -n "$BWS_ACCESS_TOKEN_FLAG" ]; then
  export BWS_ACCESS_TOKEN="$BWS_ACCESS_TOKEN_FLAG"
fi
[ -n "$BWS_PROJECT_ID" ] && export BWS_PROJECT_ID
export BWS_TOKEN_FILE
[ "$BWS_DISABLED" = "1" ] && export SOLANA_CLAWD_BWS=0

REPO_DIR="$INSTALL_ROOT/solana-clawd"
MCP_DIR="$REPO_DIR/MCP"
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
    chmod 0600 "$ENV_FILE" 2>/dev/null || true
    return
  fi

  cat >"$ENV_FILE" <<'ENV'
# solana-clawd MCP environment.
# Uncomment and fill only the services you use.
#
# Secrets can also be managed by Bitwarden Secrets Manager — see --bws-* flags.
# When a BWS access token is configured, launchers inject secrets at runtime
# via `bws run`, so you do not have to keep them in this file.

# HELIUS_API_KEY=
# SOLANA_TRACKER_API_KEY=
# BIRDEYE_API_KEY=
# GATEWAY_URL=http://127.0.0.1:8080
# CLAWD_GATEWAY_URL=http://127.0.0.1:8080
# SOLANA_MCP_URL=
# MCP_API_KEY=
# PORT=3001

# Perps aggregator (Imperial). Live execution is gated behind IMPERIAL_LIVE.
# IMPERIAL_API_BASE=https://api.imperial.space/api/v1
# IMPERIAL_JWT=
# IMPERIAL_WALLET=
# IMPERIAL_LIVE=false
# IMPERIAL_MAX_SIZE_USD=100
# IMPERIAL_ALLOWED_SYMS=SOL,ETH,BTC

# Bitwarden Secrets Manager (optional). Prefer a token file (0600) or env var.
# BWS_ACCESS_TOKEN=
# BWS_PROJECT_ID=
# BWS_SERVER_URL=
ENV
  chmod 0600 "$ENV_FILE" 2>/dev/null || true
  ok "Created env file: $ENV_FILE (0600)"
}

# Load the Bitwarden helper library from the cloned repo and run the requested
# install-time secret steps (install CLI, save token, seed env file).
BWS_LIB_LOADED=0
bootstrap_bitwarden() {
  if [ "$BWS_DISABLED" = "1" ]; then
    info "Bitwarden integration disabled (--no-bws)"
    return 0
  fi

  local lib="$REPO_DIR/scripts/bitwarden-secrets.sh"
  if [ ! -f "$lib" ]; then
    warn "Bitwarden helper not found at $lib; skipping secret manager setup"
    return 0
  fi
  # shellcheck source=/dev/null
  . "$lib"
  BWS_LIB_LOADED=1

  if [ "$BWS_DO_INSTALL" = "1" ]; then
    bws_ensure_cli || warn "bws CLI not available; continuing"
  fi

  # If a token is present and the user asked to save it, persist 0600.
  if [ "$BWS_DO_SAVE_TOKEN" = "1" ] && [ -n "${BWS_ACCESS_TOKEN:-}" ]; then
    bws_save_token "$BWS_TOKEN_FILE" "$BWS_ACCESS_TOKEN" || warn "could not save token"
  fi

  # Seed the env file from Bitwarden when requested.
  if [ "$BWS_DO_SEED" = "1" ]; then
    if ! bws_have_cli; then
      bws_ensure_cli || warn "bws CLI required to seed; skipping"
    fi
    bws_seed_env_file "$ENV_FILE" "$BWS_OVERWRITE" || warn "secret seed failed"
  fi

  if bws_token_present; then
    ok "Bitwarden secret injection active — launchers will use 'bws run' when bws is present"
  else
    info "No Bitwarden token configured (set BWS_ACCESS_TOKEN or use --bws-token=...)"
  fi
}

# Emit the env/token prelude shared by every launcher. Uses the Bitwarden
# library helper when it is loaded; otherwise falls back to a plain env-file
# source so launchers always work even without the secret manager.
emit_launcher_prelude() {
  if [ "$BWS_LIB_LOADED" = "1" ] && command -v bws_launcher_prelude >/dev/null 2>&1; then
    bws_launcher_prelude "$ENV_FILE" "$BWS_TOKEN_FILE" "$BWS_PROJECT_ID"
  else
    cat <<PRELUDE
ENV_FILE="\${SOLANA_CLAWD_MCP_ENV:-$ENV_FILE}"
if [ -f "\$ENV_FILE" ]; then
  set -a
  . "\$ENV_FILE"
  set +a
fi
PRELUDE
  fi
}

# Emit the bws-aware exec line. Expects positional params already set to the
# command (e.g. `set -- node "$ENTRY" "$@"`).
emit_launcher_exec() {
  if [ "$BWS_LIB_LOADED" = "1" ] && command -v bws_launcher_exec >/dev/null 2>&1; then
    bws_launcher_exec
  else
    printf 'exec "$@"\n'
  fi
}

write_node_launcher() {
  name="$1"
  entry="$2"

  if [ ! -f "$entry" ]; then
    warn "Skipping launcher $name; missing $entry"
    return
  fi

  {
    printf '#!/usr/bin/env bash\nset -euo pipefail\n'
    emit_launcher_prelude
    printf 'set -- node %q "$@"\n' "$entry"
    emit_launcher_exec
  } >"$BIN_DIR/$name"
  chmod +x "$BIN_DIR/$name"
}

write_launchers() {
  mkdir -p "$BIN_DIR"

  {
    printf '#!/usr/bin/env bash\nset -euo pipefail\n'
    emit_launcher_prelude
    printf 'set -- node %q "$@"\n' "$MCP_DIR/dist/index.js"
    emit_launcher_exec
  } >"$STDIO_BIN"

  {
    printf '#!/usr/bin/env bash\nset -euo pipefail\n'
    emit_launcher_prelude
    printf 'set -- node %q "$@"\n' "$MCP_DIR/dist/http.js"
    emit_launcher_exec
  } >"$HTTP_BIN"

  chmod +x "$STDIO_BIN" "$HTTP_BIN"
  ok "Installed launchers: $STDIO_BIN and $HTTP_BIN"

  write_node_launcher "agentwallet" "$REPO_DIR/packages/agentwallet/dist/cli.js"
  write_node_launcher "clawd" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-code" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-leviathan" "$REPO_DIR/packages/clawd/dist/index.js"
  write_node_launcher "clawd-perps" "$REPO_DIR/packages/clawd-perps/dist/cli.js"
  write_node_launcher "clawd-standalone" "$REPO_DIR/packages/cli-standalone/index.js"
  write_node_launcher "clawd-agents-perps" "$REPO_DIR/Perps/clawd-agents-perps/dist/cli.js"
  ok "Injected local package launchers into $BIN_DIR"
}

# One-line description of the Bitwarden integration state for the summary.
bws_status_line() {
  if [ "$BWS_DISABLED" = "1" ]; then
    printf 'disabled (--no-bws)'
    return
  fi
  local has_cli="no" has_tok="no"
  command -v bws >/dev/null 2>&1 && has_cli="yes"
  if [ -n "${BWS_ACCESS_TOKEN:-}" ] || [ -f "$BWS_TOKEN_FILE" ]; then has_tok="yes"; fi
  printf 'cli=%s token=%s' "$has_cli" "$has_tok"
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

Secret manager (Bitwarden Secrets Manager):
  status:      $(bws_status_line)
  token file:  $BWS_TOKEN_FILE
  enable:      export BWS_ACCESS_TOKEN=... (machine-account token)
               then re-run with --bws-seed and/or --bws-save-token
  runtime:     launchers run 'bws run' automatically when a token + bws exist,
               injecting secrets without writing them to disk.
  disable:     --no-bws  (or SOLANA_CLAWD_MCP_NO_BWS=1)

Injected local packages:
  packages/agentwallet
  packages/clawd
  packages/clawd-perps
  packages/clawd-perps-aggregator
  packages/clawd-protocol
  packages/clawd-sdk
  packages/clawd-wallet
  packages/cli-standalone
  Perps/clawd-agents-perps

One-shot reinstall/update:
  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash

  # With Bitwarden Secrets Manager:
  BWS_ACCESS_TOKEN=... curl -fsSL .../MCP/install.sh | bash -s -- --bws-install --bws-save-token

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
  bootstrap_bitwarden
  write_launchers
  print_client_config
}

main "$@"
