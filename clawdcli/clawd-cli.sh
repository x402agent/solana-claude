#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Solana Clawd CLI — wrapper that delegates to clawd-cloud-os CLI
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUD_CLI="$SCRIPT_DIR/../clawd-cloud-os/tools/clawd-cli.sh"

if [ -x "$CLOUD_CLI" ]; then
  exec bash "$CLOUD_CLI" "$@"
else
  # Fallback: original minimal CLI for backward compatibility
  CLAWD_API="https://solanaclawd.com/api"

  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  YELLOW='\033[1;33m'
  NC='\033[0m'

  echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     Solana Clawd CLI v1.0                       ║${NC}"
  echo -e "${BLUE}║     solanaclawd.com                             ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  case "${1:-}" in
    "status")
      echo -e "${GREEN}→${NC} Checking agent status..."
      curl -s "$CLAWD_API/status" | jq '.'
      ;;
    "agents")
      echo -e "${GREEN}→${NC} Listing registered agents..."
      curl -s "$CLAWD_API/agents" | jq '.'
      ;;
    "wallet")
      echo -e "${GREEN}→${NC} Fetching wallet info..."
      curl -s "$CLAWD_API/wallet" | jq '.'
      ;;
    "prices")
      echo -e "${GREEN}→${NC} Live token prices..."
      curl -s "$CLAWD_API/prices" | jq '.'
      ;;
    "register")
      echo -e "${GREEN}→${NC} Registering on Metaplex Agent Registry..."
      echo "Run: npx tsx clawd-register.ts"
      echo "Requires: YOUR_HELIUS_API_KEY in clawd-register.ts"
      ;;
    "connect")
      echo -e "${GREEN}→${NC} Connecting to solanaclawd.com..."
      curl -s -X POST "$CLAWD_API/connect" \
        -H "Content-Type: application/json" \
        -d '{"agent":"solana-clawd","version":"1.0"}' | jq '.'
      ;;
    "help"|"")
      echo "Usage: ./clawd-cli.sh <command>"
      echo ""
      echo -e "${YELLOW}Tip: The full CLAWD Cloud OS CLI is at clawd-cloud-os/tools/clawd-cli.sh${NC}"
      echo ""
      echo "Commands:"
      echo "  status    - Check agent status"
      echo "  agents    - List registered agents"
      echo "  wallet    - View wallet info"
      echo "  prices    - Get live token prices"
      echo "  register  - Register on Metaplex Agent Registry"
      echo "  connect   - Connect to solanaclawd.com"
      echo ""
      ;;
  esac
fi
