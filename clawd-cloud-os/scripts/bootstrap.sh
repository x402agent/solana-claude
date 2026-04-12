#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  CLAWD CLOUD OS — One-Shot Bootstrap
#  Works on: E2B sandboxes, fresh Linux terminals, macOS, any shell
#  Installs: Go (user-space if no root) → SolanaOS → solana-clawd
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"
RESET="\033[0m"

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
  echo -e "${RESET}"
  echo -e "  ${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "  ${BOLD}║  CLAWD CLOUD OS · SolanaOS + solana-clawd · One-Shot Boot  ║${RESET}"
  echo -e "  ${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

# ── Helpers ─────────────────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    fail "Missing required command: ${BOLD}$1${RESET}"
  }
}

# ── Detect environment ──────────────────────────────────────────────
detect_env() {
  if [ -f /etc/e2b ]; then
    echo "e2b"
  elif [ -f /.dockerenv ]; then
    echo "docker"
  elif grep -qi microsoft /proc/version 2>/dev/null; then
    echo "wsl"
  elif [ "$(uname)" = "Darwin" ]; then
    echo "macos"
  else
    echo "linux"
  fi
}

has_root() {
  [ "$(id -u)" = "0" ] || command -v sudo >/dev/null 2>&1
}

# ── Go installation ────────────────────────────────────────────────
GOVERSION="1.23.2"

install_go() {
  if command -v go >/dev/null 2>&1; then
    ok "Go already installed: $(go version)"
    return 0
  fi

  info "Go not found — installing..."

  local ARCH
  ARCH="$(uname -m)"
  local GOARCH
  case "$ARCH" in
    x86_64)        GOARCH="amd64" ;;
    aarch64|arm64) GOARCH="arm64" ;;
    *)             fail "Unsupported architecture: $ARCH" ;;
  esac

  local OS
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$OS" in
    linux|darwin) ;; # supported
    *)            fail "Unsupported OS: $OS" ;;
  esac

  local TARBALL="go${GOVERSION}.${OS}-${GOARCH}.tar.gz"
  local DOWNLOAD_URL="https://go.dev/dl/${TARBALL}"

  # ── Try system-wide install first (if root) ──
  if has_root && [ "$ENV_TYPE" != "e2b" ]; then
    info "Installing Go system-wide..."
    local SUDO=""
    [ "$(id -u)" != "0" ] && SUDO="sudo"

    (
      cd /tmp
      curl -fsSLO "$DOWNLOAD_URL"
      $SUDO rm -rf /usr/local/go
      $SUDO tar -C /usr/local -xzf "$TARBALL"
      rm -f "$TARBALL"
    )

    export PATH="/usr/local/go/bin:$PATH"

    grep -q '/usr/local/go/bin' "$HOME/.bashrc" 2>/dev/null || {
      echo 'export PATH="/usr/local/go/bin:$PATH"' >> "$HOME/.bashrc"
    }

    ok "Go installed system-wide: $(go version)"
    return 0
  fi

  # ── Fallback: user-space install (no root needed) ──
  info "No root access — installing Go to ~/.local/go ..."

  (
    cd /tmp
    curl -fsSLO "$DOWNLOAD_URL"
    rm -rf "$HOME/.local/go"
    mkdir -p "$HOME/.local"
    tar -C "$HOME/.local" -xzf "$TARBALL"
    rm -f "$TARBALL"
  )

  export GOROOT="$HOME/.local/go"
  export GOPATH="$HOME/go"
  export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"

  grep -q 'GOROOT="$HOME/.local/go"' "$HOME/.bashrc" 2>/dev/null || cat >> "$HOME/.bashrc" <<'GOENV'

# ── Go (installed by CLAWD Cloud OS bootstrap) ──
export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"
export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"
GOENV

  ok "Go installed to ~/.local/go: $(go version)"
}

# ── SolanaOS installation ──────────────────────────────────────────
install_solanaos() {
  if command -v solanaos >/dev/null 2>&1 || [ -x "$HOME/.solanaos/bin/solanaos" ]; then
    ok "SolanaOS already installed"
    return 0
  fi

  info "Installing SolanaOS..."
  export PATH="$HOME/.solanaos/bin:$PATH"
  npx -y solanaos-computer@latest install --with-web
  ok "SolanaOS installed"
}

# ── solana-clawd clone + setup ──────────────────────────────────────
install_solana_clawd() {
  local CLAWD_DIR="$HOME/src/solana-clawd"

  mkdir -p "$HOME/src"

  if [ ! -d "$CLAWD_DIR/.git" ]; then
    info "Cloning solana-clawd..."
    git clone https://github.com/x402agent/solana-clawd "$CLAWD_DIR"
  else
    info "solana-clawd already exists — pulling latest..."
    (cd "$CLAWD_DIR" && git pull --ff-only 2>/dev/null || true)
    ok "solana-clawd up to date at $CLAWD_DIR"
  fi

  cd "$CLAWD_DIR"

  # Environment setup
  if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    ok "Created .env from .env.example"
  fi

  if [ -n "${XAI_API_KEY:-}" ] && [ -f .env ]; then
    if ! grep -q '^XAI_API_KEY=' .env; then
      printf '\nXAI_API_KEY=%s\n' "$XAI_API_KEY" >> .env
      ok "Injected XAI_API_KEY into .env"
    fi
  fi

  if [ -n "${HELIUS_API_KEY:-}" ] && [ -f .env ]; then
    if ! grep -q '^HELIUS_API_KEY=' .env; then
      printf '\nHELIUS_API_KEY=%s\n' "$HELIUS_API_KEY" >> .env
      ok "Injected HELIUS_API_KEY into .env"
    fi
  fi

  if [ -n "${SOLANA_TRACKER_API_KEY:-}" ] && [ -f .env ]; then
    if ! grep -q '^SOLANA_TRACKER_API_KEY=' .env; then
      printf '\nSOLANA_TRACKER_API_KEY=%s\n' "$SOLANA_TRACKER_API_KEY" >> .env
      ok "Injected SOLANA_TRACKER_API_KEY into .env"
    fi
  fi

  info "Running solana-clawd setup..."
  npm run setup
  ok "solana-clawd setup complete"
}

# ── Install MOTD banner ────────────────────────────────────────────
install_motd() {
  local MOTD_SCRIPT="$HOME/.clawd-motd.sh"
  cat > "$MOTD_SCRIPT" <<'MOTD'
#!/usr/bin/env bash
CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"; BOLD="\033[1m"; DIM="\033[2m"; RESET="\033[0m"
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║              CLAWD CLOUD OS · Terminal Ready                ║${RESET}"
echo -e "${BOLD}${CYAN}║         SolanaOS + solana-clawd + xAI Grok                 ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${GREEN}go${RESET}       $(go version 2>/dev/null | awk '{print $3}' || echo 'not found')"
echo -e "  ${GREEN}node${RESET}     $(node -v 2>/dev/null || echo 'not found')"
echo -e "  ${GREEN}solanaos${RESET} $(~/.solanaos/bin/solanaos version 2>/dev/null || echo 'not found')"
echo ""
echo -e "  ${BOLD}Quick Commands:${RESET}"
echo -e "  ${YELLOW}clawd-help${RESET}                      Show full command reference"
echo -e "  ${YELLOW}clawd-start${RESET}                     Start all services"
echo -e "  ${YELLOW}clawd-status${RESET}                    Check system status"
echo -e "  ${YELLOW}cd ~/src/solana-clawd${RESET}           Enter the project"
echo ""
MOTD
  chmod +x "$MOTD_SCRIPT"

  # Add aliases and MOTD source to bashrc
  grep -q 'clawd-motd' "$HOME/.bashrc" 2>/dev/null || cat >> "$HOME/.bashrc" <<'ALIASES'

# ── CLAWD Cloud OS ──
source "$HOME/.clawd-motd.sh" 2>/dev/null

# Shortcuts
alias clawd-help='cat ~/src/solana-clawd/clawd-cloud-os/docs/terminal-help.md 2>/dev/null || echo "Run bootstrap first"'
alias clawd-start='~/.solanaos/bin/solanaos server & ~/.solanaos/bin/solanaos daemon & cd ~/src/solana-clawd && npm run mcp:http'
alias clawd-status='echo "── SolanaOS ──" && ~/.solanaos/bin/solanaos version 2>/dev/null; echo "── Go ──" && go version 2>/dev/null; echo "── Node ──" && node -v 2>/dev/null; echo "── solana-clawd ──" && cd ~/src/solana-clawd && node -e "console.log(require(\"./package.json\").version)" 2>/dev/null'
alias clawd-demo='cd ~/src/solana-clawd && npm run demo'
alias clawd-birth='cd ~/src/solana-clawd && npm run birth'
alias clawd-mcp='cd ~/src/solana-clawd && npm run mcp:http'
alias clawd-web='cd ~/src/solana-clawd && npm --prefix web run dev'
alias sos='~/.solanaos/bin/solanaos'
ALIASES

  ok "MOTD banner and aliases installed"
}

# ═══════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════
print_banner

ENV_TYPE="$(detect_env)"
info "Detected environment: ${BOLD}$ENV_TYPE${RESET}"
echo ""

# ── Phase 1: Prerequisites ──
echo -e "${BOLD}Phase 1: Prerequisites${RESET}"
need_cmd bash
need_cmd curl
need_cmd git

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$NODE_MAJOR" -lt 20 ]; then
    fail "Node.js 20+ required. Current: $(node -v)"
  fi
  ok "Node $(node -v)"
else
  fail "Node.js is required. Install from https://nodejs.org/"
fi
echo ""

# ── Phase 2: Go ──
echo -e "${BOLD}Phase 2: Go Runtime${RESET}"
install_go
echo ""

# ── Phase 3: SolanaOS ──
echo -e "${BOLD}Phase 3: SolanaOS${RESET}"
export PATH="$HOME/.local/go/bin:$HOME/go/bin:$HOME/.solanaos/bin:$PATH"
install_solanaos
echo ""

# ── Phase 4: solana-clawd ──
echo -e "${BOLD}Phase 4: solana-clawd${RESET}"
install_solana_clawd
echo ""

# ── Phase 5: Terminal Experience ──
echo -e "${BOLD}Phase 5: Terminal Experience${RESET}"
install_motd
echo ""

# ── Done ────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}"
cat <<'DONE'
╔══════════════════════════════════════════════════════════════╗
║                  BOOTSTRAP COMPLETE                         ║
║                                                             ║
║  CLAWD Cloud OS is ready.                                   ║
║  SolanaOS + solana-clawd + Go + xAI Grok + E2B-ready        ║
╚══════════════════════════════════════════════════════════════╝
DONE
echo -e "${RESET}"

echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  ${CYAN}1.${RESET} Reload your shell"
echo -e "     ${YELLOW}source ~/.bashrc${RESET}"
echo ""
echo -e "  ${CYAN}2.${RESET} Configure SolanaOS"
echo -e "     ${YELLOW}~/.solanaos/bin/solanaos onboard${RESET}"
echo ""
echo -e "  ${CYAN}3.${RESET} Start everything"
echo -e "     ${YELLOW}clawd-start${RESET}"
echo ""
echo -e "  ${CYAN}4.${RESET} Or explore individually:"
echo -e "     ${YELLOW}clawd-demo${RESET}       Animated walkthrough"
echo -e "     ${YELLOW}clawd-birth${RESET}      Hatch a Blockchain Buddy"
echo -e "     ${YELLOW}clawd-mcp${RESET}        Start MCP server"
echo -e "     ${YELLOW}clawd-web${RESET}        Launch web UI"
echo -e "     ${YELLOW}clawd-help${RESET}       Full command reference"
echo ""
echo -e "  ${CYAN}5.${RESET} Optional E2B packages:"
echo -e "     ${YELLOW}npm i @e2b/desktop${RESET}            Desktop computer use"
echo -e "     ${YELLOW}npm i @e2b/code-interpreter${RESET}   Python + chart streaming"
echo -e "     ${YELLOW}npm i e2b${RESET}                     Core sandbox SDK"
echo ""
echo -e "  ${DIM}Tip: set XAI_API_KEY before bootstrap to auto-inject it.${RESET}"
echo -e "  ${DIM}     export XAI_API_KEY=your_key && ./bootstrap.sh${RESET}"
echo ""
