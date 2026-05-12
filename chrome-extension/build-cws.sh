#!/usr/bin/env bash
# Package the popup extension for Chrome Web Store submission.
# Writes build/clawd-popup-vX.Y.Z.zip containing only the runtime files.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

VERSION=$(node -p "require('./manifest.json').version")
OUT_DIR="build"
STAGE="$OUT_DIR/stage"
ZIP_NAME="clawd-popup-v${VERSION}.zip"

rm -rf "$OUT_DIR"
mkdir -p "$STAGE/icons"

cp manifest.json background.js popup.html popup.js popup.css "$STAGE/"
cp icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png "$STAGE/icons/"

(cd "$STAGE" && zip -rq "../${ZIP_NAME}" .)
rm -rf "$STAGE"

SIZE=$(du -h "$OUT_DIR/$ZIP_NAME" | cut -f1)
echo "✔ Built $OUT_DIR/$ZIP_NAME ($SIZE)"
echo "→ Upload this zip at https://chrome.google.com/webstore/devconsole"
