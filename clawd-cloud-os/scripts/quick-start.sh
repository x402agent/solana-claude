#!/usr/bin/env bash
set -euo pipefail

# CLAWD Cloud OS Quick Start Script

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CLAWD Cloud OS Quick Start                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if bootstrap has been run
if [ ! -d "$HOME/.solanaos" ]; then
    echo -e "${YELLOW}⚠ SolanaOS not found. Running bootstrap first...${NC}"
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    "$DIR/bootstrap.sh"
    source ~/.bashrc
fi

# Start SolanaOS
echo -e "${GREEN}→${NC} Starting SolanaOS Control UI..."
~/.solanaos/bin/solanaos server &
SOLANAOS_SERVER_PID=$!

echo -e "${GREEN}→${NC} Starting SolanaOS Daemon..."
~/.solanaos/bin/solanaos daemon &
SOLANAOS_DAEMON_PID=$!

# Start solana-clawd
if [ -d "$HOME/src/solana-clawd" ]; then
    echo -e "${GREEN}→${NC} Starting solana-clawd..."
    cd "$HOME/src/solana-clawd"
    npm run demo &
    CLAWD_PID=$!
else
    echo -e "${YELLOW}⚠ solana-clawd not found at ~/src/solana-clawd${NC}"
fi

echo ""
echo -e "${GREEN}✓${NC} Services started:"
echo "  - SolanaOS Control UI: http://localhost:7777"
echo "  - SolanaOS Daemon: Running (PID: $SOLANAOS_DAEMON_PID)"
if [ -n "${CLAWD_PID:-}" ]; then
    echo "  - solana-clawd: Running (PID: $CLAWD_PID)"
fi

echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
wait