#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "Hackathon preflight"
echo

if [ -f ".env.local" ]; then
  echo "Local env: present (.env.local)"
else
  echo "Local env: missing (.env.local)"
fi

echo
echo "Secret exposure scan"

patterns=(
  'BCR2DN5TVOLPFQD4'
  '5977-5962-0026'
  'pay.solanaclawd.com'
  'solanaclawd-merchant'
  'merchant@solanaclawd.com'
)

tracked_files="$(git ls-files)"
leaks=0

for pattern in "${patterns[@]}"; do
  if [ -n "${tracked_files}" ] && printf '%s\n' "${tracked_files}" | xargs rg -n --fixed-strings --with-filename "${pattern}" >/tmp/solana-clawd-secret-scan.$$ 2>/dev/null; then
    echo "Found tracked match for: ${pattern}"
    cat /tmp/solana-clawd-secret-scan.$$
    leaks=1
  fi
done

rm -f /tmp/solana-clawd-secret-scan.$$

echo
echo "Ignored file checks"
git check-ignore -q .env.local && echo ".env.local is ignored" || { echo ".env.local is NOT ignored"; leaks=1; }
git check-ignore -q .npmrc.publish && echo ".npmrc.publish is ignored" || { echo ".npmrc.publish is NOT ignored"; leaks=1; }
git check-ignore -q ooda/journal/openai-goblin-session.json && echo "Goblin session state is ignored" || { echo "Goblin session state is NOT ignored"; leaks=1; }

echo
echo "Build checks"
npm run typecheck >/dev/null
echo "Typecheck passed"

if [ "${leaks}" -ne 0 ]; then
  echo
  echo "Preflight failed"
  exit 1
fi

echo
echo "Preflight passed"
