#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Clawd Memory — one-shot installer                              ║
# ║  curl -fsSL https://solanaclawd.com/memory/install.sh | bash    ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump          ║
# ╚══════════════════════════════════════════════════════════════════╝
set -euo pipefail

RESET="\033[0m"; BOLD="\033[1m"
GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; CYAN="\033[36m"; MAGENTA="\033[35m"

ok()   { printf "${GREEN}✅  %s${RESET}\n" "$*"; }
info() { printf "${CYAN}ℹ   %s${RESET}\n" "$*"; }
warn() { printf "${YELLOW}⚠️   %s${RESET}\n" "$*"; }
die()  { printf "${RED}❌  %s${RESET}\n" "$*" >&2; exit 1; }
step() { printf "\n${BOLD}${MAGENTA}▶  %s${RESET}\n" "$*"; }

printf "${CYAN}${BOLD}"
cat << 'BANNER'

  ╔══════════════════════════════════════════════╗
  ║   🧠  Clawd Memory  — local-first agent RAM  ║
  ║   SQLite + FTS5  ·  zero cloud  ·  $CLAWD    ║
  ╚══════════════════════════════════════════════╝

BANNER
printf "${RESET}"

# ── Node.js ────────────────────────────────────────────────────────
step "Checking Node.js"
if ! command -v node &>/dev/null; then
  die "Node.js not found. Install v20+ from https://nodejs.org"
fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 20 ]; then
  die "Node.js v20+ required (found v${NODE_MAJOR}). Update at https://nodejs.org"
fi
ok "Node.js $(node --version)"

# ── npm ────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  die "npm not found — it ships with Node.js. Reinstall Node.js."
fi
ok "npm $(npm --version)"

# ── Install ────────────────────────────────────────────────────────
step "Installing @openclawdsolana/clawd-memory"
npm install -g @openclawdsolana/clawd-memory --legacy-peer-deps
ok "Package installed"

# ── Init ──────────────────────────────────────────────────────────
step "Initializing memory bank"
clawd-memory init
ok "Memory bank ready at ~/.clawd/memory/memory.db"

# ── Done ──────────────────────────────────────────────────────────
printf "\n${GREEN}${BOLD}"
cat << 'DONE'

  ✅  Clawd Memory installed!

  Quick start:
    cm remember "my first memory" "agents remember everything" --kind note
    cm recall "memory"
    cm status

  In your agent (TypeScript):
    import { remember, recall, getContext } from '@openclawdsolana/clawd-memory'

  Docs: https://solanaclawd.com/memory

DONE
printf "${RESET}"
