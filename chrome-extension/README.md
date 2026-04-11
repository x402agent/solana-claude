# Solana Clawd — pAGENT Browser

**The first AI browser agent that trades Solana for you — with an air-gapped wallet vault your keys never leave.**

[![Version](https://img.shields.io/badge/version-2.0.0-ff6b35)](manifest.json)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)]()
[![Chrome | Brave | Edge](https://img.shields.io/badge/chrome%20%7C%20brave%20%7C%20edge-supported-brightgreen)]()
[![$CLAWD](https://img.shields.io/badge/%24CLAWD-pump.fun-ff69b4)](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)

> **Your browser. Your wallet. Your agent. Your rules.**
> Point Clawd at any page. It reads, clicks, types, trades. Your private keys stay on your machine — encrypted, air-gapped, untouchable.

---

## Why Clawd Is Different

Every other "AI wallet" ships your keys to a server. Every other "browser agent" has no wallet. Clawd is the first extension that fuses:

1. **GUI-vision browser automation** — Clawd sees your screen, not just the DOM. It handles React, canvas, shadow DOM, iframes — the stuff other agents choke on.
2. **Air-gapped Solana wallet vault** — Keys are generated, encrypted (AES-256-GCM), and signed locally. The extension talks to `localhost:9099` only. No cloud, ever.
3. **OODA-loop trading intelligence** — Clawd runs the Observe → Orient → Decide → Act → Learn cycle on live Solana data and optionally executes through your vault.
4. **Free tier that actually works** — No credit card. No trial. Load unpacked, click through the tabs, you're trading.

---

## Install (60 seconds)

1. Download or clone: `git clone https://github.com/x402agent/solana-clawd`
2. Open `chrome://extensions` in Chrome, Brave, or Edge
3. Toggle **Developer mode** (top right)
4. Click **Load unpacked** and pick one:
   - **`chrome-extension/clawd-agent/`** — Full pAGENT with side panel + GUI vision (recommended)
   - **`chrome-extension/`** — Popup-only build (wallet, chat, tools, vault, miner, seeker)

That's it. Pin the extension and you're live.

---

## What You Get

| Tab | What it does | Paid? |
|---|---|:---:|
| **Wallet** | SOL + SPL balances, OODA trade history, Bitaxe miner stats, send / swap | Free |
| **Chat** | Multi-turn chat with Clawd — routes to OpenRouter or local daemon | Free |
| **Tools** | Live RPC health, trending tokens, system status, on-chain agent identity mint | Free |
| **Seeker** | WebSocket bridge to the Solana Seeker phone | Free |
| **Miner** | MawdAxe Bitaxe fleet dashboard with SSE live updates | Free |
| **Vault** | AES-256-GCM wallet vault at `localhost:9099` — keys never leave your box | Free |
| **pAGENT** | GUI-vision browser agent, `window.PAGENT.execute("...")` on any page | Free core, **Pro unlocks** below |

---

## 🔑 Clawd Pro — Hold $CLAWD, Unlock Everything

Clawd is free to use. **Clawd Pro** unlocks the stuff the degens pay for. Gating is wallet-based — hold $CLAWD, the extension detects your balance, tier unlocks automatically. No sign-ups, no invoices, no Stripe.

| Tier | Hold | Daily Agent Runs | Models | Features |
|---|---|---|---|---|
| **Free** | 0 | 5 | Claude Haiku, GPT-4.1-nano | Manual wallet, core 6 tabs |
| **Bronze** | 1+ $CLAWD | 20 | + Gemini 3 Flash, DeepSeek R1 | Price alerts, 10 watchlist slots |
| **Silver** | 1,000+ | 50 | + Claude Sonnet 4.6, GPT-4.1 | OODA autopilot, Telegram mirroring |
| **Gold** | 10,000+ | 100 | + Claude Opus 4.6, Grok 4.20 | Multi-agent research (4 agents), X/Twitter alpha feed |
| **Diamond** | 100,000+ | 250 | + Grok multi-agent 16 | Pump.fun sniper, MEV-aware routing, priority RPC |
| **Unlimited** | $25/mo in SOL/USDC/$CLAWD | ∞ | Everything | Dedicated RPC, private support channel |

**How gating works** — when the popup loads, it pulls your connected wallet's $CLAWD balance from Helius DAS, resolves your tier locally, and enables or disables buttons in the UI. No server round-trip. You can read the source in `popup.js` — search for `resolveClawdTier()`.

[**Grab $CLAWD on pump.fun →**](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)
Mint: `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## pAGENT — The Browser Agent Other Agents Can't Touch

pAGENT injects `window.PAGENT` into every page. Your LLM client (Claude Desktop, Cursor, Cline, any MCP client) can drive your browser with natural language.

```javascript
await window.PAGENT.execute("Find the cheapest SOL→USDC route on Jupiter and screenshot it", {
  baseURL: "https://api.openrouter.ai/v1",
  model: "anthropic/claude-sonnet-4-6",
  apiKey: "sk-or-...",
  guiVision: true,
  onStatusChange: (s) => console.log(s),
  onActivity: (a) => console.log(a),
});
```

**What makes it different:**
- **GUI vision** — screenshots parsed by a vision model, not just the DOM. Works on canvas-heavy DeFi dashboards where DOM-only agents blow up.
- **Flat DOM tree** — interactive elements get numeric indices for deterministic clicks. No fragile CSS selectors.
- **Re-Act loop** — think / act / observe / repeat until the task is done or budget is hit.
- **MCP bridge** — plugs into Claude Desktop, Cursor, Cline via stdio. One-command setup, zero browser-side config.

### MCP Bridge

```
Claude Desktop / Cursor / Cline
    ↓ stdio (MCP protocol)
Node.js MCP server (:38401)
    ↓ HTTP + WebSocket
Browser hub.html tab
    ↓ message passing
pAGENT extension
    ↓ DOM + GUI vision
Any web page
```

```bash
cd chrome-extension/mcp
LLM_BASE_URL=https://api.openrouter.ai/v1 \
LLM_API_KEY=sk-or-... \
LLM_MODEL_NAME=anthropic/claude-sonnet-4-6 \
node src/index.js
```

MCP tools: `execute_task`, `get_status`, `stop_task`.

---

## Agent Wallet Vault — Keys Never Leave Your Box

The Vault tab talks to a **local-only** server at `localhost:9099` that handles keypair generation, encryption, and signing. The extension cannot reach the internet on your behalf — read the manifest, the only `host_permissions` are `127.0.0.1` / `localhost`.

```
Chrome extension popup
    ↓ HTTP to 127.0.0.1:9099 (bearer token)
agentwallet-vault server
    ↓ AES-256-GCM at rest
~/.agentwallet/vault.json  (chmod 0600)
```

**What it does:**
- Solana (Ed25519) + EVM (secp256k1) keypair generation
- Import existing base58 / hex keys
- Pause / unpause wallets (soft-lock without deleting)
- Bearer-token auth for local API
- Encrypted vault export / restore

**Start the vault:**

```bash
npm run ext:vault                 # from repo root
# or
npx agentwallet serve --port 9099
```

**Vault API (localhost only):**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/wallets` | List wallets |
| `POST` | `/api/wallets` | Create wallet |
| `POST` | `/api/wallets/import` | Import key |
| `GET` | `/api/wallets/:id/private-key` | Get decrypted key (auth required) |
| `POST` | `/api/wallets/:id/pause` | Pause wallet |
| `POST` | `/api/wallets/:id/unpause` | Unpause wallet |
| `DELETE` | `/api/wallets/:id` | Delete wallet |
| `GET` | `/api/vault/export` | Export encrypted backup |

**No keys ship with this repo.** If you see anything that looks like a key inside this folder, it's a placeholder — report it as a security bug.

---

## Directory Layout

```
chrome-extension/
├── manifest.json        Popup-build Manifest V3
├── background.js        Service worker — status polling, badge updates
├── popup.html           6-tab UI shell
├── popup.js             Popup controller — wallet, chat, mining, seeker, vault, tier gate
├── popup.css            Glassmorphism + cyberpunk theme
├── icons/               16 / 32 / 48 / 128 extension icons
├── .gitignore           node_modules / dist / zips / .env
│
├── clawd-agent/         Prebuilt full pAGENT bundle (load this)
│   ├── manifest.json
│   ├── background.js
│   ├── main-world.js    Injects window.PAGENT
│   ├── hub.html         WebSocket hub for MCP
│   ├── sidepanel.html
│   ├── content-scripts/
│   ├── chunks/
│   ├── assets/
│   └── _locales/en/
│
├── core/                @page-agent/core — Re-Act agent loop library
├── page-controller/     @page-agent/page-controller — DOM state + actions
├── page-agent/          High-level wrapper (core + controller + ui)
├── ui/                  @page-agent/ui — Panel stub
├── llms/                LLM provider adapters (OpenRouter, xAI, Anthropic, local)
└── mcp/                 @solana-clawd/browser-mcp — MCP server for AI clients
```

---

## Configuration

Click the gear icon in the popup header.

| Setting | Description | Default |
|---|---|---|
| Solana Clawd Server URL | Local daemon API endpoint | `http://127.0.0.1:7777` |
| Setup Code Import | Paste `~/.clawd/connect/setup-code.txt` | — |
| Gateway Secret | Bearer token for daemon auth | — |
| Network | Mainnet or Devnet | Mainnet |
| MawdAxe Server URL | Mining fleet API | `http://127.0.0.1:8420` |
| MawdAxe API Key | Fleet auth | — |
| OpenRouter API Key | AI chat routing | — |
| AI Model | Default chat model | `anthropic/claude-sonnet-4-6` |

## Local Port Map

| Port | Service |
|---|---|
| 7777 | Clawd daemon (primary API) |
| 18800 | Clawd daemon (alternate) |
| 18790 | Seeker gateway (mobile bridge WebSocket) |
| 8420 | MawdAxe mining fleet API |
| 9099 | agentwallet-vault |
| 38401 | pAGENT MCP bridge |

## Requirements

- Chrome, Brave, or Edge (Manifest V3)
- Clawd daemon running locally: `clawd nanobot`
- Vault: `npx agentwallet serve` (shipped in `packages/agentwallet/`)
- pAGENT MCP: Node.js 20+ and an LLM API key

---

## Security

- **Zero internet calls from the extension popup itself** — only `127.0.0.1` / `localhost` entries in `host_permissions`.
- **No bundled secrets.** This repo ships no `.env`, no keypair file, no API key. `grep` it yourself.
- **Vault files** are `chmod 0600`, AES-256-GCM encrypted, stored in `~/.agentwallet/`.
- **Permission engine is deny-first.** Clawd asks before every irreversible action.
- Found a security issue? File it at [github.com/x402agent/solana-clawd/issues](https://github.com/x402agent/solana-clawd/issues).

## License

MIT. Use it, fork it, ship it. If you build something cool on top, tag [@solanaclawd](https://x.com/solanaclawd) — we retweet the best ones.
