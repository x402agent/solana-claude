# OpenClawd TUI

[![npm version](https://img.shields.io/npm/v/@openclawdsolana/clawd-tui.svg?color=ff6b35&style=for-the-badge)](https://www.npmjs.com/package/@openclawdsolana/clawd-tui)
[![npm downloads](https://img.shields.io/npm/dm/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](https://www.npmjs.com/package/@openclawdsolana/clawd-tui)
[![node](https://img.shields.io/node/v/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](./LICENSE)

> 🦞 Claws that code, brains that deploy.

A lobster-themed agent terminal built on [`@openrouter/agent`](https://www.npmjs.com/package/@openrouter/agent) with first-class Solana on-chain awareness. Adaptive input block, streaming tool calls, session persistence, slash commands, approval gates for destructive actions — and live Birdeye + Helius DAS lookups whenever you paste a Solana address.

📦 **Published:** [`@openclawdsolana/clawd-tui` on npm](https://www.npmjs.com/package/@openclawdsolana/clawd-tui) · 📰 **What's new in v0.2:** [Solana-aware terminal](./docs/v0.2-solana-aware-terminal.md)

```text
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
```

## Install

One-shot run (no install):

```bash
npx -y @openclawdsolana/clawd-tui
```

Global install (recommended):

```bash
npm install -g @openclawdsolana/clawd-tui
clawd
```

Both `clawd` and `clawd-tui` are exposed as binaries.

On first run, `clawd` opens an OpenRouter OAuth (PKCE) login in your browser and caches the resulting key at `~/.config/openclawd/openrouter-key` (mode `0600`). Re-auth any time with `clawd --login`. If the web-callback flow is blocked, fall back to the local-loopback flow with `clawd --login --local-callback`.

You can also pre-set a key:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
clawd
```

Get a key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).

## Tools

**Client-side:** `file_read`, `file_write`, `file_edit`, `glob`, `grep`, `list_dir`, `shell`

**Server-side (OpenRouter):** `web_search`, `datetime`

Destructive tools (`shell`, `file_write`, `file_edit`) prompt for approval before each call.

## Slash commands

### Core

- `/model <id>` — switch the active OpenRouter model
- `/new` — start a fresh conversation
- `/session` — show session metadata + token usage
- `/help` — list commands
- `exit` / `quit` — leave Clawd

### Solana market data — Birdeye

Requires `BIRDEYE_API_KEY` (get one at [bds.birdeye.so](https://bds.birdeye.so/)).

- `/trending [n]` — top trending Solana tokens
- `/search <query>` — search tokens by symbol or name (volume-ranked)
- `/wallet <address>` — top USD holdings for a wallet
- `/portfolio <address>` — full token portfolio with per-position values
- `/networth <address>` — total USD net worth + top-5 weights

### Solana on-chain — Helius DAS

Requires `HELIUS_API_KEY` (get one at [helius.dev](https://www.helius.dev/)). Optional `HELIUS_RPC_URL` overrides the default mainnet endpoint.

- `/asset <id>` — DAS `getAsset` for a single mint/NFT/token (interface, compression, creators, collection, royalty, on-chain supply, mcap)
- `/assets <addr> [page]` — `getAssetsByOwner` with `showFungible` + `showNativeBalance` — split into fungible + NFT tables
- `/nfts <addr>` — `searchAssets` filtered to `nonFungible` (regular + compressed in one shot)
- `/holders <mint>` — `getTokenSupply` + `getTokenLargestAccounts` with concentration colors
- `/sigs <id>` — `getSignaturesForAsset` — recent on-chain history for a compressed asset
- `/balance <addr>` — native SOL balance (RPC `getBalance`)

### On-paste contract analysis

Paste any base58 Solana address straight into the prompt and Clawd auto-detects it. Birdeye and Helius fan out in **parallel** before the agent ever runs:

| Source       | What you get                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Birdeye**  | price · 1h/24h change · mcap · FDV · liquidity · 24h buy/sell volume · holders · trade count       |
| **Helius**   | DAS interface · compression status · creators · collection · royalty · on-chain supply · mcap calc |

Helius output is only shown when it adds something Birdeye doesn't already cover (NFTs, compressed assets, or unindexed tokens), so you never see duplicate price data. Either key is sufficient — both is best.

## Configuration

Drop an `agent.config.json` next to your working directory, or use env vars:

```json
{
  "model": "anthropic/claude-opus-4.7",
  "maxSteps": 20,
  "maxCost": 1.0,
  "display": {
    "inputStyle": "block",
    "toolDisplay": "grouped"
  },
  "showBanner": true,
  "requireApproval": ["shell", "file_write", "file_edit"]
}
```

Env overrides:

| Variable             | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `OPENROUTER_API_KEY` | Agent backend (auto-set via OAuth on first run)                          |
| `AGENT_MODEL`        | Default OpenRouter model id                                              |
| `AGENT_MAX_STEPS`    | Per-turn step cap                                                        |
| `AGENT_MAX_COST`     | Per-turn USD cap                                                         |
| `BIRDEYE_API_KEY`    | Powers `/trending /search /wallet /portfolio /networth` + paste analysis |
| `HELIUS_API_KEY`     | Powers `/asset /assets /nfts /holders /sigs /balance` + paste analysis   |
| `HELIUS_RPC_URL`     | Optional Helius RPC base override (defaults to mainnet)                  |

## Develop

```bash
git clone https://github.com/clawdsolana/OpenClawd.git
cd OpenClawd/clawd-tui
npm install
cp .env.example .env   # optional — sets OPENROUTER_API_KEY for dev
npm start
```

## License

MIT — © OpenClawd contributors
