export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/install.sh') {
      return new Response('Not found', { status: 404 });
    }
    const script = `#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CLAWD — one-shot installer                                             ║
# ║  curl -fsSL https://solanaclawd.com/install.sh | bash
# ║  npm: @openclawdsolana/clawd                                            ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RESET="\\033[0m"
BOLD="\\033[1m"
GREEN="\\033[32m"
YELLOW="\\033[33m"
RED="\\033[31m"
CYAN="\\033[36m"
DIM="\\033[2m"

ok()   { printf "\${GREEN}✅  %s\${RESET}\\n" "$*"; }
info() { printf "\${CYAN}ℹ   %s\${RESET}\\n" "$*"; }
warn() { printf "\${YELLOW}⚠️   %s\${RESET}\\n" "$*"; }
die()  { printf "\${RED}❌  %s\${RESET}\\n" "$*" >&2; exit 1; }
step() { printf "\\n\${BOLD}\${CYAN}▶  %s\${RESET}\\n" "$*"; }

# ── Banner ────────────────────────────────────────────────────────────────────
printf "\${CYAN}\${BOLD}"
cat << 'BANNER'

 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝╚═════╝

 █████╗ ██╗   ██╗████████╗ ██████╗ ███╗   ███╗ █████╗ ████████╗██╗  ██████╗ ███╗   ██╗
██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██║ ██╔═══██╗████╗  ██║
███████║██║   ██║   ██║   ██║   ██║██╔████╔██║███████║   ██║   ██║ ██║   ██║██╔██╗ ██║
██╔══██║██║   ██║   ██║   ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██║ ██║   ██║██║╚██╗██║
██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║   ██║   ██║ ╚██████╔╝██║ ╚████║
╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═════╝ ╚═╝  ╚═══╝

BANNER
printf "\${RESET}"
printf "\${DIM}  🦞  Sovereign AI Lobster Runtime · Phoenix Perps · Infinite Backroom\\n"
printf "  \\$CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\${RESET}\\n\\n"

# ── Node.js ───────────────────────────────────────────────────────────────────
step "Checking Node.js"

if ! command -v node &>/dev/null; then
  die "Node.js not found. Install v20+ from https://nodejs.org"
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "\${NODE_MAJOR}" -lt 20 ]; then
  die "Node.js v20+ required (found v\${NODE_MAJOR}). Update at https://nodejs.org"
fi
ok "Node.js $(node --version)"

# ── npm ───────────────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  die "npm not found — reinstall Node.js from https://nodejs.org"
fi
ok "npm $(npm --version)"

# ── Install ───────────────────────────────────────────────────────────────────
step "Installing @openclawdsolana/clawd"

npm install -g @openclawdsolana/clawd
ok "@openclawdsolana/clawd installed"

# ── Verify binary ─────────────────────────────────────────────────────────────
step "Verifying"

if command -v clawd &>/dev/null; then
  ok "clawd $(clawd --version 2>/dev/null || echo 'ready')"
else
  warn "clawd not found in PATH"
  NPM_BIN=$(npm config get prefix 2>/dev/null)/bin
  printf "\\n  \${BOLD}Add to your shell profile (.zshrc / .bashrc):\${RESET}\\n"
  printf "  \${CYAN}export PATH=\\"\${NPM_BIN}:\\$PATH\\"\${RESET}\\n"
  printf "\\n  Then: \${BOLD}source ~/.zshrc\${RESET}  or restart terminal\\n"
fi

# ── Vulcan (optional — needed for perps) ──────────────────────────────────────
step "Checking Vulcan CLI (Phoenix perps)"

if command -v vulcan &>/dev/null; then
  ok "Vulcan $(vulcan version 2>/dev/null | head -1 || echo 'found')"
else
  warn "Vulcan not found — perps commands will prompt you to install it"
  printf "\${DIM}  Install later with:\\n"
  printf "  curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh\${RESET}\\n"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\\n\${BOLD}\${GREEN}🦞  CLAWD Automation installed!\${RESET}\\n\\n"

printf "  \${BOLD}Start:\${RESET}\\n"
printf "  \${CYAN}clawd\${RESET}               — opens the interactive TUI\\n"
printf "  \${CYAN}clawd --help\${RESET}        — all CLI commands\\n"
printf "\\n"

printf "  \${BOLD}Backroom:\${RESET}\\n"
printf "  \${CYAN}clawd run\${RESET}           — run a backroom debate (8 turns)\\n"
printf "  \${CYAN}clawd stream\${RESET}        — stream a live debate\\n"
printf "  \${CYAN}clawd status\${RESET}        — box + automaton status\\n"
printf "  \${CYAN}clawd spawn\${RESET}         — spawn the sovereign agent runtime\\n"
printf "\\n"

printf "  \${BOLD}Perps (requires Vulcan):\${RESET}\\n"
printf "  \${CYAN}clawd perps markets\${RESET}             — list Phoenix markets\\n"
printf "  \${CYAN}clawd perps ticker SOL\${RESET}          — live SOL ticker\\n"
printf "  \${CYAN}clawd perps paper init\${RESET}          — start paper trading (\\$10k)\\n"
printf "  \${CYAN}clawd perps long SOL --notional-usdc 200\${RESET}  — open live long\\n"
printf "\\n"

printf "  \${BOLD}Links:\${RESET}\\n"
printf "  Website:  \${CYAN}https://solanaclawd.com\${RESET}\\n"
printf "  Token:    \${CYAN}8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\${RESET}\\n"
printf "  Hotline:  909-413-5567\\n"
printf "\\n"
printf "  \${YELLOW}The shell molts. The laws do not. 🦞\${RESET}\\n\\n"
`;
    return new Response(script, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
