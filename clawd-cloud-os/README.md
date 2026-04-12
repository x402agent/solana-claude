# CLAWD Cloud OS

```
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/

                    ╔══════════════════════════╗
                    ║   POWERED BY xAI GROK    ║
                    ╚══════════════════════════╝
```

The fastest way to boot a Solana-native operator stack with Grok-powered agents, local-first tooling, and one-shot setup.

## What is CLAWD Cloud OS?

CLAWD Cloud OS brings together:
- **SolanaOS** — the Go-native Solana operator runtime
- **solana-clawd** — the Grok-powered agentic layer for chat, vision, voice, research, tools, and memecoin workflows
- **CLAWD Cloud bootstrap** — a terminal-first install path that works even on fresh sandboxes with no Go installed

## Why this exists

A lot of cloud terminals and E2B sandboxes start in an awkward state:
- Node is there
- Git is there  
- Go is not
- apt-get often fails because the session is not root

CLAWD Cloud OS fixes that with one bootstrap that:
- installs Go locally in your home directory when needed
- installs SolanaOS using the repo's canonical installer flow
- clones and bootstraps solana-clawd
- leaves you with a working local-first operator stack

## What gets installed

### SolanaOS
The SolanaOS repo describes the canonical install and quick-start flow as:

```bash
npx solanaos-computer@latest install --with-web
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos version
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

It also documents bash start.sh as the one-command local dev path, plus a Go-native runtime, a control UI, MCP servers, Telegram integration, Seeker support, and wallet tooling.

### solana-clawd
solana-clawd is the xAI/Grok-native agentic layer: multi-agent research, vision, image generation, voice, structured outputs, MCP tools, web/X search, and the Clawd character experience — all centered around a single bootstrap path and a clean operator workflow.

## One-shot bootstrap

Use this on:
- CLAWD Cloud OS
- E2B sandboxes
- fresh Linux terminals
- any shell where go is missing

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
```

Or clone and run:

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd/clawd-cloud-os
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

## Quick start

### 1. Run the bootstrap

```bash
chmod +x bootstrap.sh
./bootstrap.sh
```

### 2. Reload your shell

```bash
source ~/.bashrc
go version
```

### 3. Configure SolanaOS

The SolanaOS onboarding flow is already documented as the preferred first-run setup and writes config to ~/.solanaos/solanaos.json.

```bash
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos version
```

### 4. Launch SolanaOS surfaces

The repo documents solanaos server for the Control UI on port 7777 and solanaos daemon for the main operator loop.

```bash
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

### 5. Launch solana-clawd

```bash
cd ~/src/solana-clawd
npm run demo
npm run mcp:http
npm --prefix web run dev
```

## Environment variables

### Minimum useful setup

SolanaOS documents a minimum useful .env around Solana data, LLM provider config, and Telegram, with solanaos onboard covering the guided path.

For the combined CLAWD stack, these are the most useful starting variables:

```bash
export XAI_API_KEY=your_key
export HELIUS_API_KEY=your_key  
export SOLANA_TRACKER_API_KEY=your_key
```

### Why these three
- **XAI_API_KEY** powers the Grok side of solana-clawd
- **HELIUS_API_KEY** gives Solana RPC/DAS support
- **SOLANA_TRACKER_API_KEY** gives token, chart, market, and trend surfaces

## SolanaOS paths this bootstrap preserves

This section stays consistent with the repo's documented operator flow:

```bash
npx solanaos-computer@latest install --with-web
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

That flow is already described in the repo alongside the Control UI, daemon, wallet API bootstrap, and one-shot local start options.

## What this gives you after one run

### SolanaOS side
- Go-native local runtime
- operator daemon
- Control UI
- MCP surfaces
- wallet tooling
- Telegram / Seeker / Chrome extension paths
- skills and Hub-oriented workflow

### solana-clawd side
- Grok-powered chat
- Clawd character workflows
- multi-agent research
- vision / image / voice flows
- MCP server
- web app
- buddy / meme / creative flows

## Non-root sandbox note

If you are in CLAWD Cloud OS or an E2B session and see:

```
go: command not found
E: are you root?
```

that is expected. This bootstrap uses a local user-space Go install instead of apt-get, so it works without root.

## Alternate local dev path

The SolanaOS repo also documents a direct clone-and-start flow:

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd SolanaOS
cp .env.example .env
bash start.sh
```

That path builds and starts the local services in one command.

## Terminal tools

CLAWD Cloud OS includes terminal tools in the `tools/` directory:

- **clawd-cli.sh** - Connect to solanaclawd.com via terminal
- **clawd-connect.sh** - Terminal connection script
- **clawd-register.ts** - Register on Metaplex Agent Registry

## Positioning

- **CLAWD Cloud OS** is the bootstrap layer.
- **SolanaOS** is the compact Go operator runtime.
- **solana-clawd** is the Grok-native agentic interface that sits on top.

Together, they form a terminal-first Solana AI computer:
- local-first
- cloud-friendly
- sandbox-safe
- Grok-native
- Solana-native
- one-shot bootstrappable

## Terminal help version

```
╔════════════════════════════════════════════════════════════╗
║   CLAWD CLOUD OS · SOLANAOS + SOLANA-CLAWD QUICKSTART    ║
╚════════════════════════════════════════════════════════════╝

1. Run bootstrap.sh
2. source ~/.bashrc
3. ~/.solanaos/bin/solanaos onboard
4. ~/.solanaos/bin/solanaos server
5. ~/.solanaos/bin/solanaos daemon
6. cd ~/src/solana-clawd
7. npm run demo
8. npm run mcp:http
9. npm --prefix web run dev