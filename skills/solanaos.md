---
name: solanaos
description: >
  Complete SolanaOS agent skill — install, configure, and operate the autonomous
  Solana trading runtime with Honcho v3 epistemological memory, multi-venue perp
  trading (Hyperliquid + Aster), on-chain intelligence with USD pricing, Telegram
  bot, gateway API, Tailscale mesh, hardware integration, and cross-session recall.
  Use when asked to install SolanaOS, query Solana blockchain data, manage wallets,
  run OODA trading loops, configure strategies, control BitAxe mining fleets, pair
  Seeker devices, or operate any SolanaOS runtime surface.
license: MIT
metadata:
  solanaos:
    version: 2.0.0
    author: 8BIT Labs
    category: solana-crypto
    venues: [solana-spot, hyperliquid, aster]
    requires_bins: [go, git, curl]
    requires_env: [SOLANA_TRACKER_API_KEY, TELEGRAM_BOT_TOKEN]
---

# SolanaOS — Complete Agent Skill

> Give this file to any AI agent (Claude, Codex, GPT-4, etc.)
> to fully install, configure, and operate SolanaOS in one shot.

## What You Are Installing

**SolanaOS** — an autonomous Solana trading and operator runtime by 8BIT Labs.

One ~10MB Go binary (`solanaos`) that combines:

- **OODA trading loop** — RSI + EMA + ATR across Solana spot, Hyperliquid perps, Aster perps
- **Honcho v3 memory** — persistent cross-session reasoning (KNOWN/LEARNED/INFERRED)
- **On-chain intelligence** — wallets, token research, whale detection, USD pricing
- **Telegram bot** — 60+ commands + natural language trading
- **Gateway API** — memory, trading, sessions, chat on port 18790
- **Tailscale mesh** — cross-device access without port forwarding
- **80+ skills** — auto-injected into LLM context
- **SolanaOS Hub** — [seeker.solanaos.net](https://seeker.solanaos.net)

### Links

| | |
| --- | --- |
| Repo | [github.com/x402agent/SolanaOS](https://github.com/x402agent/SolanaOS) |
| Hub | [seeker.solanaos.net](https://seeker.solanaos.net) |
| Souls | [souls.solanaos.net](https://souls.solanaos.net) |
| Docs | [go.solanaos.net](https://go.solanaos.net) |
| npm | [solanaos-cli](https://www.npmjs.com/package/solanaos-cli) |
| Launch | [solanaos.net](https://solanaos.net) |

---

## Install

```bash
git clone https://github.com/x402agent/SolanaOS solanaos
cd solanaos
```

### Minimum `.env`

```bash
SOLANA_TRACKER_API_KEY=your-key
SOLANA_TRACKER_RPC_URL=https://rpc-mainnet.solanatracker.io/?api_key=your-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ID=123456789
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=minimax/minimax-m2.7

# Recommended — get free key at helius.dev
HONCHO_ENABLED=true
HONCHO_API_KEY=hch-v3-your-key
HELIUS_API_KEY=your-helius-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-helius-key
HELIUS_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=your-helius-key

# Optional perps
# HYPERLIQUID_PRIVATE_KEY=0x...
# ASTER_API_KEY=your-key
```

### Build & Run

```bash
make build
./build/solanaos onboard
./build/solanaos daemon
```

### Verify

```bash
solanaos status && solanaos solana wallet && solanaos pet
```

---

## On-Chain Intelligence

| Source | Tier | Freshness |
|--------|------|-----------|
| SolanaTracker RPC | **KNOWN** | < 60s |
| Helius RPC | **KNOWN** | < 60s |
| Helius Enhanced WebSockets | **KNOWN** | Real-time |
| Helius DAS | **KNOWN** | < 60s |
| Jupiter + SolanaTracker Swap | **KNOWN** | < 30s |
| Hyperliquid / Aster | **KNOWN** | < 10s |
| Honcho conclusions | **LEARNED** | Persistent |

### Key Commands

```
/wallet                     SOL balance + token portfolio + USD
/trending                   Trending via SolanaTracker Datastream
/research <mint>            Deep research with risk scoring (0.0-1.0)
/buy <token> <sol>          Buy via Jupiter + SolanaTracker swap
/sell <token> <amount|%>    Sell (supports "50%", "all")
```

---

## Helius onchain-listener.ts (solana-claude integration)

When using solana-claude in a Node.js runtime:

```typescript
import { HeliusListener, HeliusPoller } from "solana-claude/src/helius";

// Real-time account monitoring
const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

// Watch a wallet for SOL balance changes
await listener.subscribeAccount(
  "WALLET_ADDRESS",
  (data) => console.log("Balance changed:", data.account.lamports / 1e9, "SOL"),
);

// Watch Token Program for all token transfers
await listener.subscribeTransaction({
  accountInclude: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
  vote: false,
  failed: false,
}, (tx) => console.log("Token tx:", tx.signature));

// Slot heartbeat (fires every ~400ms)
await listener.subscribeSlot((slot) => console.log("Slot:", slot.slot));

// Program logs (e.g. Raydium AMM v4)
await listener.subscribeLogs(
  { filter: { mentions: ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] } },
  (log) => console.log("Raydium log:", log.logs),
);
```

---

## Memory (Honcho v3)

```
/memory                          Status + peer card
/recall <query>                  AI-powered recall via dialectic
/remember <fact>                 Save durable conclusion
/dream                           Trigger memory consolidation
/profile                         Synthesized operator profile
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 18790 in use | `lsof -i :18790` → kill |
| Telegram 409 | `pkill -f "solanaos"` → restart |
| Wallet not found | `solanaos onboard` |
| Helius WS disconnects | Listener auto-reconnects with exponential backoff |
| Build fails | `go mod tidy && make build` |

---

*SolanaOS v2.0.0 · 8BIT Labs · MIT*
*github.com/x402agent/SolanaOS · seeker.solanaos.net*
