#!/usr/bin/env bash
# Unit test for scripts/bitwarden-secrets.sh using a mock `bws` CLI.
# No real Bitwarden account or network needed.
#
#   bash scripts/test-bitwarden-secrets.sh
#
# Exits non-zero on the first failed assertion.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LIB="$HERE/bitwarden-secrets.sh"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/bwstest.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  ok   %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL %s\n        expected: %s\n        actual:   %s\n' "$desc" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}
contains() {
  local desc="$1" needle="$2" haystack="$3"
  case "$haystack" in
    *"$needle"*) printf '  ok   %s\n' "$desc"; PASS=$((PASS + 1)) ;;
    *) printf '  FAIL %s\n        wanted substring: %s\n        in: %s\n' "$desc" "$needle" "$haystack"; FAIL=$((FAIL + 1)) ;;
  esac
}

# ── Mock bws CLI ──────────────────────────────────────────────────────────────
# Emits a fixed secret list; records that `run` would have executed.
MOCKBIN="$WORK/bin"
mkdir -p "$MOCKBIN"
cat >"$MOCKBIN/bws" <<'MOCK'
#!/usr/bin/env bash
case "$1" in
  --version) echo "bws 1.0.0 (mock)";;
  secret)
    if [ "$2" = "list" ]; then
      cat <<'JSON'
[
  {"id":"1","key":"HELIUS_API_KEY","value":"helius-xyz","note":"","projectId":"p1"},
  {"id":"2","key":"IMPERIAL_JWT","value":"jwt'with'quotes","note":"","projectId":"p1"},
  {"id":"3","key":"not a valid key","value":"ignored","note":"","projectId":"p1"},
  {"id":"4","key":"PORT","value":"3001","note":"","projectId":"p1"}
]
JSON
    fi
    ;;
  run) shift; echo "MOCK_BWS_RUN: $*";;
  *) exit 1;;
esac
MOCK
chmod +x "$MOCKBIN/bws"
export PATH="$MOCKBIN:$PATH"

# shellcheck source=/dev/null
. "$LIB"

echo "== capability checks =="
check "bws_have_cli finds mock" "0" "$(bws_have_cli; echo $?)"

unset BWS_ACCESS_TOKEN
BWS_TOKEN_FILE="$WORK/none"
check "bws_token_present false without token" "1" "$(bws_token_present; echo $?)"

export BWS_ACCESS_TOKEN="test-token"
check "bws_token_present true with env token" "0" "$(bws_token_present; echo $?)"
check "bws_resolve_token returns env token" "test-token" "$(bws_resolve_token)"

# Token file path
unset BWS_ACCESS_TOKEN
printf 'file-token\n' > "$WORK/tok"
BWS_TOKEN_FILE="$WORK/tok"
check "bws_resolve_token reads token file (trimmed)" "file-token" "$(bws_resolve_token)"

echo "== enable/disable =="
export BWS_ACCESS_TOKEN="t"
check "bws_enabled true when token present" "0" "$(bws_enabled; echo $?)"
check "bws_enabled false when SOLANA_CLAWD_BWS=0" "1" "$(SOLANA_CLAWD_BWS=0 bws_enabled; echo $?)"

echo "== json parsing =="
ENV_OUT="$(bws_secrets_json | bws_json_to_env)"
contains "parses HELIUS_API_KEY" "HELIUS_API_KEY='helius-xyz'" "$ENV_OUT"
contains "parses PORT" "PORT='3001'" "$ENV_OUT"
contains "escapes single quotes in value" "IMPERIAL_JWT='jwt'\\''with'\\''quotes'" "$ENV_OUT"
case "$ENV_OUT" in
  *"not a valid key"*) printf '  FAIL skips invalid identifier\n'; FAIL=$((FAIL + 1));;
  *) printf '  ok   skips invalid identifier\n'; PASS=$((PASS + 1));;
esac

echo "== env file seeding =="
ENVF="$WORK/.env"
cat >"$ENVF" <<'EOF'
HELIUS_API_KEY=preexisting
PORT=
EOF
bws_seed_env_file "$ENVF" 0 >/dev/null 2>&1
# Default (no overwrite): preexisting HELIUS kept, blank PORT filled, new key added.
contains "keeps preexisting non-blank value" "HELIUS_API_KEY=preexisting" "$(cat "$ENVF")"
contains "fills blank PORT" "PORT='3001'" "$(cat "$ENVF")"
contains "adds new IMPERIAL_JWT" "IMPERIAL_JWT=" "$(cat "$ENVF")"
# Permissions 0600
PERM="$(stat -c '%a' "$ENVF" 2>/dev/null || stat -f '%Lp' "$ENVF" 2>/dev/null)"
check "env file is chmod 600" "600" "$PERM"

echo "== overwrite mode =="
bws_seed_env_file "$ENVF" 1 >/dev/null 2>&1
contains "overwrite replaces HELIUS value" "HELIUS_API_KEY='helius-xyz'" "$(cat "$ENVF")"

echo "== token save =="
TOKF="$WORK/saved-token"
bws_save_token "$TOKF" "secret-abc" >/dev/null 2>&1
check "token file content" "secret-abc" "$(tr -d '\r\n' < "$TOKF")"
PERM="$(stat -c '%a' "$TOKF" 2>/dev/null || stat -f '%Lp' "$TOKF" 2>/dev/null)"
check "token file is chmod 600" "600" "$PERM"

echo "== launcher generation =="
PRELUDE="$(bws_launcher_prelude "$ENVF" "$TOKF" "proj-123")"
contains "prelude sources env file" "ENV_FILE=" "$PRELUDE"
contains "prelude loads token file" "BWS_TOKEN_FILE=" "$PRELUDE"
contains "prelude sets project id" "BWS_PROJECT_ID=" "$PRELUDE"
EXECLINE="$(bws_launcher_exec)"
contains "exec wraps with bws run" "exec bws run" "$EXECLINE"
contains "exec falls back to direct" 'exec "$@"' "$EXECLINE"

# Build a real launcher and run it with the mock bws to confirm injection.
LAUNCH="$WORK/launcher.sh"
{
  printf '#!/usr/bin/env bash\nset -euo pipefail\n'
  bws_launcher_prelude "$WORK/none-env" "$TOKF" ""
  printf 'set -- node fake-entry.js "$@"\n'
  bws_launcher_exec
} > "$LAUNCH"
chmod +x "$LAUNCH"
OUT="$(BWS_ACCESS_TOKEN=tok "$LAUNCH" 2>&1 || true)"
contains "launcher invokes bws run with command" "MOCK_BWS_RUN: -- node fake-entry.js" "$OUT"

# With BWS disabled, launcher should NOT use bws run.
OUT2="$(SOLANA_CLAWD_BWS=0 BWS_ACCESS_TOKEN=tok "$LAUNCH" 2>&1 || true)"
case "$OUT2" in
  *"MOCK_BWS_RUN"*) printf '  FAIL SOLANA_CLAWD_BWS=0 disables bws run\n'; FAIL=$((FAIL + 1));;
  *) printf '  ok   SOLANA_CLAWD_BWS=0 disables bws run\n'; PASS=$((PASS + 1));;
esac

echo
printf 'RESULT: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
