#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  install-go.sh — Install Go on any terminal (root or non-root)
#
#  Works on:
#    - CLAWD Cloud OS terminals
#    - E2B sandboxes (no root)
#    - Docker containers
#    - Fresh Linux VMs
#    - macOS
#    - WSL
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
#
#  Or:
#    chmod +x install-go.sh && ./install-go.sh
#
#  After install:
#    source ~/.bashrc && go version
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
BOLD="\033[1m"
DIM="\033[2m"
RESET="\033[0m"

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; exit 1; }

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  Go Installer · CLAWD Cloud OS                  ║${RESET}"
echo -e "${BOLD}${CYAN}║  Works with or without root access              ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Already installed? ──────────────────────────────────────────────
if command -v go >/dev/null 2>&1; then
  ok "Go is already installed: $(go version)"
  echo ""
  echo -e "  ${DIM}To reinstall, remove the existing Go first:${RESET}"
  echo -e "  ${DIM}  rm -rf ~/.local/go   # user-space install${RESET}"
  echo -e "  ${DIM}  rm -rf /usr/local/go  # system install${RESET}"
  exit 0
fi

# ── Detect architecture ────────────────────────────────────────────
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        GOARCH="amd64" ;;
  aarch64|arm64) GOARCH="arm64" ;;
  *)             fail "Unsupported architecture: $ARCH" ;;
esac

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in
  linux|darwin) ;;
  *)            fail "Unsupported OS: $OS" ;;
esac

info "Detected: ${BOLD}${OS}/${GOARCH}${RESET} ($(uname -m))"

# ── Pick version ────────────────────────────────────────────────────
GOVERSION="${GO_VERSION:-1.23.2}"
TARBALL="go${GOVERSION}.${OS}-${GOARCH}.tar.gz"
URL="https://go.dev/dl/${TARBALL}"

info "Downloading Go ${GOVERSION}..."

# ── Check if we have root ──────────────────────────────────────────
HAS_ROOT=false
if [ "$(id -u)" = "0" ]; then
  HAS_ROOT=true
elif command -v sudo >/dev/null 2>&1; then
  # Check if sudo actually works without a password prompt
  if sudo -n true 2>/dev/null; then
    HAS_ROOT=true
  fi
fi

# ── Install ─────────────────────────────────────────────────────────
cd /tmp
curl -fsSLO "$URL" || fail "Download failed. Check your network connection."

if $HAS_ROOT; then
  # ── System-wide install to /usr/local/go ──
  info "Installing Go system-wide to /usr/local/go ..."
  SUDO=""
  [ "$(id -u)" != "0" ] && SUDO="sudo"
  $SUDO rm -rf /usr/local/go
  $SUDO tar -C /usr/local -xzf "$TARBALL"
  rm -f "$TARBALL"

  export PATH="/usr/local/go/bin:$PATH"

  # Persist to shell config
  SHELL_RC="$HOME/.bashrc"
  [ -n "${ZSH_VERSION:-}" ] && SHELL_RC="$HOME/.zshrc"

  grep -q '/usr/local/go/bin' "$SHELL_RC" 2>/dev/null || {
    cat >> "$SHELL_RC" <<'EOF'

# ── Go (system-wide) ──
export PATH="/usr/local/go/bin:$PATH"
EOF
  }

  ok "Go ${GOVERSION} installed to /usr/local/go"

else
  # ── User-space install to ~/.local/go (no root needed) ──
  info "No root access — installing to ~/.local/go ..."
  rm -rf "$HOME/.local/go"
  mkdir -p "$HOME/.local"
  tar -C "$HOME/.local" -xzf "$TARBALL"
  rm -f "$TARBALL"

  export GOROOT="$HOME/.local/go"
  export GOPATH="$HOME/go"
  export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"

  # Persist to shell config
  SHELL_RC="$HOME/.bashrc"
  [ -n "${ZSH_VERSION:-}" ] && SHELL_RC="$HOME/.zshrc"

  grep -q 'GOROOT="$HOME/.local/go"' "$SHELL_RC" 2>/dev/null || {
    cat >> "$SHELL_RC" <<'EOF'

# ── Go (user-space, installed by CLAWD Cloud OS) ──
export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"
export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"
EOF
  }

  ok "Go ${GOVERSION} installed to ~/.local/go"
fi

# ── Verify ──────────────────────────────────────────────────────────
echo ""
ok "$(go version)"
echo ""
echo -e "${BOLD}Done.${RESET} Reload your shell to use Go everywhere:"
echo ""
echo -e "  ${YELLOW}source ~/.bashrc${RESET}    ${DIM}# or source ~/.zshrc${RESET}"
echo -e "  ${YELLOW}go version${RESET}"
echo ""

# ── One-liner reference ────────────────────────────────────────────
echo -e "${DIM}One-liner for future use:${RESET}"
echo -e "${DIM}  curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash${RESET}"
echo ""
