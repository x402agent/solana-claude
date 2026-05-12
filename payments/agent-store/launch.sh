#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STORE_DIR="$ROOT_DIR/payments/agent-store"

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

node --import tsx/esm "$STORE_DIR/index.ts" launch "$@"
