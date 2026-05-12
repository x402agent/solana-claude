#!/usr/bin/env bash
set -euo pipefail

# CLAWD Cloud OS Stop Script

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CLAWD Cloud OS Stop Services                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to stop a service on a port
stop_port_service() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}→${NC} Stopping $name on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓${NC} $name stopped"
    else
        echo -e "${BLUE}ℹ${NC} $name was not running on port $port"
    fi
}

# Function to stop processes by name pattern
stop_by_name() {
    local pattern=$1
    local name=$2
    
    if pgrep -f "$pattern" >/dev/null 2>&1; then
        echo -e "${YELLOW}→${NC} Stopping $name..."
        pkill -f "$pattern" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} $name stopped"
    else
        echo -e "${BLUE}ℹ${NC} $name was not running"
    fi
}

# Stop SolanaOS services
echo -e "${BLUE}Stopping SolanaOS services...${NC}"
stop_port_service 7777 "SolanaOS Control UI"
stop_by_name "solanaos daemon" "SolanaOS Daemon"
stop_by_name "solanaos server" "SolanaOS Server"

# Stop using the SolanaOS command if available
if [ -f "$HOME/.solanaos/bin/solanaos" ]; then
    echo -e "${YELLOW}→${NC} Running SolanaOS stop command..."
    ~/.solanaos/bin/solanaos stop 2>/dev/null || true
fi

echo ""

# Stop solana-clawd services
echo -e "${BLUE}Stopping solana-clawd services...${NC}"
stop_port_service 3000 "solana-clawd web"
stop_by_name "npm run demo" "solana-clawd demo"
stop_by_name "npm run mcp" "solana-clawd MCP"

# Additional cleanup for node processes
stop_by_name "node.*solana-clawd" "solana-clawd Node processes"

echo ""
echo -e "${GREEN}✓${NC} All CLAWD Cloud OS services have been stopped"
echo ""
echo "To check status: ./scripts/status.sh"
echo "To restart:      ./scripts/quick-start.sh"