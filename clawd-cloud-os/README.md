# CLAWD Cloud OS

```text
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/

  ╔══════════════════════════════════════════════════════════════╗
  ║  CLAWD CLOUD OS · SolanaOS + solana-clawd · One-Shot Boot  ║
  ╚══════════════════════════════════════════════════════════════╝
```

The fastest way to boot a Solana-native operator stack with Grok-powered agents, local-first tooling, and one-shot setup. Works on E2B sandboxes, fresh Linux terminals, Docker containers, macOS, and WSL.

## What is CLAWD Cloud OS?

Three projects, one bootstrap:

| Layer | Project | What it does |
| ----- | ------- | ------------ |
| **Bootstrap** | CLAWD Cloud OS | Installs Go, SolanaOS, and solana-clawd in one shot |
| **Runtime** | [SolanaOS](https://github.com/SolanaOS/SolanaOS) | Go-native Solana operator runtime (daemon, Control UI, MCP, wallets) |
| **Agent** | [solana-clawd](https://github.com/x402agent/solana-clawd) | xAI Grok agentic engine (chat, vision, voice, 16-agent research, 31 MCP tools) |

## Why this exists

Cloud terminals and E2B sandboxes start in an awkward state:

- Node is there, Git is there
- **Go is not** (SolanaOS needs it)
- `apt-get` fails because the session is not root

CLAWD Cloud OS fixes that with one bootstrap that:

1. Installs Go locally in your home directory (no root needed)
2. Installs SolanaOS using the canonical installer
3. Clones and bootstraps solana-clawd
4. Installs a terminal MOTD banner and shell aliases

## One-Shot Install

### Remote (any terminal)

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
source ~/.bashrc
```

### Local (from the repo)

```bash
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd/clawd-cloud-os
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
source ~/.bashrc
```

### Pre-inject API keys

```bash
export XAI_API_KEY="your_key"
export HELIUS_API_KEY="your_key"
./scripts/bootstrap.sh
```

Keys are auto-written to `~/src/solana-clawd/.env` during bootstrap.

## Just Need Go?

If you only need Go installed (no SolanaOS or solana-clawd):

```bash
# One-liner from any terminal
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
source ~/.bashrc
go version
```

This works on:

- E2B sandboxes (no root)
- Docker containers
- Fresh Linux VMs
- macOS (Intel and Apple Silicon)
- WSL

The installer detects your architecture, downloads the official Go tarball from
go.dev, installs to `~/.local/go` (non-root) or `/usr/local/go` (root), and
persists the PATH change in your shell config.

## Post-Bootstrap Workflow

```bash
# 1. Reload shell
source ~/.bashrc

# 2. Configure SolanaOS
sos onboard          # guided setup
sos version          # verify

# 3. Start everything
clawd-start          # SolanaOS server + daemon + MCP

# 4. Or start individually
sos server           # Control UI on :7777
sos daemon           # Operator loop
clawd-mcp            # MCP HTTP server on :3000
clawd-web            # Web UI on :3000
clawd-demo           # Animated walkthrough
clawd-birth          # Hatch a Blockchain Buddy
```

## CLI Reference

The unified CLI lives at `clawd-cloud-os/tools/clawd-cli.sh` and is aliased
after bootstrap.

### Bootstrap & Setup

| Command | Description |
| ------- | ----------- |
| `clawd-cli setup` | Full one-shot bootstrap (Go + SolanaOS + solana-clawd) |
| `clawd-cli install-go` | Install Go on any terminal (root or non-root) |
| `clawd-cli doctor` | Check all prerequisites and system health |

### Service Management

| Command | Description |
| ------- | ----------- |
| `clawd-cli start` | Start SolanaOS server + daemon + MCP |
| `clawd-cli stop` | Stop all services |
| `clawd-cli status` | Check local + remote service status |

### Remote API (solanaclawd.com)

| Command | Description |
| ------- | ----------- |
| `clawd-cli agents` | List registered agents |
| `clawd-cli wallet` | View wallet info |
| `clawd-cli prices` | Live token prices |
| `clawd-cli register` | Register on Metaplex Agent Registry |
| `clawd-cli connect` | Connect to solanaclawd.com |

### solana-clawd

| Command | Description |
| ------- | ----------- |
| `clawd-cli demo` | Animated walkthrough |
| `clawd-cli birth` | Hatch a Blockchain Buddy |

## Shell Aliases

Installed automatically by bootstrap into `~/.bashrc`:

```bash
clawd-help       # Show full terminal reference
clawd-start      # Start all services
clawd-status     # Check system status
clawd-demo       # Animated walkthrough
clawd-birth      # Hatch a Blockchain Buddy
clawd-mcp        # Start MCP HTTP server
clawd-web        # Launch web UI
sos              # Shortcut for ~/.solanaos/bin/solanaos
```

## What Gets Installed

| Component | Path | Description |
| --------- | ---- | ----------- |
| Go | `~/.local/go` or `/usr/local/go` | Go runtime (for SolanaOS compilation) |
| SolanaOS | `~/.solanaos/` | Go-native Solana operator runtime |
| solana-clawd | `~/src/solana-clawd/` | xAI Grok agentic engine + MCP tools |
| MOTD | `~/.clawd-motd.sh` | Terminal welcome banner |
| Aliases | `~/.bashrc` | Shell shortcuts for all commands |

## Environment Variables

### Required (one key unlocks everything)

```bash
export XAI_API_KEY="your_key"
```

### Recommended

```bash
export HELIUS_API_KEY="your_key"           # Solana RPC/DAS
export SOLANA_TRACKER_API_KEY="your_key"   # Market data
```

### Optional

```bash
export TELEGRAM_BOT_TOKEN="your_token"     # Telegram bot
export OPENAI_API_KEY="your_key"           # Fallback LLM
export BIRDEYE_API_KEY="your_key"          # Token data
```

## Directory Structure

```text
clawd-cloud-os/
├── scripts/
│   ├── bootstrap.sh       # One-shot bootstrap (Go + SolanaOS + solana-clawd)
│   └── install-go.sh      # Standalone Go installer (root or non-root)
├── tools/
│   ├── clawd-cli.sh       # Unified CLI (setup, doctor, start, stop, API)
│   ├── clawd-connect.sh   # WebSocket/REST connection script
│   └── clawd-register.ts  # Metaplex Agent Registry registration
├── config/
│   ├── clawd-registration.json         # Agent registration metadata
│   ├── clawd-openclaw-config.json      # OpenClaw compatibility config
│   └── solana-clawd-registration.json  # Simplified registration
├── docs/
│   └── terminal-help.md   # Full terminal reference + troubleshooting
└── README.md              # This file
```

## Troubleshooting

### `go: command not found`

```bash
source ~/.bashrc
go version
```

If Go still isn't found, reinstall:

```bash
clawd-cli install-go
source ~/.bashrc
```

### `E: are you root?` / `Permission denied`

Expected on E2B sandboxes and non-root containers. The bootstrap handles this
automatically by installing Go to `~/.local/go` instead of `/usr/local/go`.

### npm 404 on `@solanaos/nanohub`

That package does not exist in the npm registry. Use
`npx solanaos-computer@latest install --with-web` instead (the bootstrap does
this automatically).

### Port already in use

```bash
clawd-cli stop               # graceful stop
lsof -ti:7777 | xargs kill   # force kill SolanaOS
lsof -ti:3000 | xargs kill   # force kill MCP/Web
```

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  CLAWD CLOUD OS (bootstrap layer)                            │
│                                                              │
│  install-go.sh ──► bootstrap.sh ──► clawd-cli.sh            │
│       │                 │                │                   │
│       ▼                 ▼                ▼                   │
│  ┌─────────┐    ┌───────────┐    ┌─────────────┐            │
│  │   Go    │    │ SolanaOS  │    │solana-clawd │            │
│  │ runtime │───►│  daemon   │    │  MCP + Web  │            │
│  └─────────┘    │  server   │    │  Grok agent │            │
│                 │  wallet   │    │  31 tools   │            │
│                 │  MCP      │    │  voice/img  │            │
│                 └───────────┘    └─────────────┘            │
│                      │                │                      │
│                      ▼                ▼                      │
│              ┌────────────────────────────────┐              │
│              │  Terminal experience            │              │
│              │  MOTD · aliases · clawd-cli    │              │
│              └────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

## Positioning

- **CLAWD Cloud OS** is the bootstrap layer
- **SolanaOS** is the compact Go operator runtime
- **solana-clawd** is the Grok-native agentic interface

Together: a terminal-first Solana AI computer that is local-first,
cloud-friendly, sandbox-safe, and one-shot bootstrappable.
