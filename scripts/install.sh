#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-solana-clawd}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.solana-clawd/bin}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if ! need_cmd node; then
  echo "Node.js 20+ is required."
  exit 1
fi

if ! need_cmd npm; then
  echo "npm is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Node.js 20+ is required. Found $(node --version)."
  exit 1
fi

mkdir -p "${INSTALL_DIR}"

echo "Installing ${PACKAGE_NAME}..."
npm install -g "${PACKAGE_NAME}"

NPM_GLOBAL_PREFIX="$(npm prefix -g)"
NPM_GLOBAL_BIN="${NPM_GLOBAL_PREFIX}/bin"

for cmd in clawd solana-clawd; do
  if [ -x "${NPM_GLOBAL_BIN}/${cmd}" ]; then
    ln -sf "${NPM_GLOBAL_BIN}/${cmd}" "${INSTALL_DIR}/${cmd}"
  fi
done

shell_name="$(basename "${SHELL:-sh}")"
shell_rc="$HOME/.profile"
case "${shell_name}" in
  zsh) shell_rc="$HOME/.zshrc" ;;
  bash) shell_rc="$HOME/.bashrc" ;;
esac

export_line="export PATH=\"${INSTALL_DIR}:\$PATH\""
if [ -f "${shell_rc}" ]; then
  if ! grep -Fq "${INSTALL_DIR}" "${shell_rc}"; then
    printf '\n%s\n' "${export_line}" >> "${shell_rc}"
  fi
else
  printf '%s\n' "${export_line}" > "${shell_rc}"
fi

echo
echo "Installed solana-clawd."
echo "Open a new shell or run:"
echo "  ${export_line}"
echo
echo "Then launch:"
echo "  clawd"
