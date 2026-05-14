#!/bin/bash
# Build the standalone Solana Clawd menu bar app (no dependencies needed)
# This is the lightweight companion that sits in your menu bar.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/SolanaOSMenuBar.swift"
OUT="$SCRIPT_DIR/SolanaOSMenuBar"
APP_BUNDLE="$SCRIPT_DIR/Solana Clawd.app"

echo "Building Solana Clawd Menu Bar..."

# Compile the standalone Swift file
swiftc -O -o "$OUT" "$SRC" \
  -parse-as-library \
  -framework AppKit \
  -framework Foundation \
  -target arm64-apple-macos14.0 \
  2>&1

if [ ! -f "$OUT" ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Built: $OUT"

# Create .app bundle for double-click launch
APP_CONTENTS="$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_MACOS" "$APP_RESOURCES"
cp "$OUT" "$APP_MACOS/SolanaOSMenuBar"

# Copy icon if available
if [ -d "$SCRIPT_DIR/Icon.icon" ]; then
  cp -r "$SCRIPT_DIR/Icon.icon" "$APP_RESOURCES/AppIcon.icns" 2>/dev/null || true
fi

# Info.plist
cat > "$APP_CONTENTS/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>SolanaOSMenuBar</string>
  <key>CFBundleIdentifier</key>
  <string>com.solanaclawd.menubar</string>
  <key>CFBundleName</key>
  <string>Solana Clawd</string>
  <key>CFBundleDisplayName</key>
  <string>Solana Clawd</string>
  <key>CFBundleVersion</key>
  <string>2.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>2.0.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

echo "✅ App bundle: $APP_BUNDLE"
echo ""
echo "To run:"
echo "  open \"$APP_BUNDLE\""
echo ""
echo "To install to Applications:"
echo "  cp -r \"$APP_BUNDLE\" /Applications/"
echo ""
echo "To auto-start on login:"
echo "  osascript -e 'tell application \"System Events\" to make login item at end with properties {path:\"/Applications/Solana Clawd.app\", hidden:true}'"
