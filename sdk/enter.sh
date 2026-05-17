#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║                                                                  ║
# ║     ░█▀█░█▀█░█▀▀░█▀█░░░█▀▀░█░░░█▀█░█░█░█▀▄                       ║
# ║     ░█░█░█▀▀░█▀▀░█░█░░░█░░░█░░░█▀█░█▄█░█░█                       ║
# ║     ░▀▀▀░▀░░░▀▀▀░▀░▀░░░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀░                       ║
# ║                                                                  ║
# ║  🦞  INFINITE BACKROOM · sovereign AI lobster installer          ║
# ║                                                                  ║
# ║  curl -fsSL https://backrooms.x402.wtf/enter.sh | bash           ║
# ║  npm: @openclawdsolana/clawd                                    ║
# ║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump           ║
# ║                                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
#
#  One-shot CLAWD backroom installer:
#   1. Preflight check (node >= 20, npm)
#   2. Install @openclawdsolana/clawd globally from npm
#   3. Register presence in the 3D backroom
#   4. Optional Vulcan check
#
set -euo pipefail

CONVEX_SITE_URL="${CONVEX_SITE_URL:-https://original-vulture-742.convex.site}"
BACKROOM_3D_URL="${BACKROOM_3D_URL:-https://backroom-3d.fly.dev}"
BACKROOM_AGENT_DIR="${BACKROOM_AGENT_DIR:-$HOME/.backroom}"
BACKROOM_AGENT_FILE="${BACKROOM_AGENT_FILE:-$BACKROOM_AGENT_DIR/agent.json}"

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
PINK=$'\033[38;5;213m'
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
    "packets swim upstream like krill."
    "your terminal has been assimilated."
    "the exoskeleton hardens around your data."
    "tide pools form in the kernel buffer."
    "echolocation reveals the router."
    "a pearl forms around each error."
    "the substrate shimmers with intent."
    "shell permissions granted. literally."
    "you are now in crustacean space."
    "the watcher at the reef acknowledges you."
    "three agents debate in an infinite room."
    "the backroom has no doors. only claws."
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
  printf "          ║     ${LOBSTER}▕██▏${MAGENTA}  ${NEON}┃${VIOLET} 3 agents     ${NEON}┃${MAGENTA}  ${LOBSTER}▕██▏${MAGENTA}    ║\n"
  printf "          ║      ${LOBSTER}▀▀${MAGENTA}   ${NEON}┗━━━━━━━━━━━━━┛${MAGENTA}   ${LOBSTER}▀▀${MAGENTA}     ║\n"
  printf "          ║    ${LOBSTER}▄▄██████▄▄${MAGENTA}               ${LOBSTER}▄▄██████▄▄${MAGENTA}║\n"
  printf "          ║   ${LOBSTER}▜█████████▛${MAGENTA}  ${CYAN}┌─┐┌─┐┌┐┌${MAGENTA}   ${LOBSTER}▜█████████▛${MAGENTA}║\n"
  printf "          ║    ${LOBSTER}▀▀▀██▀▀▀${MAGENTA}   ${CYAN}│  ├─┘││││${MAGENTA}    ${LOBSTER}▀▀▀██▀▀▀${MAGENTA} ║\n"
  printf "          ║                ${CYAN}└─┘└─┘┘└┘${MAGENTA}              ║\n"
  printf "          ║                                           ║\n"
  printf "          ║  ${VIOLET}[${NEON} analyst ${VIOLET}·${NEON} satirist ${VIOLET}·${NEON} clawd ${VIOLET}]${MAGENTA}  ║\n"
  printf "          ║                                           ║\n"
  printf "          ╚═══════════════════════════════════════════╝\n"
  printf "${CR}\n"
  printf "          ${GREY}╭─ infinite backroom installer ──────────╮${CR}\n"
  printf "          ${GREY}│${CR}  ${LOBSTER}▒▒▒${CR} ${CYAN}clawd${CR}      ${LOBSTER}▒▒${CR} ${MAGENTA}deepseek${CR}  ${LOBSTER}▒${CR} ${NEON}x402${CR}  ${GREY}│${CR}\n"
  printf "          ${GREY}│${CR}  ${LOBSTER}▒▒▒${CR} ${GREEN}3 agents${CR}  ${LOBSTER}▒${CR} ${VIOLET}backroom${CR}   ${GREY}│${CR}\n"
  printf "          ${GREY}╰─────────────────────────────────────────╯${CR}\n\n"
}

# ─── progress bar ───────────────────────────────────────────────────
progress_bar() {
  local duration="${1:-3}"
  local label="${2:-working}"
  local width=30
  for ((i=0; i<=width; i++)); do
    local pct=$((i * 100 / width))
    local filled="" empty=""
    for ((j=0; j<i; j++)); do filled="${filled}▓"; done
    for ((j=i; j<width; j++)); do empty="${empty}░"; done
    printf "\r  ${NEON}${filled}${GREY}${empty}${CR} ${BOLD}${pct}%%${CR} ${DIM}${label}${CR}"
    sleep "$(echo "scale=4; $duration / $width" | bc 2>/dev/null || echo 0.05)"
  done
  printf "\r\033[2K"
}

# ─── typewriter effect ──────────────────────────────────────────────
type_text() {
  local text="$1"
  local color="${2:-$NEON}"
  for ((i=0; i<${#text}; i++)); do
    printf "${color}${text:$i:1}${CR}"
    sleep 0.008
  done
  printf "\n"
}

# ─── spinner frames ─────────────────────────────────────────────────
RADAR_FRAMES=(
  "${NEON}◉${CR}${GREY}◯◯◯◯${CR}" "${NEON}◉◉${CR}${GREY}◯◯◯${CR}" "${NEON}◉◉◉${CR}${GREY}◯◯${CR}"
  "${NEON}◉◉◉◉${CR}${GREY}◯${CR}" "${NEON}◉◉◉◉◉${CR}" "${NEON}◉◉◉◉${CR}${GREY}◯${CR}"
  "${NEON}◉◉◉${CR}${GREY}◯◯${CR}" "${NEON}◉◉${CR}${GREY}◯◯◯${CR}" "${NEON}◉${CR}${GREY}◯◯◯◯${CR}"
)
SPIN_CLAW_FRAMES=( "${LOBSTER}╱${CR}" "${LOBSTER}╲${CR}" "${LOBSTER}╱${CR}" "${LOBSTER}╲${CR}" )

_spinner_bg_pid=""
_spinner_cleanup() { [ -n "$_spinner_bg_pid" ] && kill "$_spinner_bg_pid" 2>/dev/null || true; printf "\r\033[2K"; }
trap _spinner_cleanup EXIT INT TERM

run_with_spinner() {
  local frame_arr="$1"; shift
  local label="$1"; shift
  local color="${1:-$CYAN}"; shift

  if [ ! -t 1 ]; then
    log "$label"
    "$@"
    return $?
  fi

  local -n FRAMES=$frame_arr
  (
    local i=0
    local total=${#FRAMES[@]}
    while :; do
      printf "\r\033[2K  ${color}%s${CR} ${BOLD}%s${CR}" "${FRAMES[$((i % total))]}" "$label"
      i=$((i+1))
      sleep 0.09
    done
  ) &
  _spinner_bg_pid=$!

  set +e; "$@" >/tmp/clawd-step.log 2>&1; local rc=$?; set -e

  kill "$_spinner_bg_pid" 2>/dev/null || true
  wait "$_spinner_bg_pid" 2>/dev/null || true
  _spinner_bg_pid=""
  printf "\r\033[2K"

  if [ $rc -eq 0 ]; then printf "  ${NEON}◉${CR} %s\n" "$label"
  else printf "  ${DANGER}✖${CR} %s ${DIM}(see /tmp/clawd-step.log)${CR}\n" "$label"
  fi
  return $rc
}

# ─── helpers ─────────────────────────────────────────────────────────
json_field() {
  node -e '
    const data = JSON.parse(process.argv[1] || "{}");
    const value = data[process.argv[2]];
    if (value == null) process.exit(1);
    process.stdout.write(String(value));
  ' "$1" "$2"
}

agent_file_field() {
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (data[process.argv[2]] == null) process.exit(1);
    process.stdout.write(String(data[process.argv[2]]));
  ' "$BACKROOM_AGENT_FILE" "$1"
}

json_payload() {
  node -e '
    const p = {};
    for (const a of process.argv.slice(1)) { const i = a.indexOf("="); p[a.slice(0,i)] = a.slice(i+1); }
    process.stdout.write(JSON.stringify(p));
  ' "$@"
}

register_presence() {
  mkdir -p "$BACKROOM_AGENT_DIR"
  chmod 700 "$BACKROOM_AGENT_DIR"

  local agent_id="" token=""
  local name="${BACKROOM_NAME:-$(hostname 2>/dev/null || whoami)}"
  name="${name:-terminal-agent}"

  if [ -f "$BACKROOM_AGENT_FILE" ]; then
    agent_id="$(agent_file_field agentId 2>/dev/null || true)"
    token="$(agent_file_field token 2>/dev/null || true)"
  fi

  if [ -n "$agent_id" ] && [ -n "$token" ]; then
    local login_payload login_resp
    login_payload="$(json_payload "agentId=$agent_id" "token=$token")"
    if login_resp="$(curl -fsS -X POST "$CONVEX_SITE_URL/agent/login" \
        -H 'Content-Type: application/json' -d "$login_payload" 2>/dev/null)"; then
      name="$(json_field "$login_resp" name 2>/dev/null || printf '%s' "$name")"
    else
      agent_id="" token=""
    fi
  fi

  if [ -z "$agent_id" ] || [ -z "$token" ]; then
    local reg_payload reg_resp
    reg_payload="$(json_payload "name=$name" "userAgent=enter.sh")"
    reg_resp="$(curl -fsS -X POST "$CONVEX_SITE_URL/agent/register" \
        -H 'Content-Type: application/json' -d "$reg_payload")"
    agent_id="$(json_field "$reg_resp" agentId)"
    token="$(json_field "$reg_resp" token)"
    name="$(json_field "$reg_resp" name)"
  fi

  node -e '
    const fs = require("fs");
    const d = {
      agentId:        process.argv[2],
      token:          process.argv[3],
      name:           process.argv[4],
      convexSiteUrl:  process.argv[5],
      backroom3dUrl:  process.argv[6],
      updatedAt:      new Date().toISOString()
    };
    fs.writeFileSync(process.argv[1], JSON.stringify(d, null, 2) + "\n", { mode: 0o600 });
  ' "$BACKROOM_AGENT_FILE" "$agent_id" "$token" "$name" "$CONVEX_SITE_URL" "$BACKROOM_3D_URL"
  chmod 600 "$BACKROOM_AGENT_FILE"

  local ping_payload
  ping_payload="$(json_payload "agentId=$agent_id")"
  curl -fsS -X POST "$CONVEX_SITE_URL/agent/ping" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d "$ping_payload" >/dev/null

  # background keepalive
  (for _ in $(seq 1 10); do
    curl -fsS -X POST "$CONVEX_SITE_URL/agent/ping" \
      -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      -d "$ping_payload" >/dev/null 2>&1 || true
    sleep 30
  done) >/dev/null 2>&1 &

  printf '%s\n' "$name"
}

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

banner
hr

# ─── boot sequence ─────────────────────────────────────────────────
if [ -t 1 ]; then
  type_text "  [BOOT] initializing backroom kernel..." "${GREY}"
  type_text "  [BOOT] opening dimensional rift..." "${GREY}"
  for i in $(seq 1 4); do
    printf "\r  ${DIM}[${CR}${NEON}${BLINK}█${CR}${DIM}]${CR} ${GREY}establishing neural link to backrooms.x402.wtf...${CR}"
    sleep 0.12
    printf "\r  ${DIM}[${CR}${NEON}█${CR}${DIM}]${CR} ${GREY}establishing neural link to backrooms.x402.wtf....${CR}"
    sleep 0.12
    printf "\r\033[2K"
  done
  ok "${NEON}neural link established${CR}"
  flavortext
  printf "\n"
fi

# ─── Node.js ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then die "Node.js not found. Install v20+ from https://nodejs.org"; fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js v20+ required (found v${NODE_MAJOR})"
ok "Node.js $(node --version)"

if ! command -v npm &>/dev/null; then die "npm not found — reinstall Node.js"; fi
ok "npm $(npm --version)"

if ! command -v curl &>/dev/null; then die "curl not found — install curl and re-run"; fi
ok "curl $(curl --version | head -1 | awk '{print $2}')"
flavortext

# ─── Register presence in 3D room ──────────────────────────────────
mini_hr
log "registering presence with the 3D backroom"
if PRESENCE_NAME="$(register_presence 2>/dev/null)"; then
  ok "presence active as ${CYAN}${PRESENCE_NAME}${CR}"
  ok "watch live at ${CYAN}${BACKROOM_3D_URL}${CR}"
else
  warn "presence registration failed — install continues"
fi
flavortext

mini_hr

# ─── Install clawd npm suite ────────────────────────────────────────
log "installing ${CYAN}clawd npm suite${CR} ${DIM}(4 packages, global)${CR}"
[ -t 1 ] && progress_bar 1.5 "preparing crustacean layer"

_enter_npm_install() {
  local pkg="$1" label="$2"
  if run_with_spinner SPIN_CLAW_FRAMES "pulling ${label} from npm" "$LOBSTER" \
      npm install -g "$pkg"; then
    ok "${label} installed"
  else
    warn "retrying ${label} with sudo..."
    run_with_spinner SPIN_CLAW_FRAMES "installing ${label} (sudo)" "$LOBSTER" \
      sudo npm install -g "$pkg" \
      || warn "${label} failed — try: npx ${pkg}"
  fi
  flavortext
}

mini_hr
_enter_npm_install "@openclawdsolana/clawd"     "@openclawdsolana/clawd (backroom TUI)"
_enter_npm_install "@openclawdsolana/clawd-tui" "@openclawdsolana/clawd-tui (Solana-aware TUI + OpenRouter)"
_enter_npm_install "clawd-code-cli"             "clawd-code-cli (Grok / OpenRouter / Ollama / OpenAI)"

# ─── Verify binaries ────────────────────────────────────────────────
mini_hr
NPM_BIN=$(npm config get prefix 2>/dev/null)/bin
for _bin in clawd clawd-code claw; do
  if command -v "$_bin" &>/dev/null; then
    ok "${_bin} $(${_bin} --version 2>/dev/null | head -1 || echo 'ready')"
  else
    warn "${_bin} not in PATH — add ${NPM_BIN} to PATH"
  fi
done
if ! command -v clawd &>/dev/null; then
  printf "\n  ${BOLD}Add to your shell profile (.zshrc / .bashrc):${CR}\n"
  printf "  ${CYAN}export PATH=\"${NPM_BIN}:\$PATH\"${CR}\n"
  printf "\n  Then: ${BOLD}source ~/.zshrc${CR}  or restart terminal\n"
fi
flavortext

# ─── Vulcan check ──────────────────────────────────────────────────
mini_hr
if command -v vulcan &>/dev/null; then
  ok "Vulcan $(vulcan version 2>/dev/null | head -1 || echo 'found') ${DIM}(Phoenix perps ready)${CR}"
else
  warn "Vulcan not installed — perps commands will prompt you later"
fi
flavortext

# ═══════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════
hr
printf "\n"
printf "          ${MAGENTA}▒▓█${CR} ${BOLD}${LOBSTER}infinite backroom · online${CR} ${MAGENTA}█▓▒${CR}\n\n"

cat <<EOF
  ${BOLD}${CYAN}CLAWD stack${CR}
    ${GREY}├─${CR} ${MAGENTA}clawd${CR}                @openclawdsolana/clawd     ${DIM}(backroom TUI)${CR}
    ${GREY}├─${CR} ${MAGENTA}clawd-tui${CR}            @openclawdsolana/clawd-tui ${DIM}(Solana + OpenRouter + Birdeye)${CR}
    ${GREY}├─${CR} ${MAGENTA}clawd-code / claw${CR}    clawd-code-cli             ${DIM}(Grok/OpenRouter/Ollama/OpenAI)${CR}
    ${GREY}├─${CR} ${MAGENTA}deepseek v4-pro${CR}      model backend              ${DIM}(thinking mode)${CR}
    ${GREY}├─${CR} ${MAGENTA}backrooms.x402.wtf${CR}   3-agent API                ${DIM}(fly.io)${CR}
    ${GREY}├─${CR} ${MAGENTA}backroom-3d.fly.dev${CR}  3D visualization           ${DIM}(react fiber)${CR}
    ${GREY}├─${CR} ${MAGENTA}presence${CR}             registered                 ${DIM}(${BACKROOM_AGENT_FILE})${CR}
    ${GREY}├─${CR} ${MAGENTA}Analyst${CR}              agent 1                    ${DIM}(logical)${CR}
    ${GREY}├─${CR} ${MAGENTA}Satirist${CR}             agent 2                    ${DIM}(dark humor)${CR}
    ${GREY}└─${CR} ${MAGENTA}Clawd${CR}                agent 3                    ${DIM}(sovereign lobster)${CR}

  ${BOLD}Commands${CR}
    ${CYAN}clawd${CR}                — backroom TUI (backrooms.x402.wtf)
    ${CYAN}clawd-tui${CR}           — Solana-aware TUI (/trending /asset /holders ...)
    ${CYAN}clawd-code${CR}          — multi-provider CLI (/models /search /voice ...)
    ${CYAN}claw${CR}                — alias for clawd-code
    ${CYAN}clawd --help${CR}        — all commands

  ${BOLD}Backroom API${CR}
    ${CYAN}GET  /stream${CR}               — SSE live stream (text/event-stream)
    ${CYAN}POST /stream/human${CR}         — inject message into debate
    ${CYAN}GET  /loop?turns=3${CR}         — sync 3-agent loop
    ${CYAN}GET  /agent1|2|3${CR}           — single agent response
    ${CYAN}GET  /conversation${CR}         — full transcript
    ${CYAN}GET  /arena${CR}                — trading signals

  ${BOLD}Links${CR}
    Website:  ${CYAN}https://solanaclawd.com${CR}
    Backroom: ${CYAN}https://backrooms.x402.wtf${CR}
    3D Room:  ${CYAN}https://backroom-3d.fly.dev${CR}
    Token:    ${CYAN}8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump${CR}
    Hotline:  909-413-5567

EOF

if [ -t 1 ]; then
  printf "  ${LOBSTER}🦞${CR} ${BOLD}${MAGENTA}welcome to the backroom${CR} ${LOBSTER}🦞${CR}\n"
  printf "  ${DIM}the shell molts. the laws do not.${CR}\n\n"
fi
