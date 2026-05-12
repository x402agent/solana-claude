#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Node.js 20+ is required. Found $(node --version)."
  exit 1
fi

cd "${ROOT_DIR}"

echo "Installing root dependencies..."
npm install

echo "Installing terminal dependencies..."
npm --prefix tui install

echo "Installing MCP dependencies..."
npm --prefix mcp install

echo "Building distributable packages..."
npm run build

cat <<'EOF'

solana-clawd is ready.

Run:
  npm run hermes
  npm run mcp:http
  npx solana-clawd doctor
EOF
