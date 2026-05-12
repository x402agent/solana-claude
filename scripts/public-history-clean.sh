#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPLACEMENTS_FILE="$ROOT_DIR/scripts/filter-repo-replacements.txt"

cd "$ROOT_DIR"

echo "Preparing public-history cleanup in: $ROOT_DIR"
echo "This rewrites git history. Run only on a throwaway branch or fresh clone."

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required but not installed." >&2
  exit 1
fi

if [ ! -f "$REPLACEMENTS_FILE" ]; then
  echo "Missing replacements file: $REPLACEMENTS_FILE" >&2
  exit 1
fi

echo
echo "1. Rotate any exposed credentials before rewriting history."
echo "2. Make a fresh mirror backup before continuing."
echo
echo "Suggested backup:"
echo "  git clone --mirror . ../solana-clawd.backup.git"
echo
echo "Suggested disposable working clone:"
echo "  git clone . ../solana-clawd-public-clean"
echo
echo "Then in the disposable clone run:"
echo "  git filter-repo --replace-text \"$REPLACEMENTS_FILE\" \\"
echo "    --invert-paths \\"
echo "    --path .agents/ \\"
echo "    --path .augment/ \\"
echo "    --path .claude/ \\"
echo "    --path .codebuddy/ \\"
echo "    --path .commandcode/ \\"
echo "    --path beepboop/leanring-buddy.xcodeproj/xcuserdata/ \\"
echo "    --path tailclawd/quickstart/.iii/"
echo
echo "After rewrite, force-push carefully:"
echo "  git push --force --all"
echo "  git push --force --tags"
