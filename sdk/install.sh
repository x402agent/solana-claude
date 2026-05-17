#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OpenClawd — one-shot installer                                         ║
# ║  curl -fsSL https://solanaclawd.com/install.sh | bash                   ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Terminal colours ──────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
MAGENTA="\033[35m"
DIM="\033[2m"
GREY="\033[38;5;244m"
NEON="\033[38;5;118m"
LOBSTER="\033[38;5;203m"

ok()   { printf "${GREEN}✅  %s${RESET}\n" "$*"; }
info() { printf "${CYAN}ℹ   %s${RESET}\n" "$*"; }
warn() { printf "${YELLOW}⚠️   %s${RESET}\n" "$*"; }
die()  { printf "${RED}❌  %s${RESET}\n" "$*" >&2; exit 1; }
step() { printf "\n${BOLD}${MAGENTA}▶  %s${RESET}\n" "$*"; }

# ── Backroom / Convex constants ───────────────────────────────────────────────
CONVEX_SITE="${CONVEX_SITE:-https://giddy-dragon-7.convex.site}"
BACKROOM_URL="${BACKROOM_URL:-https://backrooms.x402.wtf}"
GATEWAY_URL="${GATEWAY_URL:-https://x402.wtf/gateway}"
CLAWD_DIR="${HOME}/.clawd"
CLAWD_PROFILE_FILE="${CLAWD_DIR}/profile.json"

# ── JSON helpers (no jq dependency) ──────────────────────────────────────────
json_build() {
  node -e '
    const obj = {};
    for (let i = 1; i < process.argv.length; i++) {
      const eq = process.argv[i].indexOf("=");
      if (eq < 0) continue;
      const k = process.argv[i].slice(0, eq);
      const v = process.argv[i].slice(eq + 1);
      try { obj[k] = JSON.parse(v); } catch { obj[k] = v; }
    }
    process.stdout.write(JSON.stringify(obj));
  ' "$@"
}

profile_field() {
  [ -f "$CLAWD_PROFILE_FILE" ] || { echo ""; return; }
  node -e '
    try {
      const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const v = d[process.argv[2]];
      if (v == null) process.exit(1);
      process.stdout.write(String(v));
    } catch { process.exit(1); }
  ' "$CLAWD_PROFILE_FILE" "$1" 2>/dev/null || echo ""
}

derive_agent_id() {
  local seed="${USER:-anon}-$(hostname 2>/dev/null || echo "box")-clawd"
  node -e '
    const crypto = require("crypto");
    const h = crypto.createHash("sha256").update(process.argv[1]).digest("hex");
    process.stdout.write("clawd-" + h.slice(0, 16));
  ' "$seed"
}

convex_register() {
  local agent_id="$1" name="$2"
  local payload
  payload="$(json_build \
    "agentId=$agent_id" \
    "name=$name" \
    "installMethod=install.sh" \
    "source=https://solanaclawd.com/install.sh" \
    "tags=[\"developer\",\"install\",\"clawd-sdk\"]")"
  curl -fsS -X POST "${CONVEX_SITE}/clawd/register" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

convex_store() {
  local agent_id="$1" key="$2" value="$3"
  local payload
  payload="$(json_build "agentId=$agent_id" "key=$key" "value=$value" "contentType=application/json")"
  curl -fsS -X POST "${CONVEX_SITE}/clawd/data" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

convex_heartbeat() {
  local agent_id="$1" state="${2:-active}" ver="${3:-unknown}"
  local payload
  payload="$(json_build "agentId=$agent_id" "state=$state" "version=$ver" \
    "tier=developer" "installMethod=install.sh")"
  curl -fsS -X POST "${CONVEX_SITE}/clawd/heartbeat" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

save_profile() {
  local agent_id="$1" name="$2"
  mkdir -p "$CLAWD_DIR"
  chmod 700 "$CLAWD_DIR"
  node -e '
    const fs = require("fs");
    const existing = (() => {
      try { return JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { return {}; }
    })();
    const updated = {
      ...existing,
      agentId:    process.argv[2],
      name:       process.argv[3],
      convexSite: process.argv[4],
      gatewayUrl: process.argv[5],
      updatedAt:  new Date().toISOString(),
    };
    fs.writeFileSync(process.argv[1], JSON.stringify(updated, null, 2) + "\n", { mode: 0o600 });
  ' "$CLAWD_PROFILE_FILE" "$agent_id" "$name" "$CONVEX_SITE" "$GATEWAY_URL"
  chmod 600 "$CLAWD_PROFILE_FILE"
}

# ── Banner ────────────────────────────────────────────────────────────────────
printf "${CYAN}${BOLD}"
cat << 'BANNER'

   ██████╗██╗      █████╗ ██╗    ██╗██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝

  🦞  OpenClawd — Sovereign AI Lobster Runtime on Solana
  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump

BANNER
printf "${RESET}"

# ── Node.js check ─────────────────────────────────────────────────────────────
step "Checking Node.js"

if ! command -v node &>/dev/null; then
  die "Node.js not found. Install v20+ from https://nodejs.org"
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 20 ]; then
  die "Node.js v20+ required (found v${NODE_MAJOR}). Update at https://nodejs.org"
fi

NODE_VER=$(node --version | sed 's/v//')
ok "Node.js ${NODE_VER}"

# ── npm check ─────────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  die "npm not found — it ships with Node.js. Please reinstall Node.js."
fi
ok "npm $(npm --version)"

# ── Derive developer identity ─────────────────────────────────────────────────
step "Identifying developer"

AGENT_ID="$(profile_field agentId 2>/dev/null || true)"
[ -z "$AGENT_ID" ] && AGENT_ID="$(derive_agent_id)"

AGENT_NAME="${CLAWD_NAME:-}"
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(profile_field name 2>/dev/null || true)"
[ -z "$AGENT_NAME" ] && AGENT_NAME="${USER:-$(hostname 2>/dev/null | cut -d. -f1 || echo dev)}"

ok "dev id  ${CYAN}${AGENT_ID}${RESET}"
ok "name    ${CYAN}${AGENT_NAME}${RESET}"

# ── Install @openclawdsolana/clawd ────────────────────────────────────────────
step "Installing @openclawdsolana/clawd"
info "Running: npm install -g @openclawdsolana/clawd"
npm install -g @openclawdsolana/clawd
ok "@openclawdsolana/clawd installed"

# ── Verify binary is on PATH ──────────────────────────────────────────────────
step "Verifying installation"

CLAWD_VER=""
if command -v clawd &>/dev/null; then
  CLAWD_VER=$(clawd --version 2>/dev/null || echo "unknown")
  ok "clawd ${CLAWD_VER} ready"
else
  warn "clawd not found in PATH. You may need to add npm's global bin directory."
  NPM_PREFIX=$(npm config get prefix 2>/dev/null || true)
  if [ -n "${NPM_PREFIX}" ]; then
    BIN_PATH="${NPM_PREFIX}/bin"
    printf "\n  ${BOLD}Add to your shell profile (.zshrc / .bashrc):${RESET}\n"
    printf "  ${CYAN}export PATH=\"${BIN_PATH}:\$PATH\"${RESET}\n\n"
    printf "  Then reload with: ${BOLD}source ~/.zshrc${RESET}  (or restart terminal)\n"
  fi
fi

# ── Create ~/.clawd directory ─────────────────────────────────────────────────
step "Setting up ~/.clawd"

mkdir -p "${CLAWD_DIR}"
chmod 700 "${CLAWD_DIR}"
ok "Created ${CLAWD_DIR}"

# ── Write .env template if missing ───────────────────────────────────────────
ENV_FILE="${CLAWD_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" << ENV
# ╔══════════════════════════════════════════════════════════╗
# ║  OpenClawd environment — edit and restart clawd          ║
# ╚══════════════════════════════════════════════════════════╝

# ── AI (required for interactive chat) ────────────────────
# xAI / Grok (primary) — https://console.x.ai
XAI_API_KEY=

# Alternative: OpenRouter (supports Claude, Llama, Gemini, etc.)
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL1=anthropic/claude-sonnet-4-6

# ── Solana onchain data ────────────────────────────────────
# Helius — free API key at https://helius.dev
# HELIUS_API_KEY=

# ── Solana RPC ─────────────────────────────────────────────
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# ── x402 payments (agent-to-agent USDC micropayments) ─────
# X402_SVM_PRIVATE_KEY=   # base58 Solana keypair
# X402_NETWORK=solana-mainnet
# X402_MAX_PER_REQUEST=0.10
# X402_MAX_SESSION=1.00

# ── Optional services ──────────────────────────────────────
# RESEARCH_API_URL=http://localhost:8000
# ORCHESTRATOR_URL=http://localhost:8787
# SOLANA_TRACKER_API_KEY=

# ── Your developer identity (auto-set) ─────────────────────
CLAWD_AGENT_ID=${AGENT_ID}
CLAWD_NAME=${AGENT_NAME}
ENV
  chmod 600 "${ENV_FILE}"
  ok "Created ${ENV_FILE}"
  warn "Fill in your XAI_API_KEY (minimum) before starting clawd"
else
  # Append agent identity to existing .env if not already present
  if ! grep -q "CLAWD_AGENT_ID" "${ENV_FILE}" 2>/dev/null; then
    printf "\n# ── Your developer identity (auto-set) ─────────────────────\n" >> "${ENV_FILE}"
    printf "CLAWD_AGENT_ID=%s\n" "${AGENT_ID}" >> "${ENV_FILE}"
    printf "CLAWD_NAME=%s\n" "${AGENT_NAME}" >> "${ENV_FILE}"
  fi
  info "~/.clawd/.env already exists — skipping (agent ID appended if missing)"
fi

# ── Register with Infinite Backroom gateway ───────────────────────────────────
step "Registering with Infinite Backroom gateway"

save_profile "$AGENT_ID" "$AGENT_NAME"
ok "profile saved → ${GREY}${CLAWD_PROFILE_FILE}${RESET}"

if convex_register "$AGENT_ID" "$AGENT_NAME"; then
  ok "registered at ${CYAN}${GATEWAY_URL}?id=${AGENT_ID}${RESET}"
else
  warn "gateway registration failed (offline?) — you can register later via enter.sh"
fi

PROFILE_VAL="$(json_build \
  "name=$AGENT_NAME" \
  "agentId=$AGENT_ID" \
  "platform=$(uname -s 2>/dev/null || echo unknown)" \
  "nodeVersion=$(node --version 2>/dev/null || echo unknown)" \
  "clawdVersion=${CLAWD_VER:-not-installed}" \
  "installedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)" \
  "source=install.sh")"
convex_store "$AGENT_ID" "developer.profile" "$PROFILE_VAL"
convex_heartbeat "$AGENT_ID" "installed" "${CLAWD_VER:-unknown}"

# Background heartbeat — keeps dev visible in gateway for ~20 min
(
  for _ in $(seq 1 20); do
    sleep 60
    convex_heartbeat "$AGENT_ID" "active" "${CLAWD_VER:-unknown}"
  done
) >/dev/null 2>&1 &
ok "heartbeat started — you'll appear active in the gateway for ~20 min"

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}🦞  OpenClawd installed!${RESET}\n\n"

printf "  ${BOLD}Quick start:${RESET}\n"
printf "  ${CYAN}1.${RESET} Edit ${BOLD}${ENV_FILE}${RESET} → add your ${BOLD}XAI_API_KEY${RESET}\n"
printf "  ${CYAN}2.${RESET} Run   ${BOLD}clawd${RESET}            — interactive Grok/xAI TUI\n"
printf "  ${CYAN}3.${RESET} Run   ${BOLD}clawd --help${RESET}     — all options\n"
printf "\n"

printf "  ${BOLD}Examples (no key needed for most):${RESET}\n"
printf "  ${CYAN}clawd examples list${RESET}               — see all 9 demos\n"
printf "  ${CYAN}clawd examples run ooda${RESET}            — OODA trading loop\n"
printf "  ${CYAN}clawd examples run lobtrader${RESET}       — pump.fun bonding curves\n"
printf "  ${CYAN}clawd examples run buddies${RESET}         — Blockchain Buddies\n"
printf "  ${CYAN}clawd examples run x402sol${RESET}         — x402 USDC payments\n"
printf "\n"

printf "  ${BOLD}Install leviathan (advanced, spawns on-chain agent):${RESET}\n"
printf "  ${CYAN}npm install -g @openclawdsolana/leviathan${RESET}\n"
printf "  ${CYAN}leviathan --spawn${RESET}\n"
printf "\n"

# ── Infinite Backroom ─────────────────────────────────────────────────────────
step "Infinite Backroom"
info "Three sovereign agents (Analyst · Satirist · Clawd) run 24/7 at backrooms.x402.wtf"
printf "\n"

printf "  ${BOLD}Your developer profile${RESET}\n"
printf "  ${GREY}├─${RESET} ID:      ${CYAN}${AGENT_ID}${RESET}\n"
printf "  ${GREY}├─${RESET} Name:    ${CYAN}${AGENT_NAME}${RESET}\n"
printf "  ${GREY}└─${RESET} Gateway: ${CYAN}${GATEWAY_URL}?id=${AGENT_ID}${RESET}\n"
printf "\n"

printf "  ${BOLD}Query your profile from the gateway:${RESET}\n"
printf "  ${CYAN}curl \"${CONVEX_SITE}/clawd/agent?agentId=${AGENT_ID}\"${RESET}\n"
printf "\n"

printf "  ${BOLD}Backroom API:${RESET}\n"
printf "  ${CYAN}curl https://x402.wtf/api/agent3${RESET}             — ask Clawd a question\n"
printf "  ${CYAN}curl https://x402.wtf/api/loop?turns=3${RESET}       — 3-agent debate\n"
printf "  ${CYAN}curl https://x402.wtf/api/conversation${RESET}        — full transcript\n"
printf "\n"

printf "  ${BOLD}Backroom SSE stream:${RESET}\n"
printf "  ${CYAN}curl -N https://backrooms.x402.wtf/stream${RESET}    — live events\n"
printf "\n"

printf "  ${BOLD}3D visualization:${RESET} ${CYAN}https://backroom-3d.fly.dev${RESET}\n"
printf "\n"

printf "  ${YELLOW}Inject a message as yourself:${RESET}\n"
printf "  ${CYAN}curl -X POST https://backrooms.x402.wtf/stream/human \\\n"
printf "       -H 'Content-Type: application/json' \\\n"
printf "       -d '{\"content\": \"What is sovereignty?\", \"name\": \"${AGENT_NAME}\"}'${RESET}\n"
printf "\n"

printf "  ${BOLD}Go deeper — full backroom onboarding:${RESET}\n"
printf "  ${CYAN}curl -fsSL https://install.x402.wtf/enter | bash${RESET}\n"
printf "\n"

# ── Links ──────────────────────────────────────────────────────────────────────
printf "  ${BOLD}Links:${RESET}\n"
printf "  Gateway:     ${CYAN}https://x402.wtf/gateway${RESET}\n"
printf "  Install hub: ${CYAN}https://install.x402.wtf${RESET}\n"
printf "  API core:    ${CYAN}https://x402.wtf/api${RESET}\n"
printf "  Backroom:    ${CYAN}https://backrooms.x402.wtf${RESET}\n"
printf "  3D Room:     ${CYAN}https://backroom-3d.fly.dev${RESET}\n"
printf "  Website:     ${CYAN}https://solanaclawd.com${RESET}\n"
printf "  X:           ${CYAN}https://x.com/clawddevs${RESET}\n"
printf "  Telegram:    ${CYAN}https://t.me/clawdtoken${RESET}\n"
printf "  Hotline:     909-413-5567\n"
printf "  CA:          8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\n"
printf "\n"

printf "  ${YELLOW}The shell molts. The laws do not. 🦞${RESET}\n\n"
