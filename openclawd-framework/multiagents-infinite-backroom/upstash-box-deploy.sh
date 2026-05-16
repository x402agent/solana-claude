#!/usr/bin/env bash
# ============================================================
# 🦞 CLAWD Infinite Backroom — Upstash Box SDK Deploy
# ============================================================
# Modern TypeScript SDK deployment using @upstash/box
#
# Prerequisites:
#   export UPSTASH_BOX_API_KEY="..."
#   export DEEPSEEK_API_KEY="..."
#
# Usage:
#   chmod +x upstash-box-deploy.sh
#   npm run box:deploy       # Deploy with interactive menu
#   npm run box:status       # Check status
#   npm run box:run          # Run backroom conversation
#   npm run box:stream       # Live-stream a backroom debate
#
# Or directly:
#   UPSTASH_BOX_API_KEY="..." npx tsx api/upstash-manager.ts --deploy
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Color output ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC}  $1"; }

# ─── Help ───────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${CYAN}🦞 CLAWD Infinite Backroom — Upstash Box SDK Deploy${NC}

Usage: $(basename "$0") [OPTION]

Options:
  --deploy    Deploy using the TypeScript SDK manager (recommended)
  --status    Check box health via SDK
  --run       Run a backroom conversation via SDK
  --stream    Live-stream a backroom debate via SDK
  --legacy    Deploy using legacy Upstash CLI (deprecated)
  --help      Show this help message

Environment:
  UPSTASH_BOX_API_KEY    Required — Upstash Box API key
  DEEPSEEK_API_KEY       Required for backroom conversations
  UPSTASH_BOX_ID         Box ID (default: stirred-anemone-13117)

Quick start:
  export UPSTASH_BOX_API_KEY="your-upstash-key"
  export DEEPSEEK_API_KEY="your-deepseek-key"
  npm install
  npm run box:deploy

EOF
}

# ─── Check dependencies ─────────────────────────────────────────
check_deps() {
    if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
        info "Installing dependencies..."
        cd "${SCRIPT_DIR}" && npm install
    fi
    if [ -z "${UPSTASH_BOX_API_KEY:-}" ]; then
        err "UPSTASH_BOX_API_KEY is not set."
        exit 1
    fi
    ok "Dependencies satisfied"
}

# ─── SDK commands ───────────────────────────────────────────────
do_deploy() {
    check_deps
    info "Deploying via @upstash/box SDK..."
    cd "${SCRIPT_DIR}"
    npx tsx api/upstash-manager.ts --deploy
}

do_status() {
    check_deps
    cd "${SCRIPT_DIR}"
    npx tsx api/upstash-manager.ts --status
}

do_run() {
    check_deps
    cd "${SCRIPT_DIR}"
    npx tsx api/upstash-manager.ts --run
}

do_stream() {
    check_deps
    cd "${SCRIPT_DIR}"
    npx tsx api/upstash-manager.ts --stream
}

# ─── Legacy deploy (original bash method) ───────────────────────
do_legacy() {
    warn "Legacy deployment mode (deprecated — use SDK instead)."
    
    check_deps

    if ! command -v upstash &> /dev/null; then
        warn "Upstash CLI not found. Install with: npm install -g @upstash/cli"
        warn "Falling back to SDK method..."
        do_deploy
        return
    fi

    local config_file="/tmp/clawd-upstash-legacy.json"
    
    cat > "$config_file" <<CONFIGEOF
{
  "name": "clawd-backrooms",
  "region": "us-east-1",
  "plan": "hobby",
  "env": {
    "DEEPSEEK_API_KEY": "${DEEPSEEK_API_KEY:-}",
    "DEEPSEEK_MODEL": "deepseek-v4-pro",
    "DEEPSEEK_BASE_URL": "https://api.deepseek.com",
    "LOG_LEVEL": "info"
  },
  "build": {
    "command": "pip install -r requirements.txt"
  },
  "run": {
    "command": "uvicorn api.main:app --host 0.0.0.0 --port 8000",
    "port": 8000
  },
  "public": true,
  "cron": {
    "backroom_conversation": {
      "schedule": "0 */2 * * *",
      "url": "/conversation",
      "method": "GET"
    }
  }
}
CONFIGEOF

    info "Deploying via legacy CLI..."
    upstash box deploy --config "$config_file" 2>&1 || {
        warn "Direct deploy failed. Retrying..."
        upstash box create clawd-backrooms --region us-east-1 2>&1 || true
        upstash box deploy clawd-backrooms --dir "$SCRIPT_DIR" 2>&1
    }
    
    ok "Legacy deployment completed."
}

# ─── Main ───────────────────────────────────────────────────────
main() {
    case "${1:---deploy}" in
        --deploy)   do_deploy ;;
        --status)   do_status ;;
        --run)      do_run ;;
        --stream)   do_stream ;;
        --legacy)   do_legacy ;;
        --help|-h)  show_help ;;
        *)
            err "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
