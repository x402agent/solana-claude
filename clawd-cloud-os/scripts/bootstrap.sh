#!/usr/bin/env bash
set -euo pipefail

echo "   _____       __                        ________                    __"
echo "  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /"
echo "  \\__ \\/ __ \\/ / __ \`/ __ \\/ __ \`/    / /   / / __ \`/ | /| / / __  /"
echo " ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ / "
echo "/____/\\____/_/\\__,_/_/ /_/\\__,_/      \\____/_/\\__,_/ |__/|__/\\__,_/  "
echo ""
echo "                    ╔══════════════════════════╗"
echo "                    ║   POWERED BY xAI GROK    ║"
echo "                    ╚══════════════════════════╝"
echo ""
echo "CLAWD Cloud OS bootstrap starting..."
echo ""

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd bash
need_cmd curl
need_cmd git
need_cmd node
need_cmd npm

NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ is required. Current version: $(node -v)"
  exit 1
fi

install_local_go() {
  if command -v go >/dev/null 2>&1; then
    echo "Go already installed: $(go version)"
    return
  fi

  echo "Go not found. Installing local user-space Go..."

  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) GOARCH="amd64" ;;
    aarch64|arm64) GOARCH="arm64" ;;
    *)
      echo "Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac

  GOVERSION="1.23.2"
  cd /tmp
  curl -fsSLO "https://go.dev/dl/go${GOVERSION}.linux-${GOARCH}.tar.gz"

  rm -rf "$HOME/.local/go"
  mkdir -p "$HOME/.local"
  tar -C "$HOME/.local" -xzf "go${GOVERSION}.linux-${GOARCH}.tar.gz"

  export GOROOT="$HOME/.local/go"
  export GOPATH="$HOME/go"
  export PATH="$GOROOT/bin:$GOPATH/bin:$HOME/.solanaos/bin:$PATH"

  grep -q 'GOROOT="$HOME/.local/go"' "$HOME/.bashrc" 2>/dev/null || cat >> "$HOME/.bashrc" <<'EOF'

export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"
export PATH="$GOROOT/bin:$GOPATH/bin:$HOME/.solanaos/bin:$PATH"
EOF

  echo "Installed Go: $(go version)"
}

install_local_go

export PATH="$HOME/.local/go/bin:$HOME/go/bin:$HOME/.solanaos/bin:$PATH"

echo ""
echo "Installing SolanaOS..."
npx -y solanaos-computer@latest install --with-web

echo ""
echo "Cloning solana-clawd..."
mkdir -p "$HOME/src"
cd "$HOME/src"

if [ ! -d "$HOME/src/solana-clawd" ]; then
  git clone https://github.com/x402agent/solana-clawd
fi

cd "$HOME/src/solana-clawd"

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ -n "${XAI_API_KEY:-}" ] && [ -f .env ] && ! grep -q '^XAI_API_KEY=' .env; then
  printf '\nXAI_API_KEY=%s\n' "$XAI_API_KEY" >> .env
fi

echo ""
echo "Running solana-clawd setup..."
npm run setup

echo ""
echo "Bootstrap complete."
echo ""
echo "Next:"
echo "  source ~/.bashrc"
echo "  ~/.solanaos/bin/solanaos onboard"
echo "  ~/.solanaos/bin/solanaos version"
echo "  ~/.solanaos/bin/solanaos server"
echo "  ~/.solanaos/bin/solanaos daemon"
echo ""
echo "  cd ~/src/solana-clawd"
echo "  npm run demo"
echo "  npm run mcp:http"
echo "  npm run birth"
echo "  npm --prefix web run dev"