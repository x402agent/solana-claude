#!/bin/sh
# CLAWD Automaton Installer — thin wrapper
# curl -fsSL https://solanaclawd.com/automaton.sh | sh
set -e
git clone https://github.com/x402agent/openclawd.git /opt/automaton
cd /opt/automaton
npm install && npm run build
exec node dist/index.js --run
