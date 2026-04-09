# Solana Clawd — pAGENT Chrome Extension

**AI-powered GUI vision browser agent with air-gapped Solana wallet vault.**

Version 2.0.0 | Manifest V3 | Unpacked Extension

---

## What Is This?

The Solana Clawd Chrome Extension is the browser companion for [solana-clawd](https://github.com/x402agent/solana-clawd). It connects to your local Clawd daemon and provides:

- **pAGENT** — AI browser automation with GUI vision (see and interact with any web page)
- **Wallet Dashboard** — SOL balance, token portfolio, send/swap, OODA trade history
- **Agent Wallet Vault** — Air-gapped AES-256-GCM encrypted keypair management (never touches the internet)
- **Mining Fleet** — MawdAxe Bitaxe fleet monitoring with SSE live updates
- **Seeker Gateway** — Bridge your Solana Seeker phone to the Clawd daemon
- **AI Chat** — Multi-turn chat with Clawd trading intelligence (OpenRouter or native)
- **Tools** — RPC health, trending tokens, system status, on-chain agent identity minting

## Install

1. Open `chrome://extensions` in Chrome/Brave/Edge
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select one of these directories:
   - `chrome-extension/clawd-agent/` — Full pAGENT with side panel + GUI vision automation
   - `chrome-extension/` — Popup-only extension (wallet, chat, tools, vault, miner, seeker)

The clawd-agent variant requires `<all_urls>` permission for page automation. The popup-only variant only connects to localhost.

## Directory Structure

```
chrome-extension/
├── manifest.json          Popup extension manifest (Manifest V3)
├── background.js          Service worker — status polling, badge updates
├── popup.html             Main UI (6 tabs: Wallet, Seeker, Miner, Chat, Tools, Vault)
├── popup.js               Popup logic (1800+ lines — wallet, chat, mining, seeker, vault)
├── popup.css              Glassmorphism + cyberpunk theme (1100+ lines)
├── icons/                 Extension icons (16, 32, 48, 128px)
│
├── clawd-agent/           Full pAGENT browser agent (load this as unpacked)
│   ├── manifest.json      Manifest V3 with sidePanel, tabs, tabGroups, content scripts
│   ├── background.js      Service worker — tab control, page control, wallet, hub
│   ├── main-world.js      Injects window.PAGENT API into every page
│   ├── hub.html           WebSocket hub for MCP server bridge
│   ├── sidepanel.html     Side panel UI for pAGENT
│   ├── content-scripts/   DOM access content script
│   ├── chunks/            Compiled agent runtime chunks
│   ├── assets/            Icons and compiled CSS
│   └── _locales/en/       "Solana Clawd pAGENT" locale strings
│
├── clawd-extension/       Mirror of clawd-agent (alternate build)
│
├── core/                  @page-agent/core — Re-Act agent loop library
│   └── src/               PageAgentCore, tools, types, utils
│
├── page-controller/       @page-agent/page-controller — DOM state + actions
│   └── src/               Flat DOM tree, element indexing, click/input/scroll
│
├── page-agent/            High-level wrapper (core + controller + UI)
│
├── mcp/                   @solanaos/browser-mcp — MCP server for AI clients
│   └── src/               HTTP + WebSocket bridge, CLI launcher
│
├── ui/                    @page-agent/ui — Panel stub
│
├── solanaos-agent/        Legacy SolanaOS agent (pre-rebrand)
└── solanaos-extension/    Legacy SolanaOS extension (pre-rebrand)
```

## pAGENT — GUI Vision Browser Agent

pAGENT is the AI-powered browser automation layer. It injects `window.PAGENT` into every web page, enabling Claude or any MCP client to:

- **See** — Extract a simplified DOM tree with indexed interactive elements
- **Think** — Send the page state to an LLM for reasoning (Re-Act loop)
- **Act** — Click, type, scroll, select, open tabs, manage tab groups
- **Vision** — Get visual state snapshots via `getVisualState()`

### window.PAGENT API

```javascript
// Execute a natural language task on the current page
await window.PAGENT.execute("Find the cheapest flight to Tokyo", {
  baseURL: "https://api.openrouter.ai/v1",
  model: "anthropic/claude-sonnet-4-6",
  apiKey: "sk-or-...",
  guiVision: true,
  onStatusChange: (status) => console.log(status),
  onActivity: (activity) => console.log(activity),
  onGuiVision: (snapshot) => console.log(snapshot),
});

// Stop a running task
window.PAGENT.stop();

// Get current visual state
const state = await window.PAGENT.getVisualState();
```

### MCP Bridge

The `mcp/` package bridges pAGENT to Claude Desktop or any MCP client:

```
Claude Desktop / Cursor / VS Code
    ↓ (stdio, MCP protocol)
Node.js MCP server (:38401)
    ↓ (HTTP + WebSocket)
Browser hub.html tab
    ↓ (Message passing)
pAGENT extension + PageController
    ↓ (DOM manipulation)
Web pages
```

```bash
# Start the MCP bridge
cd chrome-extension/mcp
LLM_BASE_URL=https://api.openrouter.ai/v1 \
LLM_API_KEY=sk-or-... \
LLM_MODEL_NAME=anthropic/claude-sonnet-4-6 \
node src/index.js
```

MCP Tools:
- `execute_task` — Execute a natural language task in the browser (blocking)
- `get_status` — Check hub connection and busy state
- `stop_task` — Cancel running automation

## Agent Wallet Vault

The Vault tab provides air-gapped keypair management through the local `agentwallet-vault` server. **Private keys never leave your machine.**

### How It Works

```
Chrome Extension Popup
    ↓ (HTTP, localhost only)
agentwallet-vault server (:9099)
    ↓ (AES-256-GCM encrypted)
~/.agentwallet/vault.json (0600 permissions)
```

### Features

- Generate Solana (Ed25519) and EVM (secp256k1) keypairs
- Import existing private keys
- Pause/unpause wallets
- Export encrypted vault backup
- Bearer token authentication
- Zero internet connectivity required

### Start the Vault

```bash
# From repo root
npm run ext:vault

# Or directly
npx agentwallet serve --port 9099
```

### Vault API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/wallets` | List all wallets |
| POST | `/api/wallets` | Create new wallet |
| POST | `/api/wallets/import` | Import existing key |
| GET | `/api/wallets/:id/private-key` | Get decrypted key (auth required) |
| POST | `/api/wallets/:id/pause` | Pause wallet |
| POST | `/api/wallets/:id/unpause` | Unpause wallet |
| DELETE | `/api/wallets/:id` | Delete wallet |
| GET | `/api/vault/export` | Export encrypted vault |

## Popup Tabs

### Wallet

- Agent runtime status (daemon state, OODA mode, open/closed trades)
- Recent OODA trades with P&L and Solscan links
- Bitaxe miner card (hashrate, temp, power, shares, efficiency)
- SOL balance + USD conversion
- Token portfolio
- Transaction history
- Send SOL / Swap tokens

### Seeker

- WebSocket bridge to Solana Seeker phone
- Gateway URL, auth mode (auto/token/password), setup code import
- Connection status and gateway logs

### Miner

- MawdAxe fleet management (aggregate stats + per-device cards)
- Server-Sent Events for live updates
- Hashrate, temperature, power, shares, efficiency

### Chat

- Multi-turn conversation with Clawd trading intelligence
- Routes to OpenRouter or native Clawd daemon
- System prompt: cyberpunk lobster with GUI vision and wallet access

### Tools

- RPC Health (Helius slot/latency)
- Trending Tokens (top Solana movers)
- System Status (daemon, wallet, workspace)
- Register On-Chain (mint agent identity NFT)
- TamaGOchi Pet (virtual pet interaction)

### Vault

- See [Agent Wallet Vault](#agent-wallet-vault) above

## Configuration

Click the gear icon in the popup header to access settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Solana Clawd Server URL | Daemon API endpoint | `http://127.0.0.1:7777` |
| Setup Code Import | Paste `~/.clawd/connect/setup-code.txt` | — |
| Gateway Secret | Bearer token for daemon auth | — |
| Network | Mainnet or Devnet | Mainnet |
| MawdAxe Server URL | Mining fleet API | `http://127.0.0.1:8420` |
| MawdAxe API Key | Fleet auth | — |
| OpenRouter API Key | For AI chat | — |
| AI Model | Chat model | `openai/gpt-5.4-nano` |

## Local API Ports

| Port | Service | Description |
|------|---------|-------------|
| 7777 | Clawd daemon | Primary control API |
| 18800 | Clawd daemon | Alternative port |
| 18790 | Seeker gateway | Mobile bridge WebSocket |
| 8420 | MawdAxe | Mining fleet API |
| 9099 | agentwallet-vault | Encrypted wallet vault |
| 38401 | pAGENT MCP | Browser automation bridge |

## Requirements

- Chrome, Brave, or Edge (Manifest V3 support)
- Clawd daemon running locally (`clawd nanobot`)
- For vault: `npx agentwallet serve` (included in repo at `packages/agentwallet/`)
- For pAGENT MCP: Node.js 20+ and an LLM API key

## License

MIT
