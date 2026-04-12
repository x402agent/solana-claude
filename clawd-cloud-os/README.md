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

**The Solana-native cloud bootstrap for operators, builders, traders, and agent engineers.**

CLAWD Cloud OS brings together four layers into one opinionated stack:

- **SolanaOS** — the compact Go-native operator runtime
- **solana-clawd** — the Grok-powered Solana agent layer ([npm v1.7.0](https://www.npmjs.com/package/solana-clawd))
- **E2B** — secure cloud sandboxes for terminal, desktop, code execution, and agent deployment
- **CLAWD Cloud bootstrap** — a terminal-first install path that works even on fresh sandboxes with no Go

> **Don't need the full stack?** Just run `npx solana-clawd demo` or `npm i solana-clawd` — the npm package gives you 31 MCP tools, 9 agents, Blockchain Buddies, and unicode spinners without any Go or SolanaOS setup.

## What is CLAWD Cloud OS?

Four layers, one bootstrap:

| Layer | Project | What it does |
| ----- | ------- | ------------ |
| **Bootstrap** | CLAWD Cloud OS | Installs Go, SolanaOS, and solana-clawd in one shot |
| **Runtime** | [SolanaOS](https://github.com/SolanaOS/SolanaOS) | Go-native Solana operator runtime (daemon, Control UI, MCP, wallets) |
| **Agent** | [solana-clawd](https://github.com/x402agent/solana-clawd) ([npm](https://www.npmjs.com/package/solana-clawd)) | xAI Grok agentic engine (chat, vision, voice, 16-agent research, 31 MCP tools) |
| **Sandbox** | [E2B](https://e2b.dev) | Secure cloud sandboxes — desktop, code interpreter, Claude Code, OpenCode, OpenClaw |

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
5. Leaves you E2B-ready for desktop, coding, and agent workflows

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

## Service Ports

Default local surfaces after bootstrap:

| Service | Port | Start path |
| ------- | ---: | ---------- |
| SolanaOS daemon / gateway | 18790 | `bash start.sh` or `solanaos daemon` |
| SolanaOS Control UI | 7777 | `solanaos server` |
| Agent Wallet | 8421 | auto-started by `start.sh` or standalone |
| solanaos-mcp | 3001 | auto-started by `start.sh` |
| solana-clawd MCP | 3000 | `npm run mcp:http` |
| control-api | 18789 | standalone control API |

---

## E2B-Native Workflows

E2B provides secure cloud sandboxes for terminal, desktop GUI, coding agents, and
data work. CLAWD Cloud OS is designed to run inside E2B or alongside it.

### 1. Desktop Computer Use

For GUI agents, E2B Desktop gives you an Ubuntu/XFCE desktop with screenshot,
mouse, keyboard, and VNC streaming support.

```bash
npm i @e2b/desktop
```

```typescript
import { Sandbox } from "@e2b/desktop";

const sandbox = await Sandbox.create({
  resolution: [1024, 720],
  dpi: 96,
  timeoutMs: 300_000,
});

await sandbox.stream.start();
console.log(sandbox.stream.getUrl());

await sandbox.leftClick(500, 300);
await sandbox.write("hello world");
await sandbox.press("Enter");
const screenshot = await sandbox.screenshot();
```

### 2. Claude Code in E2B

E2B ships a prebuilt `claude` template with Claude Code already installed.

```typescript
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create("claude", {
  envs: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
});

const result = await sandbox.commands.run(
  `claude --dangerously-skip-permissions -p "Create a hello world HTTP server in Go"`
);

console.log(result.stdout);
```

### 3. OpenCode in E2B

E2B ships a prebuilt `opencode` template for headless coding-agent workflows.

```typescript
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create("opencode", {
  envs: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
});

const result = await sandbox.commands.run(
  `opencode run "Create a hello world HTTP server in Go"`
);

console.log(result.stdout);
```

### 4. OpenClaw in E2B

E2B ships an `openclaw` template with browser gateway startup and Telegram pairing.

```typescript
import { Sandbox } from "e2b";

const TOKEN = process.env.OPENCLAW_APP_TOKEN || "my-gateway-token";
const PORT = 18789;

const sandbox = await Sandbox.create("openclaw", {
  envs: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
  timeoutMs: 3600_000,
});

await sandbox.commands.run(
  `bash -lc 'openclaw config set gateway.controlUi.allowInsecureAuth true && \
openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true && \
openclaw gateway --allow-unconfigured --bind lan --auth token --token ${TOKEN} --port ${PORT}'`,
  { background: true }
);

console.log(`https://${sandbox.getHost(PORT)}/?token=${TOKEN}`);
```

### 5. Persistence — Pause and Resume

E2B sandboxes can be paused and resumed with filesystem and memory state
preserved, including running processes and variables.

```typescript
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create();
await sandbox.pause();

const resumed = await Sandbox.connect(sandbox.sandboxId);
```

### 6. List and Reconnect

List running and paused sandboxes, then reconnect by ID.

```typescript
import { Sandbox } from "e2b";

const paginator = Sandbox.list({
  query: { state: ["running", "paused"] },
});

const items = await paginator.nextItems();
const sbx = await Sandbox.connect(items[0].sandboxId);
```

### 7. Internet Controls

E2B sandboxes have internet access by default. You can restrict outbound traffic.

```typescript
import { Sandbox, ALL_TRAFFIC } from "e2b";

const sandbox = await Sandbox.create({
  network: {
    allowOut: ["api.example.com", "*.github.com"],
    denyOut: [ALL_TRAFFIC],
  },
});
```

### 8. Git Integration

E2B provides git helpers for clone, pull, push, and credential handling.

```typescript
await sandbox.git.clone("https://github.com/your-org/your-repo.git", {
  path: "/home/user/repo",
  username: "x-access-token",
  password: process.env.GITHUB_TOKEN,
  depth: 1,
});

// For repeated auth inside the same sandbox
await sandbox.git.dangerouslyAuthenticate({
  username: process.env.GIT_USERNAME,
  password: process.env.GIT_TOKEN,
});
```

### 9. Code Interpreter and AI Data Work

For Python/data workflows, E2B Code Interpreter supports uploaded datasets,
parallel code contexts, stdout/stderr streaming, chart/result streaming,
static Matplotlib plots, and interactive chart payloads.

```bash
npm i @e2b/code-interpreter
```

```typescript
import { Sandbox } from "@e2b/code-interpreter";

const sandbox = await Sandbox.create();

await sandbox.runCode(`
import matplotlib.pyplot as plt
plt.plot([1,2,3,4])
plt.ylabel("some numbers")
plt.show()
`, {
  onStdout: data => console.log(data),
  onStderr: data => console.error(data),
  onResult: result => console.log(result),
});
```

Interactive chart types: line, bar, scatter, pie, box-and-whisker.

### 10. Preinstalled Python Stack

The E2B data sandbox includes: pandas, matplotlib, numpy, openpyxl, plotly,
scikit-learn, scipy, pillow, python-docx. Good for CLAWD research, dashboards,
agent analysis, and chart generation.

---

## Recommended Operator Flows

| Goal | Command |
| ---- | ------- |
| Fastest bootstrap | `bash scripts/bootstrap.sh && source ~/.bashrc && sos onboard` |
| Full local SolanaOS | `git clone .../SolanaOS && cd solanaos && cp .env.example .env && bash start.sh` |
| E2B coding agent | `e2b sbx create opencode && opencode` |
| E2B Claude Code | `e2b sbx create claude && claude` |
| E2B OpenClaw | `e2b sbx create openclaw && openclaw` |
| npm quick try | `npx solana-clawd demo` |

---

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
│  │ runtime │───►│  daemon   │    │  npm v1.7.0 │            │
│  └─────────┘    │  server   │    │  MCP + Web  │            │
│                 │  wallet   │    │  31 tools   │            │
│                 │  MCP      │    │  9 agents   │            │
│                 └───────────┘    └─────────────┘            │
│                      │                │                      │
│                      ▼                ▼                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Terminal experience                                    │  │
│  │  MOTD · aliases · clawd-cli · npx solana-clawd         │  │
│  └────────────────────────────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  E2B Sandbox Layer (optional)                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │  │
│  │  │ Desktop  │ │  Claude  │ │ OpenCode │ │  OpenClaw │ │  │
│  │  │ computer │ │  Code    │ │          │ │  gateway  │ │  │
│  │  │ use      │ │  agent   │ │  agent   │ │  + Tg     │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │  │
│  │  pause/resume · list/connect · internet controls       │  │
│  │  git helpers · code interpreter · chart streaming      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Positioning

- **CLAWD Cloud OS** is the bootstrap layer
- **SolanaOS** is the compact Go operator runtime
- **solana-clawd** is the Grok-native agentic interface
- **E2B** is the secure execution and desktop substrate

Together: a terminal-first Solana AI computer that is local-first,
cloud-friendly, sandbox-safe, E2B-native, and one-shot bootstrappable.

## Key Details

- `solanaos-computer` is the canonical one-shot installer; `solanaos-cli` is an alias; `@solanaos/nanohub` is the separate skill-registry CLI (not on npm yet)
- SolanaOS's first-run path: `npx solanaos-computer@latest install --with-web` then `solanaos onboard` (writes config to `~/.solanaos/solanaos.json`)
- E2B prebuilt agent templates: `claude`, `opencode`, `openclaw`
- E2B Code Interpreter SDK: `@e2b/code-interpreter` for Python execution with chart streaming
- E2B Desktop SDK: `@e2b/desktop` for GUI agent workflows with screenshot/mouse/keyboard
