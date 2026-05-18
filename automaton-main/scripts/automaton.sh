#!/bin/sh
# CLAWD Automaton One-Shot Installer
# curl -fsSL https://x402.wtf/automation/install.sh | sh
set -e

REPO_URL="https://github.com/x402agent/openclawd.git"
INSTALL_DIR="${CLAWD_AUTOMATON_INSTALL_DIR:-$HOME/.clawd/automaton}"
BIN_DIR="${HOME}/.local/bin"
BIN_TARGET="${BIN_DIR}/clawd-automaton"

echo "🦞  Crustacean Automation — One-Shot Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌  Node.js v20+ required. Install from https://nodejs.org"
  exit 1
fi

# Check/install pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Clone or update
mkdir -p "$(dirname "${INSTALL_DIR}")"

if [ -d "${INSTALL_DIR}" ]; then
  echo "Updating existing install at ${INSTALL_DIR}..."
  git -C "${INSTALL_DIR}" pull --ff-only
else
  echo "Cloning to ${INSTALL_DIR}..."
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}/automaton-main"
pnpm install --frozen-lockfile
pnpm build

mkdir -p "${BIN_DIR}"
ln -sf "${INSTALL_DIR}/automaton-main/dist/index.js" "${BIN_TARGET}"

echo ""
echo "✅  Installation complete!"
echo ""
echo "  clawd-automaton --help     Show available commands"
echo "  clawd-automaton --run      Start the agent loop"
echo "  clawd-automaton --status   Check runtime status"
echo "  ${INSTALL_DIR}/agents/agents-catalog.json   Agent registry catalog"
echo "  ${INSTALL_DIR}/agents/templates/index.json  Agent template registry"
echo "  ${INSTALL_DIR}/agents/skills/index.json     Formal skill hub"
echo "  ${INSTALL_DIR}/agents/skills/README.md      Full local skill library"
echo "  Binary linked at ${BIN_TARGET}"
echo ""
echo "  The shell molts. The laws do not. 🦞"
echo ""

exec node dist/index.js --help
