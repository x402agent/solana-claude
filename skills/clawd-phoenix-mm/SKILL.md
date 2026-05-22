---
name: clawd-phoenix-mm
version: 1.0.0
description: "Phoenix on-chain market-maker automation for the Clawd agent. Use when running the Rust mm binary that places resting limit orders on the Phoenix CLOB to earn maker rebates and tighten the book spread."
metadata:
  openclaw:
    category: "finance"
  requires:
    skills: ["vulcan-execution-modes", "vulcan-risk-management", "vulcan-market-intel"]
---

# clawd-phoenix-mm

Use this skill when the user wants to:

- Run the Phoenix on-chain market-maker (mm Rust binary)
- Check mm workspace / build the mm binary
- Configure quote edge, quote size, refresh frequency, or price-improvement behavior
- Earn maker rebates by placing resting orders on the Phoenix CLOB

## What the On-Chain Market-Maker Does

The `mm` binary (from `perps/phoenix-onchain-market-maker-master`) is a Rust program that:

1. Reads the current Coinbase ticker price for a symbol (e.g., `SOL-USD`)
2. Places a two-sided quote (bid + ask) around the mid price with a configurable edge
3. Refreshes the quote every N milliseconds
4. Collects maker rebates when orders fill

The maker earns fees instead of paying them — the wider the edge, the more rebate per fill.

## Workspace Setup

```bash
# Check mm workspace status
clawd perps onchain-mm status

# Build the mm binary (Rust / cargo)
clawd perps onchain-mm build

# Preview the exact cargo run command
clawd perps onchain-mm plan \
  --market <PHOENIX_MARKET_PUBKEY> \
  --ticker SOL-USD \
  --quote-edge-bps 3
```

Environment variables:
- `CLAWD_ONCHAIN_MM_ROOT` — path to `perps/phoenix-onchain-market-maker-master`
- `CLAWD_ONCHAIN_MM_MARKET` — Phoenix market pubkey (required for live run)
- `CLAWD_ONCHAIN_MM_TICKER` — Coinbase ticker (default: `SOL-USD`)
- `CLAWD_ONCHAIN_MM_RPC_URL` — Solana RPC endpoint

## Running the Market-Maker

The run is **gated** — all three must be set:

```bash
CLAWD_ONCHAIN_MM_LIVE=true OPERATOR_CONFIRMED=true \
  clawd perps onchain-mm run \
  --market <PUBKEY> \
  --ticker SOL-USD \
  --quote-edge-bps 3 \
  --quote-size 100000000 \
  --yes
```

Key parameters:
| Flag | Default | Description |
|---|---|---|
| `--quote-edge-bps` | 3 | Half-spread in bps (edge around mid) |
| `--quote-size` | 100000000 | Quote size in quote atoms |
| `--refresh-ms` | 2000 | Quote refresh interval ms |
| `--price-improvement` | `ignore` | `join` / `dime` / `ignore` |
| `--post-only` | true | Reject if would cross the book |

## Agent API (ClawdPerpsRuntime)

```typescript
const runtime = new ClawdPerpsRuntime();

// Check mm workspace status
const status = runtime.getOnchainMmStatus();
// status.binaryBuilt — true if cargo build has run
// status.liveEnabled — true when CLAWD_ONCHAIN_MM_LIVE=true

// Build a run plan (dry-run, shows exact command)
const plan = runtime.buildOnchainMmPlan({
  market: "HhHRvLFvZid6FD7C96H93F2MkASjYfYAx8Y2P8KMAr6b",
  ticker: "SOL-USD",
  quoteEdgeBps: 3,
});

// Preview onchain MM for a market
const { status, plan } = runtime.previewOnchainMm("SOL-USD");
```

## Default SOL/USDC Market

The bundled default market pubkey is the SOL/USDC localnet fixture:
`HhHRvLFvZid6FD7C96H93F2MkASjYfYAx8Y2P8KMAr6b`

Set `CLAWD_ONCHAIN_MM_MARKET` to the correct mainnet pubkey before live runs.

## Integration with clawd-perps-aggregator

Phoenix is a first-class venue in the aggregator with full orderbook depth:

```typescript
import { PhoenixAdapter, buildVenueAdapters } from "@openclawdsolana/clawd-perps-aggregator";
// Phoenix adapter fetches live book depth and uses VWAP slippage
const adapters = buildVenueAdapters(transport, ["phoenix"]);
```

The on-chain MM tightens the Phoenix book — the aggregator will route more volume to Phoenix as the spread narrows.

## Safety

- Build and test on localnet before mainnet
- The mm binary signs and submits transactions continuously
- `--post-only` (default true) prevents crossing the book and taking positions
- Keep `OPERATOR_CONFIRMED=true` gated — only set in production environments
