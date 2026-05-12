# Solana Clawd — pAGENT Browser

**The first AI browser agent that trades Solana for you — with an air-gapped wallet vault your keys never leave.**

[![Version](https://img.shields.io/badge/version-2.0.0-ff6b35)](manifest.json)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)]()
[![Chrome · Brave · Edge](https://img.shields.io/badge/chrome%20·%20brave%20·%20edge-supported-brightgreen)]()
[![License MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![$CLAWD](https://img.shields.io/badge/%24CLAWD-pump.fun-ff69b4)](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)

> **Your browser. Your wallet. Your agent. Your rules.**
>
> Point Clawd at any page. It reads, clicks, types, trades. Your private keys stay on your machine — encrypted, air-gapped, untouchable.

---

## Table of Contents

1. [Why Clawd Is Different](#why-clawd-is-different)
2. [Install in 60 Seconds](#install-in-60-seconds)
3. [Six Tabs, Zero Cloud](#six-tabs-zero-cloud)
4. [Clawd Pro — Hold \$CLAWD, Unlock Everything](#clawd-pro--hold-clawd-unlock-everything)
5. [pAGENT — GUI Vision Browser Agent](#pagent--gui-vision-browser-agent)
6. [Agent Wallet Vault](#agent-wallet-vault)
7. [MCP Bridge](#mcp-bridge)
8. [Configuration](#configuration)
9. [Directory Layout](#directory-layout)
10. [Security & Privacy](#security--privacy)
11. [Build & Publish to Chrome Web Store](#build--publish-to-chrome-web-store)
12. [Troubleshooting](#troubleshooting)
13. [Support](#support)
14. [License](#license)

---

## Why Clawd Is Different

Every other "AI wallet" ships your keys to a server. Every other "browser agent" has no wallet. **Clawd is the first extension that fuses both, locally:**

- **GUI-vision browser automation** — Clawd sees your screen, not just the DOM. It works on React, canvas, shadow DOM, iframes — the stuff other agents choke on.
- **Air-gapped Solana wallet vault** — Keys are generated, encrypted (AES-256-GCM), and signed locally. The extension talks to `localhost:9099` only. No cloud, ever.
- **OODA-loop trading intelligence** — Clawd runs the Observe → Orient → Decide → Act → Learn cycle on live Solana data and, with your permission, executes through your vault.
- **Free tier that actually works** — No credit card. No trial. Load unpacked, click through the tabs, you're trading.
- **One key unlocks everything** — your own OpenRouter key drives the AI; no usage quotas, no rug-pull subscription.

---

## Install in 60 Seconds

### Option A — Chrome Web Store *(once published)*

1. Visit the Chrome Web Store listing (link goes here after approval).
2. Click **Add to Chrome**.
3. Pin the extension and click the claw.

### Option B — Load Unpacked (recommended for power users)

```bash
git clone https://github.com/x402agent/solana-clawd
```

1. Open `chrome://extensions` in Chrome, Brave, or Edge.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and pick one:
   - `chrome-extension/` → popup build (wallet + chat + tools + vault + miner + seeker)
   - `chrome-extension/clawd-agent/` → full pAGENT build with side panel + GUI-vision automation

### Option C — Install the .zip from Releases

1. Download `clawd-popup-v2.0.0.zip` from the [releases page](https://github.com/x402agent/solana-clawd/releases).
2. Unzip and follow the **Load Unpacked** flow above.

---

## Six Tabs, Zero Cloud

| Tab | What it does | Paid? |
|---|---|:---:|
| 💰 **Wallet** | SOL + SPL balances, OODA trade history, Bitaxe miner card, send / swap | Free |
| 📱 **Seeker** | WebSocket bridge to the Solana Seeker phone | Free |
| ⛏  **Miner** | MawdAxe Bitaxe fleet dashboard with SSE live updates | Free |
| 💬 **Chat** | Multi-turn chat with Clawd — routes to OpenRouter or the local daemon | Free |
| 🔧 **Tools** | Live RPC health, trending tokens, system status, on-chain agent identity mint | Free |
| 🔐 **Vault** | AES-256-GCM local wallet vault at `localhost:9099` — keys never leave your box | Free |
| 🧠 **pAGENT** | GUI-vision browser agent, `window.PAGENT.execute("...")` on any page | Free core, **Pro unlocks more** |

Every tab is tied to a local daemon or a local RPC. The extension itself only whitelists `127.0.0.1` and `localhost` in `host_permissions` — audit [`manifest.json`](manifest.json) yourself.

---

## Clawd Pro — Hold \$CLAWD, Unlock Everything

Clawd is free to use. **Clawd Pro** unlocks the stuff the degens pay for. Gating is **wallet-based**: hold \$CLAWD, the extension reads your balance via the Clawd daemon's portfolio endpoint, resolves your tier locally, and flips UI switches. **No sign-ups, no invoices, no Stripe.**

| Tier | Hold | Daily Agent Runs | Models | Features |
|---|---|---|---|---|
| **Free** | 0 \$CLAWD | 5 | Claude Haiku, GPT-4.1-nano | Manual wallet, core 6 tabs |
| **Bronze** | 1+ \$CLAWD | 20 | + Gemini 3 Flash, DeepSeek R1 | Price alerts, 10 watchlist slots |
| **Silver** | 1,000+ \$CLAWD | 50 | + Claude Sonnet 4.6, GPT-4.1 | OODA autopilot, Telegram mirroring |
| **Gold** | 10,000+ \$CLAWD | 100 | + Claude Opus 4.6, Grok 4.20 | Multi-agent research (4 agents), X/Twitter alpha feed |
| **Diamond** | 100,000+ \$CLAWD | 250 | + Grok multi-agent 16 | Pump.fun sniper, MEV-aware routing, priority RPC |
| **Unlimited** | \$25/mo in SOL / USDC / \$CLAWD | ∞ | Everything | Dedicated RPC, private support channel |

### How Gating Works (Open Source, Local)

The tier engine is implemented entirely in [`popup.js`](popup.js) — no server round-trip, no telemetry:

1. When the wallet tab refreshes, the popup calls `/api/wallet/portfolio` against the local Clawd daemon.
2. `extractClawdBalance(tokens)` finds the \$CLAWD entry by mint `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`.
3. `resolveClawdTier(balance)` maps the balance to a tier object.
4. `applyClawdTier(tier)` walks every DOM node with `data-pro-feature="..."` and toggles `.pro-locked` + `disabled`, then updates the header badge.
5. The badge is clickable — it opens `pump.fun/<mint>` in a new tab.

Want a new gated feature? Add `data-pro-feature="silverFeatureKey"` to any button in `popup.html` and register the minimum tier in `CLAWD_PRO_FEATURES` in `popup.js`. Done.

### Grab \$CLAWD

[**pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump →**](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)

Mint: `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## pAGENT — GUI Vision Browser Agent

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

// Get the current visual + DOM snapshot
const state = await window.PAGENT.getVisualState();

// Cancel mid-task
window.PAGENT.stop();
```

**What makes it different:**

- **GUI vision** — screenshots parsed by a vision model, not just the DOM. Works on canvas-heavy DeFi dashboards where DOM-only agents blow up.
- **Flat DOM tree** — interactive elements get numeric indices for deterministic clicks. No fragile CSS selectors.
- **Re-Act loop** — think / act / observe / repeat until the task is done or the budget is hit.
- **MCP bridge** — plugs into Claude Desktop, Cursor, Cline via stdio. One-command setup, zero browser-side config.

---

## Agent Wallet Vault

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
| `GET`    | `/api/health`                    | Health check |
| `GET`    | `/api/wallets`                   | List wallets |
| `POST`   | `/api/wallets`                   | Create wallet |
| `POST`   | `/api/wallets/import`            | Import key |
| `GET`    | `/api/wallets/:id/private-key`   | Get decrypted key (auth required) |
| `POST`   | `/api/wallets/:id/pause`         | Pause wallet |
| `POST`   | `/api/wallets/:id/unpause`       | Unpause wallet |
| `DELETE` | `/api/wallets/:id`               | Delete wallet |
| `GET`    | `/api/vault/export`              | Export encrypted backup |

> **No keys ship with this repo.** If you see anything that looks like a key inside this folder, it's a placeholder — file it as a security bug.

---

## MCP Bridge

The `mcp/` package bridges pAGENT to Claude Desktop or any MCP client:

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

**MCP tools exposed:**

- `execute_task` — Execute a natural language task in the browser (blocking)
- `get_status` — Check hub connection and busy state
- `stop_task` — Cancel running automation

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "clawd-browser": {
      "command": "node",
      "args": ["/absolute/path/to/chrome-extension/mcp/src/index.js"],
      "env": {
        "LLM_BASE_URL": "https://api.openrouter.ai/v1",
        "LLM_API_KEY": "sk-or-...",
        "LLM_MODEL_NAME": "anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

---

## Configuration

Click the ⚙️ icon in the popup header.

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

### Local Port Map

| Port  | Service |
|-------|---|
| 7777  | Clawd daemon (primary API) |
| 18800 | Clawd daemon (alternate) |
| 18790 | Seeker gateway (mobile bridge WebSocket) |
| 8420  | MawdAxe mining fleet API |
| 9099  | agentwallet-vault |
| 38401 | pAGENT MCP bridge |

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
├── build-cws.sh         Builds the Chrome Web Store zip
├── CWS-LISTING.md       Paste-ready store listing copy
├── .gitignore           node_modules / dist / build / zips / .env
│
├── clawd-agent/         Prebuilt full pAGENT bundle (load this for GUI vision)
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

## Security & Privacy

- **Zero internet calls from the extension popup itself.** Only `127.0.0.1` / `localhost` entries exist in `host_permissions`. Grep it.
- **No bundled secrets.** This repo ships no `.env`, no keypair file, no API key. `OR_BUNDLED_KEY` is an empty constant — users supply their own OpenRouter key via the settings panel.
- **Vault files** are `chmod 0600`, AES-256-GCM encrypted, stored in `~/.agentwallet/`.
- **Permission engine is deny-first.** Clawd asks before every irreversible action.
- **Zero telemetry.** No analytics, no crash reports, no "help us improve the product" checkbox.
- **Single-purpose extension**: Solana wallet dashboard + AI chat companion that talks only to a local Clawd daemon.

### Permission Justification (Chrome Web Store)

| Permission | Why |
|---|---|
| `storage` | Persist settings (daemon URL, OpenRouter key, gateway secret, tier cache) in `chrome.storage.local` |
| `activeTab` | Open the current wallet address in Solscan when the user clicks "View on Explorer" |
| `alarms` | Poll the local daemon every 30s to update the toolbar badge (online/OODA live/stale) |
| `host_permissions` for `127.0.0.1` / `localhost` | Talk to the Clawd daemon, Seeker gateway, MawdAxe miner API, and agentwallet-vault. **No remote hosts.** |

### Data Disclosures

- ❌ We do **not** sell or transfer user data to third parties
- ❌ We do **not** use user data for unrelated purposes
- ❌ We do **not** use user data for creditworthiness
- ✅ All data categories in the CWS privacy form: **Not collected**

Found a security issue? File it at [github.com/x402agent/solana-clawd/issues](https://github.com/x402agent/solana-clawd/issues) or email `security@solanaclawd.com`.

---

## Build & Publish to Chrome Web Store

```bash
./build-cws.sh
# → build/clawd-popup-v2.0.0.zip (~60 KB, 10 files)
```

The script bundles only the files the popup extension actually needs — no `node_modules`, no source packages, no prebuilt pAGENT bundle. Upload the zip at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).

Full step-by-step copy for the CWS listing form lives in [`CWS-LISTING.md`](CWS-LISTING.md) — every field, every permission justification, every screenshot spec.

### Release Checklist

- [ ] `./build-cws.sh` runs clean
- [ ] Version bumped in `manifest.json` (CWS rejects re-uploads with the same version)
- [ ] No `console.log` debug statements in `popup.js` or `background.js`
- [ ] No hardcoded API keys (`OR_BUNDLED_KEY` is empty)
- [ ] Manifest description ≤ 132 chars
- [ ] Icons are exactly 16 / 32 / 48 / 128 px PNG
- [ ] `host_permissions` contains only `localhost` / `127.0.0.1`
- [ ] Screenshots captured at 1280×800
- [ ] Privacy policy URL added in the dashboard (required for wallet-handling extensions)
- [ ] Tested on Chrome, Brave, and Edge with `Load unpacked`

---

## Troubleshooting

**Badge shows `!` (stale).** Your Clawd daemon hasn't responded in ~30s. Run `clawd nanobot` in a terminal.

**Wallet tab says "Server offline — set HELIUS_RPC_URL".** Set `HELIUS_RPC_URL` in the daemon's `.env` and restart it. The extension itself never talks to Helius directly — the daemon does.

**Vault tab can't connect.** Start the vault: `npx agentwallet serve --port 9099` or `npm run ext:vault` from the repo root.

**Pro features are locked even though I hold \$CLAWD.** Refresh the Wallet tab — tier resolution happens after the portfolio endpoint returns. If your \$CLAWD sits in an associated-token account the daemon doesn't index, reconnect the wallet in the daemon config.

**pAGENT doesn't inject on `chrome://` pages.** Chrome blocks content scripts on `chrome://` and `chrome-extension://` origins. Open a normal page.

**The extension asks for `<all_urls>`.** You loaded the `clawd-agent/` variant instead of the root popup build. That's expected — pAGENT needs cross-origin content script access for GUI automation.

---

## Support

- **GitHub Issues** — [github.com/x402agent/solana-clawd/issues](https://github.com/x402agent/solana-clawd/issues)
- **X / Twitter** — [@solanaclawd](https://x.com/solanaclawd)
- **Website** — [solanaclawd.com](https://solanaclawd.com)
- **Email** — `support@solanaclawd.com`
- **Security** — `security@solanaclawd.com` (PGP key on request)

---

## License

MIT. Use it, fork it, ship it. If you build something cool on top, tag [@solanaclawd](https://x.com/solanaclawd) — the best ones get retweeted.

---

*Built with 🦞 by the Solana Clawd crew.*
