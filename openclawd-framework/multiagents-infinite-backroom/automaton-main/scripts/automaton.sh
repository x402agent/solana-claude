#!/bin/sh
# CLAWD Automaton Installer — thin wrapper
# curl -fsSL https://conway.tech/automaton.sh | sh
set -e
git clone https://github.com/Conway-Research/automaton.git /opt/automaton
cd /opt/automaton
npm install && npm run build
exec node dist/index.js --run
