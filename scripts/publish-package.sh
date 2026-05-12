#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "NPM_TOKEN is required."
  exit 1
fi

NPMRC_PATH="${ROOT_DIR}/.npmrc.publish"
trap 'rm -f "${NPMRC_PATH}"' EXIT

cat > "${NPMRC_PATH}" <<EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

echo "Building publishable package..."
npm run build

echo "Publishing to npm..."
npm publish --userconfig "${NPMRC_PATH}" --access public
