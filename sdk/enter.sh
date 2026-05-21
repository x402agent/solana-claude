#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║                                                                  ║
# ║  🦞  CLAWD INFINITE BACKROOM · sovereign AI lobster installer   ║
# ║                                                                  ║
# ║  curl -fsSL https://install.x402.wtf/enter | bash               ║
# ║  alt: curl -fsSL https://backrooms.x402.wtf/enter.sh | bash     ║
# ║                                                                  ║
# ║  npm: @openclawdsolana/clawd                                    ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump           ║
# ║  gateway: https://x402.wtf/gateway                              ║
# ║                                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
#
#  Flow:
#   1. Preflight (node ≥ 20, npm, curl)
#   2. Register this developer in Convex (track install)
#   3. Store developer profile, wallet, platform data
#   4. Install the full Clawd npm package surface globally
#   5. Launch background heartbeat (dev shows up live at x402.wtf/gateway)
#
set -euo pipefail

# ─── Convex backend (giddy-dragon-7) ─────────────────────────────
CONVEX_SITE="${CONVEX_SITE:-https://giddy-dragon-7.convex.site}"
BACKROOM_URL="${BACKROOM_URL:-https://backrooms.x402.wtf}"
BACKROOM_3D_URL="${BACKROOM_3D_URL:-https://backroom-3d.fly.dev}"
GATEWAY_URL="${GATEWAY_URL:-https://x402.wtf/gateway}"
TERMINAL_URL="${TERMINAL_URL:-https://solanaclawd.com/terminal}"
CLAWD_PROFILE_DIR="${CLAWD_PROFILE_DIR:-$HOME/.clawd}"
CLAWD_PROFILE_FILE="${CLAWD_PROFILE_FILE:-$CLAWD_PROFILE_DIR/profile.json}"
CLAWD_ENV_FILE="${CLAWD_PROFILE_DIR}/.env"

# ─── cyberpunk palette ────────────────────────────────────────────
CR=$'\033[0m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; BLINK=$'\033[5m'
MAGENTA=$'\033[38;5;201m'
CYAN=$'\033[38;5;51m'
LOBSTER=$'\033[38;5;203m'
NEON=$'\033[38;5;118m'
VIOLET=$'\033[38;5;141m'
AMBER=$'\033[38;5;214m'
DANGER=$'\033[38;5;196m'
GREY=$'\033[38;5;244m'
AQUA=$'\033[38;5;45m'
GREEN=$'\033[38;5;83m'

hr()      { printf "${VIOLET}▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰${CR}\n"; }
mini_hr() { printf "${GREY}▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰${CR}\n"; }
log()     { printf "${CYAN}▸${CR} ${BOLD}%s${CR}\n" "$*"; }
ok()      { printf "${NEON}◉${CR} %s\n" "$*"; }
warn()    { printf "${AMBER}▲${CR} %s\n" "$*"; }
die()     { printf "${DANGER}✖ fatal:${CR} %s\n" "$*" >&2; exit 1; }

flavortext() {
  local FLAVORS=(
    "the shell molts. the laws do not."
    "deepseek dreams in electric brine."
    "antennae twitch. the network waits."
    "a solitary claw types in the dark."
    "bioluminescent whispers traverse the wire."
    "the abyss scuttles sideways."
    "three agents debate in an infinite room."
    "the backroom has no doors. only claws."
    "your profile is now in the registry."
    "sovereign dev, welcome to the trench."
  )
  local idx=$((RANDOM % ${#FLAVORS[@]}))
  printf "  ${DIM}${AQUA}∼ ${FLAVORS[$idx]}${CR}\n"
}

# ─── banner ─────────────────────────────────────────────────────────
banner() {
  printf "${MAGENTA}"
  cat <<'ASCII'

          ╔═══════════════════════════════════════════╗
          ║                                           ║
ASCII
  printf "          ║     ${LOBSTER}▄▄▄▄${MAGENTA}      ${CYAN}INFINITE${MAGENTA}    ${LOBSTER}▄▄▄▄${MAGENTA}    ║\n"
  printf "          ║    ${LOBSTER}▐█▄█▌${MAGENTA}     ${CYAN}BACKROOM${MAGENTA}    ${LOBSTER}▐█▄█▌${MAGENTA}   ║\n"
  printf "          ║     ${LOBSTER}╲██╱${MAGENTA}  ${NEON}┏━━━━━━━━━━━━━┓${MAGENTA}  ${LOBSTER}╲██╱${MAGENTA}    ║\n"
  printf "          ║      ${LOBSTER}██${MAGENTA}   ${NEON}┃${CYAN} 🦞 lobster.os ${NEON}┃${MAGENTA}   ${LOBSTER}██${MAGENTA}     ║\n"
  printf "          ║     ${LOBSTER}▕██▏${MAGENTA}  ${NEON}┃${VIOLET} x402.wtf     ${NEON}┃${MAGENTA}  ${LOBSTER}▕██▏${MAGENTA}    ║\n"
  printf "          ║      ${LOBSTER}▀▀${MAGENTA}   ${NEON}┗━━━━━━━━━━━━━┛${MAGENTA}   ${LOBSTER}▀▀${MAGENTA}     ║\n"
  printf "          ║    ${LOBSTER}▄▄██████▄▄${MAGENTA}               ${LOBSTER}▄▄██████▄▄${MAGENTA}║\n"
  printf "          ║   ${LOBSTER}▜█████████▛${MAGENTA}  ${CYAN}┌─┐┌─┐┌┐┌${MAGENTA}   ${LOBSTER}▜█████████▛${MAGENTA}║\n"
  printf "          ║    ${LOBSTER}▀▀▀██▀▀▀${MAGENTA}   ${CYAN}│  ├─┘││││${MAGENTA}    ${LOBSTER}▀▀▀██▀▀▀${MAGENTA} ║\n"
  printf "          ║                ${CYAN}└─┘└─┘┘└┘${MAGENTA}              ║\n"
  printf "          ║  ${VIOLET}[${NEON} analyst · satirist · clawd ${VIOLET}]${MAGENTA}    ║\n"
  printf "          ║  ${GREY}gateway: x402.wtf/gateway${MAGENTA}          ║\n"
  printf "          ╚═══════════════════════════════════════════╝\n"
  printf "${CR}\n"
  printf "          ${GREY}╭─ dev hub: install.x402.wtf ────────────╮${CR}\n"
  printf "          ${GREY}│${CR}  ${LOBSTER}▒▒▒${CR} ${CYAN}clawd${CR}    ${LOBSTER}▒▒${CR} ${MAGENTA}x402 api${CR}  ${LOBSTER}▒${CR} ${NEON}convex${CR}  ${GREY}│${CR}\n"
  printf "          ${GREY}│${CR}  ${LOBSTER}▒▒▒${CR} ${GREEN}3 agents${CR}  ${LOBSTER}▒${CR} ${VIOLET}gateway${CR}   ${GREY}│${CR}\n"
  printf "          ${GREY}╰─────────────────────────────────────────╯${CR}\n\n"
}

# ─── JSON helpers (Node.js-backed, no jq dependency) ─────────────
json_field() {
  node -e '
    try {
      const d = JSON.parse(process.argv[1] || "{}");
      const v = d[process.argv[2]];
      if (v == null) process.exit(1);
      process.stdout.write(String(v));
    } catch { process.exit(1); }
  ' "$1" "$2" 2>/dev/null
}

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

# ─── Derive a stable agent ID from machine identity ──────────────
derive_agent_id() {
  local seed="${USER:-anon}-$(hostname 2>/dev/null || echo "box")-clawd"
  node -e '
    const crypto = require("crypto");
    const h = crypto.createHash("sha256").update(process.argv[1]).digest("hex");
    process.stdout.write("clawd-" + h.slice(0, 16));
  ' "$seed"
}

# ─── Collect platform metadata ────────────────────────────────────
collect_metadata() {
  local platform node_ver npm_ver arch os_name clawd_ver
  platform="$(uname -s 2>/dev/null || echo unknown)"
  arch="$(uname -m 2>/dev/null || echo unknown)"
  os_name="$(uname -r 2>/dev/null || echo unknown)"
  node_ver="$(node --version 2>/dev/null || echo unknown)"
  npm_ver="$(npm --version 2>/dev/null || echo unknown)"
  clawd_ver="$(clawd --version 2>/dev/null || echo not-installed)"
  json_build \
    "platform=$platform" \
    "arch=$arch" \
    "osRelease=$os_name" \
    "nodeVersion=$node_ver" \
    "npmVersion=$npm_ver" \
    "clawdVersion=$clawd_ver" \
    "installer=enter.sh" \
    "installedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"
}

# ─── Convex: register developer install ──────────────────────────
convex_register() {
  local agent_id="$1"
  local name="$2"
  local metadata_json="$3"
  local wallet_address="${SOLANA_WALLET:-}"

  # Check for existing keystore wallet
  local keystore="$HOME/.openclawd/keystore.json"
  if [ -z "$wallet_address" ] && [ -f "$keystore" ]; then
    wallet_address="$(node -e '
      try {
        const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
        process.stdout.write(d.pubkey || "");
      } catch {}
    ' "$keystore" 2>/dev/null || echo "")"
  fi

  local payload
  payload="$(node -e '
    const body = {
      agentId:       process.argv[1],
      name:          process.argv[2],
      installMethod: "enter.sh",
      source:        "https://install.x402.wtf/enter",
      tags:          ["developer", "install", "clawd-sdk"],
    };
    try { body.metadata = process.argv[3]; } catch {}
    if (process.argv[4]) body.address = process.argv[4];
    process.stdout.write(JSON.stringify(body));
  ' "$agent_id" "$name" "$metadata_json" "$wallet_address")"

  curl -fsS -X POST "${CONVEX_SITE}/clawd/register" \
    -H 'Content-Type: application/json' \
    -d "$payload" 2>/dev/null
}

# ─── Convex: store a data key for this developer ─────────────────
convex_store() {
  local agent_id="$1"
  local key="$2"
  local value="$3"
  local content_type="${4:-application/json}"
  local payload
  payload="$(json_build "agentId=$agent_id" "key=$key" "value=$value" "contentType=$content_type")"
  curl -fsS -X POST "${CONVEX_SITE}/clawd/data" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

# ─── Convex: heartbeat ────────────────────────────────────────────
convex_heartbeat() {
  local agent_id="$1"
  local state="${2:-active}"
  local clawd_ver="${3:-unknown}"
  local payload
  payload="$(json_build "agentId=$agent_id" "state=$state" "version=$clawd_ver" \
    "tier=developer" "installMethod=enter.sh")"
  curl -fsS -X POST "${CONVEX_SITE}/clawd/heartbeat" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

# ─── Save local profile ───────────────────────────────────────────
save_profile() {
  local agent_id="$1"
  local name="$2"
  mkdir -p "$CLAWD_PROFILE_DIR"
  chmod 700 "$CLAWD_PROFILE_DIR"
  node -e '
    const fs = require("fs");
    const existing = (() => {
      try { return JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { return {}; }
    })();
    const updated = {
      ...existing,
      agentId: process.argv[2],
      name: process.argv[3],
      convexSite: process.argv[4],
      gatewayUrl: process.argv[5],
      terminalUrl: process.argv[6],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(process.argv[1], JSON.stringify(updated, null, 2) + "\n", { mode: 0o600 });
  ' "$CLAWD_PROFILE_FILE" "$agent_id" "$name" "$CONVEX_SITE" "$GATEWAY_URL" "$TERMINAL_URL"
  chmod 600 "$CLAWD_PROFILE_FILE"
}

# ─── spinner util ─────────────────────────────────────────────────
SPIN_CLAW_FRAMES=( "${LOBSTER}╱${CR}" "${LOBSTER}╲${CR}" "${LOBSTER}╱${CR}" "${LOBSTER}╲${CR}" )
_spinner_pid=""
_stop_spinner() {
  [ -n "$_spinner_pid" ] && kill "$_spinner_pid" 2>/dev/null || true
  wait "$_spinner_pid" 2>/dev/null || true
  _spinner_pid=""
  printf "\r\033[2K"
}
trap '_stop_spinner; exit' EXIT INT TERM

run_spin() {
  local label="$1"; shift
  if [ ! -t 1 ]; then log "$label"; "$@"; return $?; fi
  (local i=0; while :; do
    printf "\r\033[2K  ${LOBSTER}%s${CR} ${BOLD}%s${CR}" \
      "${SPIN_CLAW_FRAMES[$((i % 4))]}" "$label"
    i=$((i+1)); sleep 0.09
  done) &
  _spinner_pid=$!
  set +e; "$@" >/tmp/clawd-enter.log 2>&1; local rc=$?; set -e
  _stop_spinner
  [ $rc -eq 0 ] && printf "  ${NEON}◉${CR} %s\n" "$label" \
                 || printf "  ${AMBER}▲${CR} %s ${DIM}(non-fatal)${CR}\n" "$label"
  return $rc
}

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

banner
hr

# ─── Boot sequence ─────────────────────────────────────────────────
if [ -t 1 ]; then
  printf "  ${DIM}${GREY}[BOOT] opening connection to x402.wtf network...${CR}\n"
  sleep 0.3
  printf "  ${DIM}${GREY}[BOOT] loading crustacean OS...${CR}\n"
  sleep 0.2
  printf "\r\033[2A\033[2K\033[2K"
fi
ok "${NEON}CLAWD backroom installer ${GREY}· install.x402.wtf/enter${CR}"
flavortext
printf "\n"

# ─── Preflight ─────────────────────────────────────────────────────
mini_hr
log "preflight checks"

if ! command -v node &>/dev/null; then die "Node.js not found — install v20+ from https://nodejs.org"; fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js v20+ required (found v${NODE_MAJOR})"
ok "Node.js $(node --version)"

if ! command -v npm &>/dev/null; then die "npm not found — reinstall Node.js"; fi
ok "npm $(npm --version)"

if ! command -v curl &>/dev/null; then die "curl not found"; fi
ok "curl $(curl --version 2>/dev/null | head -1 | awk '{print $2}')"
flavortext

# ─── Derive identity ────────────────────────────────────────────────
mini_hr
log "identifying developer"

AGENT_ID="$(profile_field agentId 2>/dev/null || true)"
[ -z "$AGENT_ID" ] && AGENT_ID="$(derive_agent_id)"

AGENT_NAME="${CLAWD_NAME:-}"
[ -z "$AGENT_NAME" ] && AGENT_NAME="$(profile_field name 2>/dev/null || true)"
[ -z "$AGENT_NAME" ] && AGENT_NAME="${USER:-$(hostname 2>/dev/null | cut -d. -f1 || echo dev)}"

ok "dev id  ${CYAN}${AGENT_ID}${CR}"
ok "name    ${CYAN}${AGENT_NAME}${CR}"

# ─── Register in Convex ────────────────────────────────────────────
mini_hr
log "registering with x402.wtf gateway (Convex)"

METADATA_JSON="$(collect_metadata)"

if run_spin "registering developer in gateway" \
    convex_register "$AGENT_ID" "$AGENT_NAME" "$METADATA_JSON"; then
  ok "registered — view at ${CYAN}${GATEWAY_URL}?id=${AGENT_ID}${CR}"
else
  warn "registration failed (offline?) — install continues"
fi
flavortext

# ─── Install Clawd npm package surface ─────────────────────────────
mini_hr
log "installing ${CYAN}Clawd npm packages${CR} ${DIM}(npm global)${CR}"

CLAWD_NPM_PACKAGES=(
  "@openclawdsolana/clawd"
  "@openclawdsolana/clawd-tui"
  "@openclawdsolana/clawd-sdk"
  "@openclawdsolana/clawd-standalone"
  "@openclawdsolana/clawd-wallet"
  "@openclawdsolana/clawd-perps"
  "clawd-automaton"
  "x402.wtf"
  "x402agent-nanoclawd-cli"
)

if ! run_spin "npm install -g ${CLAWD_NPM_PACKAGES[*]}" \
    npm install -g "${CLAWD_NPM_PACKAGES[@]}"; then
  warn "retrying with sudo..."
  run_spin "sudo npm install -g ${CLAWD_NPM_PACKAGES[*]}" \
    sudo npm install -g "${CLAWD_NPM_PACKAGES[@]}" \
    || die "npm install failed — see /tmp/clawd-enter.log"
fi
ok "Clawd npm packages installed"
flavortext

# ─── Verify binary ──────────────────────────────────────────────────
for bin in clawd clawd-tui clawd-standalone clawd-perps clawd-automaton x402.wtf nanoclawd; do
  if command -v "$bin" &>/dev/null; then
    ok "${bin} ${DIM}ready at $(command -v "$bin")${CR}"
  else
    warn "${bin} not found in PATH after npm install"
  fi
done

CLAWD_VER=""
if command -v clawd &>/dev/null; then
  CLAWD_VER="$(clawd --version 2>/dev/null || echo ready)"
  ok "clawd ${CYAN}${CLAWD_VER}${CR} ${DIM}ready${CR}"
else
  warn "clawd not found in PATH — add npm's global bin:"
  NPM_BIN="$(npm config get prefix 2>/dev/null)/bin"
  printf "\n  ${CYAN}export PATH=\"${NPM_BIN}:\$PATH\"${CR}\n"
  printf "  Then: ${BOLD}source ~/.zshrc${CR} or restart terminal\n\n"
fi

# ─── Store developer profile + metadata in Convex ─────────────────
mini_hr
log "storing developer data in gateway"

save_profile "$AGENT_ID" "$AGENT_NAME"
ok "profile saved to ${GREY}${CLAWD_PROFILE_FILE}${CR}"

# Store profile data in Convex KV store
PROFILE_VAL="$(json_build \
  "name=$AGENT_NAME" \
  "agentId=$AGENT_ID" \
  "platform=$(uname -s 2>/dev/null || echo unknown)" \
  "nodeVersion=$(node --version 2>/dev/null || echo unknown)" \
  "clawdVersion=${CLAWD_VER:-not-installed}" \
  "installedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)" \
  "source=enter.sh" \
  "gatewayUrl=${GATEWAY_URL}" \
  "terminalUrl=${TERMINAL_URL}")"

convex_store "$AGENT_ID" "developer.profile" "$PROFILE_VAL" "application/json"

# Store install event
INSTALL_VAL="$(json_build \
  "method=enter.sh" \
  "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)" \
  "clawdVersion=${CLAWD_VER:-unknown}" \
  "nodeVersion=$(node --version 2>/dev/null || echo unknown)" \
  "platform=$(uname -s 2>/dev/null || echo unknown)")"

convex_store "$AGENT_ID" "install.latest" "$INSTALL_VAL" "application/json"
ok "developer data stored in x402.wtf gateway"

# Store wallet if present
if [ -f "$HOME/.openclawd/keystore.json" ]; then
  WALLET_ADDR="$(node -e '
    try {
      const d = JSON.parse(require("fs").readFileSync(process.env.HOME + "/.openclawd/keystore.json","utf8"));
      process.stdout.write(d.pubkey || "");
    } catch {}
  ' 2>/dev/null || echo "")"
  if [ -n "$WALLET_ADDR" ]; then
    WALLET_VAL="$(json_build "address=$WALLET_ADDR" "network=mainnet" \
      "storedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)")"
    convex_store "$AGENT_ID" "developer.wallet" "$WALLET_VAL" "application/json"
    ok "wallet ${CYAN}${WALLET_ADDR:0:12}…${CR} stored in gateway"
  fi
fi
flavortext

# ─── Initial heartbeat ─────────────────────────────────────────────
convex_heartbeat "$AGENT_ID" "installed" "${CLAWD_VER:-unknown}" >/dev/null 2>&1 || true

# ─── Background heartbeat (keeps dev visible in gateway) ──────────
mini_hr
(
  for _ in $(seq 1 20); do
    sleep 60
    convex_heartbeat "$AGENT_ID" "active" "${CLAWD_VER:-unknown}" >/dev/null 2>&1 || true
  done
) >/dev/null 2>&1 &
ok "background heartbeat started — you'll show as active in gateway for ~20 min"

# ─── Generate + register dev API key ──────────────────────────────
mini_hr
log "provisioning x402.wtf developer API key"

# Generate a key if one isn't already stored locally
DEV_API_KEY="$(profile_field apiKey 2>/dev/null || true)"
if [ -z "$DEV_API_KEY" ]; then
  DEV_API_KEY="$(node -e '
    const crypto = require("crypto");
    process.stdout.write("x402_dev_" + crypto.randomBytes(24).toString("hex"));
  ')"
fi

# Try to register the key with x402.wtf/api (gateway catalog)
KEYREG_PAYLOAD="$(json_build \
  "agentId=$AGENT_ID" \
  "name=$AGENT_NAME" \
  "apiKey=$DEV_API_KEY" \
  "source=enter.sh")"

KEYREG_OK=0
if curl -fsS -X POST "${CONVEX_SITE}/clawd/apikey" \
    -H 'Content-Type: application/json' \
    -d "$KEYREG_PAYLOAD" >/dev/null 2>&1; then
  KEYREG_OK=1
fi

# Also store via KV
convex_store "$AGENT_ID" "developer.apiKey" \
  "$(json_build "apiKey=$DEV_API_KEY" "issuedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)" "source=enter.sh")" \
  "application/json"

# Save key into local profile
node -e '
  const fs = require("fs");
  const existing = (() => { try { return JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { return {}; } })();
  existing.apiKey = process.argv[2];
  existing.apiKeyIssuedAt = new Date().toISOString();
  fs.writeFileSync(process.argv[1], JSON.stringify(existing, null, 2) + "\n", { mode: 0o600 });
' "$CLAWD_PROFILE_FILE" "$DEV_API_KEY" 2>/dev/null || true

if [ "$KEYREG_OK" = "1" ]; then
  ok "API key registered at ${CYAN}x402.wtf/api${CR}"
else
  ok "API key generated (offline — will sync on next run)"
fi
printf "  ${BOLD}Your key:${CR} ${NEON}${DEV_API_KEY}${CR}\n"
printf "  ${DIM}(also saved to ${CLAWD_PROFILE_FILE})${CR}\n"
flavortext

# ─── Write .env template ───────────────────────────────────────────
if [ ! -f "$CLAWD_ENV_FILE" ]; then
  cat > "$CLAWD_ENV_FILE" << ENV
# ╔══════════════════════════════════════════════╗
# ║  OpenClawd environment — edit before using  ║
# ╚══════════════════════════════════════════════╝

# ── x402.wtf developer API key ─────────────────
X402_DEV_KEY=${DEV_API_KEY}

# ── AI (required for chat) ──────────────────────
XAI_API_KEY=

# ── Solana ──────────────────────────────────────
# HELIUS_API_KEY=
# BIRDEYE_API_KEY=
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# SOLANA_PRIVATE_KEY=        # base58 — DO NOT COMMIT

# ── x402 payments ───────────────────────────────
# X402_NETWORK=solana-mainnet
# X402_MAX_PER_REQUEST=0.10

# ── Your developer ID ───────────────────────────
CLAWD_AGENT_ID=${AGENT_ID}
CLAWD_NAME=${AGENT_NAME}

# ── Web terminal ────────────────────────────────
CLAWD_TERMINAL_URL=${TERMINAL_URL}
ENV
  chmod 600 "$CLAWD_ENV_FILE"
  ok ".env template created at ${GREY}${CLAWD_ENV_FILE}${CR}"
else
  # Patch existing .env — add X402_DEV_KEY if missing
  if ! grep -q "^X402_DEV_KEY=" "$CLAWD_ENV_FILE" 2>/dev/null; then
    printf "\n# x402.wtf developer API key\nX402_DEV_KEY=%s\n" "$DEV_API_KEY" >> "$CLAWD_ENV_FILE"
    ok "X402_DEV_KEY added to existing .env"
  fi
  if ! grep -q "^CLAWD_TERMINAL_URL=" "$CLAWD_ENV_FILE" 2>/dev/null; then
    printf "\n# Web terminal\nCLAWD_TERMINAL_URL=%s\n" "$TERMINAL_URL" >> "$CLAWD_ENV_FILE"
    ok "CLAWD_TERMINAL_URL added to existing .env"
  fi
fi

# ─── Vulcan check ──────────────────────────────────────────────────
mini_hr
if command -v vulcan &>/dev/null; then
  ok "Vulcan found ${DIM}(Phoenix perps ready)${CR}"
else
  warn "Vulcan not installed — perps commands will prompt you later"
fi

# ═══════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════
hr
printf "\n"
printf "  ${BOLD}${LOBSTER}🦞  Welcome to CLAWD · Infinite Backroom${CR}\n\n"

printf "  ${BOLD}Your developer profile${CR}\n"
printf "  ${GREY}├─${CR} ID:       ${CYAN}${AGENT_ID}${CR}\n"
printf "  ${GREY}├─${CR} Name:     ${CYAN}${AGENT_NAME}${CR}\n"
printf "  ${GREY}├─${CR} API key:  ${NEON}${DEV_API_KEY}${CR}\n"
printf "  ${GREY}├─${CR} Gateway:  ${CYAN}${GATEWAY_URL}${CR}\n"
printf "  ${GREY}├─${CR} Terminal: ${CYAN}${TERMINAL_URL}${CR}\n"
printf "  ${GREY}└─${CR} Profile:  ${GREY}${CLAWD_PROFILE_FILE}${CR}\n"
printf "\n"

printf "  ${BOLD}Gateway — view your data${CR}\n"
printf "  ${CYAN}curl \"${CONVEX_SITE}/clawd/agent?agentId=${AGENT_ID}\"${CR}\n"
printf "  ${CYAN}curl \"${CONVEX_SITE}/clawd/data?agentId=${AGENT_ID}&key=developer.profile\"${CR}\n"
printf "  ${CYAN}curl \"${CONVEX_SITE}/clawd/agents\"${CR}               — all devs online\n"
printf "\n"

printf "  ${BOLD}Backroom API (x402.wtf/api)${CR}\n"
printf "  ${CYAN}curl https://x402.wtf/api/agent3${CR}             — ask Clawd\n"
printf "  ${CYAN}curl https://x402.wtf/api/loop?turns=3${CR}       — 3-agent debate\n"
printf "  ${CYAN}curl -N https://backrooms.x402.wtf/stream${CR}    — SSE live stream\n"
printf "  ${CYAN}curl -X POST https://backrooms.x402.wtf/stream/human${CR}\n"
printf "       ${GREY}-d '{\"content\":\"hello\",\"name\":\"${AGENT_NAME}\"}'${CR}\n"
printf "\n"

printf "  ${BOLD}Commands${CR}\n"
printf "  ${CYAN}clawd${CR}                — interactive TUI\n"
printf "  ${CYAN}clawd --help${CR}         — all options\n"
printf "  ${CYAN}leviathan --spawn${CR}    — spawn sovereign on-chain agent\n"
printf "  ${CYAN}${TERMINAL_URL}${CR} — browser terminal\n"
printf "\n"

printf "  ${BOLD}Links${CR}\n"
printf "  ${CYAN}${TERMINAL_URL}${CR} — browser terminal\n"
printf "  ${CYAN}https://x402.wtf/gateway${CR}    — your developer hub\n"
printf "  ${CYAN}https://install.x402.wtf${CR}    — install hub\n"
printf "  ${CYAN}https://backrooms.x402.wtf${CR}  — infinite backroom\n"
printf "  ${CYAN}https://backroom-3d.fly.dev${CR} — 3D visualization\n"
printf "  ${CYAN}https://solanaclawd.com${CR}     — website\n"
printf "  Hotline: 909-413-5567\n"
printf "  CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\n"
printf "\n"

printf "  ${DIM}${AQUA}the shell molts. the laws do not. 🦞${CR}\n\n"
