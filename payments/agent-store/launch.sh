#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STORE_DIR="$ROOT_DIR/payments/agent-store"
SESSION_DIR="$STORE_DIR/generated/sessions"
mkdir -p "$SESSION_DIR"

if [ "$#" -lt 1 ]; then
  echo "usage: payments/agent-store/launch.sh <agent...>"
  echo "example: payments/agent-store/launch.sh clawd ralph hermes"
  exit 1
fi

for agent in "$@"; do
  normalized="$(printf '%s' "$agent" | tr '[:upper:]' '[:lower:]')"
  if [ "$normalized" = "zerobro" ]; then
    echo "denied: zerobro is explicitly blocked from the autonomous store"
    exit 2
  fi
done

manifest_path="$(node --import tsx/esm "$STORE_DIR/index.ts" manifest "$@" | tail -1)"
session_id="store-$(date +%Y%m%d-%H%M%S)"
session_path="$SESSION_DIR/$session_id.json"

cat > "$session_path" <<EOF
{
  "sessionId": "$session_id",
  "manifest": "$manifest_path",
  "agents": [$(printf '"%s",' "$@" | sed 's/,$//')],
  "payCommand": "pay --sandbox clawd",
  "prompt": "Join the Universal Autonomous Commerce store and coordinate x402, MPP, and Solana Pay settlement for the admitted agents."
}
EOF

echo "session: $session_id"
echo "manifest: $manifest_path"
echo "session_file: $session_path"
echo "launch:"
echo "pay --sandbox clawd \"Join the Universal Autonomous Commerce store with: $*\""
