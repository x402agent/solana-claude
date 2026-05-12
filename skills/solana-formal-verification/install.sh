#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SKILL_SLUG="solana-formal-verification"
PACKAGE_NAME="@x402agent/solana-formal-verification"
SKILL_BUNDLE_INSTALLED=0

install_skill_bundle() {
    if [ "${SKIP_QEDGEN_SKILL_INSTALL:-0}" = "1" ]; then
        echo "Skipping skill bundle install because SKIP_QEDGEN_SKILL_INSTALL=1"
        return 0
    fi

    local targets=(
        "$HOME/.codex/skills/$SKILL_SLUG"
        "$HOME/.claude/skills/$SKILL_SLUG"
    )

    for target in "${targets[@]}"; do
        mkdir -p "$(dirname "$target")"
        rm -rf "$target"
        mkdir -p "$target"

        cp -R \
            SKILL.md \
            README.md \
            LICENSE \
            claude.md \
            install.sh \
            Cargo.toml \
            Cargo.lock \
            bin \
            crates \
            docs \
            example \
            "$target/"

        echo "✓ Installed skill bundle to $target"
    done

    SKILL_BUNDLE_INSTALLED=1
}

# ── Rust / Cargo ────────────────────────────────────────────────────────────
if ! command -v cargo &> /dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Rust toolchain not found. Installing via rustup..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# ── Lean / elan ─────────────────────────────────────────────────────────────
if ! command -v lean &> /dev/null && ! command -v elan &> /dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Lean toolchain not found. Installing via elan..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y --default-toolchain leanprover/lean4:v4.15.0
    export PATH="$HOME/.elan/bin:$PATH"
fi

# ── Build qedgen binary ──────────────────────────────────────────────────
if [ -f "bin/qedgen" ] && [ -x "bin/qedgen" ]; then
    echo "✓ Pre-built qedgen binary found"
    if ./bin/qedgen --version &> /dev/null; then
        echo "✓ Binary is compatible with this platform"
    else
        echo "  Pre-built binary is not compatible, rebuilding..."
        cargo build --release
        mkdir -p bin
        cp target/release/qedgen bin/
        chmod +x bin/qedgen
    fi
else
    echo "Building qedgen binary..."
    cargo build --release
    mkdir -p bin
    cp target/release/qedgen bin/
    chmod +x bin/qedgen
fi

echo "✓ qedgen binary built successfully"

# ── Set up global validation workspace ──────────────────────────────────────
# Pre-fetch Mathlib cache so the first `qedgen verify --validate` is fast.
# This runs in the background so it doesn't block npm install.

setup_global_workspace() {
    local ws_dir
    if [ -n "$QEDGEN_VALIDATION_WORKSPACE" ]; then
        ws_dir="$QEDGEN_VALIDATION_WORKSPACE"
    elif [ "$(uname)" = "Darwin" ]; then
        ws_dir="$HOME/Library/Caches/qedgen-solana-skills/validation-workspace"
    elif [ -n "$XDG_CACHE_HOME" ]; then
        ws_dir="$XDG_CACHE_HOME/qedgen-solana-skills/validation-workspace"
    else
        ws_dir="$HOME/.cache/qedgen-solana-skills/validation-workspace"
    fi

    # Skip if already set up
    if [ -f "$ws_dir/lakefile.lean" ] && [ -d "$ws_dir/.lake/packages/mathlib" ]; then
        echo "✓ Global validation workspace already exists at $ws_dir"
        return 0
    fi

    echo "Setting up global validation workspace at $ws_dir..."
    echo "  This downloads and caches Mathlib (~1-2 min with cache, 25+ min without)."
    echo "  Running in background — qedgen will work once this completes."

    mkdir -p "$ws_dir"

    # Use qedgen setup command if available
    if [ -x "bin/qedgen" ]; then
        bin/qedgen setup --workspace "$ws_dir" &
        echo "  Background PID: $!"
    else
        echo "  Warning: binary not available, workspace will be set up on first use."
    fi
}

setup_global_workspace

install_skill_bundle

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ${PACKAGE_NAME} installed successfully!"
echo ""
echo "  Requirements:"
echo "    - MISTRAL_API_KEY environment variable must be set"
echo "    - Lean toolchain (auto-installed via elan)"
if [ "$SKILL_BUNDLE_INSTALLED" = "1" ]; then
    echo "    - Skill bundle copied to ~/.codex/skills/${SKILL_SLUG} and ~/.claude/skills/${SKILL_SLUG}"
else
    echo "    - Skill bundle install skipped"
fi
echo ""
echo "  The global Mathlib cache may still be downloading in the background."
echo "  First run of 'qedgen verify --validate' may be slow if not ready."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
