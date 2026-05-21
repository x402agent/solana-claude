#!/usr/bin/env bash
# solana-clawd one-shot setup script
# Usage: bash scripts/setup.sh

set -euo pipefail

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BOLD}${CYAN}"
echo "  _____       __                        ________                    __"
echo " / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /"
echo " \\__ \\/ __ \\/ / __ \`/ __ \\/ __ \`/   / /   / / __ \`/ | /| / / __  / "
echo "___/ / /_/ / / /_/ / / / / /_/ /   / /___/ / /_/ /| |/ |/ / /_/ /  "
echo "/____/\\____/_/\\__,_/_/ /_/\\__,_/    \\____/_/\\__,_/ |__/|__/\\__,_/   "
echo -e "${RESET}"
echo -e "${BOLD}  solana-clawd bootstrap — root runtime, MCP, web, vault, wiki, skills${RESET}"
echo ""

run_step() {
  local title="$1"
  shift
  echo -e "\n${BOLD}${title}${RESET}"
  "$@"
}

if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js is required but was not found on PATH.${RESET}"
  echo "Install Node 20+ and rerun: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo -e "${YELLOW}Node >= 20 required. Current: $(node --version)${RESET}"
  exit 1
fi

echo -e "${GREEN}✓ Node $(node --version)${RESET}"

cd "${ROOT_DIR}"

run_step "Installing root dependencies..." npm install
run_optional_step() {
  local title="$1"
  local dir="$2"
  shift 2
  if [ -d "${ROOT_DIR}/${dir}" ]; then
    run_step "$title" "$@"
  else
    echo -e "\n${YELLOW}Skipping ${title}: ${dir} is not present.${RESET}"
  fi
}

run_step "Installing MCP dependencies..." npm --prefix mcp ci
run_optional_step "Installing agentwallet dependencies..." "packages/agentwallet" npm --prefix packages/agentwallet ci
run_optional_step "Installing web dependencies..." "web" npm --prefix web install
run_optional_step "Installing Clawd Vault web dependencies..." "llm-wiki-tang/web" npm --prefix llm-wiki-tang/web install
run_optional_step "Installing wiki dependencies..." "web/wiki" npm --prefix web/wiki install

run_step "Building root runtime..." npm run build
run_step "Building MCP package..." npm run mcp:build
run_optional_step "Building agentwallet package..." "packages/agentwallet" npm run agentwallet:build
run_optional_step "Building web app..." "web" npm --prefix web run build
run_optional_step "Building Clawd Vault web app..." "llm-wiki-tang/web" npm run vault:web:build
run_optional_step "Building wiki app..." "web/wiki" npm --prefix web/wiki run build
run_step "Generating skills catalog..." npm run skills:catalog

if [ -d "${ROOT_DIR}/web/skills" ]; then
  cp "${ROOT_DIR}/skills/catalog.json" "${ROOT_DIR}/web/skills/catalog.json"
  echo -e "${GREEN}✓ Synced web/skills/catalog.json${RESET}"
fi

if [ ! -f "${ROOT_DIR}/.env" ] && [ -f "${ROOT_DIR}/.env.example" ]; then
  cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
  echo -e "${GREEN}✓ Created .env from .env.example${RESET}"
fi

cat <<EOF

${BOLD}${GREEN}✓ Setup complete${RESET}

${BOLD}One-shot path completed:${RESET}
  - root runtime built
  - MCP package built at ${ROOT_DIR}/mcp/dist
  - agentwallet package built at ${ROOT_DIR}/packages/agentwallet/dist
  - web app built
  - Clawd Vault web app built
  - wiki app built
  - skills catalog generated and synced

${BOLD}Recommended next commands:${RESET}
  ${CYAN}CLI demo${RESET}
    npm run demo

  ${CYAN}MCP HTTP server${RESET}
    npm run mcp:http
    # then connect at http://localhost:3000/mcp

  ${CYAN}Main web app${RESET}
    npm --prefix web run dev

  ${CYAN}Clawd Vault web app${RESET}
    npm run vault:web:dev

  ${CYAN}Wiki app${RESET}
    npm --prefix web/wiki run dev

  ${CYAN}Standalone solana-clawd skill${RESET}
    npx skills add x402agent/solana-clawd --path skill/solana-clawd

  ${CYAN}Agentwallet vault server${RESET}
    npm run agentwallet:start
    # then connect at http://localhost:9099/api/health

  ${CYAN}Clawd Desktop / Cursor config${RESET}
    {
      "mcpServers": {
        "solana-clawd": {
          "command": "node",
          "args": ["${ROOT_DIR}/mcp/dist/index.js"]
        }
      }
    }
EOF
