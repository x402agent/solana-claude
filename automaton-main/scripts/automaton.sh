#!/bin/sh
# CLAWD Automaton Installer — thin wrapper
# curl -fsSL https://x402.wtf/automation/install.sh | sh
set -e
git clone https://github.com/x402agent/solana-clawd.git /opt/solana-clawd
cd /opt/solana-clawd/automaton-main
pnpm install && pnpm build
exec node dist/index.js --run
