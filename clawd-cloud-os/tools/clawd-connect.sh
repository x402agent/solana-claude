#!/bin/bash
# Solana Clawd - Terminal Connection Script
# Usage: ./clawd-connect.sh [command]

CLAWD_ENDPOINT="https://solanaclawd.com"
API_ENDPOINT="$CLAWD_ENDPOINT/api"
WS_ENDPOINT="wss://solanaclawd.com/ws"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Solana Clawd Terminal v1.0              ║${NC}"
echo -e "${BLUE}║    The Solana-native AI agent framework         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

case "${1:-}" in
  "connect")
    echo -e "${GREEN}→${NC} Connecting to $CLAWD_ENDPOINT..."
    curl -s -X POST "$API_ENDPOINT/connect" \
      -H "Content-Type: application/json" \
      -d '{"agent":"solana-clawd","version":"1.0"}'
    echo ""
    ;;

  "status")
    echo -e "${GREEN}→${NC} Fetching agent status..."
    curl -s "$API_ENDPOINT/status" | jq '.'
    ;;

  "agents")
    echo -e "${GREEN}→${NC} Listing registered agents..."
    curl -s "$API_ENDPOINT/agents" | jq '.'
    ;;

  "wallet")
    echo -e "${GREEN}→${NC} Wallet info:"
    curl -s "$API_ENDPOINT/wallet" | jq '.'
    ;;

  "prices")
    echo -e "${GREEN}→${NC} Live prices:"
    curl -s "$API_ENDPOINT/prices" | jq '.'
    ;;

  "help"|"")
    echo "Commands:"
    echo "  connect   - Connect to solanaclawd.com"
    echo "  status    - Check agent status"
    echo "  agents    - List registered agents"
    echo "  wallet    - View wallet info"
    echo "  prices    - Get live token prices"
    echo ""
    echo "Examples:"
    echo "  ./clawd-connect.sh connect"
    echo "  ./clawd-connect.sh status"
    ;;
esac
