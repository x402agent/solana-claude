<div align="center">

```text
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/

                    ╔══════════════════════════╗
                    ║   POWERED BY xAI GROK    ║
                    ╚══════════════════════════╝
```

# CLAWD Cloud 

### The Solana-native cloud bootstrap for operators, builders, traders, and agent engineers.

Powered by **$CLAWD** on Solana & Pump.fun | Built with **xAI Grok**, **MiniMax M2.7**, and **E2B**

`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

<p>
  <a href="https://solanaclawd.com/staking">
    <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=20&pause=750&color=14F195&center=true&vCenter=true&width=960&lines=%2Fstaking+is+live+%E2%86%92+lock+OpenClawd+agents;Metaplex+Core+FreezeDelegate+staking+on+Solana;Wallet-signed+stake+%C2%B7+inspect+%C2%B7+unstake+console" alt="Animated OpenClawd staking launch banner" />
  </a>
</p>

**New:** [`/staking`](https://solanaclawd.com/staking) is the live OpenClawd agent staking console.  
Minimum devnet program: `D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP` · Global pool: `EyDhP1HU3yqCmqCpKkQHFuX3wMD6sJF1kK8eeRwmTr1K`

```text
wallet ── sign ──> /staking ── freeze delegate ──> agent locked
agent  ─ inspect ─> Core asset ─ unfreeze/remove ─> agent unlocked
```

**Agent staking is now a primary OpenClawd pillar.** The live `/staking`
console proves non-custodial Metaplex Core agent locking on devnet, while
`programs/clawd-stake/` carries the larger reward protocol: weighted
`StakePosition` accounts, CLAWD emissions, SOL fee-share, Helius indexing, and
phase-2 gacha fee routing. `/agents/stake` and `/stake` both redirect to the
same staking console.

---

# Dark Ralph TUI

Dark Ralph is a Bun + Ink terminal app for Solana market surveillance, wallet context, and autonomous AI analysis. The default experience is the **MAWD Market View**: a Bloomberg-style terminal surface with live tickers, a candlestick chart, order book, heatmap, top movers, network stats, activity, and agent controls.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
└─🦞 MAWD │ MARKET VIEW────────────────────────────Uptime: 00:04:35 │ 8:36 AM─┘
┌──────────────────────────────────────────────────────────────────────────────┐
└─SOL $150.25 +2.34% │ BONK $0.00002345 +5.67% │ WIF $2.85 -1.20% │ JUP +3.80%┘

 ┌──────────────────────────────────────────────┐  ┌──────────────────────────┐
 │ SOL/USDC │ 1H              $132.97 (-11.36%)│  │ ORDER BOOK       SOL/USDC │
 │ 152.42 ▒██▒▒││││                           │  │ DEPTH    PRICE      SIZE  │
 │        ▒█▒█▒▒││ │   ·                      │  │ ██████  150.288   260.26 │
 │          │▒│ ▒█▒▒▒││ ││██▒▒·│              │  │ ██████  150.278   960.39 │
 │ VOL▁▃▄▄▃▂▂▃▃▃▁▃▃▄▃▂▃▂▄▂▃▃▃▂▂▃▂▂▄▃▁▂▂▃▁   │  │ ─── SPREAD: 0.0405 ───    │
 │ O: 134.42     H: 135.72     L: 131.50      │  │ ███     150.188   422.84 │
 └──────────────────────────────────────────────┘  └──────────────────────────┘

 ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────┐
 │ MARKET HEATMAP       │ │ TOP MOVERS           │ │ LIVE FEED          ● LIVE│
 │ ╭────╮ ╭────╮ ╭────╮ │ │ ▲ BONK +15.3%        │ │ 🐋 5,000 SOL to exchange│
 │ ╰+3.5╯ ╰+12╯ ╰+8.3╯ │ │ ▲ WIF  +12.5%        │ │ 📈 SOL crossed $150     │
 │ ╰-4.8╯ ╰-1.5╯ ╰-8.2╯│ │ ▼ MNGO -12.5%        │ │ ⚡ BONK divergence       │
 └──────────────────────┘ └──────────────────────┘ └──────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
└─[1] MARKET │ [2] TRADING │ [3] PORTFOLIO │ [4] ANALYTICS │ [5] AGENT───────┘
```

## Features

- **MAWD market dashboard** with ticker tape, SOL/USDC chart, order book, spread, volume bars, heatmap, top movers, live feed, network stats, and activity stream.
- **Five terminal views**: Market, Trading, Portfolio, Analytics, and Agent.
- **Autonomous agent loop** through `RalphAgent`, with configurable auto/interactive mode and recursive market thoughts.
- **Provider integrations** for Helius, Birdeye, xAI Grok, Perplexity, OpenRouter, News API, SERP API, and Financial Datasets.
- **Solana wallet tools** for local wallet creation, address display, balance lookup, and portfolio context.
- **Terminal-native controls** with number-key navigation, refresh/help shortcuts, and an agent command surface.

## OpenClawd agent staking docs

Dark Ralph is the market-surveillance/operator companion to the OpenClawd agent stack. Related local references:

- Main app README: `/Users/8bit/Downloads/clawd-terminal/README.md`
- Agents catalog README: `/Users/8bit/Downloads/clawd-terminal/agents/README.md`
- Pay Agents guide: `/Users/8bit/Downloads/clawd-terminal/docs/pay-agents.md`
- Clawd Stake program: `/Users/8bit/Downloads/clawd-terminal/programs/clawd-stake/README.md`
- Clawd TUI README: `/Users/8bit/Downloads/clawd-terminal/clawd-tui/clawd-tui/README.md`
- Dark Ralph TUI README: `/Users/8bit/fraud/OpenClawd/dark-ralph/README.md`

Dark Ralph's role in this system is operator awareness: watch market conditions,
agent-wallet context, and token health while the OpenClawd app handles
wallet-signed staking at `/staking`. The larger `clawd-stake` reward layer can
use the same market and payment data when routing future CLAWD emissions and
gacha fee share.

## Quick Start

```bash
cd dark-ralph
bun install
cp .env.example .env
bun run run
```

The TUI can boot without every key configured. Missing providers are shown as disconnected and their dependent commands fail closed.

## Commands

```bash
bun run run                         # Start MAWD TUI
bun run src/cli.tsx run --auto      # Autonomous mode
bun run src/cli.tsx run --interactive
bun run src/cli.tsx run --wallet <address>
bun run src/cli.tsx run --headless  # Daemon mode

bun run status                      # API configuration status
bun run setup                       # Setup instructions
bun run wallet -- --create          # Create local wallet
bun run wallet -- --balance         # Show wallet balance
bun run wallet -- --address         # Show wallet address
```

When installed from a built package, the binaries are:

```bash
dark-ralph run
ralph run
ralph-tui run
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `1` | Market view |
| `2` | Trading view |
| `3` | Portfolio view |
| `4` | Analytics view |
| `5` | Agent view |
| `Tab` | Cycle display mode |
| `H` | Help |
| `R` | Refresh |
| `Q` / `Esc` | Quit |

## Agent Commands

| Command | Description |
| --- | --- |
| `/help` | Show available commands |
| `/analyze` | Run market analysis |
| `/trending` | Show trending Solana tokens |
| `/wallet` | Display wallet context |
| `/news` | Fetch crypto news |
| `/search <query>` | Search through Grok |
| `/research <topic>` | Research through Perplexity |
| `/prophecy` | Generate Dark Ralph predictions |
| `/clear` | Clear agent messages |

## Configuration

Create `.env` from `.env.example` and add the keys you want to enable:

```env
HELIUS_API_KEY=
HELIUS_RPC_URL=
BIRDEYE_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
OPENROUTER_API_KEY=
NEWS_API_KEY=
SERP_API_KEY=
FINANCIAL_DATASET_API_KEY=
```

| Service | Enables |
| --- | --- |
| Helius | Solana RPC, DAS, balances, transactions |
| Birdeye | Token prices, OHLCV, trending tokens, market data |
| xAI Grok | Search and market reasoning |
| Perplexity | Research workflows |
| OpenRouter | Model-backed reasoning |
| News API | Crypto news feed |
| SERP API | Search result enrichment |
| Financial Datasets | Additional market and sentiment data |

## Project Layout

```text
dark-ralph/
├── docs/
│   └── BIRDEYE_INTEGRATION.md
├── src/
│   ├── cli.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── BloombergDashboard.tsx
│   │   ├── PriceChart.tsx
│   │   ├── OrderBook.tsx
│   │   ├── Heatmap.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── TradingPanel.tsx
│   ├── engine/
│   │   └── ralph-agent.ts
│   ├── services/
│   │   ├── birdeye.ts
│   │   ├── birdeye-api.ts
│   │   ├── birdeye-websocket.ts
│   │   ├── helius.ts
│   │   ├── ai-providers.ts
│   │   └── market-data-provider.ts
│   └── skills/
│       └── solana-wallet.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Built With

- Bun
- Ink
- React
- `@solana/web3.js`
- Zod
- Commander

---

[SOUL.md](./SOUL.md) · [SOUL Template](./SOUL_TEMPLATE.md) · [Grok Prompt Guide](./docs/grok-prompting.md) · [Migration Guide](./docs/migrate-from-openclaw.md)

[ClawdRouter Cloud](./docs/clawdrouter-cloud.md) · [ClawdRouter API](./docs/CLAWD_ROUTER.md) · [Build Guide](./docs/CLAWD_ROUTER_BUILD.md) · [Agent Guide](./docs/clawdrouter-agent-guide.md) · [Pay Agents](./docs/pay-agents.md) · [Monetize](./docs/monetize.md) · [x402-proxy Worker](./docs/x402-proxy-worker.md) · [agents-x402 SDK](./docs/agents-x402-sdk.md) · [MPP compatibility](./docs/mpp-compatibility.md) · [R2 Vault](./docs/r2-vault.md) · [OpenRouter Attribution](./docs/openrouter-attribution.md) · [Market](./docs/market.md) · [Market article](./ARTICLE_MARKET.md) · [Skills article](./ARTICLE_SKILLS.md) · [/latest](./client/src/pages/Latest.tsx) · [/skills](./Claw3D-main/src/app/skills/page.tsx) · [/myskills](./Claw3D-main/src/app/myskills/page.tsx) · [/keys](./client/src/pages/Api.tsx) · [/agent-api](./client/src/pages/AgentApi.tsx) · [/cherry-charm](./client/src/pages/CherryCharm.tsx) · [/stats](./client/src/pages/Stats.tsx) · [/clawdrouter](./client/src/pages/ClawdRouter.tsx) · [/x402](./client/src/pages/X402.tsx) · [/market](./client/src/pages/Market.tsx) · [/bazaar](./client/src/pages/Bazaar.tsx) · [/voice](./client/src/pages/Voice.tsx) · [/studio](./client/src/pages/Studio.tsx) · [/bots](./client/src/pages/Bots.tsx) · [/office](./client/src/pages/Office.tsx)

[ElevenLabs Voice MCP](./ELEVENLABS_VOICE_MCP.md) · [Clawd Voice](./client/src/pages/ClawdVoice.tsx)

---

## OpenClawd Agent Staking Docs

The staking-first Metaplex Agent metaprotocol is documented across the app, agent catalog, payment rails, and terminal surfaces:

- Main app README: `/Users/8bit/Downloads/clawd-terminal/README.md`
- Agents catalog README: `/Users/8bit/Downloads/clawd-terminal/agents/README.md`
- Pay Agents guide: `/Users/8bit/Downloads/clawd-terminal/docs/pay-agents.md`
- Clawd Stake program: `/Users/8bit/Downloads/clawd-terminal/programs/clawd-stake/README.md`
- Clawd TUI README: `/Users/8bit/Downloads/clawd-terminal/clawd-tui/clawd-tui/README.md`
- Dark Ralph TUI README: `/Users/8bit/fraud/OpenClawd/dark-ralph/README.md`

Core files:

- User route: `client/src/pages/AgentStake.tsx`
- Live devnet lock builder: `client/src/lib/agentStaking.ts`
- Reward protocol program: `programs/clawd-stake/`
- Reward tx API: `server/_core/clawdStakeRoutes.ts`
- Helius -> Convex mirror: `server/_core/clawdStakeWebhook.ts`
- Convex mirror tables/functions: `convex/clawdStake.ts`

---

### 🚀 Install in one shot

```bash
curl -fsSL https://solanaclawd-install.x402.workers.dev | bash
```

Drops `clawd`, `ralph`, `nanosolana`, and `solanaos` into `~/.local/bin`. macOS (arm64 + x86_64) and Linux. npm + brew fallbacks:

```bash
npm i -g @mawdbotsonsolana/cli
brew install x402agent/tap/solana-clawd
```

Landing: [`/openclawd`](./client/src/pages/OpenClawd.tsx) · Launchpad: [`/launchpad`](./client/src/pages/Launchpad.tsx) · Article: [ARTICLE_LAUNCHPAD.md](./ARTICLE_LAUNCHPAD.md)

---

### 🆕 Latest ships — 2026-04-21

- **`/agent-api` + `cloudflare-agent-api/`** — The Cloudflare Worker agent API is now a first-class project service. Root scripts cover local dev, typecheck, D1 migrations, deploys, staging deploys, and live tails. The public page exposes health, provider readiness, endpoints, and copyable agent registration snippets for API-key agents, session auth, Crossmint Solana wallets, and deployment factory routes.
- **`/cherry-charm` + `cherry-charm-main/` adaptation** — The standalone Cherry Charm arcade has been translated into a CLAWD-native route: site navigation, route catalog visibility, Three.js mint-machine scene, local credit loop, bet tiers, agent autoplay, candy inventory, progress tracking, and copyable launch command. `/arcade` redirects to the same public surface.
- **`/clawd-voice` + ElevenLabs MCP + x402 gateways** — The ElevenLabs ConvAI agent now has a read-only `openclawd_voice_data` webhook for weather, Helius, Birdeye, Solana token search/price/trending, asset, and wallet lookups. The bundled `elevenlabs-mcp-main 2/` server is wired through `.mcp.json` for local MCP clients, with `pnpm run elevenlabs:mcp:print` for Claude Desktop/Cursor/Codex/Gemini config and `pnpm run elevenlabs:setup-tools` to re-attach the live ConvAI webhook tool. `.mcp.json` also advertises the remote Pump.fun x402 MCP server and `/api/voice/session` publishes Pump.fun, pump scanner, BeepBoop, and SolanaOS agent API gateway URLs for voice clients.
- **`/launchpad` + `/openclawd`** — New Solana + Base agentic launchpad sealed inside Phala TDX enclaves. Replaced the `eliza-develop` runtime with OpenClawd agents so every launch inherits `mpl-agent-registry` identity, Honcho brain, ClawdRouter inference, and SOUL profiles. Dual-rail: Pump.fun (Solana) + Clanker (Base). Ten new skills shipped (`defillama-market`, `dexscreener-scout`, `coingecko-rates`, `oneinch-router`, `pump-fun-sdk`, `phishing-detector`, `sanctions-check`, `contract-scanner`, `gas-estimator`, `grants-finder`) wrapped over `plugin.delivery/api/*`. `/openclawd` is the CLI landing with curl one-liner, npm fallback, terminal preview, and full command catalog. Shared `<InstallHero />` component renders the same install block on `/start`, `/openclawd`, and `/launchpad`.
- **`/studio` — Vibe Voice Studio** with Moonshot **Kimi K2.6** (262K context, agentic tool-calls, preserved reasoning). Browser-native voice I/O via the Web Speech API (no paid TTS). Kimi can emit `<chart mint="..."/>` tool markers rendered inline as live Birdeye sparklines. Set `MOONSHOT_API_KEY` to enable.
- **`/bots` — R3F runtime visualizer** for the 6 production Telegram bots (`clawd-telegram-bots.fly.dev`). Live health polling every 5s, click-through to each bot handle. Includes **bot6 / [@clawdbuyingbot](https://t.me/clawdbuyingbot)** — NL Solana buy bot with Jupiter swaps + Birdeye data + xAI intent parsing. Token-gated to $CLAWD holders.
- **ClawdRouter registry** gained `moonshot/kimi-k2.6`, `moonshot/kimi-k2-thinking`, `moonshot/kimi-k2-turbo-preview` alongside the existing Moonshot K2.5.
- **New server env:** `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL` (default `https://api.moonshot.ai/v1`), `MOONSHOT_MODEL` (default `moonshot/kimi-k2.6`).
- **New route:** `POST /api/moonshot/chat` — direct Moonshot adapter (`server/_core/moonshot.ts`) with thinking-mode passthrough.

See [/latest](./client/src/pages/Latest.tsx) for the full changelog.

</div>

---

## 🚀 One-command install

The Go daemon + TypeScript MCP server + ClawdRouter — any platform, one line.

### cURL (one-shot)

```bash
curl -fsSL https://solanaclawd.com/install | sh
```

Served live off the site ([server/_core/app.ts](./server/_core/app.ts)): detects `darwin-arm64`, `darwin-amd64`, `linux-amd64`, or `linux-arm64`, pulls the matching tarball from the optional `CLAWD_BINARY_BASE_URL` CDN first when configured, falls back to the [`x402agent/solana-clawd`](https://github.com/x402agent/solana-clawd) GitHub release, and drops `clawd`, `ralph`, `slnc`, and `clawd-tui` into `~/.local/bin`.

The install scope is intentionally safe by default: binaries plus a shared `~/.clawd/config.env` with public/free-mode defaults. It does not prompt for paid API keys, create wallets, burn tokens, or enable premium models during `curl | sh`; users opt into those later through `clawd setup`, `clawd go`, or the web terminal.

Distribution policy:

| Decision | Default |
|----------|---------|
| Binary hosting | Both: GitHub Releases are canonical; CDN is supported through `CLAWD_BINARY_BASE_URL` for faster binary downloads. |
| Install scope | Binaries plus shared config template. Full setup remains an explicit follow-up command. |
| Shared state | One `~/.clawd/config.env` for OpenClawd and Dark Ralph. |
| Integration | Tight enough to share config and wallet context; commands remain independently runnable as `clawd` and `ralph`. |

### NPM

```bash
npm i -g @mawdbotsonsolana/cli
```

OpenRouter-native terminal UI fallback:

```bash
npx -y @openclawdsolana/clawd-tui
npm i -g @openclawdsolana/clawd-tui
```

### Homebrew

```bash
brew install x402agent/tap/solana-clawd
```

### Quick start

```bash
# 1. clone + build from source
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd/solana-clawd
make install

# 2. start trading
clawd daemon            # start the daemon
clawd ooda --sim        # simulated OODA loop (no money at risk)
ralph                   # Dark Ralph terminal mode

# 3. or zero-config via ClawdRouter (no API keys at birth)
clawd go
```

Binaries shipped:

| Binary | Purpose |
|--------|---------|
| `clawd` | Main daemon with OODA loop trading |
| `ralph` | Dark Ralph terminal mode |
| `slnc` | solana-go CLI for direct RPC operations |
| `clawd-tui` | Terminal UI launcher |

Build targets: `make build` · `make slnc` · `make tui` · `make slim` (<10MB) · `make orin` (NVIDIA Orin Nano cross-compile).

---

## cURL API examples

All endpoints served by the hosted ClawdRouter at `api.solanaclawd.com`, gated by the same $CLAWD wallet keys minted at [/keys](./client/src/pages/Api.tsx).

### Balance check

```bash
curl -X POST https://api.solanaclawd.com/v1/rpc \
  -H "Authorization: Bearer $CLAWDRouter_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"method":"getBalance","params":["<wallet_pubkey>"]}'
```

### Token price

```bash
curl -X POST https://api.solanaclawd.com/v1/market/price \
  -H "Authorization: Bearer $CLAWDRouter_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mint":"So11111111111111111111111111111111111111112"}'
```

### Pump.fun token scan

```bash
curl -X POST https://api.solanaclawd.com/v1/trading/scan \
  -H "Authorization: Bearer $CLAWDRouter_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":20}'
```

### Jupiter swap quote

```bash
curl -X POST https://api.solanaclawd.com/v1/trading/quote \
  -H "Authorization: Bearer $CLAWDRouter_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputMint":"So11111111111111111111111111111111111111112",
       "outputMint":"<token_mint>",
       "amount":1000000000}'
```

Full reference: [docs/solana-clawd-go.md](./docs/solana-clawd-go.md).

---

## MCP server (31+ tools)

| Category | Tools |
|----------|-------|
| Helius RPC | `account_info`, `balance`, `transactions`, `priority_fee` |
| Solana market | `price`, `trending`, `token_info`, `wallet_pnl` |
| Trading | `pump_token_scan`, `pump_buy_quote`, `pump_sell_quote` |
| Memory | `memory_recall`, `memory_write` |
| Wallet | `balance`, `address`, `transfer` |
| Agent | `agent_spawn`, `agent_list`, `agent_stop` |

### MawdBot OODA loop

```text
OBSERVE → prices, volume, holders, dev-wallet, bonding%
ORIENT  → RSI/EMA/ATR scoring, confidence model
DECIDE  → confidence ≥ 0.60 → size band
ACT     → Jupiter swap / Hyperliquid / Aster
LEARN   → persist to ClawVault, feed auto-optimizer
```

### ClawVault memory tiers

| Tier | What it holds | Confidence |
|------|---------------|------------|
| **KNOWN** | API data, prices, balances, on-chain state | Verified, expires |
| **LEARNED** | Trade patterns, wallet behaviors, market correlations | Persistent, high trust |
| **INFERRED** | Derived signals, hypotheses, weak correlations | Tentative, revisable |

### Drawdown cascade

| Drawdown | Action |
|----------|--------|
| 5% | Reduce weakest exposure, block high-risk pump.fun |
| 8% | Close all perp positions, revert to spot-only |
| 12% | Full halt on new risk until manual review |

### npm packages

| Package | Purpose |
|---------|---------|
| `@mawdbotsonsolana/cli` | Main CLI installer (clawd, nanosolana, solanaos aliases) |
| `@mawdbotsonsolana/computer` | Full runtime package |
| `@mawdbotsonsolana/installer` | One-command installer with ClawdRouter |

### OpenClawd npm org

| Package | Version | Purpose |
|---------|---------|---------|
| `@openclawdsolana/clawd-code-cli` | `1.9.1` | Solana lobster coding CLI and OpenClawd terminal runtime |
| `@openclawdsolana/leviathan` | `0.2.3` | Sovereign AI Lobster Runtime on Solana |
| `@openclawdsolana/agents-x402` | `0.1.0` | One-line x402 Solana monetization for MCP servers, HTTP handlers, and agent tool calls |
| `@openclawdsolana/agentwallet` | `0.1.1` | Encrypted Solana + EVM keypair vault for E2B sandboxes and Cloudflare Workers |
| `@openclawdsolana/clawdrouter` | `0.1.1` | LLM router for autonomous Solana agents with wallet-signed USDC micropayments |
| `@openclawdsolana/membrain-types` | `0.1.0` | TypeScript types and client for the Membrain memory layer |
| `@openclawdsolana/vault-mcp` | `1.0.1` | ClawdVault MCP server for security scanning and vault operations |
| `@openclawdsolana/wurk-mcp` | `1.0.0` | WURK API MCP server for job creation and x402 payments |
| `@openclawdsolana/plugin-sdk` | `1.0.0` | Plugin SDK with OpenAPI parsing, Zod schemas, and Solana Attestation Service helpers |
| `@openclawdsolana/chat-plugins-gateway` | `1.1.2` | Edge plugin gateway with deny-first permissions and plugin.delivery manifest forwarding |
| `@openclawdsolana/clawd-tui` | `0.2.2` | OpenRouter-native lobster terminal with Solana paste analysis and DeepSeek commands |
| `@openclawdsolana/automaton` | `0.1.0` | Self-replicating agent runtime for Sense -> Think -> Strike -> Drift loops |
| `@openclawdsolana/pagent-page-controller` | `1.6.3` | DOM operation and element interaction helpers for pAGENT |
| `@openclawdsolana/pagent-llms` | `1.6.3` | OpenAI, OpenRouter, and Anthropic adapters for pAGENT |
| `@openclawdsolana/pagent-core` | `1.6.4` | GUI vision agent core for web apps and browser-extension hosts |
| `@openclawdsolana/percolator` | `1.0.3` | Agentic perpetuals CLI for Solana trade management and monitoring |
| `@openclawdsolana/pagent-ui` | `1.6.4` | Viewport overlays, screenshot adapters, and rendering utilities for pAGENT |
| `@openclawdsolana/honcho-bridge` | `0.1.0` | Honcho reasoning-memory adapter with Membrain semantic feed-through |
| `@openclawdsolana/clawd-wallet` | `0.1.0` | Solana wallet and Jupiter swap core for the OpenClawd agent ecosystem |

### NPM release diagnostics

The repository root is a private web app package. Do not publish from the root with `npm publish`; it will try to pack the whole workspace and produce a huge `clawd-terminal` tarball. Publish the TUI package through the checked scripts:

```bash
npm run publish:tui:dry-run
NPM_OTP=123456 npm run publish:tui:otp
```

If publish fails with `E403 Two-factor authentication or granular access token with bypass 2fa enabled is required`, the package is packed correctly, but npm needs either a current OTP code or an automation/granular access token allowed by the `@openclawdsolana` org policy.

---

CLAWD Cloud OS brings together three layers into one opinionated stack:

* **SolanaOS** — the compact Go-native operator runtime
* **solana-clawd** — the Grok-powered Solana agent layer
* **E2B** — secure cloud sandboxes for terminal, desktop, code execution, and agent deployment

The result is a local-first but cloud-friendly Solana AI computer that can:

* bootstrap itself on fresh terminals
* install Go without sudo when needed
* run SolanaOS and solana-clawd in one shot
* deploy into E2B sandboxes for coding, desktop computer use, web agents, and wallet tooling

---

## What This Repo Is

This repository is the web terminal build of **solana-clawd**: a Solana-native AI terminal and vibe-coding studio with:

- Phantom wallet sign-in with token-gated access
- AI usage tracking and image generation history
- Solana market data via Helius, Jupiter, and Birdeye
- DFlow trading + prediction market API integration (tRPC + smoke tests)
- GitHub, Telegram, and X integrations
- E2B cloud sandbox management (create, run, pause, resume, kill)
- SOUL.md lore and in-app migration guide

The current app is a Vite client plus Express/tRPC server.

## What's Live on solanaclawd.com

This section documents every surface shipped in the current build, in the order you will actually encounter it.

### 1. Agent Registry Surfaces

The agent stack is a four-page funnel backed by Metaplex Core + [`@metaplex-foundation/mpl-agent-registry`](https://github.com/metaplex-foundation/mpl-agent-registry):

- **[/agents](./client/src/pages/AgentGallery.tsx)** — **Gallery**. Sticky command bar at the top with wallet pill, hub nav, and section anchors (`ONE-SHOT · TEMPLATES · LIBRARY`). Featured roster hard-codes real on-chain agents (**CLAWD Agent**, **ClawdFather**, **Агент-снайпер**) with their addresses.
- **[/agents/registry](./client/src/pages/AgentRegistry.tsx)** — **Registry**. Curated catalog surface with the [AgentHowItWorks](./client/src/components/AgentHowItWorks.tsx) collapsible explainer.
- **[/agents/explorer](./client/src/pages/AgentExplorer.tsx)** — **Live Explorer**. Streams recent program signatures from the `mpl-agent-registry` program via Helius RPC (`umi.rpc.call('getSignaturesForAddress', …)`), derives each Core asset by matching `findAgentIdentityV1Pda` against the signature's account keys (no extra RPC), then enriches via `fetchAsset` + `findAssetSignerPda` + the registration JSON. Auto-refreshes every 30s and filters broken-image / prompt-text-name entries client-side. Exposed as `trpc.metaplex.recentAgents`.
- **[/agents/mint](./client/src/pages/AgentMint.tsx)** — **Mint**. Unified wallet connect card, $CLAWD holder check, no-login mint. UTF-8 byte-length guards (`NAME_MAX_BYTES=32`, `URI_MAX_BYTES=200`, `DESCRIPTION_MAX_BYTES=1000`) prevent the "encoding overruns Uint8Array" failure. Oversized metadata URIs are auto-pinned to Pinata via `uploadJsonToPinata` and replaced with the short gateway URL. Default service list registered with each identity: `hosted-chat, a2a, mcp, x402, x402-facilitator, clawdrouter, grok-voice, grok-voice-mcp, token, pump-scanner`.
- **[/agents/:address](./client/src/pages/AgentChat.tsx)** — **Hosted chat**. Public embed shell (also routed as `/agents/hosted/:address`) that serves any A2A-linked agent from `https://solanaclawd.com` (no `beepboop.` subdomain leakage).

### 2. Clawd's Brain — Per-Agent Honcho Memory

Every minted agent ships with a Honcho-powered per-agent memory deterministically provisioned at wallet mint.

- **Session topology.** Mint creates a persistent Honcho session `trading-agent-{walletId}` with two peers: the owner (`user-{id}`) and the agent (`agent-wallet-{walletId}`). Seeded peer cards capture operator preferences (explicit approval, KNOWN/LEARNED/INFERRED labelling) and the agent's execution mode (live vs. simulated, Privy wallet address).
- **Lifecycle events.** `trade-queued`, `trade-rejected`, and `trade-executed` are written from both peer perspectives with typed metadata (`action`, `token`, `amount`, `status`, `mode`).
- **Surfaced at:** [/brain](./client/src/pages/Brain.tsx) (token-gated, one panel per owned agent), inline in the Terminal's [AgentTradingPanel](./client/src/pages/Terminal.tsx), and via `trpc.agent.brain({ agentWalletId })`. Backed by [server/_core/honcho.ts](./server/_core/honcho.ts) (`bootstrapTradingAgentMemory`, `readTradingAgentBrain`, trade lifecycle recorders).
- **Fail-soft.** When `HONCHO_ENABLED=false` or the API key is missing, wallet creation and trade approval proceed; memory writes are best-effort and never block execution.

Env:

```bash
HONCHO_ENABLED=true
HONCHO_API_KEY=...
HONCHO_BASE_URL=                   # optional; defaults to Honcho cloud
HONCHO_WORKSPACE_ID=solana-clawd-trading
HONCHO_REASONING_LEVEL=low
```

### 3. Clawd's Guide — Global Pop-Out Chat

[ClawdGuide](./client/src/components/ClawdGuide.tsx) is a floating, $CLAWD-gated, natural-language-aware Grok chat that rides on every page.

- **Holder gate.** Both client and server verify $CLAWD holding (`trpc.wallet.verifyHolder`) before the pop-out unlocks.
- **Per-wallet persistence.** Messages keyed as `clawd-guide-messages-v2:{walletAddress}` in `localStorage`; every exchange is also fire-and-forgotten to `/api/grok/record` so Honcho keeps the long-tail memory of the guide per wallet.
- **Natural-language token awareness.** Free-text mint addresses (base58) and `$TICKER` mentions are extracted and hydrated via `trpc.solanaTracker.chatContext` with a 4s race timeout — the model sees a compact token-context block without the user having to paste JSON.
- **Pinned layout.** Inline style forces `position: fixed`, safe-area-aware `right`/`bottom`, `zIndex: 10000`, `transform: translateZ(0)`, `contain: "layout paint"`, and `direction: ltr` so the widget never drifts left or jumps between routes.

### 4. Vibe — GLM Coding Studio

[/vibe](./client/src/pages/Vibe.tsx) is a token-gated vibe-coding studio powered by Z.AI GLM (`ZAI_API_KEY`). The frontend streams from `/api/zai/chat/stream`; the page itself is $CLAWD-gated behind `TokenGate`.

### 5. Chart + TokenInsights — Solana Tracker Realtime

[/chart/:address](./client/src/pages/Chart.tsx) now embeds [TokenInsights](./client/src/components/TokenInsights.tsx): bubble map of holders, bundler heat, risk tabs, ATH, trending context. All series come from Solana Tracker via [server/_core/solanaTracker.ts](./server/_core/solanaTracker.ts), exposed as `trpc.solanaTracker.{tokenOverview,holders,bundlers,price,ath,trending,chatContext}`. A 30–60s LRU TTL caches responses to protect the API budget. Extraction helpers `BASE58_RE` + `TICKER_RE` drive both the insights panel and the ClawdGuide token-context bridge.

Env: `SOLANA_TRACKER_API_KEY=...`

### 6. CLAWD x402 Solana Facilitator

CLAWD runs its own x402 USDC-on-Solana facilitator at [server/_core/x402Facilitator.ts](./server/_core/x402Facilitator.ts). Supports the full facilitator interface:

| Route | Purpose |
| --- | --- |
| `GET /api/x402/facilitator/supported` | Returns supported schemes/networks (`exact`, `solana`) |
| `POST /api/x402/facilitator/verify` | Verifies an `X-Payment` header against the advertised `accepts[]` requirement |
| `POST /api/x402/facilitator/settle` | Submits the signed USDC transfer, confirms it on-chain, returns a base64 receipt |

Internally `settle()` base64-decodes the payload, extracts the SPL transfer instruction by discriminator (`3`), calls `connection.simulateTransaction` for pre-flight, then `sendRawTransaction` + `confirmTransaction`. Duplicate signatures are treated as success (idempotent).

The facilitator is **multi-tenant**: any signed-in user can register an agent, MCP server, HTTP endpoint, or tool at [/x402 → Monetize](./client/src/pages/X402.tsx) and start accepting USDC per call. Payment requests that include `paymentRequirements.agentSlug` route USDC to the owner's on-file wallet; requests without a slug fall back to the platform treasury (the legacy behavior, unchanged). Platform commission defaults to 10% (floor 5% for users, configurable by admins) and accrues to `payment_events.commissionAtomic` per call. Full guide: [docs/monetize.md](./docs/monetize.md).

Env:

```bash
X402_RECIPIENT_WALLET=...           # Platform treasury / fallback recipient
X402_FEE_PAYER_PRIVATE_KEY=...      # base58, server-side only
X402_NETWORK=mainnet                # or devnet
X402_USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
X402_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
X402_MAX_PER_REQUEST_USD=1.00
X402_MAX_PER_SESSION_USD=10.00
```

#### /x402 — Hardened browser payment flow

[/x402](./client/src/pages/X402.tsx) is the client-side page that handles an HTTP 402 response end to end. It parses the `?requirements=` challenge out of the URL, validates it, asks the connected Solana wallet to sign an x402 payment header, and (on success) prints the base64 header for the retry. A **demo mode** kicks in automatically when the URL carries no challenge so the flow is exercisable without a real 402.

Hardening lives in [client/src/lib/x402.ts](./client/src/lib/x402.ts) — every challenge has to pass:

- `isValidSolanaAddress` (base58, 32–44 chars) for recipient and token mint
- Amount parses as a `BigInt` in `(0, 1_000_000 USDC]` — no zero, no absurd ceilings
- Network ∈ `{solana-mainnet, solana-devnet}`
- Nonce ≥ 8 chars, expiry inside `[-30d, +365d]` (refuses past and far-future challenges)
- Wallet pubkey must be base58 before signing, and the returned Ed25519 signature must be exactly 64 bytes
- Re-sign prevention: once a header is signed the button locks out (nonces are one-shot)

The page also holds a **Monetize / Routing / $CLAWD Holder / History** tab group. Monetize is where users register slugs, set prices, and watch earnings accrue in real time. Routing reuses [client/src/lib/clawdrouter.ts](./client/src/lib/clawdrouter.ts) so the same tier mapping, featured model list, and `CLAWD_HOLDER_TIERS` surface in payment context.

### 6.5 R2 Vault — the "floppy disk" save system

Every signed-in user gets a private slice of the Clawd Cloudflare R2 bucket (`clawd`) keyed under `users/<openId>/…`. A floppy-disk icon appears next to user-generated content (vibe projects, generated art, chats, agents); one click pushes the artifact to R2 and records a row in `saved_items`. A floating launcher bottom-right opens a drawer listing everything stashed, with open / download / share-link / delete per item.

Surfaces:

- [client/src/components/FloppyDiskSave.tsx](./client/src/components/FloppyDiskSave.tsx) — the drop-in icon button
- [client/src/components/SavedVaultDrawer.tsx](./client/src/components/SavedVaultDrawer.tsx) — the drawer + floating launcher
- [client/src/contexts/SavedVaultContext.tsx](./client/src/contexts/SavedVaultContext.tsx) — `useSavedVault().save({ kind, title, blob | url | data })`
- [server/_core/r2.ts](./server/_core/r2.ts) — S3-compat client; every read/write enforces the `users/<openId>/` prefix
- tRPC router `appRouter.storage` — `presignUpload` (≤512 MB PUT), `saveInline` (≤10 MB base64), `list`, `get`, `getDownloadUrl`, `update`, `delete`, plus `status`

Env (R2 token scoped to bucket `clawd`, Object Read & Write):

```bash
CLOUDFLARE_ACCOUNT_ID=2f5db575118d15ec19000e13282201bc
CLOUDFLARE_S3_API=https://2f5db575118d15ec19000e13282201bc.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=clawd
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://vault.solanaclawd.com  # optional
```

Full guide: [docs/r2-vault.md](./docs/r2-vault.md). Migration: [drizzle/0004_saved_items.sql](./drizzle/0004_saved_items.sql).

### 7. ClawdRouter — Pay-Per-Inference Proxy

[`POST /api/clawdrouter/v1/chat/completions`](./server/_core/app.ts) is an OpenAI-compatible proxy that is wired end-to-end with the facilitator:

1. No `X-Payment` header → responds `402` with x402 requirements (`x402Version`, `accepts[]`, `scheme`, `network`, `asset`, `maxAmountRequired`, `payTo`, `resource`, `extra.facilitator`).
2. Header present → calls `x402Facilitator.settle({ header })`.
3. On settlement → forwards to OpenRouter (with [App Attribution](./docs/openrouter-attribution.md) headers) or xAI Grok depending on model.
4. Streams the completion back and emits `X-Payment-Response` with the base64 receipt.

An advertisement endpoint at `GET /api/clawdrouter` publishes the capability card (model list, profiles `ECO/AUTO/PREMIUM`, the 15-dim scorer, tier classification, config + security, OpenRouter attribution).

Live demo: [/router/demo](./client/src/pages/RouterDemo.tsx). The page signs a USDC transfer via `wallet.signTransaction`, base64-encodes it as the `X-Payment` header, and exercises the full 402 → pay → retry loop. The [RouterGuide](./client/src/pages/RouterGuide.tsx) at `/router` now surfaces a prominent **Try Live Demo** callout that deep-links into it.

Connection fix: `Connection(`${window.location.origin}/api/rpc`)` (absolute URL required by `@solana/web3.js`).

#### /clawdrouter — Specialist agents picker + routing UI

[/clawdrouter](./client/src/pages/ClawdRouter.tsx) is the public capability surface for the router. Three tabs:

- **Agents** — live-fetches the 43 registered DeFi/CLAWD specialist personas from [`GET /api/clawdrouter/agents`](./server/_core/app.ts). Searchable by title/tag/description, filterable by category. Clicking a card reveals the full `systemRole`, opening message, opening questions, and a copy-to-clipboard `clawdrouter/agent/<id>` model id that any OpenAI-compatible client can paste into the `model` field.
- **Routing** — ECO/AUTO/PREMIUM profile cards and the tier → model mapping table.
- **Models** — featured-model grid with cost/req, context window, quality score.

Backed by:

| Surface | Purpose |
| --- | --- |
| [server/_core/clawdrouterAgents.ts](./server/_core/clawdrouterAgents.ts) | Whitelist of 43 agent IDs, mtime-cached JSON loader over `agents/src/*.json`, path-traversal guard, `summarizeAgent` for list response |
| `GET /api/clawdrouter/agents` | List endpoint — lightweight summaries only |
| `GET /api/clawdrouter/agents/:id` | Detail endpoint — full record including `config.systemRole` |
| [client/src/lib/clawdrouter-agents.ts](./client/src/lib/clawdrouter-agents.ts) | Browser-safe port: `REGISTERED_AGENT_IDS`, `isAgentModel`, `extractAgentId`, `buildAgentModelId`, `fetchAgentList`, `fetchAgent` |

Ported from the standalone `ClawdRouter-main/clawdrouter/src/agents/` module so the web app and the CLI router agree on identifier, model-id prefix (`clawdrouter/agent/`), and whitelist.

### 7.25 ClawdRouter Tunnel — your Ollama, anywhere you hold $CLAWD

Reverse-WebSocket tunnel so the hosted router can serve requests from the Ollama running on **your** machine. No open ports, no VPN, no second account. One persistent WS dialed out from your laptop to [`wss://clawdrouter.fly.dev/v1/tunnel/connect`](./clawdrouter/src/tunnel/hub.ts); inbound HTTP on `clawdrouter.fly.dev/v1/local/*` is forwarded over the tunnel to your local Ollama and the reply streams back.

Three-tier architecture, deliberately small:

| Host | Role | Source |
| --- | --- | --- |
| [`clawdrouter.x402.workers.dev`](./clawdrouter/src/worker.ts) (Cloudflare Worker) | Control plane — wallet-signed `/v1/enroll/mint`, single-use `/v1/enroll/:token`, hub-secret-gated `/v1/keys/verify`. D1 tables: `api_keys`, `auth_challenges`, `enrollment_tokens` ([migrations](./clawdrouter/migrations/)). | [`src/auth/enroll.ts`](./clawdrouter/src/auth/enroll.ts), [`src/auth/keys.ts`](./clawdrouter/src/auth/keys.ts) |
| [`clawdrouter.fly.dev`](./clawdrouter/src/proxy/server.ts) (Fly.io Node server) | Data plane — WebSocket hub at `/v1/tunnel/connect`, in-memory tenant registry, 5-min verifier cache, `forward(tenantId, req)` with pending-id correlation. | [`src/tunnel/hub.ts`](./clawdrouter/src/tunnel/hub.ts), [`src/tunnel/verify.ts`](./clawdrouter/src/tunnel/verify.ts) |
| Customer laptop (the `clawdrouter` binary) | Spoke — reads `~/.clawd/clawdrouter/device.json`, dials the hub with bearer auth, exp-backoff reconnect, 30s heartbeat, dispatches `req` frames to local Ollama (`/api/tags`, `/v1/chat/completions`). | [`src/tunnel/spoke.ts`](./clawdrouter/src/tunnel/spoke.ts), [`src/device/enroll.ts`](./clawdrouter/src/device/enroll.ts) |

Enrollment UX lives on [`/keys`](./client/src/pages/Api.tsx) via [`WalletKeyMinter`](./client/src/components/WalletKeyMinter.tsx) — **+ New device** button signs an `enroll` challenge, mints a fresh `ck_live_*` key, returns `clawdrouter enroll https://…/v1/enroll/<token>` as a single-use (15-min TTL) install command. On the Ollama host the customer runs:

```bash
clawdrouter enroll https://clawdrouter.x402.workers.dev/v1/enroll/<token>
clawdrouter   # spoke mode — dials hub, holds WSS open
```

From any device carrying the bearer key:

```bash
curl https://clawdrouter.fly.dev/v1/local/models \
  -H "Authorization: Bearer ck_live_…"
# → JSON list of the customer's Ollama models
```

Tests: 7 hub unit tests + 5 end-to-end forward tests ([`tunnel.test.ts`](./clawdrouter/tests/tunnel.test.ts), [`forward.test.ts`](./clawdrouter/tests/forward.test.ts)). Full walkthrough: [`docs/CLAWD_ROUTER_TUNNEL.md`](./docs/CLAWD_ROUTER_TUNNEL.md). Narrative: [`ARTICLE_TUNNELS.md`](./ARTICLE_TUNNELS.md).

**Streaming.** Chat completions with `"stream": true` (or any upstream response that uses chunked transfer / `text/event-stream`) flow chunk-by-chunk through the tunnel as SSE. Detection is automatic on the spoke — the existing handler contract opts between single `res` frame and `res.start/chunk/end` at runtime.

**Remaining v1 limits.** Soft cap ≈ 500 concurrent tunnels per fly machine. No mid-stream cancel — client disconnect stops hub writes but spoke keeps streaming upstream to completion. No request queueing — offline spoke → immediate `503 tunnel_offline`.

### 7.5 Voice — Grok realtime voice agent with screen-aware tools

[/voice](./client/src/pages/Voice.tsx) is a token-gated, browser-native voice chat with Grok. Mic in, audio out, with server-side `web_search` + `x_search` and client-side tools for screen capture and token metrics.

Wire-up:

| Surface | Purpose |
| --- | --- |
| `POST /api/grok/voice/ephemeral-token` | Mints a scoped `client_secret` against `POST https://api.x.ai/v1/realtime/client_secrets`. Session-gated — only authenticated CLAWD holders can drain xAI quota. |
| `WS /ws/grok/voice` | Server-side proxy to `wss://api.x.ai/v1/realtime`. Pre-configures the session with the "clawd" persona, `turn_detection: server_vad`, and the tool roster (web_search, x_search, get_price, get_token_info, look_at_screen). Forwards `response.audio.delta`, text transcripts, and `function_call` events back to the client. |
| `POST /api/grok/vision/describe` | Session-gated Grok vision endpoint. Accepts `data:image/*` or `https://` URLs up to 8MB, returns a short text description. Backs the `look_at_screen` tool so the voice agent can see the user's shared screen. |
| [client/src/lib/voice/realtime.ts](./client/src/lib/voice/realtime.ts) | `VoiceClient` — ephemeral token fetch, mic → PCM16 @ 24kHz capture, base64 audio queue with monotonic playhead, VU meter, tool dispatch, interrupt support. |
| [client/src/lib/voice/screen.ts](./client/src/lib/voice/screen.ts) | `openScreenCaptureSession` holds a `getDisplayMedia` stream across calls, `grab()` returns a scaled JPEG data URL, `describeImage()` POSTs to the vision endpoint. |

The page embeds a [LightweightChart](./client/src/components/LightweightChart.tsx) next to the transcript so the voice agent has something real to look at when you ask it to read the chart back to you. Tools surface in the transcript as `tool` pills so you can see what the agent is calling.

**Session flow for newcomers:** wallet sign-in runs on first click of _Start call_ — `useWalletSignIn` handles challenge → `signMessage` → `/api/auth/verify`, then we trust its own result rather than re-fetching `auth.me` (the `invalidate()` races the cookie write and caused a "no session was created" loop on preview builds).

### 7.9 Monetization Stack — user-owned x402 endpoints end-to-end

Five coordinated layers so any user can charge USDC on Solana for access to their agents, MCP tools, or HTTP endpoints — with commission accrual, a Cloudflare Worker gateway, an SDK, and MPP/x402 dual-protocol support.

| Phase | What | Docs | Code |
| --- | --- | --- | --- |
| 1 | Multi-tenant facilitator + `payment_events` audit log | [monetize.md](./docs/monetize.md) | [server/_core/x402Facilitator.ts](./server/_core/x402Facilitator.ts), [drizzle/schema.ts](./drizzle/schema.ts) |
| 2 | `/x402 → Monetize` tab — register slugs, set prices, watch earnings live | [monetize.md](./docs/monetize.md) | [client/src/components/MonetizeDashboard.tsx](./client/src/components/MonetizeDashboard.tsx), [server/routers.ts](./server/routers.ts) (`monetize` router) |
| 3 | `clawd-x402-proxy` Cloudflare Worker — zero-credential origin gate | [x402-proxy-worker.md](./docs/x402-proxy-worker.md) | [workers/x402-proxy/](./workers/x402-proxy/) |
| 4 | `@solana-clawd/agents-x402` SDK — paid MCP tools + HTTP middleware | [agents-x402-sdk.md](./docs/agents-x402-sdk.md) | [packages/agents-x402-solana/](./packages/agents-x402-solana/) |
| 5 | MPP compatibility — `WWW-Authenticate: Payment` / `Authorization: Payment` / `Payment-Receipt` emitted alongside the x402 headers | [mpp-compatibility.md](./docs/mpp-compatibility.md) | facilitator + Worker + SDK |
| 6 | `pay` agent workflows — sandbox-first paid API calls, Pay MCP for Claude/Codex, provider discovery, and gateway specs | [pay-agents.md](./docs/pay-agents.md) | [agents/src/pay-agent.json](./agents/src/pay-agent.json), [pay-main/](./pay-main/) |

**How a user monetizes in under a minute:**

1. Visit `/x402 → Monetize`, click **Register**, pick a slug + price, paste your Solana wallet as recipient.
2. Choose one:
   * **Any HTTP origin** — edit `workers/x402-proxy/wrangler.jsonc` with your slug + origin, `npx wrangler deploy`. Done.
   * **MCP server** — `pnpm add @solana-clawd/agents-x402`, wrap your server with `withClawdX402({ slug })`, mark paid tools with `server.paidTool(...)`.
   * **Node / Hono / Express** — drop in `honoX402Gate({ slug })` or `expressX402Gate({ slug })`.
3. Clients pay in USDC on Solana. The Clawd facilitator routes the transfer to the owner's wallet, accrues a configurable commission (default 10%, 5% floor for users) to `payment_events.commissionAtomic`, and the Monetize dashboard shows each settlement live with payer wallet, signature, and USD amount.

**Protocol compatibility** — every layer speaks both the legacy x402 headers (`X-Payment` / `X-Payment-Required` / `X-Payment-Response`) and the IETF-track MPP headers (`Authorization: Payment` / `WWW-Authenticate: Payment` / `Payment-Receipt`). Payload schemas are identical across both.

**Env vars (no new secrets — reuses the facilitator's existing env):**

```bash
X402_RECIPIENT_WALLET=...                         # Platform treasury / fallback recipient
X402_FEE_PAYER_PRIVATE_KEY=...                    # Optional: gasless flow
X402_NETWORK=mainnet
X402_USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

Migrations: [drizzle/0005_monetized_agents.sql](./drizzle/0005_monetized_agents.sql). Live Worker: `https://clawd-x402-proxy.x402.workers.dev`. Capability card: `GET /api/x402/facilitator/supported`.

### 8. Styling Pass — Solana Brand + Retro CRT

[client/src/index.css](./client/src/index.css) was retuned to the Solana brand palette (`--color-neon-green: #14F195`, `--color-neon-purple: #9945FF`) with brand-tinted CRT scanlines, a layered purple/green grid overlay, glass panels with a scanline pseudo-element, and a brand scrollbar + selection + focus ring.

### 9. Gateway — Holder Onboarding (Privy + Telegram + X)

[`/gateway`](./client/src/pages/Gateway.tsx) is the single page that turns a verified `$CLAWD` holder into an active operator. It's the production-ready bridge between [`gateway/src/*`](./gateway/src/) (the standalone Telegram bot + Express HTTP API) and the main app.

**Onboarding flow** ([GatewayOnboarding.tsx](./client/src/components/GatewayOnboarding.tsx)) runs as a 5-step badge sequence:

1. **`$CLAWD` holder check** — auto-derived from the unified wallet's `clawdBalance`. The page itself is wrapped in `<TokenGate>`, so non-holders are redirected.
2. **Link Telegram** — `useLoginWithTelegram()` (Privy) opens the Telegram Login Widget pointing at `@clawdprivybot` (its `/setdomain` is bound to `auth.privy.io`, which lets Privy own the OAuth dance).
3. **Link X / Twitter** — `useLoginWithOAuth({ provider: "twitter" })` (Privy) redirects through `https://auth.privy.io/api/v1/oauth/callback` and back.
4. **Provision personal CLAWD agent** — server calls `getOrCreateTelegramSolanaWallet(telegramUserId)` ([privyTelegramBot.ts](./server/_core/privyTelegramBot.ts)) to mint a Privy embedded Solana wallet bound to the holder's Telegram identity, and adds the server's authorization key as a signer.
5. **Join the signal group** — server creates a single-use, 24h-TTL invite link to `TELEGRAM_STREAM_GROUP_ID` (defaults to `-1003338091119`) via Telegram's `createChatInviteLink`, then DMs the holder a welcome from `@clawdprivybot` with the link.

**Backend wiring** ([`gatewayService.ts`](./server/_core/gatewayService.ts) + [`routers.ts`](./server/routers.ts)):

| tRPC procedure | Purpose |
| --- | --- |
| `gateway.health` | Liveness for Helius / Birdeye / Telegram / Supabase + uptime + slot |
| `gateway.configuredWallet` | Default wallet (Solana env / burn-wallet fallback) |
| `gateway.balance / tokens / transactions / assets / slot` | Solana RPC + Helius DAS lookups for any address |
| `gateway.tokenPrice / tokenOverview / search` | Birdeye REST proxies |
| `gateway.streamGroupInfo` | `{ chatId, botUsername, botConfigured, privyConfigured }` |
| `gateway.groupInvite` | Mint single-use `createChatInviteLink` |
| `gateway.onboardHolder` | Legacy raw Telegram-Widget HMAC verification path |
| `gateway.onboardPrivy` | Re-verifies the Privy access token via `verifyAuthToken({ app_id, auth_token })` from `@privy-io/node`, then provisions wallet + invite |
| `gateway.diagnose` | 10-check pipeline status (bot reachable, group accessible, bot is admin, `can_invite_users`, Privy app + auth keys, Twitter OAuth client, Helius RPC, Birdeye API) — surfaces fix hints inline |

**Pipeline diagnostics** ([GatewayDiagnostics.tsx](./client/src/components/GatewayDiagnostics.tsx)) lets the operator click *"Run checks"* to verify every prerequisite end-to-end and shows green/red with a `Fix:` hint per failure (e.g. *"Promote @clawdprivybot to admin in CLAWD Signals"*, *"Set `PRIVY_AUTH_KEY_ID` in .env"*).

**Required env** (additions to [`.env.example`](./.env.example)):

```bash
PRIVY_TELEGRAM_BOT_TOKEN=<from @BotFather>
PRIVY_TELEGRAM_BOT_USERNAME=clawdprivybot
VITE_PRIVY_TELEGRAM_BOT_USERNAME=clawdprivybot
PRIVY_AUTH_KEY_ID=<from dashboard.privy.io → Wallets → Authorization keys>
PRIVY_AUTH_PRIVATE_KEY=wallet-auth:<base64 EC private key>
TWITTER_CLIENT_ID=<OAuth 2.0 client>
TWITTER_CLIENT_SECRET=<OAuth 2.0 secret>
TELEGRAM_STREAM_GROUP_ID=-1003338091119
```

**Operator setup checklist:**

1. `@BotFather` → `/setdomain` for `@clawdprivybot` → `auth.privy.io`
2. `dashboard.privy.io` → Login methods → enable **Telegram** (paste bot username + token) and **Twitter** (paste OAuth 2.0 client + secret)
3. `dashboard.privy.io` → App settings → Domains → add `https://solanaclawd.com` (and any preview domains)
4. Twitter Developer Portal → User authentication settings → Callback URI = `https://auth.privy.io/api/v1/oauth/callback`, Website URL = `https://solanaclawd.com`
5. Add `@clawdprivybot` to the signal group as **admin** with **Invite Users** permission
6. Open `/gateway` → **Run checks** → expect 10/10 green before pushing users at it

### 10. Pop-Out QoL Fixes

- ScrollArea in floating panels: added `min-h-0` to the `flex-1` child (Tailwind flexbox trap) so the scroll container actually scrolls. Code blocks use `wrap-anywhere` + `[&_pre]:overflow-x-auto`.
- Bundle stability: removed `@solana-program/*` from `rollupOptions.external`, added the installed subset to `optimizeDeps.include` in [vite.config.ts](./vite.config.ts). Blank-page regression is fixed.
- Lambda ship: `vercel.json` has `includeFiles: "agents/**"` so `/api/agents/catalog` finds its assets on Vercel, plus `/.well-known/(.*)` → `/api` and a CSP that permits `'unsafe-eval'` for the Telegram widget.

## Sitemap

All routes are SPA — Vercel rewrites `/((?!api).*)` to `index.html` (see [vercel.json](./vercel.json)), so deep links like `/brain`, `/router/demo`, or `/agents/explorer` work identically on `solanaclawd.com` and preview builds. Back buttons use `window.history.back()` with a per-page `backTo` fallback for direct loads.

| Route | Page | Gate | Back target (direct load) |
| --- | --- | --- | --- |
| `/` | [Home](./client/src/pages/Home.tsx) | public | — |
| `/terminal` | [Terminal](./client/src/pages/Terminal.tsx) | $CLAWD | — |
| `/agents` | [AgentGallery](./client/src/pages/AgentGallery.tsx) | public | `/` |
| `/agents/registry` | [AgentRegistry](./client/src/pages/AgentRegistry.tsx) | public | `/agents` |
| `/agents/explorer` | [AgentExplorer](./client/src/pages/AgentExplorer.tsx) — live `mpl-agent-registry` feed via Helius RPC | public | `/agents` |
| `/agents/mint` | [AgentMint](./client/src/pages/AgentMint.tsx) — unified wallet card, no login | public | `/agents` |
| `/agents/:address` | [AgentChat](./client/src/pages/AgentChat.tsx) | public | `/agents` |
| `/agents/hosted/:address` | [AgentChat](./client/src/pages/AgentChat.tsx) — embed shell | public | `/agents` |
| `/agents/gallery` | redirects → `/agents` | — | — |
| `/brain` | [Brain (Clawd's Brain)](./client/src/pages/Brain.tsx) | $CLAWD | `/terminal` |
| `/strategy` | [Strategy](./client/src/pages/Strategy.tsx) | $CLAWD | `/terminal` |
| `/swap` | [Swap](./client/src/pages/Swap.tsx) | $CLAWD | `/` |
| `/store` | [Store](./client/src/pages/Store.tsx) | $CLAWD | `/terminal` |
| `/vibe` | [Vibe](./client/src/pages/Vibe.tsx) — GLM coding studio | $CLAWD | `/` |
| `/predict` | [Predict](./client/src/pages/Predict.tsx) — DFlow + Jupiter markets | $CLAWD | `/terminal` |
| `/orders` | [Orders](./client/src/pages/Orders.tsx) — Trigger / DCA / Swap | $CLAWD | `/terminal` |
| `/pump` | [Pump](./client/src/pages/Pump.tsx) — PumpFun launch monitor | public | `/terminal` |
| `/portfolio` | [Portfolio](./client/src/pages/Portfolio.tsx) | $CLAWD | `/terminal` |
| `/treasury` | [Treasury](./client/src/pages/Treasury.tsx) | $CLAWD | `/terminal` |
| `/gateway` | [Gateway](./client/src/pages/Gateway.tsx) — Privy + Telegram + X holder onboarding, personal CLAWD agent wallet, signal-group invite, pipeline diagnostics | $CLAWD | `/` |
| `/chart/:address?` | [Chart](./client/src/pages/Chart.tsx) + [TokenInsights](./client/src/components/TokenInsights.tsx) | public | `/` |
| `/docs` | [SolanaClawdDocs](./client/src/pages/SolanaClawdDocs.tsx) — includes `#clawdrouter-routing` system diagram | public | `/` |
| `/router` | [RouterGuide](./client/src/pages/RouterGuide.tsx) — build · attribution · agent · API | public | `/` |
| `/router/demo` | [RouterDemo](./client/src/pages/RouterDemo.tsx) — live pay-per-inference demo | public | `/router` |
| `/clawdrouter` | [ClawdRouter](./client/src/pages/ClawdRouter.tsx) — specialist agents picker + routing/models tabs | public | `/` |
| `/x402` | [X402](./client/src/pages/X402.tsx) — hardened HTTP 402 payment flow | public | `/` |
| `/skills` | [Skills Marketplace](./Claw3D-main/src/app/skills/page.tsx) — 25+ AI agent skills for trading, DeFi, analytics | public | `/` |
| `/myskills` | [My Skills](./Claw3D-main/src/app/myskills/page.tsx) — personal skill usage analytics per wallet | $CLAWD | `/` |
| `/voice` | [Voice](./client/src/pages/Voice.tsx) — Grok realtime voice + screen-aware tools | $CLAWD | `/terminal` |
| `/migrate`, `/launch` → `/`, `/home` → `/` | [MigrationGuide](./client/src/pages/MigrationGuide.tsx) + redirects | public | `/` |
| `/office` | [Office (3D)](./client/src/pages/Office.tsx) — React Three Fiber 3D office with agent avatars | public | — |
| `/soul` | [SoulGenerator](./client/src/pages/SoulGenerator.tsx) | public | `/` |
| `/soul/lore` | [SoulLore](./client/src/pages/SoulLore.tsx) | $CLAWD | `/soul` |
| `/callback/auth`, `/auth/callback`, `/terminal/auth/callback` | [AuthCallback](./client/src/pages/AuthCallback.tsx) | public | — |
| `*` | [NotFound](./client/src/pages/NotFound.tsx) | public | — |

### HTTP + tRPC API surface

| Surface | Purpose |
| --- | --- |
| `GET /api/clawdrouter` | Capability card for the router (now advertises specialist-agent count + list URL) |
| `POST /api/clawdrouter/v1/chat/completions` | x402-gated pay-per-inference proxy (OpenAI-compatible) |
| `GET /api/clawdrouter/agents` | List the 43 specialist agents (summary shape, for pickers) |
| `GET /api/clawdrouter/agents/:id` | Full specialist record including `config.systemRole` |
| `GET /api/x402/facilitator/supported` | Facilitator scheme/network advertisement |
| `POST /api/x402/facilitator/verify` | Verify an `X-Payment` header |
| `POST /api/x402/facilitator/settle` | Submit + confirm a USDC payment |
| `GET /api/voice/session` | Grok voice session capability card (ephemeral token URL, proxy URL, pre-wired remote MCP servers) |
| `POST /api/grok/voice/ephemeral-token` | Mint a short-lived xAI `client_secret` — session-gated |
| `WS /ws/grok/voice` | Server-side proxy to `wss://api.x.ai/v1/realtime` with the "clawd" session pre-configured |
| `POST /api/grok/vision/describe` | Grok vision backing for `/voice`'s `look_at_screen` tool — session-gated |
| `POST /api/grok/record` | Append a ClawdGuide exchange into Honcho per wallet |
| `POST /api/zai/chat/stream` | GLM streaming endpoint for Vibe |
| `GET /api/agents/catalog` | Bundled agent catalog (multi-candidate path resolution, Vercel `includeFiles: "agents/**"`) |
| `trpc.mintAgent` | Public mint mutation (accepts `walletAddress`, validates UTF-8 byte lengths, auto-pins oversized URIs) |
| `trpc.agent.brain` | Owner-scoped Honcho brain snapshot |
| `trpc.metaplex.recentAgents` | Helius-sourced live feed for `/agents/explorer` |
| `trpc.wallet.verifyHolder` | Shared holder check (gates `/brain`, `/vibe`, ClawdGuide) |
| `trpc.solanaTracker.*` | `tokenOverview`, `holders`, `bundlers`, `price`, `ath`, `trending`, `chatContext` |

### Featured on-chain agents

| Agent | Address |
| --- | --- |
| CLAWD Agent | see `/agents` Featured strip |
| ClawdFather | see `/agents` Featured strip |
| Агент-снайпер | see `/agents` Featured strip |

**Categorized top nav.** Every page (including the Home landing page) now shares a single [NavHeader](./client/src/components/NavHeader.tsx) with four Radix dropdown categories driven by [nav-categories.tsx](./client/src/components/nav-categories.tsx):

- **Trade** — Swap · Orders · Predict · Pump · Charts · Portfolio · Treasury · Store · Strategy
- **Agents** — Agent Hub · Gallery · Registry · Explorer · Mint
- **Studio** — Soul Gen · Soul Lore · Vibe · Brain
- **Router** — ClawdRouter · Router Demo · x402 Payment · Clawd Docs · Migrate

The header highlights the active category and the active item; an always-visible **ENTER** CTA takes the operator to `/terminal`. On mobile, the menu switches to a two-column grid per category. Pages inside the Agents section additionally render a shared [AgentSubNav](./client/src/components/AgentSubNav.tsx) pill strip (HUB · GALLERY · REGISTRY · MINT · EXPLORER · BRAIN) as a breadcrumb/switcher; [AgentCatalog](./client/src/components/AgentCatalog.tsx) exposes a sticky `ONE-SHOT · TEMPLATES · LIBRARY` tab strip with live counts that anchor-jumps between the three catalog sections. The Terminal sidebar continues to surface the full operator toolbelt (Agent Gallery, Agent Registry, Agent Explorer, Mint Agent, Clawd's Brain, Strategy Builder, Swap, Store).

**Agent Explorer.** [/agents/explorer](./client/src/pages/AgentExplorer.tsx) is a live feed of newly registered agents on the Metaplex `mpl-agent-registry` program. The server streams recent program signatures via Helius RPC ([`umi.rpc.call('getSignaturesForAddress', …)`](./server/_core/metaplexAgent.ts)), derives the Core asset for each transaction by checking which `accountKey`'s `findAgentIdentityV1Pda` is also present in that same transaction (no extra RPC for discovery), then enriches each hit via `fetchAsset` + `findAssetSignerPda` + the registration document. Exposed through `trpc.metaplex.recentAgents` and auto-refreshed every 30s in the UI.

## SOUL Engine

The `solana-clawd` prompt stack is designed as a two-part engine:

- [SOUL.md](./SOUL.md) is the stable identity, epistemology, and permission layer
- [SOUL_TEMPLATE.md](./SOUL_TEMPLATE.md) is the user-facing specialization template that gets paired with it

If you are running on Grok, use the companion guide at [docs/grok-prompting.md](./docs/grok-prompting.md) to keep the `SOUL.md` prefix stable and move only live task context into the user prompt.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Production build:

```bash
pnpm build
pnpm start
```

## One-Shot Bootstrap

For E2B shells, non-root terminals, fresh Linux boxes, cloud dev environments, and agent sandboxes:

```bash
bash scripts/bootstrap.sh
```

What it does:

* checks Node 20+
* installs Go locally if `go` is missing
* installs SolanaOS
* clones `solana-clawd`
* creates `.env` from `.env.example` if needed
* runs `npm run setup`

After bootstrap, reload your shell and start SolanaOS:

```bash
source ~/.bashrc
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

---

## Environment

Use [`.env.example`](./.env.example) as the deployment template. The runtime currently expects:

- Public domains: `PUBLIC_PAGES_URL=https://beepboop-solanaclawd.pages.dev`, `PUBLIC_APP_URL=https://beepboop.solanaclawd.com`, `PUBLIC_AGENT_BASE_URL=https://solanaclawd.com`, `PUBLIC_AGENT_GALLERY_URL=https://solanaclawd.com/agents`, `PUBLIC_AGENT_A2A_URL=https://solanaclawd.com/api/agents/a2a`, `PUBLIC_AGENT_API_URL=https://solanaclawd.com/api/agents`, `PUBLIC_AGENT_MCP_URL=https://mcp.solanaclawd.com`, `PUBLIC_PUMP_SCANNER_URL=https://pump-scanner-cron.x402.workers.dev`, `PUBLIC_CLAWD_TOKEN_URL=https://beepboop.solanaclawd.com/chart?address=8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
- App/auth: `DATABASE_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `PHANTOM_APP_ID`, `VITE_PHANTOM_APP_ID`, `VITE_REOWN_PROJECT_ID`
- Solana: `HELIUS_API_KEY`, `HELIUS_RPC_URL`, `BIRDEYE_API_KEY`, `VITE_CLAWD_TOKEN_ADDRESS`
- DFlow: `DFLOW_API_KEY`, `DFLOW_TRADING_API_BASE_URL=https://quote-api.dflow.net`, `DFLOW_PREDICTION_API_BASE_URL=https://dev-prediction-markets-api.dflow.net`, `DFLOW_PRIORITY_FEES_WS_URL` (optional override)
- Social: `TELEGRAM_BOT_TOKEN`, `TWITTER_BEARER_TOKEN`
- AI/image: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_EL=openrouter/elephant-alpha`, `DEFAULT_CHAT_MODEL=openrouter/elephant-alpha`, `XAI_API_KEY`, `XAI_BASE_URL=https://api.x.ai/v1`, `XAI_TEXT_MODEL=grok-4.20-reasoning`, `XAI_IMAGE_MODEL=grok-imagine-image`, `XAI_VIDEO_MODEL=grok-imagine-video`, `FAL_API_KEY`, `GATEWAY_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `LOCAL_AGENT_GATEWAY_URL`, `LOCAL_AGENT_GATEWAY_API_KEY`, `LOCAL_AGENT_GATEWAY_MODEL`, `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`, `OLLAMA_API_KEY=ollama`, `OLLAMA_MODEL=llama3.1:8b`
- MiniMax studio: `MINIMAX_CODING_TOKEN`, `MINIMAX_BASE_URL=https://api.minimax.io/v1`, `MINIMAX_TEXT_MODEL=MiniMax-M2.7`, `MINIMAX_SPEECH_MODEL=speech-2.8-hd`, `MINIMAX_SPEECH_VOICE_ID=English_expressive_narrator`
- Media models: `FAL_SEE_TEXT_MODEL`, `FAL_SEE_IMAGE_MODEL`, `MINIMAX_API_KEY`, `MINI_MUSIC_MODEL`, `FAL_MUSIC_MODEL`
- E2B: `E2B_API_KEY`, `GIT_USERNAME`, `GIT_TOKEN`, `OPENCLAW_APP_TOKEN`

---

## What is Included

### SolanaOS

SolanaOS is the Go-native operator runtime. The canonical install path is:

```bash
npx solanaos-computer@latest install --with-web
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos version
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

You can also run it locally from source:

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd solanaos
cp .env.example .env
bash start.sh
```

### solana-clawd

solana-clawd is the Grok-powered agentic layer for:

* chat, vision, image generation, voice
* multi-agent research and structured outputs
* MCP tools and Solana market intelligence
* creative and meme workflows

### Solana Trading Plugin

Install the **solana-trader** plugin to add Jupiter swap execution, portfolio tracking, and pump.fun launch capabilities to your terminal.

```bash
npx skills add https://github.com/solana-clawd/openclaw-solana-plugins --skill solana-trader
```

Or install via skills.sh:

```bash
npx skills add https://skills.sh/solana-clawd/openclaw-solana-plugins/solana-trader
```

> Browse all available plugins at [skills.sh/solana-clawd](https://skills.sh/solana-clawd)

### E2B

E2B provides:

* secure code sandboxes
* Linux desktop sandboxes for computer use
* prebuilt templates for **Claude Code**, **OpenCode**, and **OpenClaw**
* pause/resume persistence
* list/connect lifecycle management
* controlled outbound networking
* git helpers
* Python code execution with chart and result streaming

---

## Service Ports

| Service                   |  Port | Start path                               |
| ------------------------- | ----: | ---------------------------------------- |
| SolanaOS daemon / gateway | 18790 | `bash start.sh` or `solanaos daemon`     |
| SolanaOS Control UI       |  7777 | `solanaos server`                        |
| Agent Wallet              |  8421 | auto-started by `start.sh` or standalone |
| solanaos-mcp              |  3001 | auto-started by `start.sh`               |
| control-api               | 18789 | standalone control API                   |

---

## E2B-Native Workflows

### 1. Desktop Computer Use

For GUI agents, E2B Desktop gives you an Ubuntu/XFCE desktop with screenshot, mouse, keyboard, and VNC streaming support.

```bash
npm i @e2b/desktop
```

```ts
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

```ts
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

```ts
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

```ts
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

### 5. Persistence, Pause, Resume

E2B sandboxes can be paused and resumed with filesystem and memory state preserved.

```ts
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create();
await sandbox.pause();

const resumed = await Sandbox.connect(sandbox.sandboxId);
```

### 6. List and Reconnect

```ts
import { Sandbox } from "e2b";

const paginator = Sandbox.list({
  query: { state: ["running", "paused"] },
});

const items = await paginator.nextItems();
const sbx = await Sandbox.connect(items[0].sandboxId);
```

### 7. Internet Controls

```ts
import { Sandbox, ALL_TRAFFIC } from "e2b";

const sandbox = await Sandbox.create({
  network: {
    allowOut: ["api.example.com", "*.github.com"],
    denyOut: [ALL_TRAFFIC],
  },
});
```

### 8. Git Integration

```ts
await sandbox.git.clone("https://github.com/your-org/your-repo.git", {
  path: "/home/user/repo",
  username: "x-access-token",
  password: process.env.GITHUB_TOKEN,
  depth: 1,
});
```

### 9. Code Interpreter

```bash
npm i @e2b/code-interpreter
```

```ts
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

### 10. Preinstalled Python Stack

The E2B data sandbox includes pandas, matplotlib, numpy, openpyxl, plotly, scikit-learn, scipy, pillow, and python-docx.

---

## E2B API Endpoints

This terminal exposes E2B sandbox management through both tRPC and REST:

### tRPC (via `trpc.e2b.*`)

| Procedure       | Type     | Description                        |
| --------------- | -------- | ---------------------------------- |
| `e2b.create`    | mutation | Create a sandbox (template, envs)  |
| `e2b.list`      | query    | List running/paused sandboxes      |
| `e2b.connect`   | mutation | Reconnect to a sandbox by ID       |
| `e2b.pause`     | mutation | Pause a sandbox                    |
| `e2b.resume`    | mutation | Resume a paused sandbox            |
| `e2b.kill`      | mutation | Kill a sandbox                     |
| `e2b.run`       | mutation | Execute a command in a sandbox     |
| `e2b.writeFile` | mutation | Write a file inside a sandbox      |
| `e2b.readFile`  | query    | Read a file from a sandbox         |
| `e2b.gitClone`  | mutation | Clone a repo into a sandbox        |
| `e2b.getUrl`    | query    | Get public URL for a sandbox port  |

### REST

| Method | Path                 | Description                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/e2b/create`    | Create a sandbox                   |
| GET    | `/api/e2b/list`      | List sandboxes                     |
| POST   | `/api/e2b/run`       | Run a command                      |
| POST   | `/api/e2b/pause`     | Pause a sandbox                    |
| POST   | `/api/e2b/resume`    | Resume a sandbox                   |
| POST   | `/api/e2b/kill`      | Kill a sandbox                     |
| POST   | `/api/e2b/write-file`| Write a file                       |
| POST   | `/api/e2b/read-file` | Read a file                        |
| POST   | `/api/e2b/git-clone` | Clone a repo                       |
| GET    | `/api/e2b/url`       | Get sandbox port URL               |

---

## DFlow Setup (Complete)

This repo now includes a first-class DFlow integration in the server tRPC layer.

### 1) Environment

Add these to your `.env` (or `.env.local`):

```bash
DFLOW_API_KEY=your_dflow_api_key
DFLOW_TRADING_API_BASE_URL=https://quote-api.dflow.net
DFLOW_PREDICTION_API_BASE_URL=https://dev-prediction-markets-api.dflow.net
# Optional; auto-derived from trading base URL when omitted
DFLOW_PRIORITY_FEES_WS_URL=
```

### 2) tRPC Routes

All DFlow routes are mounted at `trpc.dflow.*`.

- `dflow.status`
- `dflow.trading.priorityFees`
- `dflow.trading.priorityFeesStreamInfo`
- `dflow.trading.predictionMarketInit`
- `dflow.trading.tokens`
- `dflow.trading.tokensWithDecimals`
- `dflow.trading.venues`
- `dflow.metadata.tagsByCategories`
- `dflow.metadata.filtersBySports`
- `dflow.metadata.series`
- `dflow.metadata.seriesByTicker`
- `dflow.metadata.events`
- `dflow.metadata.event`
- `dflow.metadata.searchEvents`
- `dflow.markets.markets`
- `dflow.markets.market`
- `dflow.markets.marketByMint`
- `dflow.markets.marketsBatch`
- `dflow.markets.outcomeMints`
- `dflow.orderbook.byMarketTicker`
- `dflow.orderbook.byMint`
- `dflow.trades.list`
- `dflow.trades.byMint`
- `dflow.trades.onchain`
- `dflow.trades.onchainByEvent`
- `dflow.trades.onchainByMarket`
- `dflow.liveData.byMilestones`
- `dflow.liveData.byEvent`
- `dflow.liveData.byMint`
- `dflow.candlesticks.event`
- `dflow.candlesticks.market`
- `dflow.candlesticks.marketByMint`
- `dflow.forecastHistory.byEvent`
- `dflow.forecastHistory.byMint`
- `dflow.proxy` (protected passthrough for advanced calls)

### 3) Runtime Visibility

`trpc.system.runtime` now includes a `dflow` block with API key presence and configured base URLs.

### 4) Smoke Test

Run:

```bash
pnpm dflow:smoke
```

The smoke script validates both trading + prediction endpoints and attempts a priority-fees websocket handshake.

---

## Burn + Lock Mechanism v2.0

**Hardened gasless $CLAWD burn system** with a dedicated treasury wallet for sponsored message burns, shared pricing, and on-chain burn tracking. The manual burn tab remains a self-burn flow signed by the user's wallet. The lock UI is present, but Streamflow lock creation is not wired end-to-end yet.

### Security Properties

| Property | Implementation |
|----------|----------------|
| **Zero Key Exposure** | User wallets never share private keys; treasury signing stays server-side and isolated |
| **Gasless Burn Mode** | Chat/action burn mode spends treasury SOL and treasury CLAWD, so the user does not need SOL for those burns |
| **Irreversible Burns** | Two-step confirmation with clear irreversibility warning |
| **Auditable** | Burns are visible on-chain and reflected in the scoreboard/history queries |
| **Shared Pricing** | Client burn mode and server pricing endpoint use the same tier map and USD costs |
| **Treasury Hardening** | Sponsored burns derive amount server-side, require a token-gated wallet, and enforce replay/rate-limit guards |

## Privy Gas Sponsorship Rate Limits

Clawd now wraps Privy gas sponsorship with server-side custom spend controls so supported site actions can run without asking users to pay transaction fees. The sponsor decision is made server-side before calling Privy's wallet RPC and is recorded only after the sponsored transaction submits successfully.

Default daily caps:

| Meter | Default | Env override |
|-------|---------|--------------|
| Per wallet | `$2.00` | `GAS_SPONSOR_WALLET_DAILY_CENTS` |
| Per user | `$5.00` | `GAS_SPONSOR_USER_DAILY_CENTS` |
| Whole app | `$100.00` | `GAS_SPONSOR_APP_DAILY_CENTS` |

The gate also requires the connected wallet to hold `$CLAWD` by default. Override with `GAS_SPONSOR_CLAWD_REQUIRED=false` for testing or set `GAS_SPONSOR_MIN_CLAWD` to tune the holder floor. Chain estimates default to Base at `$0.05`, Solana at `$0.01`, and Ethereum at `$1.00`; override a chain with an env var like `GAS_SPONSOR_COST_EIP155_8453_CENTS=10`.

Runtime surfaces:

- `trpc.gasSponsor.status` returns the public policy, current spend, and estimated chain cost.
- `trpc.gasSponsor.privyRpc` sends supported Privy wallet RPC calls with `sponsor: true` only when the `$CLAWD` gate and wallet/user/app caps pass.
- `trpc.burn.sponsoredBurn` shares the same gas-sponsorship meter before treasury-sponsored burns execute.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAWD Burn + Lock v2.0                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  User Browser    │    │         Server-side               │  │
│  │  ┌────────────┐  │    │  ┌────────────────────────────┐  │  │
│  │  │TokenActions│  │    │  │ Sponsored burn router      │  │  │
│  │  │Burn Mode   │  │    │  │ - derives cost server-side │  │  │
│  │  └──────┬─────┘  │    │  │ - verifies token gate      │  │  │
│  │         │        │    │  │ - signs with treasury      │  │  │
│  └─────────┼────────┘    │  └──────────────┬─────────────┘  │  │
│            │             │                 │                │  │
│            ▼             │         ┌───────▼────────┐       │  │
│     ┌────────────┐       │         │ Birdeye /      │       │  │
│     │ User wallet│       │         │ DexScreener    │       │  │
│     │ self-burns │       │         │ price oracle   │       │  │
│     │ only       │       │         └────────────────┘       │  │
│     └─────┬──────┘       │                    │              │  │
│           │              │                    ▼              │  │
│           ▼              │             ┌──────────┐          │  │
│    ┌──────────────┐      │             │Streamflow│          │  │
│    │ Solana       │      │             │ Locks /  │          │  │
│    │ Mainnet      │      │             │ Vesting  │          │  │
│    │ (On-chain)   │      │             └──────────┘          │  │
│    └──────────────┘      │                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

**`client/src/components/TokenActions.tsx`**
- User-initiated self-burn UI
- Mode toggle: BURN vs LOCK/VEST tabs
- Uses the active Solana wallet adapter signer
- VersionedTransaction burn with ComputeBudget priority fee
- Two-step burn confirmation with irreversibility warning
- Lock mode currently collects intent only and does not submit a Streamflow transaction

**`client/src/contexts/BurnModeContext.tsx`**
- Session burn tracking and price oracle
- Uses a protected server-side sponsored burn path for burn mode
- Tracks `totalBurnedSession`, `clawdPriceUsd`, and sponsored burn availability

**`scripts/maintenance.ts`**
- Server-side maintenance script
- Operations: `closeEmptyATAs`, `burnClawdSecurely`, `createClawdLockOrVesting`
- Uses `MAINTENANCE_WALLET_SECRET_KEY` from `.env`

### Burn Mode UI

The Terminal page (`client/src/pages/Terminal.tsx`) includes a burn tab with:

- **TokenActions**: Burn/Lock interface with amount input, MAX button, preset amounts (100, 1K, 10K, 100K)
- **BurnScoreboard**: Community burn statistics and leaderboard

### Streamflow Status

The lock/vest panel is currently a UI placeholder for a future Streamflow integration. It does not create on-chain locks yet, so the hardened lock guarantees below are design targets rather than live behavior.

### Setup Instructions

1. **Environment Variables**
```bash
# Required for Burn + Lock v2.0
VITE_CLAWD_TOKEN_ADDRESS="8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"
BURN_WALLET_TREASURY="GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4"
BURN_WALLET_TREASURY_PRIVATE_KEY="your-base58-encoded-private-key"
AGENT_MINT_BURN_COST_USD="0.05"
BIRDEYE_API_KEY="your-birdeye-api-key"
HELIUS_API_KEY="your-helius-api-key"
HELIUS_RPC_URL="your-helius-rpc-url"
HELIUS_WALLET_API_BASE="https://wallet-api.helius.xyz"

# Optional maintenance wallet for server-side ops only
MAINTENANCE_WALLET_SECRET_KEY="your-base58-encoded-private-key"
```

2. **Database Setup**
```bash
pnpm drizzle:push
```

3. **Run Maintenance Script** (optional)
```bash
npx tsx scripts/maintenance.ts --operation=burnClawdSecurely --amount=1000
```

### Burn Transaction Flow

```
1. User enables burn mode or triggers a priced burn action
2. Server derives the exact burn cost from the selected model/action
3. Server re-verifies the caller's CLAWD holding and enforces replay/rate-limit guards
4. Treasury wallet signs and submits the burn transaction
5. On-chain burn executes from the treasury wallet
6. UI updates session stats and refreshes scoreboard/history
```

### Agent Mint Treasury Burn

```
1. User successfully mints or one-shot deploys a Metaplex agent
2. Server computes AGENT_MINT_BURN_COST_USD worth of CLAWD using live price data
3. Treasury wallet burns that CLAWD on-chain
4. Mint response includes the treasury burn details when successful
```

### Manual Self-Burn Flow

```
1. User inputs burn amount (100, 1K, 10K, 100K presets or custom)
2. User clicks "BURN CLAWD"
3. Confirmation modal displays the irreversible self-burn warning
4. User signs the transaction in their wallet
5. On-chain burn executes from the user's own token account
```

### Lock/Vest Flow Status

```
1. User selects LOCK tab
2. User inputs:
   - Amount to lock
   - Recipient address (or self)
   - Cliff percentage (0-100%)
   - Duration (30/90/180/365 days)
3. User clicks "CREATE LOCK"
4. The UI currently shows the intended Streamflow design and does not submit an on-chain lock transaction
```

### API Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/api/rpc` | POST | Proxied Solana RPC (hides API key) |
| `trpc.burn.pricing` | Query | Real-time CLAWD pricing and costs |
| `trpc.burn.walletBalances` | Query | Token balances via Helius DAS |
| `trpc.burn.burnHistory` | Query | On-chain burn transaction history |
| `trpc.burn.scoreboard` | Query | Aggregate burn statistics |
| `trpc.burn.walletIdentity` | Query | Wallet ENS/SNS lookup |

### Security Considerations

- **No server-side key exposure**: Helius API key proxied through `/api/rpc`
- **User signature required for self-burns only**: Manual burns require explicit wallet approval; sponsored burn mode does not
- **Irreversibility warning**: Two-step confirmation for burns
- **Treasury isolation**: Sponsored burns derive pricing server-side and never accept arbitrary client-provided burn amounts
- **Lock UI is not live yet**: Do not assume Streamflow locks are being created until that integration lands
- **On-chain audit**: All burns visible on Solana

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Burn transaction failed" | For self-burns, check wallet connection and ensure SOL for gas; for burn mode, check treasury config and token-gate status |
| "Insufficient balance" | Acquire more $CLAWD tokens |
| "Price unavailable" | Birdeye API rate-limited, wait for refresh |
| "Phantom not connected" | Install Phantom extension, connect wallet |

---

## Recommended Operator Flow

### Fastest

```bash
bash scripts/bootstrap.sh
source ~/.bashrc
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
cd ~/src/solana-clawd && npm run demo
```

### Full Local

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd solanaos
cp .env.example .env
bash start.sh
```

### E2B Coding Agent

```bash
e2b sbx create opencode
opencode
```

### E2B Claude Code

```bash
e2b sbx create claude
claude
```

### E2B OpenClaw

```bash
e2b sbx create openclaw
openclaw
```

---

## API Keys

CLAWD supports programmatic access via API keys for both users and agents. Keys use `clawd_sk_` prefix, SHA-256 hashed storage, and scope-based access control.

### Create a Key

```bash
# Via tRPC (browser session or existing API key)
curl -X POST https://your-app.com/trpc/apiKey.create \
  -H "Content-Type: application/json" \
  -H "Cookie: solana_session=<jwt>" \
  -d '{"json":{"name":"my-bot","scopes":["chat:read","chat:write"]}}'
```

The full key (`clawd_sk_...`) is returned **once** — store it securely.

### Use a Key

```bash
curl https://your-app.com/trpc/chat.send \
  -H "Authorization: Bearer clawd_sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"json":{"message":"hello"}}'
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `chat:read` | Read chat history |
| `chat:write` | Send messages |
| `image:generate` | Generate images |
| `agent:manage` | Create/update agents |
| `e2b:manage` | Manage E2B sandboxes |
| `burn:execute` | Execute sponsored burns |
| `admin` | Full admin access (owner only) |

### Agent Keys

Pass `agentWalletId` when creating a key to scope it to a specific agent wallet. Agent keys can only access resources associated with that agent.

### tRPC Routes

| Route | Type | Description |
|-------|------|-------------|
| `apiKey.create` | mutation | Create a new API key (max 10 per user) |
| `apiKey.list` | query | List your keys (prefix only, no secrets) |
| `apiKey.revoke` | mutation | Revoke a key by ID |
| `apiKey.usage` | query | Get usage stats for a key |
| `apiKey.scopes` | query | List all available scopes |

### Migration

```bash
# Apply the API keys migration
psql $DATABASE_URL < drizzle/0003_api_keys.sql
```

### Security Notes

- Keys are SHA-256 hashed before storage — the full key is never persisted
- Only the key prefix (`clawd_sk_xxxx...`) is stored for identification
- Expired keys are rejected at validation time
- All key usage is logged to `api_key_audit_log` for forensics
- Max 10 keys per user to prevent abuse

---

## Deploy

### clawd-terminal (Main App)

This app can be deployed as a single Node service:

- Build command: `pnpm build`
- Start command: `pnpm start`
- Port: `PORT`

Railway or Fly.io. The existing `fly.toml` targets app `clawd-terminal` in `ewr`.

```bash
# Deploy main app to Fly.io
fly deploy
```

### ClawdRouter (API Proxy)

ClawdRouter deploys as a separate Fly.io service — the OpenAI-compatible LLM proxy with smart routing, $CLAWD token gating, and API key auth.

```bash
cd clawdrouter

# Build TypeScript
npm run build

# Deploy to Fly.io
fly deploy
```

**Required secrets** (set via `fly secrets set`):

```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  DATABASE_URL=postgresql://... \
  HELIUS_API_KEY=... \
  CLAWDROUTER_INTERNAL_SECRET=your-shared-secret \
  CLAWDROUTER_VALIDATION_URL=https://clawd-terminal.fly.dev
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Routes to 55+ models via OpenRouter |
| `DATABASE_URL` | Yes* | Direct API key validation (same Neon DB) |
| `CLAWDROUTER_VALIDATION_URL` | Yes* | Or validate keys via main app's `/api/auth/validate-key` |
| `CLAWDROUTER_INTERNAL_SECRET` | Yes | Shared secret between router ↔ main app |
| `HELIUS_API_KEY` | No | For $CLAWD holder tier checks |

*One of `DATABASE_URL` or `CLAWDROUTER_VALIDATION_URL` is required for API key auth.

**Hosted mode behavior:**
- `x402` literal auth is disabled — users must use `clawd_sk_` API keys
- Rate limits: 1000 req/hr for API key users, tier-based for wallet auth
- All requests to `/v1/chat/completions` require authentication
- Health, models, and status endpoints remain public

**Usage after deployment:**

```bash
# With your API key from clawd-terminal
curl https://clawdrouter.fly.dev/v1/chat/completions \
  -H "Authorization: Bearer clawd_sk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"clawdrouter/auto","messages":[{"role":"user","content":"Hello"}]}'

# Or point any OpenAI-compatible client
client = OpenAI(base_url="https://clawdrouter.fly.dev/v1", api_key="clawd_sk_...")
```

## Docs

### Project docs

- [SOUL.md](./SOUL.md) — stable identity, epistemology, and permission layer
- [SOUL_TEMPLATE.md](./SOUL_TEMPLATE.md) — user-facing specialization template
- [TRADE.md](./TRADE.md) — Pump.fun trading agent skill (OODA loop, position sizing, guardrails)
- [docs/grok-prompting.md](./docs/grok-prompting.md) — keep the SOUL prefix stable on Grok
- [docs/ipfs-setup.md](./docs/ipfs-setup.md)
- [docs/migrate-from-openclaw.md](./docs/migrate-from-openclaw.md) — migrate legacy configs

### ClawdRouter docs

The ClawdRouter is the unified, token-gated, x402-aware LLM + Solana routing layer. Every endpoint checks `$CLAWD` holder status (Helius DAS) and falls back to x402 USDC payments on Solana.

- **[docs/CLAWD_ROUTER.md](./docs/CLAWD_ROUTER.md)** — full public API reference: the 10 `/api/solana-clawd/*` routes (chat, image, video, tts, stt, voice-token, voices, research, agentic, mcp-tools), auth contract, error shapes, env vars.
- **[docs/CLAWD_ROUTER_BUILD.md](./docs/CLAWD_ROUTER_BUILD.md)** — source-file templates for rebuilding the router from scratch: `lib/solana-clawd.ts`, `lib/solana-clawd-server.ts`, the per-route handler template, `.env.example`.
- **[docs/clawdrouter-agent-guide.md](./docs/clawdrouter-agent-guide.md)** — integration contract for Claude Code / Copilot / any AI agent calling the router (wallet-address convention, `clawd` metadata block, streaming pattern, xAI tool shapes).
- **[docs/openrouter-attribution.md](./docs/openrouter-attribution.md)** — headers the router sends on OpenRouter calls so the app appears on [openrouter.ai/rankings](https://openrouter.ai/rankings) (HTTP-Referer, X-OpenRouter-Title, X-OpenRouter-Categories, X-Title), recommended categories, localhost + privacy notes.

Mirror copies ship alongside the router package at [clawdrouter copy/docs/](./clawdrouter%20copy/docs/) (`api-reference.md`, `build.md`, `agent-guide.md`, `openrouter-attribution.md`, `architecture.md`, `configuration.md`, `routing-profiles.md`).

### In-app surfaces for the router

- **[/router](./client/src/pages/RouterGuide.tsx)** — 4-tab interactive guide: **Build** · **Attribution** · **Agent** · **API**. Covers the full rebuild walkthrough, OpenRouter attribution headers/categories/repo references, the agent integration rules (clawd metadata, gating pattern, streaming pattern), and the endpoint map + access-control model.
- **[/router/demo](./client/src/pages/RouterDemo.tsx)** — live routing playground.
- **[/x402](./client/src/pages/X402.tsx)** — hardened HTTP 402 payment flow. Parses `?requirements=<base64>` from the URL, validates schema + USDC mint + expiry + per-request limits, signs via the active unified wallet, and keeps a local payment history. Backed by [client/src/lib/x402.ts](./client/src/lib/x402.ts) (browser-safe `x402FetchWithRetry`, `createPaymentHeader`, `parsePaymentRequirements`, `X402Error`) and [client/src/lib/clawdrouter.ts](./client/src/lib/clawdrouter.ts) (profile + tier + holder-tier snapshots).
- **[/docs](./client/src/pages/SolanaClawdDocs.tsx)** — the broader solana-clawd docs hub includes a `#clawdrouter-agent` section that links out to all four router markdown docs and back to `/x402`.

---

## Google Merchant Center Feed

The `/store` catalog is wired end-to-end to Google Merchant Center so SKUs can
be indexed, surfaced in Shopping, and validated against Google's product spec.

**Source of truth.** [`shared/storeCatalog.ts`](./shared/storeCatalog.ts) defines
every SKU. The client store page ([`client/src/pages/Store.tsx`](./client/src/pages/Store.tsx))
and the Merchant Center feed generator both import it, so the feed can never
drift from what's rendered.

**On-page verification.** Google Search Console's site-verification meta tag is
embedded in [`client/index.html`](./client/index.html#L13). `/store` also injects
runtime `Open Graph`, Twitter Card, `<link rel="canonical">`, and a
[schema.org `CollectionPage` + `ItemList` of `Product`/`Offer` nodes](https://schema.org/Product)
built from the catalog.

### Commands

| Command              | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `pnpm feed:build`    | Emit `.build/merchant/clawd-store-feed.xml` (RSS 2.0 + `g:` ns)   |
| `pnpm feed:upload`   | SFTP the latest build to `partnerupload.google.com`               |
| `pnpm feed:publish`  | `feed:build && feed:upload` — use this in CI                      |

### Merchant environment

```dotenv
MERCHANT_SERVER=partnerupload.google.com
MERCHANT_PORT=19321
MERCHANT_USERNAME=mc-sftp-XXXXXXXXXX
MERCHANT_PW=<merchant-center-issued password>
MERCHANT_FINGERPRINT=<base64 SHA-256 of server host key>
MERCHANT_GOOGLE_CLOUD_BUCKET=merchantcenterXXXXXXXXXX
MERCHANT_SITE_URL=https://clawd.app
MERCHANT_BRAND=CLAWD
MERCHANT_SHIPPING_COUNTRY=US
MERCHANT_REMOTE_FILENAME=clawd-store-feed.xml
```

`MERCHANT_FINGERPRINT` is pinned via the uploader's `hostVerifier` so the SFTP
session refuses to authenticate if the host key changes. Credentials are
provisioned in Merchant Center → **Data sources → SFTP/GCS**.

### Upload safety

[`scripts/merchant-upload.ts`](./scripts/merchant-upload.ts) uploads to a
temporary `<filename>.uploading` path and renames into place once the transfer
completes, so Google's feed crawler never observes a half-written file.

### Registering the feed

1. Merchant Center → **Data sources → Add product source → SFTP upload**.
2. Filename: `clawd-store-feed.xml` (matches `MERCHANT_REMOTE_FILENAME`).
3. Set a scheduled fetch that lines up with your `pnpm feed:publish` cron.
4. Monitor **Diagnostics** in Merchant Center for parsing or policy errors.

Full ops guide: [`scripts/README-merchant.md`](./scripts/README-merchant.md).

---

## Positioning

**CLAWD Cloud OS** is the bootstrap layer.
**SolanaOS** is the Go-native runtime.
**solana-clawd** is the Grok-native agentic interface.
**E2B** is the secure execution and desktop substrate.

Together they give you:

* one-shot install
* no-root Go bootstrap
* terminal + web + MCP workflows
* desktop computer use
* sandbox persistence
* cloud coding agents
* Solana-native operator ergonomics
