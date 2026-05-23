#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# bitwarden-secrets.sh — Bitwarden Secrets Manager (bws) integration for the
# solana-clawd installers.
#
# This file is a *library*: source it from an installer, then call its
# functions. It never executes anything on its own.
#
#   . scripts/bitwarden-secrets.sh
#   bws_ensure_cli            # install the bws CLI if missing (opt-in)
#   bws_seed_env_file FILE    # pull secrets → env file (only fills blanks)
#   bws_write_launcher ...    # emit a launcher that injects secrets at runtime
#
# Why Bitwarden Secrets Manager?
#   - Machine-account access tokens (BWS_ACCESS_TOKEN) — no interactive vault
#     unlock, perfect for installers, CI, and agents.
#   - `bws run -- <cmd>` injects every accessible secret as an env var into a
#     child process, so secrets never have to touch disk in plaintext.
#   - `bws secret list` returns JSON we can seed an .env file with when an
#     operator prefers a file (still chmod 0600).
#
# Auth resolution order (most secure first):
#   1. BWS_ACCESS_TOKEN environment variable
#   2. A 0600 token file (BWS_TOKEN_FILE, default $CONFIG_DIR/bws-access-token)
#
# Optional:
#   BWS_PROJECT_ID   restrict to one Secrets Manager project
#   BWS_SERVER_URL   self-hosted Bitwarden server base URL
#   BWS_VERSION      pin a bws CLI version for bws_ensure_cli
# ──────────────────────────────────────────────────────────────────────────────

# Guard against double-sourcing.
if [ -n "${__BWS_SECRETS_SOURCED:-}" ]; then
  return 0 2>/dev/null || true
fi
__BWS_SECRETS_SOURCED=1

# Default bws CLI version downloaded when no package manager is available.
BWS_DEFAULT_VERSION="${BWS_VERSION:-1.0.0}"

# ── Logging shims ─────────────────────────────────────────────────────────────
# Reuse the host installer's helpers when present; otherwise define minimal ones.
if ! command -v info >/dev/null 2>&1; then
  info() { printf '  %s\n' "$*"; }
fi
if ! command -v warn >/dev/null 2>&1; then
  warn() { printf '  ! %s\n' "$*" >&2; }
fi
if ! command -v ok >/dev/null 2>&1; then
  ok() { printf '  OK %s\n' "$*"; }
fi

bws_info() { info "[bitwarden] $*"; }
bws_warn() { warn "[bitwarden] $*"; }
bws_ok()   { ok   "[bitwarden] $*"; }

# ── Capability checks ─────────────────────────────────────────────────────────

# True if the bws CLI is on PATH.
bws_have_cli() { command -v bws >/dev/null 2>&1; }

# Echo the resolved access token (env first, then token file). Empty + rc=1 if none.
bws_resolve_token() {
  if [ -n "${BWS_ACCESS_TOKEN:-}" ]; then
    printf '%s' "$BWS_ACCESS_TOKEN"
    return 0
  fi
  local tf="${BWS_TOKEN_FILE:-}"
  if [ -n "$tf" ] && [ -f "$tf" ]; then
    # Strip surrounding whitespace/newlines.
    tr -d '\r\n' < "$tf"
    return 0
  fi
  return 1
}

# True if a token is resolvable (env or file).
bws_token_present() { bws_resolve_token >/dev/null 2>&1; }

# True if Bitwarden secret injection is both wanted and possible.
# Disabled entirely when SOLANA_CLAWD_BWS=0.
bws_enabled() {
  [ "${SOLANA_CLAWD_BWS:-1}" != "0" ] || return 1
  bws_token_present
}

# ── CLI installation ──────────────────────────────────────────────────────────

# Map uname → bws release target. Echoes the target triple, rc=1 if unknown.
bws_release_target() {
  local os arch
  os="$(uname -s 2>/dev/null || echo unknown)"
  arch="$(uname -m 2>/dev/null || echo unknown)"
  case "$os" in
    Darwin)
      case "$arch" in
        arm64|aarch64) printf 'macos-aarch64' ;;
        x86_64)        printf 'macos-x86_64' ;;
        *) return 1 ;;
      esac ;;
    Linux)
      case "$arch" in
        x86_64)        printf 'linux-x86_64' ;;
        aarch64|arm64) printf 'linux-aarch64' ;;
        *) return 1 ;;
      esac ;;
    *) return 1 ;;
  esac
}

# Install the bws CLI if missing. Tries: existing binary → brew → cargo →
# GitHub release zip. Honors BWS_VERSION. Returns 0 if bws is available after.
bws_ensure_cli() {
  if bws_have_cli; then
    bws_info "bws CLI present: $(bws --version 2>/dev/null | head -n1)"
    return 0
  fi

  bws_info "installing Bitwarden Secrets Manager CLI (bws)"

  if command -v brew >/dev/null 2>&1; then
    if brew install bitwarden/tap/bws >/dev/null 2>&1 || brew install bws >/dev/null 2>&1; then
      bws_have_cli && { bws_ok "installed bws via Homebrew"; return 0; }
    fi
    bws_warn "Homebrew install of bws failed; trying other methods"
  fi

  if command -v cargo >/dev/null 2>&1; then
    if cargo install bws >/dev/null 2>&1; then
      bws_have_cli && { bws_ok "installed bws via cargo"; return 0; }
    fi
    bws_warn "cargo install bws failed; trying release download"
  fi

  local target version url tmp dest_dir
  target="$(bws_release_target)" || { bws_warn "no prebuilt bws for this platform; install manually: https://bitwarden.com/help/secrets-manager-cli/"; return 1; }
  version="$BWS_DEFAULT_VERSION"
  url="https://github.com/bitwarden/sdk-sm/releases/download/bws-v${version}/bws-${target}-${version}.zip"
  dest_dir="${BWS_INSTALL_DIR:-$HOME/.local/bin}"
  mkdir -p "$dest_dir"

  if ! command -v curl >/dev/null 2>&1; then
    bws_warn "curl not found; cannot download bws release"
    return 1
  fi
  if ! command -v unzip >/dev/null 2>&1; then
    bws_warn "unzip not found; cannot extract bws release"
    return 1
  fi

  tmp="$(mktemp -d "${TMPDIR:-/tmp}/bws.XXXXXX")" || return 1
  bws_info "downloading $url"
  if curl -fsSL "$url" -o "$tmp/bws.zip" 2>/dev/null && unzip -oq "$tmp/bws.zip" -d "$tmp" 2>/dev/null; then
    if [ -f "$tmp/bws" ]; then
      install -m 0755 "$tmp/bws" "$dest_dir/bws" 2>/dev/null || { cp "$tmp/bws" "$dest_dir/bws"; chmod 0755 "$dest_dir/bws"; }
      rm -rf "$tmp"
      case ":$PATH:" in *":$dest_dir:"*) ;; *) export PATH="$dest_dir:$PATH" ;; esac
      bws_have_cli && { bws_ok "installed bws to $dest_dir/bws"; return 0; }
    fi
  fi
  rm -rf "$tmp"
  bws_warn "could not auto-install bws (version $version, target $target). Install manually: https://bitwarden.com/help/secrets-manager-cli/"
  return 1
}

# ── Secret retrieval ──────────────────────────────────────────────────────────

# Echo the raw JSON array from `bws secret list`. rc=1 on any failure.
# Honors BWS_PROJECT_ID and BWS_SERVER_URL.
bws_secrets_json() {
  bws_have_cli || return 1
  local token
  token="$(bws_resolve_token)" || return 1

  local args=(secret list)
  [ -n "${BWS_PROJECT_ID:-}" ] && args+=("$BWS_PROJECT_ID")
  args+=(--output json)
  [ -n "${BWS_SERVER_URL:-}" ] && args+=(--server-url "$BWS_SERVER_URL")

  BWS_ACCESS_TOKEN="$token" bws "${args[@]}" 2>/dev/null
}

# Convert a bws JSON secret array (stdin) → KEY='value' export-safe lines.
# Only emits entries whose key is a valid POSIX shell identifier. Prefers
# python3, falls back to jq. rc=1 if neither is available.
bws_json_to_env() {
  if command -v python3 >/dev/null 2>&1; then
    # Write the parser to a temp file so the function's stdin (the JSON) is
    # NOT swallowed by a heredoc fed to `python3 -`.
    local _script _rc
    _script="$(mktemp "${TMPDIR:-/tmp}/bwsjson.XXXXXX")" || return 1
    cat >"$_script" <<'PY'
import json, re, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(1)
if not isinstance(data, list):
    sys.exit(1)
ident = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
for item in data:
    if not isinstance(item, dict):
        continue
    key = item.get("key")
    val = item.get("value")
    if not key or val is None or not ident.match(str(key)):
        continue
    # Single-quote and escape any embedded single quotes for safe sourcing.
    safe = str(val).replace("'", "'\\''")
    print("%s='%s'" % (key, safe))
PY
    python3 "$_script"
    _rc=$?
    rm -f "$_script"
    return $_rc
  fi
  if command -v jq >/dev/null 2>&1; then
    jq -r '
      .[]
      | select(.key != null and .value != null)
      | select(.key | test("^[A-Za-z_][A-Za-z0-9_]*$"))
      | "\(.key)=" + "'"'"'" + (.value | gsub("'"'"'"; "'"'"'\\'"'"''"'"'")) + "'"'"'"
    ' 2>/dev/null
    return $?
  fi
  bws_warn "need python3 or jq to parse Bitwarden secrets"
  return 1
}

# Seed an env file from Bitwarden.
#   bws_seed_env_file FILE [overwrite]
# Creates FILE (mode 0600) if missing. By default only fills keys that are
# absent or blank in the file; pass overwrite=1 to replace existing values.
bws_seed_env_file() {
  local file="$1" overwrite="${2:-0}"
  [ -n "$file" ] || { bws_warn "bws_seed_env_file: no file given"; return 1; }

  bws_enabled || { bws_info "no access token; skipping secret seed"; return 0; }
  bws_have_cli || { bws_warn "bws CLI not installed; skipping secret seed"; return 1; }

  local json env_lines
  json="$(bws_secrets_json)" || { bws_warn "could not list secrets (check BWS_ACCESS_TOKEN / project)"; return 1; }
  env_lines="$(printf '%s' "$json" | bws_json_to_env)" || return 1
  [ -n "$env_lines" ] || { bws_info "no secrets returned from Bitwarden"; return 0; }

  mkdir -p "$(dirname "$file")"
  [ -f "$file" ] || { : > "$file"; chmod 0600 "$file"; }
  chmod 0600 "$file" 2>/dev/null || true

  local count=0 line key
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    key="${line%%=*}"
    if grep -q "^${key}=" "$file" 2>/dev/null; then
      if [ "$overwrite" = "1" ]; then
        # Replace the existing assignment in place (portable: rewrite file).
        local tmp
        tmp="$(mktemp "${TMPDIR:-/tmp}/bwsenv.XXXXXX")"
        grep -v "^${key}=" "$file" > "$tmp" 2>/dev/null || true
        printf '%s\n' "$line" >> "$tmp"
        cat "$tmp" > "$file"
        rm -f "$tmp"
        count=$((count + 1))
      elif grep -q "^${key}=$" "$file" 2>/dev/null; then
        # Existing key is blank → fill it.
        local tmp
        tmp="$(mktemp "${TMPDIR:-/tmp}/bwsenv.XXXXXX")"
        grep -v "^${key}=$" "$file" > "$tmp" 2>/dev/null || true
        printf '%s\n' "$line" >> "$tmp"
        cat "$tmp" > "$file"
        rm -f "$tmp"
        count=$((count + 1))
      fi
    else
      printf '%s\n' "$line" >> "$file"
      count=$((count + 1))
    fi
  done <<EOF
$env_lines
EOF

  chmod 0600 "$file" 2>/dev/null || true
  bws_ok "seeded $count secret(s) from Bitwarden into $file"
}

# Persist an access token to a 0600 file so launchers can inject it at runtime.
#   bws_save_token FILE [TOKEN]
bws_save_token() {
  local file="$1" token="${2:-${BWS_ACCESS_TOKEN:-}}"
  [ -n "$file" ] || return 1
  [ -n "$token" ] || { bws_warn "no token to save"; return 1; }
  mkdir -p "$(dirname "$file")"
  ( umask 077; printf '%s\n' "$token" > "$file" )
  chmod 0600 "$file" 2>/dev/null || true
  bws_ok "saved Bitwarden access token to $file (0600)"
}

# Emit a portable shell prelude (stdout) that a launcher can embed to:
#   1. source an env file,
#   2. load a token from a token file when BWS_ACCESS_TOKEN is unset,
#   3. mark whether `bws run` should wrap the process.
# Args: ENV_FILE TOKEN_FILE [PROJECT_ID]
bws_launcher_prelude() {
  local env_file="$1" token_file="$2" project_id="${3:-}"
  cat <<PRELUDE
ENV_FILE="\${SOLANA_CLAWD_MCP_ENV:-${env_file}}"
if [ -f "\$ENV_FILE" ]; then
  set -a
  . "\$ENV_FILE"
  set +a
fi
BWS_TOKEN_FILE="\${BWS_TOKEN_FILE:-${token_file}}"
if [ -z "\${BWS_ACCESS_TOKEN:-}" ] && [ -f "\$BWS_TOKEN_FILE" ]; then
  BWS_ACCESS_TOKEN="\$(tr -d '\\r\\n' < "\$BWS_TOKEN_FILE")"
  export BWS_ACCESS_TOKEN
fi
PRELUDE
  if [ -n "$project_id" ]; then
    printf 'BWS_PROJECT_ID="${BWS_PROJECT_ID:-%s}"\nexport BWS_PROJECT_ID\n' "$project_id"
  fi
}

# Emit the exec line (stdout) for a launcher: wraps with `bws run` when a token
# and the CLI are available at runtime, otherwise runs directly.
# Args: the full command + args, e.g.  bws_launcher_exec node "$ENTRY" '"$@"'
bws_launcher_exec() {
  cat <<'EXEC'
if [ "${SOLANA_CLAWD_BWS:-1}" != "0" ] && [ -n "${BWS_ACCESS_TOKEN:-}" ] && command -v bws >/dev/null 2>&1; then
  if [ -n "${BWS_PROJECT_ID:-}" ]; then
    exec bws run --project-id "$BWS_PROJECT_ID" -- "$@"
  fi
  exec bws run -- "$@"
fi
exec "$@"
EXEC
}
