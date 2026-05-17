#!/bin/sh
# Solana Clawd Automation Installer — thin wrapper
# curl -fsSL https://x402.wtf/automation/install.sh | bash
set -e
TARGET="${OPENCLAWD_HOME:-$HOME/.solana-clawd}"
if [ ! -d "$TARGET/.git" ]; then
  git clone https://github.com/x402agent/solana-clawd.git "$TARGET"
else
  git -C "$TARGET" pull --ff-only
fi
cd "$TARGET"
npm install && npm run build
exec npm run automation:full
