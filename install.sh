#!/usr/bin/env bash
# OpenClawd installer — bootstraps the Solana-native AI agent runtime.
#
# Surfaces it brings up:
#   • openclawd / clawd Go binary             — daemon, gateway, solana ops
#   • openclawd-framework (Node)              — @openclawdsolana/leviathan runtime
#   • gateway (Node)                          — Telegram + Birdeye/Helius control plane
#   • plugin.delivery (Node)                  — public plugin SDK + edge gateway
#   • dark-ralph TUI                          — Bloomberg-style Solana intelligence terminal
#   • pAGENT chrome-extension surfaces        — autonomous browser/trading agent
#   • Grok voice runtime via XAI_API_KEY      — wss://api.x.ai/v1/realtime
#
# Invoked by:
#   • npm/openclawd-cli/bin/install.mjs        (npx @openclawdsolana/cli)
#   • npm/openclawd-computer/bin/install.mjs   (npx @openclawdsolana/computer)
#   • npm/openclawd-installer/bin/install.mjs  (npx @openclawdsolana/installer)
#   • Direct curl:
#       curl -fsSL https://install.solanaclawd.com | bash
#
# Flags:
#   --with-web           Also build the local web console launcher.
#   --branch=NAME        Clone a non-default branch when bootstrapping remotely.
#   --bin-dir=PATH       Override the binary install dir (default: $OPENCLAWD_HOME/bin).
#   --xai-key=KEY        Seed XAI_API_KEY in the workspace .env (interactive otherwise).
#   --no-build           Skip Go binary build (use prebuilt or skip native).
#   --no-node            Skip Node workspace install/build.
#   --reset-config       Overwrite an existing config.json.
#   --quiet              Suppress informational chatter; keep ✓/! lines only.
#   --no-banner          Skip the ASCII banner (CI-friendly).
#   -h | --help          Show usage and exit.

set -euo pipefail
umask 022

# ──────────────────────────────────────────────────────────────────────────────
# Defaults
# ──────────────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/clawdsolana/OpenClawd.git"
WORKSPACE="${OPENCLAWD_HOME:-$HOME/.openclawdsolana}"
OPENCLAWD_BASE_URL="${OPENCLAWD_BASE_URL:-https://solanaclawd.com/openclawd}"
OPENCLAWD_GATEWAY_URL="${OPENCLAWD_GATEWAY_URL:-https://solanaclawd.com/gateway}"
OPENCLAWD_SITE_URL="${OPENCLAWD_SITE_URL:-https://solanaclawd.com}"
BIN_DIR_DEFAULT="$WORKSPACE/bin"
BIN_DIR=""
BUILD_DIR_NAME="build"
BRANCH="main"
WITH_WEB=0
NO_BUILD=0
NO_NODE=0
RESET_CONFIG=0
QUIET=0
NO_BANNER=0
XAI_KEY_FLAG=""
GO_MIN_MAJOR=1
GO_MIN_MINOR=21
NODE_MIN_MAJOR=20

# ──────────────────────────────────────────────────────────────────────────────
# Pretty output (Solana brand colors — green #14F195, purple #9945FF)
# ──────────────────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  GREEN=$'\033[38;2;20;241;149m'
  PURPLE=$'\033[38;2;153;69;255m'
  CYAN=$'\033[38;2;77;208;225m'
  DIM=$'\033[38;2;120;134;160m'
  RED=$'\033[38;2;255;87;87m'
  BOLD=$'\033[1m'
  RESET=$'\033[0m'
else
  GREEN='' PURPLE='' CYAN='' DIM='' RED='' BOLD='' RESET=''
fi

info()  { [ "$QUIET" = "1" ] || printf "${DIM}  %s${RESET}\n" "$*"; }
step()  { [ "$QUIET" = "1" ] || printf "${PURPLE}  ▸ %s${RESET}\n" "$*"; }
ok()    { printf "${GREEN}  ✓ %s${RESET}\n" "$*"; }
warn()  { printf "${PURPLE}  ! %s${RESET}\n" "$*"; }
fail()  { printf "${RED}  ✖ %s${RESET}\n" "$*" >&2; exit 1; }

usage() {
  sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

banner() {
  [ "$NO_BANNER" = "1" ] && return 0
  [ "$QUIET" = "1" ] && return 0
  printf "\n"
  printf "${PURPLE}     ___                   ${GREEN} ___ _                _${RESET}\n"
  printf "${PURPLE}    /   \\ _ __  ___ _ _    ${GREEN}/ __| |__ ___ __ ____| |${RESET}\n"
  printf "${PURPLE}   | () | '_ \\/ -_) ' \\   ${GREEN}| (__| / _\\ V  V / _\\ |${RESET}\n"
  printf "${PURPLE}    \\___/| .__/\\___|_||_|  ${GREEN}\\___|_\\__|\\_/\\_/\\__,_|${RESET}\n"
  printf "${PURPLE}         |_|                                ${RESET}${DIM}🦞 Solana-native AI agents${RESET}\n"
  printf "\n"
}

# ──────────────────────────────────────────────────────────────────────────────
# Flag parsing
# ──────────────────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --with-web)        WITH_WEB=1 ;;
    --no-build)        NO_BUILD=1 ;;
    --no-node)         NO_NODE=1 ;;
    --reset-config)    RESET_CONFIG=1 ;;
    --quiet|-q)        QUIET=1 ;;
    --no-banner)       NO_BANNER=1 ;;
    --branch=*)        BRANCH="${arg#--branch=}" ;;
    --bin-dir=*)       BIN_DIR="${arg#--bin-dir=}" ;;
    --xai-key=*)       XAI_KEY_FLAG="${arg#--xai-key=}" ;;
    -h|--help)         usage ;;
    *) warn "Ignoring unknown flag: $arg" ;;
  esac
done

BIN_DIR="${BIN_DIR:-$BIN_DIR_DEFAULT}"

banner

# ──────────────────────────────────────────────────────────────────────────────
# Platform + dependency probe
# ──────────────────────────────────────────────────────────────────────────────
OS_NAME="$(uname -s 2>/dev/null || echo unknown)"
ARCH_NAME="$(uname -m 2>/dev/null || echo unknown)"
case "$OS_NAME" in
  Darwin|Linux) ;;
  *) warn "Untested host OS: $OS_NAME (continuing anyway)" ;;
esac
info "host: $OS_NAME/$ARCH_NAME • workspace: $WORKSPACE • branch: $BRANCH"

require() { command -v "$1" >/dev/null 2>&1 || fail "$1 is required ($2)"; }
require git  "https://git-scm.com/"
require curl "your package manager"

check_go_version() {
  command -v go >/dev/null 2>&1 || { warn "Go not found — native build will be skipped. Install: https://go.dev/dl/"; NO_BUILD=1; return; }
  local v major minor
  v="$(go version 2>/dev/null | awk '{print $3}' | sed 's/^go//')"
  major="${v%%.*}"; minor="${v#*.}"; minor="${minor%%.*}"
  if [ -z "$major" ] || [ -z "$minor" ]; then
    warn "Could not parse Go version — proceeding anyway"
    return
  fi
  if [ "$major" -lt "$GO_MIN_MAJOR" ] || { [ "$major" -eq "$GO_MIN_MAJOR" ] && [ "$minor" -lt "$GO_MIN_MINOR" ]; }; then
    fail "Go ${GO_MIN_MAJOR}.${GO_MIN_MINOR}+ required (found $v). Upgrade: https://go.dev/dl/"
  fi
  info "go: $v"
}

check_node_version() {
  command -v node >/dev/null 2>&1 || { warn "Node not found — JS surfaces will be skipped. Install: https://nodejs.org/"; NO_NODE=1; return; }
  command -v npm  >/dev/null 2>&1 || { warn "npm not found — JS surfaces will be skipped"; NO_NODE=1; return; }
  local v major
  v="$(node -v 2>/dev/null | sed 's/^v//')"
  major="${v%%.*}"
  if [ -n "$major" ] && [ "$major" -lt "$NODE_MIN_MAJOR" ]; then
    warn "Node ${NODE_MIN_MAJOR}+ recommended (found v$v). Upgrading is strongly suggested."
  fi
  info "node: v$v • npm: $(npm -v 2>/dev/null || echo '?')"
}

[ "$NO_BUILD" = "0" ] && check_go_version
[ "$NO_NODE"  = "0" ] && check_node_version

# Concurrency lock — refuse to run two installers at once against the same workspace.
mkdir -p "$WORKSPACE" "$BIN_DIR"
LOCK_FILE="$WORKSPACE/.install.lock"
if [ -e "$LOCK_FILE" ]; then
  PID="$(cat "$LOCK_FILE" 2>/dev/null || echo '?')"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    fail "Another installer is running (pid $PID). Remove $LOCK_FILE if stale."
  fi
fi
echo "$$" > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT INT TERM

# ──────────────────────────────────────────────────────────────────────────────
# Source tree resolution
#   1. If the script is a real file inside a checkout, use that checkout.
#   2. Otherwise clone into $WORKSPACE/src.
#
# When piped via `curl | bash`, BASH_SOURCE is empty and we must NOT fall back
# to the caller's git root — that could be any unrelated repo. We validate the
# checkout by looking for a known OpenClawd marker (install.sh + SOUL.md or
# openclawd-framework/).
# ──────────────────────────────────────────────────────────────────────────────
is_openclawd_checkout() {
  local dir="$1"
  [ -d "$dir/.git" ] || return 1
  # At least one OpenClawd-specific marker must exist alongside package.json
  { [ -f "$dir/SOUL.md" ] || [ -d "$dir/openclawd-framework" ] || [ -f "$dir/install.sh" ] && grep -q "openclawdsolana" "$dir/install.sh" 2>/dev/null; } \
    && { [ -f "$dir/go.mod" ] || [ -f "$dir/package.json" ]; }
}

SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
fi
SRC_DIR=""
if [ -n "$SCRIPT_DIR" ] && is_openclawd_checkout "$SCRIPT_DIR"; then
  SRC_DIR="$SCRIPT_DIR"
  info "using local checkout at $SRC_DIR"
else
  SRC_DIR="$WORKSPACE/src"
  if [ -d "$SRC_DIR/.git" ]; then
    step "updating $SRC_DIR ($BRANCH)"
    git -C "$SRC_DIR" fetch --quiet origin "$BRANCH" || warn "git fetch failed — using local copy"
    git -C "$SRC_DIR" checkout --quiet "$BRANCH" || warn "git checkout failed"
    git -C "$SRC_DIR" reset --hard "origin/$BRANCH" || warn "git reset failed"
  else
    step "cloning $REPO_URL → $SRC_DIR"
    git clone --quiet --branch "$BRANCH" --depth 1 "$REPO_URL" "$SRC_DIR" \
      || fail "git clone failed (branch=$BRANCH)"
  fi
fi
cd "$SRC_DIR"

# ──────────────────────────────────────────────────────────────────────────────
# Build the Go binary
# ──────────────────────────────────────────────────────────────────────────────
GO_PKG=""
if [ "$NO_BUILD" = "0" ]; then
  for candidate in "./cli" "./cmd/openclawd" "./cmd/clawd" "./openclawd-framework/cli" "."; do
    if [ -d "$candidate" ] && ls "$candidate"/*.go >/dev/null 2>&1; then
      if grep -ql "^package main" "$candidate"/*.go; then
        GO_PKG="$candidate"
        break
      fi
    fi
  done
fi

if [ "$NO_BUILD" = "1" ]; then
  info "skipping Go build (--no-build)"
elif [ -z "$GO_PKG" ]; then
  warn "no Go main package located — skipping binary build"
else
  mkdir -p "$BUILD_DIR_NAME"
  step "building openclawd from $GO_PKG"
  GOFLAGS="-trimpath" go build -ldflags "-s -w" -o "$BUILD_DIR_NAME/openclawd" "$GO_PKG" \
    || fail "go build failed in $GO_PKG"

  install -m 0755 "$BUILD_DIR_NAME/openclawd" "$BIN_DIR/openclawd"
  ln -sf "$BIN_DIR/openclawd" "$BIN_DIR/openclawdsolana"
  ln -sf "$BIN_DIR/openclawd" "$BIN_DIR/clawd"
  ok "installed $BIN_DIR/openclawd (aliases: openclawdsolana, clawd)"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Node workspaces — framework, gateway, plugin.delivery, pAGENT
# ──────────────────────────────────────────────────────────────────────────────
has_cmd() { command -v "$1" >/dev/null 2>&1; }

pkg_install() {
  local dir="$1"
  if has_cmd pnpm; then
    ( cd "$dir" && pnpm install --frozen-lockfile=false --link-workspace-packages )
  else
    ( cd "$dir" && npm install --no-audit --no-fund --legacy-peer-deps )
  fi
}

pkg_run() {
  local dir="$1"
  local script="$2"
  if has_cmd pnpm; then
    ( cd "$dir" && pnpm run --if-present "$script" )
  else
    ( cd "$dir" && npm run "$script" --if-present )
  fi
}

if [ "$NO_NODE" = "1" ]; then
  info "skipping Node workspaces (--no-node)"
elif [ -f "$SRC_DIR/package.json" ] && command -v npm >/dev/null 2>&1; then
  step "installing Node workspaces"
  pkg_install "$SRC_DIR" || warn "root workspace install had warnings"
  [ -d "$SRC_DIR/openclawd-framework" ] && pkg_install "$SRC_DIR/openclawd-framework" || warn "framework install skipped"
  [ -d "$SRC_DIR/gateway" ] && pkg_install "$SRC_DIR/gateway" || warn "gateway install skipped"
  ( cd "$SRC_DIR" && node scripts/install-plugin-delivery.mjs ) || warn "plugin.delivery install skipped"
  if has_cmd pnpm; then
    info "pAGENT packages linked through root pnpm workspace"
  else
    ( cd "$SRC_DIR" && npm run install:pagent --if-present ) || warn "pAGENT install skipped"
  fi

  step "building TypeScript surfaces"
  [ -d "$SRC_DIR/openclawd-framework" ] && pkg_run "$SRC_DIR/openclawd-framework" build || warn "framework build failed"
  [ -d "$SRC_DIR/gateway" ] && pkg_run "$SRC_DIR/gateway" build || warn "gateway build failed"
  ( cd "$SRC_DIR" && node scripts/build-plugin-delivery.mjs ) || warn "plugin.delivery build failed"
  if has_cmd pnpm; then
    (
      for d in chrome-extension/theme chrome-extension/wallet chrome-extension/page-controller chrome-extension/llms chrome-extension/core chrome-extension/ui chrome-extension/page-agent; do
        [ -d "$SRC_DIR/$d" ] && pkg_run "$SRC_DIR/$d" build || exit 1
      done
    )
  else
    ( cd "$SRC_DIR" && npm run build:pagent --if-present )
  fi || warn "pAGENT build skipped"

  # Build the root package (solana-clawd CLI) and link its bin entries
  step "building root CLI (solana-clawd)"
  pkg_run "$SRC_DIR" build || warn "root CLI build failed"
  if [ -f "$SRC_DIR/dist/entrypoints/clawd.js" ]; then
    chmod +x "$SRC_DIR/dist/entrypoints/clawd.js"
    ln -sf "$SRC_DIR/dist/entrypoints/clawd.js" "$BIN_DIR/solana-clawd"
    ln -sf "$SRC_DIR/dist/entrypoints/clawd.js" "$BIN_DIR/clawd"
    ok "linked $BIN_DIR/clawd → solana-clawd CLI"
  else
    warn "root CLI build produced no dist/entrypoints/clawd.js — skipping bin link"
  fi

  ok "Node surfaces ready"
else
  warn "Node/npm not found or no package.json — skipping JS workspace install"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Dark Ralph TUI — install from npm when published, otherwise build the bundled
# workspace and expose dark-ralph / ralph / ralph-tui from $BIN_DIR.
# ──────────────────────────────────────────────────────────────────────────────
if [ "$NO_NODE" = "1" ]; then
  info "skipping dark-ralph TUI (--no-node)"
elif command -v npm >/dev/null 2>&1 && npm view @darkralph/tui version >/dev/null 2>&1; then
  step "installing dark-ralph TUI from npm"
  npm i -g @darkralph/tui --no-audit --no-fund || warn "dark-ralph npm install failed"
elif [ -d "$SRC_DIR/dark-ralph" ] && command -v bun >/dev/null 2>&1; then
  step "building bundled dark-ralph TUI"
  (
    cd "$SRC_DIR/dark-ralph"
    bun install --frozen-lockfile
    bun run build
    bun run build:lib
  ) || warn "dark-ralph TUI build failed"
  if [ -f "$SRC_DIR/dark-ralph/dist/cli.js" ]; then
    install -m 0755 "$SRC_DIR/dark-ralph/dist/cli.js" "$BIN_DIR/dark-ralph"
    if [ -f "$SRC_DIR/dark-ralph/node_modules/yoga-wasm-web/dist/yoga.wasm" ]; then
      install -m 0644 "$SRC_DIR/dark-ralph/node_modules/yoga-wasm-web/dist/yoga.wasm" "$BIN_DIR/yoga.wasm"
    fi
    ln -sf "$BIN_DIR/dark-ralph" "$BIN_DIR/ralph-tui"
    rm -f "$BIN_DIR/ralph"
    if printf ':%s:' "$PATH" | grep -q ":$HOME/.local/bin:"; then
      mkdir -p "$HOME/.local/bin"
      ln -sf "$BIN_DIR/dark-ralph" "$HOME/.local/bin/dark-ralph"
      ln -sf "$BIN_DIR/dark-ralph" "$HOME/.local/bin/ralph-tui"
      rm -f "$HOME/.local/bin/ralph"
    fi
    ok "installed dark-ralph TUI (alias: ralph-tui)"
  fi
else
  warn "dark-ralph TUI skipped — install Bun or publish @darkralph/tui"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Optional web console
# ──────────────────────────────────────────────────────────────────────────────
if [ "$WITH_WEB" = "1" ]; then
  WEB_PKG=""
  for candidate in "./cmd/openclawd-web" "./cmd/clawd-web" "./web/cmd"; do
    [ -d "$candidate" ] && { WEB_PKG="$candidate"; break; }
  done
  if [ -z "$WEB_PKG" ]; then
    warn "web console source not found — skipping"
  else
    step "building openclawd-web from $WEB_PKG"
    go build -ldflags "-s -w" -o "$BUILD_DIR_NAME/openclawd-web" "$WEB_PKG" \
      || fail "go build failed for web console"
    install -m 0755 "$BUILD_DIR_NAME/openclawd-web" "$BIN_DIR/openclawd-web"
    ok "installed $BIN_DIR/openclawd-web"
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# Canonical config — every CLI surface (cli/clawd-cli.sh, cli/clawd-connect.sh,
# the Go runtime, services/*) reads this file. One OPENCLAWD_API_BASE override
# (or pointing at a local registrar) flips the entire stack.
# ──────────────────────────────────────────────────────────────────────────────
CFG_PATH="$WORKSPACE/config.json"
write_config() {
  cat > "$CFG_PATH" <<CFGEOF
{
  "version": "0.3.0",
  "openclawdBase":   "$OPENCLAWD_BASE_URL",
  "apiBase":         "$OPENCLAWD_BASE_URL",
  "gatewayBase":     "$OPENCLAWD_GATEWAY_URL",
  "marketplaceBase": "$OPENCLAWD_SITE_URL/marketplace",
  "mcpBase":         "$OPENCLAWD_GATEWAY_URL/mcp",
  "registrarBase":   "$OPENCLAWD_BASE_URL/registrar",
  "solanaRpc":       "https://api.mainnet-beta.solana.com",
  "sasProgramId":    "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG",
  "scope":           "@openclawdsolana",
  "skillsCatalog":   "$OPENCLAWD_BASE_URL/skills",
  "extensionsDir":   "extensions",
  "skillsDir":       "skills",
  "voice": {
    "provider":      "xai",
    "realtimeUrl":   "wss://api.x.ai/v1/realtime",
    "ephemeralUrl":  "https://api.x.ai/v1/realtime/client_secrets",
    "ttsUrl":        "https://api.x.ai/v1/tts",
    "model":         "grok-voice-think-fast-1.0",
    "defaultVoice":  "eve",
    "voices":        ["eve", "ara", "rex", "sal", "leo"],
    "audioRate":     24000,
    "ephemeralTtlSeconds": 300,
    "envKey":        "XAI_API_KEY"
  },
  "pagent": {
    "tradingEnabled":   true,
    "launchEnabled":    true,
    "trackingEnabled":  true,
    "guiPort":          7423,
    "voiceEnabled":     true
  }
}
CFGEOF
}

if [ ! -f "$CFG_PATH" ]; then
  write_config
  ok "wrote $CFG_PATH"
elif [ "$RESET_CONFIG" = "1" ]; then
  cp "$CFG_PATH" "$CFG_PATH.bak.$(date +%s)"
  write_config
  ok "reset $CFG_PATH (backup saved alongside)"
else
  info "keeping existing $CFG_PATH (re-run with --reset-config to overwrite)"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Workspace .env — secret scaffolding (XAI_API_KEY for Grok voice + others).
# Created once; never overwritten. Permissions 0600.
# ──────────────────────────────────────────────────────────────────────────────
ENV_PATH="$WORKSPACE/.env"
if [ ! -f "$ENV_PATH" ]; then
  cat > "$ENV_PATH" <<ENVEOF
# OpenClawd workspace secrets — sourced by the daemon, gateway, and pAGENT.
# Never commit this file. Permissions are 0600.

# ── Grok / xAI voice + reasoning ──────────────────────────────────────────────
XAI_API_KEY=
OPENCLAWD_VOICE_MODEL=grok-voice-think-fast-1.0
OPENCLAWD_VOICE_DEFAULT=eve
OPENCLAWD_VOICE_REALTIME_URL=wss://api.x.ai/v1/realtime
OPENCLAWD_VOICE_EPHEMERAL_URL=https://api.x.ai/v1/realtime/client_secrets
OPENCLAWD_VOICE_EPHEMERAL_TTL=300
OPENCLAWD_API_BASE=$OPENCLAWD_BASE_URL
OPENCLAWD_GATEWAY_BASE=$OPENCLAWD_GATEWAY_URL
OPENCLAWD_MARKETPLACE=$OPENCLAWD_SITE_URL/marketplace

# ── Solana market data + indexing ─────────────────────────────────────────────
HELIUS_API_KEY=
BIRDEYE_API_KEY=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# ── Telegram gateway (optional) ───────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=
ENVEOF
  chmod 0600 "$ENV_PATH"
  ok "wrote $ENV_PATH (chmod 0600)"
else
  info "keeping existing $ENV_PATH"
fi

# Seed XAI_API_KEY from --xai-key flag or interactive prompt (TTY only).
seed_xai_key() {
  local key="$1"
  [ -z "$key" ] && return 0
  if grep -q '^XAI_API_KEY=$' "$ENV_PATH" 2>/dev/null; then
    # Use a tmpfile to avoid sed -i portability issues between BSD and GNU.
    local tmp
    tmp="$(mktemp "${TMPDIR:-/tmp}/openclawd.env.XXXXXX")"
    awk -v k="$key" 'BEGIN{FS=OFS="="} /^XAI_API_KEY=$/ {print "XAI_API_KEY=" k; next} {print}' \
      "$ENV_PATH" > "$tmp" && mv "$tmp" "$ENV_PATH"
    chmod 0600 "$ENV_PATH"
    ok "seeded XAI_API_KEY"
  else
    info "XAI_API_KEY already set — leaving alone"
  fi
}

if [ -n "$XAI_KEY_FLAG" ]; then
  seed_xai_key "$XAI_KEY_FLAG"
elif [ -t 0 ] && [ -t 1 ] && [ "$QUIET" = "0" ] && grep -q '^XAI_API_KEY=$' "$ENV_PATH" 2>/dev/null; then
  printf "${CYAN}  ? Paste your XAI_API_KEY for Grok voice (Enter to skip): ${RESET}"
  IFS= read -r XAI_INPUT || XAI_INPUT=""
  [ -n "${XAI_INPUT:-}" ] && seed_xai_key "$XAI_INPUT"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Post-install verification
# ──────────────────────────────────────────────────────────────────────────────
if [ -x "$BIN_DIR/openclawd" ]; then
  VERSION_OUT="$("$BIN_DIR/openclawd" version 2>/dev/null | head -1 || true)"
  [ -n "$VERSION_OUT" ] && info "binary self-check: $VERSION_OUT"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Final banner — copyable PATH export, quickstart, share line.
# ──────────────────────────────────────────────────────────────────────────────
SHELL_NAME="$(basename "${SHELL:-bash}")"
case "$SHELL_NAME" in
  zsh)  RC_FILE="~/.zshrc" ;;
  bash) RC_FILE="~/.bashrc" ;;
  fish) RC_FILE="~/.config/fish/config.fish" ;;
  *)    RC_FILE="your shell rc" ;;
esac

cat <<EOF

${GREEN}${BOLD}🦞 OpenClawd installed${RESET}

  ${BOLD}Workspace${RESET} : $WORKSPACE
  ${BOLD}Binaries${RESET}  : $BIN_DIR
  ${BOLD}Config${RESET}    : $CFG_PATH
  ${BOLD}Secrets${RESET}   : $ENV_PATH  ${DIM}(0600)${RESET}

  ${PURPLE}1.${RESET} Add to PATH (append to $RC_FILE):
       export PATH="$BIN_DIR:\$PATH"

  ${PURPLE}2.${RESET} Set your Grok key for voice + reasoning:
       echo "XAI_API_KEY=sk-..." >> $ENV_PATH

  ${PURPLE}3.${RESET} Smoke tests:
       openclawd version
       openclawd solana health
       openclawd voice test           ${DIM}# wss://api.x.ai/v1/realtime${RESET}

  ${PURPLE}4.${RESET} Launch the autonomous pAGENT (trade • launch • track):
       openclawd daemon
       openclawd pagent gui           ${DIM}# http://localhost:7423${RESET}

  ${PURPLE}5.${RESET} Pair a Seeker / Telegram channel:
       openclawd gateway start
       openclawd gateway setup-code

  ${PURPLE}6.${RESET} Launch the Dark Ralph TUI:
       dark-ralph run

${DIM}  Star us: https://solanaclawd.com${RESET}
${DIM}  Share:   curl -fsSL https://install.solanaclawd.com | bash${RESET}

EOF
