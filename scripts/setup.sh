#!/usr/bin/env bash
# solana-claude one-shot setup script
# Usage: bash scripts/setup.sh
# No private key or wallet required.

set -e

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}"
echo "  ____  ___  _     _    _   _    _     ____ _        _    _   _ ____"
echo " / ___|/ _ \| |   / \  | \ | |  / \   / ___| |      / \  | | | |  _ \\"
echo " \\___ \\| | | | |  / _ \\ |  \\| | / _ \\ | |   | |     / _ \\ | | | | | | |"
echo "  ___) | |_| | |_/ ___ \\| |\\  |/ ___ \\| |___| |___ / ___ \\| |_| | |_| |"
echo " |____/ \\___/|_/_/   \\_\\_| \\_/_/   \\_\\\\____|_____/_/   \\_\\\\___/|____/"
echo -e "${RESET}"
echo -e "${BOLD}  Solana AI Agent Framework — No private key required${RESET}"
echo ""

# ── Check node ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing via nvm...${RESET}"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source "$HOME/.nvm/nvm.sh"
  nvm install 22
  nvm use 22
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${YELLOW}Node >= 20 required. Current: $(node --version)${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${RESET}"

# ── Install root deps ─────────────────────────────────────────────────────────
echo -e "\n${BOLD}Installing root dependencies...${RESET}"
npm install

# ── Install MCP server deps ──────────────────────────────────────────────────
echo -e "\n${BOLD}Installing MCP server dependencies...${RESET}"
cd mcp-server && npm install && cd ..

# ── Build ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Building TypeScript...${RESET}"
npm run build 2>/dev/null || true
chmod +x dist/entrypoints/clawd.js 2>/dev/null || echo -e "${YELLOW}⚠ Root build skipped (no entry point yet)${RESET}"

echo -e "\n${BOLD}Building MCP server...${RESET}"
npm run mcp:build

# ── .env ─────────────────────────────────────────────────────────────────────
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${RESET}"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✓ Setup complete!${RESET}"
echo ""
echo -e "${BOLD}Quick start options:${RESET}"
echo ""
echo -e "  ${CYAN}1. MCP with Claude Desktop (recommended — no API key needed):${RESET}"
echo "     Add to ~/Library/Application\\ Support/Claude/claude_desktop_config.json:"
echo '     {'
echo '       "mcpServers": {'
echo '         "solana-claude": {'
echo '           "command": "node",'
echo "           \"args\": [\"$(pwd)/mcp-server/dist/index.js\"]"
echo '         }'
echo '       }'
echo '     }'
echo ""
echo -e "  ${CYAN}2. Run MCP as HTTP server (Cursor, remote access):${RESET}"
echo "     npm run mcp:http"
echo "     # Connect at http://localhost:3000/mcp"
echo ""
echo -e "  ${CYAN}3. Deploy to Fly.io (24/7 public access):${RESET}"
echo "     fly launch --name solana-claude --config mcp-server/fly.toml"
echo "     fly deploy"
echo ""
echo -e "  ${CYAN}4. Add an LLM key for standalone agent mode (optional):${RESET}"
echo "     # Free models at https://openrouter.ai"
echo "     echo 'OPENROUTER_API_KEY=sk-or-...' >> .env"
echo ""
