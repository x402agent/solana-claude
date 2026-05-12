# CLAWD Cloud OS — Terminal Reference

```text
╔══════════════════════════════════════════════════════════════╗
║              CLAWD CLOUD OS · Terminal Ready                ║
║         SolanaOS + solana-clawd + xAI Grok                 ║
╚══════════════════════════════════════════════════════════════╝
```

## TL;DR

SolanaOS needs Go. If your terminal says `go: command not found` and `apt-get`
fails because you are not root, install Go into your home directory with the
official tarball, reload your shell, and bootstrap the full stack:

```bash
# Install Go (works without root)
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
source ~/.bashrc

# Bootstrap everything
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
source ~/.bashrc
```

---

## Installing Go

### Why Go is required

SolanaOS is a Go-native binary. The `npx solanaos-computer@latest install`
command compiles it locally, which requires Go on your PATH.

### Automatic (recommended)

The bootstrap script handles Go automatically. If you just want Go by itself:

```bash
clawd-cli install-go
```

Or as a one-liner from any terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
```

### What the installer does

1. Detects your architecture (x86_64 or arm64) and OS (Linux or macOS)
2. Downloads the official Go tarball from go.dev
3. If you have root/sudo: installs to `/usr/local/go`
4. If you do not have root: installs to `~/.local/go`
5. Adds Go to your PATH in `~/.bashrc`
6. Verifies with `go version`

### Manual install (non-root)

If you prefer to do it by hand:

```bash
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        GOARCH="amd64" ;;
  aarch64|arm64) GOARCH="arm64" ;;
esac

cd /tmp
curl -fsSLO "https://go.dev/dl/go1.23.2.linux-${GOARCH}.tar.gz"

rm -rf "$HOME/.local/go"
mkdir -p "$HOME/.local"
tar -C "$HOME/.local" -xzf "go1.23.2.linux-${GOARCH}.tar.gz"

export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"
export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"

# Persist
cat >> ~/.bashrc <<'EOF'
export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"
export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"
EOF

go version
```

### Manual install (with root)

```bash
sudo apt-get update
sudo apt-get install -y golang-go
go version
```

Or from the official tarball:

```bash
curl -fsSLO https://go.dev/dl/go1.23.2.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.2.linux-amd64.tar.gz
export PATH="/usr/local/go/bin:$PATH"
go version
```

### Common errors

| Error | Cause | Fix |
| ----- | ----- | --- |
| `go: command not found` | Go not installed or not on PATH | Run `clawd-cli install-go` |
| `E: are you root?` | apt-get without root | Use the user-space install above |
| `Permission denied` | Writing to /usr/local without sudo | Use `~/.local/go` path instead |
| After install, still not found | Shell not reloaded | Run `source ~/.bashrc` |

---

## One-Shot Bootstrap

### What gets installed

| Component | Description | Install path |
| ------------ | --------------------------------- | ---------------------------------- |
| Go | Go runtime for SolanaOS | `~/.local/go` or `/usr/local/go` |
| SolanaOS | Go-native Solana operator runtime | `~/.solanaos/` |
| solana-clawd | xAI Grok agentic engine | `~/src/solana-clawd/` |
| MOTD | Terminal welcome banner + aliases | `~/.clawd-motd.sh` |

### Run it

```bash
# Option A: Remote bootstrap
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash

# Option B: Local bootstrap
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd/clawd-cloud-os
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

### Pre-inject API keys (optional)

```bash
export XAI_API_KEY="your_key"
export HELIUS_API_KEY="your_key"
./scripts/bootstrap.sh
```

Keys are auto-written to `~/src/solana-clawd/.env` during bootstrap.

---

## CLI Reference

After bootstrap, use `clawd-cli` for everything:

### Bootstrap & Setup

```bash
clawd-cli setup              # One-shot bootstrap (Go + SolanaOS + solana-clawd)
clawd-cli install-go         # Install Go on any terminal
clawd-cli doctor             # Check all prerequisites and system health
```

### Service Management

```bash
clawd-cli start              # Start SolanaOS + MCP server
clawd-cli stop               # Stop all services
clawd-cli status             # Check local + remote status
```

### Remote API (solanaclawd.com)

```bash
clawd-cli agents             # List registered agents
clawd-cli wallet             # View wallet info
clawd-cli prices             # Live token prices
clawd-cli register           # Register on Metaplex Agent Registry
clawd-cli connect            # Connect to solanaclawd.com
```

### solana-clawd

```bash
clawd-cli demo               # Animated walkthrough
clawd-cli birth              # Hatch a Blockchain Buddy
```

---

## Shell Aliases (installed by bootstrap)

```bash
clawd-help                   # Show this reference
clawd-start                  # Start all services
clawd-status                 # Check system status
clawd-demo                   # Run animated walkthrough
clawd-birth                  # Hatch a Blockchain Buddy
clawd-mcp                    # Start MCP HTTP server
clawd-web                    # Launch web UI
sos                          # Shortcut for ~/.solanaos/bin/solanaos
```

---

## Post-Bootstrap Workflow

```bash
# 1. Reload shell
source ~/.bashrc

# 2. Configure SolanaOS
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos version

# 3. Start everything
clawd-start
# Or individually:
~/.solanaos/bin/solanaos server    # Control UI on :7777
~/.solanaos/bin/solanaos daemon    # Operator loop
cd ~/src/solana-clawd
npm run mcp:http                   # MCP on :3000

# 4. Explore
npm run demo                       # Walkthrough
npm run birth                      # Blockchain Buddy
npm --prefix web run dev           # Web UI on :3000
```

---

## Environment Variables

### Required

```bash
export XAI_API_KEY="your_key"          # Powers all Grok features
```

### Recommended

```bash
export HELIUS_API_KEY="your_key"       # Solana RPC/DAS
export SOLANA_TRACKER_API_KEY="your_key"  # Market data
```

### Optional

```bash
export TELEGRAM_BOT_TOKEN="your_token"    # Telegram bot
export OPENAI_API_KEY="your_key"          # Fallback LLM
export BIRDEYE_API_KEY="your_key"         # Token data
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────┐
│                    CLAWD CLOUD OS COMMANDS                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SETUP                                                       │
│  clawd-cli setup           Full bootstrap                    │
│  clawd-cli install-go      Install Go (root or non-root)     │
│  clawd-cli doctor          System health check               │
│                                                              │
│  SERVICES                                                    │
│  clawd-cli start           Start SolanaOS + MCP              │
│  clawd-cli stop            Stop everything                   │
│  clawd-cli status          Check all services                │
│                                                              │
│  SOLANAOS                                                    │
│  sos onboard               Initial configuration             │
│  sos server                Control UI (:7777)                │
│  sos daemon                Operator loop                     │
│                                                              │
│  SOLANA-CLAWD                                                │
│  clawd-cli demo            Animated walkthrough              │
│  clawd-cli birth           Hatch a Buddy                     │
│  clawd-mcp                 MCP HTTP server (:3000)           │
│  clawd-web                 Web UI (:3000)                    │
│                                                              │
│  API                                                         │
│  clawd-cli agents          List agents                       │
│  clawd-cli wallet          Wallet info                       │
│  clawd-cli prices          Live prices                       │
│  clawd-cli connect         Connect to solanaclawd.com        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Go not found after install

```bash
source ~/.bashrc
go version
```

### Permission denied on scripts

```bash
chmod +x clawd-cloud-os/scripts/*.sh
chmod +x clawd-cloud-os/tools/*.sh
```

### Port already in use

```bash
lsof -ti:7777 | xargs kill -9    # SolanaOS
lsof -ti:3000 | xargs kill -9    # MCP / Web
```

### Missing jq

```bash
# With root
sudo apt-get install -y jq

# macOS
brew install jq

# Without either — CLI works fine, just no pretty JSON
```

### npm 404 on @solanaos/nanohub

That package name does not exist in the npm registry. Use
`npx solanaos-computer@latest install --with-web` instead.
