#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  CLAWD Cloud OS — Full-Stack One-Shot
#  Installs: Go → SolanaOS → solana-clawd → agentwallet-vault
#  Honors:   NPM_TOKEN for authenticated registry installs
#            XAI_API_KEY, HELIUS_API_KEY, VAULT_PASSPHRASE (optional)
#  Starts:   agentwallet vault on :9099 (background)
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

BOLD="\033[1m"; CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; DIM="\033[2m"; RESET="\033[0m"

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
fail() { echo -e "  ${RED}✗${RESET} $*"; exit 1; }

print_banner() {
  echo -e "${BOLD}${CYAN}"
  cat <<'ART'
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/
ART
  echo -e "${RESET}"
  echo -e "  ${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "  ${BOLD}║  CLAWD · FULL STACK · clawd + agentwallet-vault + SolanaOS ║${RESET}"
  echo -e "  ${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

# ── Pre-flight ──────────────────────────────────────────────────────
print_banner

for cmd in bash curl git node npm; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing required command: ${BOLD}$cmd${RESET}"
done

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -lt 20 ] && fail "Node 20+ required (current: $(node -v))"
ok "Node $(node -v)"

# ── Phase 1: NPM auth (if NPM_TOKEN provided) ──────────────────────
echo -e "${BOLD}Phase 1: npm authentication${RESET}"
if [ -n "${NPM_TOKEN:-}" ]; then
  NPMRC="$HOME/.npmrc"
  touch "$NPMRC"
  chmod 600 "$NPMRC"
  # Remove any existing auth line for registry.npmjs.org, then append fresh
  tmpfile="$(mktemp)"
  grep -v '^//registry.npmjs.org/:_authToken=' "$NPMRC" > "$tmpfile" || true
  mv "$tmpfile" "$NPMRC"
  printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" >> "$NPMRC"
  ok "Wrote authenticated ~/.npmrc (0600)"
else
  warn "NPM_TOKEN not set — anonymous installs only"
fi
echo ""

# ── Phase 2: Delegate Go + SolanaOS + solana-clawd to bootstrap.sh ─
echo -e "${BOLD}Phase 2: Go + SolanaOS + solana-clawd${RESET}"
BOOTSTRAP_URL="https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh"
info "Running upstream bootstrap..."
curl -fsSL "$BOOTSTRAP_URL" | bash
echo ""

# ── Phase 3: agentwallet-vault build ───────────────────────────────
echo -e "${BOLD}Phase 3: agentwallet-vault${RESET}"
CLAWD_DIR="$HOME/src/solana-clawd"
[ -d "$CLAWD_DIR" ] || fail "solana-clawd not found at $CLAWD_DIR"

cd "$CLAWD_DIR"
info "Building packages/agentwallet..."
npm run agentwallet:build
ok "agentwallet-vault built"
echo ""

# ── Phase 4: Vault passphrase + env wiring ─────────────────────────
echo -e "${BOLD}Phase 4: Vault configuration${RESET}"
ENV_FILE="$CLAWD_DIR/.env"
[ -f "$ENV_FILE" ] || { [ -f "$CLAWD_DIR/.env.example" ] && cp "$CLAWD_DIR/.env.example" "$ENV_FILE"; }

if [ -z "${VAULT_PASSPHRASE:-}" ]; then
  VAULT_PASSPHRASE="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
  warn "Generated VAULT_PASSPHRASE (saved to .env — back this up)"
fi

set_env() {
  local key="$1" val="$2"
  [ -z "$val" ] && return 0
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # replace in place
    tmpfile="$(mktemp)"
    grep -v "^${key}=" "$ENV_FILE" > "$tmpfile" || true
    printf '%s=%s\n' "$key" "$val" >> "$tmpfile"
    mv "$tmpfile" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

set_env VAULT_PASSPHRASE "$VAULT_PASSPHRASE"
set_env VAULT_PORT "${VAULT_PORT:-9099}"
set_env VAULT_HOST "${VAULT_HOST:-127.0.0.1}"
[ -n "${VAULT_API_TOKEN:-}" ] && set_env VAULT_API_TOKEN "$VAULT_API_TOKEN"
chmod 600 "$ENV_FILE"
ok "Vault env wired into .env"
echo ""

# ── Phase 5: Start vault in background ─────────────────────────────
echo -e "${BOLD}Phase 5: Start agentwallet vault${RESET}"
LOG_DIR="$HOME/.clawd/logs"
mkdir -p "$LOG_DIR"
VAULT_LOG="$LOG_DIR/agentwallet.log"
VAULT_PID_FILE="$LOG_DIR/agentwallet.pid"

if [ -f "$VAULT_PID_FILE" ] && kill -0 "$(cat "$VAULT_PID_FILE")" 2>/dev/null; then
  ok "Vault already running (pid $(cat "$VAULT_PID_FILE"))"
else
  info "Launching vault on :${VAULT_PORT:-9099}..."
  (
    cd "$CLAWD_DIR"
    set -a; . "$ENV_FILE"; set +a
    nohup npm --prefix packages/agentwallet start >"$VAULT_LOG" 2>&1 &
    echo $! > "$VAULT_PID_FILE"
  )
  sleep 2
  if kill -0 "$(cat "$VAULT_PID_FILE")" 2>/dev/null; then
    ok "Vault started (pid $(cat "$VAULT_PID_FILE"), log: $VAULT_LOG)"
  else
    warn "Vault failed to start — check $VAULT_LOG"
  fi
fi
echo ""

# ── Done ────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}"
cat <<'DONE'
╔══════════════════════════════════════════════════════════════╗
║              FULL STACK BOOTSTRAP COMPLETE                  ║
╚══════════════════════════════════════════════════════════════╝
DONE
echo -e "${RESET}"

echo -e "  ${CYAN}Vault health:${RESET}  curl http://127.0.0.1:${VAULT_PORT:-9099}/api/health"
echo -e "  ${CYAN}Vault logs:${RESET}    tail -f $VAULT_LOG"
echo -e "  ${CYAN}Create wallet:${RESET} curl -X POST http://127.0.0.1:${VAULT_PORT:-9099}/api/wallets \\"
echo -e "                   -H 'Content-Type: application/json' \\"
echo -e "                   -d '{\"label\":\"my-wallet\",\"chainType\":\"solana\"}'"
echo -e "  ${CYAN}Next:${RESET}          source ~/.bashrc && clawd-start"
echo ""
