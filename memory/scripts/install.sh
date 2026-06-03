#!/bin/bash
#
# Mnemosyne Install Script for Hermes Agent
# Handles the directory mismatch between docs and reality
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════"
echo "  Mnemosyne Installer for Hermes Agent"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Find Hermes home directory
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
HERMES_VENV="${HERMES_HOME}/hermes-agent"

# The location Hermes actually looks for memory plugins
HERMES_PLUGIN_DIR="${HERMES_VENV}/plugins/memory"
MNEMOSYNE_LINK="${HERMES_PLUGIN_DIR}/mnemosyne"

# Current location (where this script is)
MNEMOSYNE_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📁 Hermes home: ${HERMES_HOME}"
echo "📁 Hermes venv: ${HERMES_VENV}"
echo "📁 Mnemosyne source: ${MNEMOSYNE_SRC}"
echo "📁 Plugin target: ${MNEMOSYNE_LINK}"
echo ""

# Check if Hermes is installed
if [ ! -d "${HERMES_VENV}" ]; then
    echo -e "${RED}❌ Hermes not found at ${HERMES_VENV}${NC}"
    echo ""
    echo "Please install Hermes first:"
    echo "  https://github.com/NousResearch/hermes-agent#installation"
    exit 1
fi

echo -e "${GREEN}✓ Hermes found${NC}"

# Create the plugins/memory directory if it doesn't exist
mkdir -p "${HERMES_PLUGIN_DIR}"

# Remove existing symlink or directory if present
if [ -L "${MNEMOSYNE_LINK}" ]; then
    echo "🔄 Removing existing symlink..."
    rm "${MNEMOSYNE_LINK}"
elif [ -d "${MNEMOSYNE_LINK}" ]; then
    echo -e "${YELLOW}⚠️  Existing mnemosyne directory found, backing up...${NC}"
    mv "${MNEMOSYNE_LINK}" "${MNEMOSYNE_LINK}.backup.$(date +%s)"
fi

# Create symlink
echo "🔗 Creating symlink..."
ln -s "${MNEMOSYNE_SRC}" "${MNEMOSYNE_LINK}"

# Also create the legacy location for backwards compatibility
LEGACY_PLUGIN_DIR="${HERMES_HOME}/plugins"
if [ ! -d "${LEGACY_PLUGIN_DIR}" ]; then
    mkdir -p "${LEGACY_PLUGIN_DIR}"
fi

LEGACY_LINK="${LEGACY_PLUGIN_DIR}/mnemosyne"
if [ -L "${LEGACY_LINK}" ] || [ -d "${LEGACY_LINK}" ]; then
    rm -rf "${LEGACY_LINK}" 2>/dev/null || true
fi
ln -s "${MNEMOSYNE_SRC}" "${LEGACY_LINK}" 2>/dev/null || true

# Install dependencies into Hermes's venv
echo ""
echo "📦 Installing dependencies into Hermes venv..."

if [ -f "${HERMES_VENV}/bin/activate" ]; then
    # Use Hermes's Python
    HERMES_PYTHON="${HERMES_VENV}/bin/python"
    
    # Install mnemosyne package itself
    "${HERMES_PYTHON}" -m pip install -e "${MNEMOSYNE_SRC}" --quiet
    
    # Install fastembed for dense retrieval (optional but recommended)
    echo ""
    read -p "Install fastembed for dense retrieval? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        "${HERMES_PYTHON}" -m pip install fastembed --quiet
        echo -e "${GREEN}✓ fastembed installed${NC}"
    fi
    
    # Install sqlite-vec if available
    "${HERMES_PYTHON}" -m pip install sqlite-vec --quiet 2>/dev/null || echo -e "${YELLOW}⚠️  sqlite-vec not available, will use bundled version${NC}"
    
else
    echo -e "${YELLOW}⚠️  Hermes venv not found, installing to system Python...${NC}"
    pip install -e "${MNEMOSYNE_SRC}" --quiet
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ Mnemosyne installed successfully!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Set your environment variables (optional):"
echo "     export MNEMOSYNE_VEC_TYPE=int8     # 4x compression"
echo "     export MNEMOSYNE_LOG_TOOLS=1       # Auto-log tool calls"
echo ""
echo "  2. Restart Hermes gateway:"
echo "     hermes gateway restart"
echo ""
echo "  3. Verify installation:"
echo "     hermes tools list | grep mnemosyne"
echo ""
echo "For help: https://github.com/AxDSan/mnemosyne/issues"
echo ""
