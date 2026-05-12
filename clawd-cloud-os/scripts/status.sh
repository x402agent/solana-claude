#!/usr/bin/env bash
set -euo pipefail

# CLAWD Cloud OS Status Check Script

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CLAWD Cloud OS Status Check                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a process is running
check_process() {
    local name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running on port $port"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running on port $port"
        return 1
    fi
}

# Function to check command availability
check_command() {
    local cmd=$1
    local desc=$2
    
    if command -v $cmd >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $desc: $(command -v $cmd)"
        return 0
    else
        echo -e "${RED}✗${NC} $desc: not found"
        return 1
    fi
}

echo -e "${BLUE}System Components:${NC}"
echo ""

# Check Go installation
if command -v go >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Go: $(go version)"
else
    echo -e "${RED}✗${NC} Go: not installed"
fi

# Check Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Node.js: $(node -v)"
else
    echo -e "${RED}✗${NC} Node.js: not installed"
fi

# Check SolanaOS installation
if [ -f "$HOME/.solanaos/bin/solanaos" ]; then
    echo -e "${GREEN}✓${NC} SolanaOS: installed at ~/.solanaos"
    if [ -f "$HOME/.solanaos/solanaos.json" ]; then
        echo -e "${GREEN}✓${NC} SolanaOS: configured"
    else
        echo -e "${YELLOW}⚠${NC}  SolanaOS: not configured (run 'solanaos onboard')"
    fi
else
    echo -e "${RED}✗${NC} SolanaOS: not installed"
fi

# Check solana-clawd
if [ -d "$HOME/src/solana-clawd" ]; then
    echo -e "${GREEN}✓${NC} solana-clawd: installed at ~/src/solana-clawd"
else
    echo -e "${RED}✗${NC} solana-clawd: not installed"
fi

echo ""
echo -e "${BLUE}Running Services:${NC}"
echo ""

# Check services
check_process "SolanaOS Control UI" 7777
check_process "solana-clawd" 3000

# Check SolanaOS daemon
if pgrep -f "solanaos daemon" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SolanaOS Daemon is running"
else
    echo -e "${YELLOW}⚠${NC}  SolanaOS Daemon is not running"
fi

echo ""
echo -e "${BLUE}Environment Variables:${NC}"
echo ""

# Check essential environment variables
if [ -n "${XAI_API_KEY:-}" ]; then
    echo -e "${GREEN}✓${NC} XAI_API_KEY is set"
else
    echo -e "${YELLOW}⚠${NC}  XAI_API_KEY is not set"
fi

if [ -n "${HELIUS_API_KEY:-}" ]; then
    echo -e "${GREEN}✓${NC} HELIUS_API_KEY is set"
else
    echo -e "${YELLOW}⚠${NC}  HELIUS_API_KEY is not set"
fi

if [ -n "${SOLANA_TRACKER_API_KEY:-}" ]; then
    echo -e "${GREEN}✓${NC} SOLANA_TRACKER_API_KEY is set"
else
    echo -e "${YELLOW}⚠${NC}  SOLANA_TRACKER_API_KEY is not set"
fi

echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo ""

# Test solanaclawd.com API
if curl -s -o /dev/null -w "%{http_code}" "https://solanaclawd.com/api/status" | grep -q "200\|404"; then
    echo -e "${GREEN}✓${NC} solanaclawd.com API is reachable"
else
    echo -e "${RED}✗${NC} solanaclawd.com API is not reachable"
fi

echo ""
echo -e "${BLUE}Quick Actions:${NC}"
echo "  - Start all services: ./scripts/quick-start.sh"
echo "  - Stop all services:  ./scripts/stop.sh"
echo "  - View help:          cat docs/terminal-help.md"