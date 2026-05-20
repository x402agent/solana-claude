#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

dry_run=0
if [ "${1:-}" = "--dry-run" ]; then
  dry_run=1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This command must be run inside a git repository."
  exit 1
fi

dir_names=(
  node_modules
  target
  dist
  build
  .next
  coverage
  __pycache__
  .pytest_cache
  .mypy_cache
  .ruff_cache
  .lake
  .wrangler
  .turbo
  .cache
  .venv
  venv
)

find_expr=()
for name in "${dir_names[@]}"; do
  if [ "${#find_expr[@]}" -gt 0 ]; then
    find_expr+=(-o)
  fi
  find_expr+=(-name "${name}")
done

mapfile -d '' dirs < <(
  find . \
    -path './.git' -prune -o \
    -path './.local-secrets' -prune -o \
    -type d \( "${find_expr[@]}" \) -print0 \
    | sort -z
)

mapfile -d '' ds_store_files < <(
  find . \
    -path './.git' -prune -o \
    -path './.local-secrets' -prune -o \
    -type f -name '.DS_Store' -print0 \
    | sort -z
)

removed=0

remove_path() {
  local path="$1"

  if ! git check-ignore -q -- "${path}"; then
    return
  fi

  if [ "${dry_run}" -eq 1 ]; then
    printf 'would remove %s\n' "${path}"
  else
    printf 'remove %s\n' "${path}"
    rm -rf -- "${path}"
  fi
  removed=$((removed + 1))
}

for dir in "${dirs[@]}"; do
  remove_path "${dir}"
done

for file in "${ds_store_files[@]}"; do
  remove_path "${file}"
done

if [ "${dry_run}" -eq 1 ]; then
  echo "Dry run complete: ${removed} ignored generated path(s) matched."
else
  echo "Cleaned ${removed} ignored generated path(s)."
fi
