#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

RED="\033[31m"
YELLOW="\033[33m"
GREEN="\033[32m"
BOLD="\033[1m"
RESET="\033[0m"

failures=0
warnings=0

say() {
  printf "%b%s%b\n" "$1" "$2" "$RESET"
}

fail() {
  failures=$((failures + 1))
  say "${RED}${BOLD}" "FAIL: $1"
}

warn() {
  warnings=$((warnings + 1))
  say "${YELLOW}${BOLD}" "WARN: $1"
}

pass() {
  say "${GREEN}${BOLD}" "PASS: $1"
}

echo -e "${BOLD}solana-clawd repo hygiene audit${RESET}"
echo "root: ${ROOT_DIR}"
echo ""

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for this audit."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This command must be run inside a git repository."
  exit 1
fi

while IFS= read -r -d '' file; do
  case "${file}" in
    .env|*/.env|.env.local|*/.env.local|.env.production|*/.env.production|.env.development|*/.env.development|.env.test|*/.env.test)
      fail "Tracked env file: ${file}"
      ;;
    .env.*|*/.env.*)
      case "${file}" in
        *.env.example|*.env.sample|*.env.template) ;;
        */.env.example|*/.env.sample|*/.env.template) ;;
        *) fail "Tracked env variant: ${file}" ;;
      esac
      ;;
  esac

  case "${file}" in
    .npmrc|*/.npmrc|.netrc|*/.netrc|*.pem|*.key|*.p12|*.pfx|*.crt|*.cer|*.mobileprovision|id_rsa|*/id_rsa|id_ed25519|*/id_ed25519)
      fail "Tracked credential-like file: ${file}"
      ;;
  esac
done < <(git ls-files -z)

if [ "${failures}" -eq 0 ]; then
  pass "No tracked env or credential files detected."
fi

content_hits="$(
  git ls-files -z | xargs -0 rg -n --no-messages --color never \
    --glob '!**/node_modules/**' \
    --glob '!**/*.lock' \
    --glob '!**/package-lock.json' \
    --glob '!**/bun.lock' \
    -- 'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----|wallet-auth:[A-Za-z0-9+/=_-]{20,}|privy_app_secret_[A-Za-z0-9]+|e2b_[A-Za-z0-9]{16,}|hch-v3-[A-Za-z0-9]{10,}|fc-[A-Za-z0-9]{10,}' \
    || true
)"

if [ -n "${content_hits}" ]; then
  warn "High-signal secret-like strings found in tracked files. Review these before release:"
  printf "%s\n" "${content_hits}" | sed -n '1,40p'
  extra_lines="$(printf "%s\n" "${content_hits}" | wc -l | tr -d ' ')"
  if [ "${extra_lines}" -gt 40 ]; then
    echo "... truncated to first 40 matches"
  fi
else
  pass "No high-signal secret strings detected in tracked files."
fi

nested_git_dirs="$(
  find . -mindepth 2 -type d -name '.git' \
    -not -path './.git' \
    -not -path './node_modules/*' \
    | sort \
    || true
)"

if [ -n "${nested_git_dirs}" ]; then
  warn "Nested git directories present in the working tree. Exclude these from exports:"
  printf "%s\n" "${nested_git_dirs}"
else
  pass "No nested git directories found."
fi

vendored_deps="$(
  find . -type d -name 'node_modules' \
    -not -path './node_modules' \
    | sort \
    || true
)"

if [ -n "${vendored_deps}" ]; then
  warn "Vendored node_modules directories present. Do not ship or archive these with the repo:"
  printf "%s\n" "${vendored_deps}" | sed -n '1,20p'
  extra_dirs="$(printf "%s\n" "${vendored_deps}" | wc -l | tr -d ' ')"
  if [ "${extra_dirs}" -gt 20 ]; then
    echo "... truncated to first 20 directories"
  fi
else
  pass "No vendored node_modules directories found."
fi

echo ""
if [ "${failures}" -gt 0 ]; then
  say "${RED}${BOLD}" "Audit failed with ${failures} blocking issue(s) and ${warnings} warning(s)."
  exit 1
fi

say "${GREEN}${BOLD}" "Audit passed with ${warnings} warning(s)."
