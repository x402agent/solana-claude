---
name: openclawd-legacy
description: >
  Complete OpenClawd agent skill — install, configure, and operate the autonomous
  Solana trading runtime with Membrain epistemological memory, multi-venue trading
  (Jupiter, DFlow, pump.fun), on-chain intelligence with USD pricing, Telegram
  bot, gateway API, and cross-session recall.
  Use when asked to install OpenClawd, query Solana blockchain data, manage wallets,
  run OODA trading loops, configure strategies, or operate any OpenClawd runtime surface.
license: MIT
metadata:
  openclawd:
    version: 1.0.0
    author: OpenClawd Team
    category: solana-crypto
    venues: [solana-spot, jupiter, dflow, pump-fun]
    requires_bins: [node, git, curl]
    requires_env: [HELIUS_API_KEY, SOLANA_RPC_URL]
---

# OpenClawd — Complete Agent Skill

> Give this file to any AI agent (Claude, Grok, GPT-4, etc.)
> to fully install, configure, and operate OpenClawd in one shot.

## What You Are Installing

**OpenClawd** — an autonomous Solana trading and operator runtime by the OpenClawd team.

One Node.js/TypeScript stack that combines:

- **OODA trading loop** — RSI + EMA + ATR across Solana spot, DFlow, pump.fun
- **Membrain memory** — persistent cross-session reasoning (KNOWN/LEARNED/INFERRED)
- **On-chain intelligence** — wallets, token research, whale detection, USD pricing
- **Telegram bot** — 60+ commands + natural language trading via @clawdbot_sol_bot
- **Gateway API** — memory, trading, sessions, chat
- **90+ skills** — auto-injected into LLM context
- **OpenClawd Hub** — solanaclawd.com

### Links

| | |
| --- | --- |
| Repo | [github.com/x402agent/OpenClawd-Typescript](https://github.com/x402agent/OpenClawd-Typescript) |
| Hub | [solanaclawd.com](https://solanaclawd.com) |
| Telegram | [@clawdbot_sol_bot](https://t.me/clawdbot_sol_bot) |
| X | [@clawddevs](https://x.com/clawddevs) |
| npm | [clawd-code-cli](https://www.npmjs.com/package/clawd-code-cli) |

---

## Install

```bash
npm i -g clawd-code-cli
clawd
```

### Minimum `.env`

```bash
# Required
HELIUS_API_KEY=your-helius-key
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key

# Optional
SOLANA_PRIVATE_KEY=your-wallet-base58  # for trading # pragma: allowlist secret
BIRDEYE_API_KEY=your-birdeye-key
JUPITER_API_KEY=your-jupiter-key
OPENROUTER_API_KEY=sk-or-v1-your-key

# Membrain Memory (optional)
MEMBRAIN_API_KEY=your-membrain-key
```

### Build & Run

```bash
cd OpenClawd-Typescript
pnpm install
pnpm build
pnpm dev
```

---

## On-Chain Intelligence

| Source | Tier | Freshness |
|--------|------|-----------|
| Helius RPC | **KNOWN** | < 60s |
| Helius Enhanced WebSockets | **KNOWN** | Real-time |
| Helius DAS | **KNOWN** | < 60s |
| Jupiter DEX | **KNOWN** | < 30s |
| Birdeye | **KNOWN** | < 60s |
| Membrain conclusions | **LEARNED** | Persistent |

### Key Commands (clawd TUI)

```
/wallet                     SOL balance + token portfolio + USD
/trending                   Trending via Birdeye
/search <query>             Token search
/research <mint>            Deep research with risk scoring
/buy <token> <sol>          Buy via Jupiter swap
/sell <token> <amount|%>    Sell (supports "50%", "all")
/launch <name> <symbol>     Launch on pump.fun
```

---

## Membrain Memory

```
/memory                          Status + memory stats
/recall <query>                  AI-powered recall
/remember <fact>                 Save durable conclusion
/stats                           Memory tier stats
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | `pnpm install && pnpm build` |
| RPC errors | Check HELIUS_API_KEY |
| Trading disabled | Set SOLANA_PRIVATE_KEY |
| Memory errors | Check MEMBRAIN_API_KEY |

---

*OpenClawd v1.0.0 · OpenClawd Team · MIT*
*github.com/x402agent/OpenClawd-Typescript · solanaclawd.com*