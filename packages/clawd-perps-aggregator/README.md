# @openclawdsolana/clawd-perps-aggregator

**Solana perps smart-order router, developer SDK, and MCP server.**
Built on top of the Clawd `/Perps` stack and the Imperial multi-venue
execution router. Aggregates Phoenix, Flash Trade, Jupiter Perps, and
GMTrade behind a single execution surface for humans, dashboards, and
AI agents.

```text
                       ┌────────────────────────────────────┐
   AI agents / TUI ────┤    @openclawdsolana/clawd-perps-aggregator
   dashboards     ────┤                                    │
   bots / scripts ────┤   SDK · Router · MCP · Realtime    │
                       └────────────────────────────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                  ┌───────▼──────┐         ┌────────▼─────────┐
                  │ Phoenix CLOB │         │ Imperial Router  │
                  │   (book)     │         │  Flash · Jupiter │
                  │              │         │  · GMTrade       │
                  └──────────────┘         └──────────────────┘
```

---

## What's in the box

| Layer | Module | What it does |
|-------|--------|--------------|
| Venues | `venues/` | Pluggable `VenueAdapter` per perps venue. Imperial-backed adapters for Phoenix, Flash, Jupiter, GMTrade. |
| Aggregator | `aggregator/` | Per-venue depth-aware quoting + composite scoring across cost, liquidity, OI, and funding. Single-best-venue routing today; split-execution drop-in compatible. |
| Realtime | `realtime/` | WebSocket multiplexer + in-memory cache for marks / funding / Phoenix depth. Cross-venue position aggregator. OODA-style market scoring. |
| SDK | `sdk/` | `PerpsAggregator` class. Quotes, routes, build/simulate/execute (paper-first), positions, balances, liquidation risk, signing helpers. |
| MCP | `mcp/` | Standalone MCP server on stdio. Drop-in for Claude Desktop / Claude Code / any MCP host. |
| CLI | `cli.ts` | `clawd-perps-aggregator` — operator CLI for exploration and smoke tests. |

---

## Install

```bash
npm install @openclawdsolana/clawd-perps-aggregator
# or, from the monorepo:
cd packages/clawd-perps-aggregator
npm install
npm run build
```

---

## Quick start (SDK)

```typescript
import { PerpsAggregator } from "@openclawdsolana/clawd-perps-aggregator";

const agg = new PerpsAggregator();

// Cross-venue quote for a $250 SOL long.
const quotes = await agg.quote({
  symbol: "SOL",
  side: "long",
  action: "open",
  sizeUsd: 250,
  slippageBps: 30,
});
console.log(quotes); // VenueQuote[] sorted in their natural order

// Smart-order-route: pick best venue with rationale.
const route = await agg.route({
  symbol: "SOL",
  side: "long",
  action: "open",
  sizeUsd: 250,
});
console.log(route.legs[0].venue, route.rationale);

// Simulate without submitting.
const sim = await agg.simulate({
  wallet: "<base58 pubkey>",
  symbol: "SOL",
  side: "long",
  action: "open",
  sizeUsd: 250,
});

// Execute. Paper-first by default. Live only if IMPERIAL_LIVE=true.
const record = await agg.execute({
  wallet: "<base58 pubkey>",
  symbol: "SOL",
  side: "long",
  action: "open",
  sizeUsd: 250,
});
console.log(record.status); // "paper" | "submitted" | "blocked" | "failed"
```

---

## Quick start (MCP)

Start the server on stdio:

```bash
npx clawd-perps-mcp
# or, after build:
node dist/mcp/bin.js
```

Wire it into Claude Desktop / Claude Code config:

```json
{
  "mcpServers": {
    "clawd-perps": {
      "command": "clawd-perps-mcp",
      "env": {
        "IMPERIAL_API_BASE": "https://api.imperial.space/api/v1",
        "IMPERIAL_WALLET": "<base58 pubkey>",
        "IMPERIAL_ALLOWED_SYMS": "SOL,ETH,BTC",
        "IMPERIAL_MAX_SIZE_USD": "100"
      }
    }
  }
}
```

The agent now has the following tools available:

| Tool | Purpose |
|------|---------|
| `perps_list_venues` | What venues are enabled |
| `perps_list_markets` | Markets across all venues |
| `perps_get_marks` | Mark prices per venue |
| `perps_get_funding` | Funding + borrow rates |
| `perps_get_quote` | Cross-venue quote, depth-aware |
| `perps_route_trade` | SOR with rationale + candidates |
| `perps_route_trade_split` | Split-execution router (fans across venues when AMM capacity demands) |
| `perps_get_pools` | Per-venue AMM pool state + summary (util, capacity, skew, predicted funding, health) |
| `perps_build_order_tx` | Build payload without submitting |
| `perps_simulate_order` | Route + check policy + report fillability |
| `perps_execute_order` | Paper-first execute (live behind env) |
| `perps_get_positions` | Cross-venue positions + totals |
| `perps_get_balances` | USDC subaccount balances |
| `perps_liquidation_risks` | Liquidation distance, sorted worst first |
| `perps_build_deposit_tx` | Build deposit/withdraw tx (caller signs) |
| `perps_stream_snapshot` | Realtime cache snapshot (lazy-starts stream) |
| `perps_score_market` | OODA composite signal (momentum/funding/liquidity) |

---

## Quick start (CLI)

```bash
clawd-perps-aggregator markets SOL
clawd-perps-aggregator marks SOL
clawd-perps-aggregator funding SOL
clawd-perps-aggregator quote SOL long 250
clawd-perps-aggregator route SOL long 250
clawd-perps-aggregator route-split SOL long 25000   # AMM-aware split
clawd-perps-aggregator pools SOL                     # pool state per venue
clawd-perps-aggregator positions <wallet>
clawd-perps-aggregator risk <wallet>
clawd-perps-aggregator mcp                   # start MCP server on stdio
```

---

## Smart order routing

The router scores each venue on four normalised components and picks the
single best venue. Default weights:

| Component | Weight | Direction | Source |
|-----------|--------|-----------|--------|
| Cost | 0.55 | lower better | slippage + fee + funding-over-hold |
| Liquidity | 0.20 | higher better | venue meta / pool depth |
| Open Interest | 0.10 | higher better | venue meta |
| Funding | 0.15 | lower better | hold-weighted funding cost |

### Slippage / impact model

Three layered models, picked per venue:

- **Phoenix** (CLOB): walks the orderbook to compute the VWAP of a market
  order for the requested USD notional, then converts to bps vs. mid.
- **AMM venues with pool state**: `poolImpact()` — base sqrt impact +
  imbalance premium that prices in pool counterparty risk. Opening into
  the heavy side is **more expensive** (you're forcing the pool to take
  on more risk); opening into the light side is rebate-clamped to zero.
  Refuses to fill orders that breach per-side OI caps.
- **AMM venues without pool state**: `ammImpactSlippage()` — generic
  square-root impact parameterised by venue liquidity (fallback).

The aggregator ships a `PoolStateProvider` hook so operators can inject
real on-chain pool readers (JLP, Flash, GMTrade) per (venue, symbol);
when no provider is registered, a `syntheticPoolState()` is derived from
the venue's current funding signal as a best-effort placeholder.

### Split execution

`PerpsAggregator.routeSplit()` (or MCP `perps_route_trade_split`) fans an
order across venues when AMM capacity demands it:

1. Quote every venue for the full notional → baseline.
2. Greedy allocator: re-quote each venue per chunk; allocate to the
   venue with the lowest **marginal** cost.
3. Prefer the single-venue plan unless splitting beats it by at least
   `splitThresholdBps` (default 5 bps), or no single venue can fill the
   full size.

Tunable: `splitThresholdBps`, `maxLegs` (default 3), `stepUsd` (default
$100).

### AMM pool views

```typescript
const pools = await agg.pools("SOL");
// [{ venue: "flash", pool: { aumUsd, longOiUsd, shortOiUsd, maxLong/Short, ... },
//    summary: { utilization, capacityUsd, skew, borrowPerHourPct,
//               predictedFundingLongPerHourPct, health, healthComponents } }, ...]
```

The summary surfaces the math operators actually care about: how close to
the cap is each side, what the next-period funding rate would be given
current OI imbalance, and a composite `health` score in [0,1].

---

## Realtime stream

`MarketStream` wraps Imperial's `/ws/market` socket — funding, marks, and
Phoenix depth — with auto-reconnect, ping/pong keepalive, and an in-memory
cache. Works in Node (`ws` optional dep) and in browsers (native
WebSocket). Emit `funding`, `mark`, `depth`, `connected`, `disconnected`,
`error` events.

```typescript
const stream = agg.stream(["SOL", "ETH"]);
stream.on("mark", (m) => console.log(m.venue, m.symbol, m.price));
stream.on("funding", (f) => console.log(f.symbol, f.longPerHourPct));
const snap = stream.snapshotCache();
agg.stopStream();
```

---

## Cross-protocol positions

```typescript
const agg = new PerpsAggregator();
const positions = await agg.positions("<wallet>");
console.log(positions.totals);
//  { grossNotionalUsd, netNotionalUsd, collateralUsd, unrealizedPnlUsd, bySymbol }

const risks = await agg.liquidationRisks("<wallet>");
//  Sorted closest-to-liquidation first, with `risk` band: low|medium|high|critical
```

---

## Safety model

The aggregator inherits the existing Imperial safety contract verbatim:

- **Paper-first.** `execute()` returns a paper record unless `IMPERIAL_LIVE=true`
  AND `PERPS_AGG_PAPER!=true`.
- **Symbol allowlist** via `IMPERIAL_ALLOWED_SYMS`.
- **Hard size cap** via `IMPERIAL_MAX_SIZE_USD`.
- **Slippage tolerance** via `IMPERIAL_SLIPPAGE_BPS`.
- **Validation** on every `execute()` and `simulate()` call.
- **Signing happens externally** — private keys never enter this package.
  Use the `signBase64Transaction` / `SignerLike` helpers to plug in your
  wallet runtime.

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `IMPERIAL_API_BASE` | `https://api.imperial.space/api/v1` | Override the Imperial endpoint. |
| `IMPERIAL_JWT` | — | Pre-issued JWT (skip connect flow). Required for auth reads + live execution. |
| `IMPERIAL_WALLET` | — | Operator wallet pubkey. |
| `IMPERIAL_PROFILE_INDEX` | `0` | Imperial subaccount index 0..5. |
| `IMPERIAL_LIVE` | `false` | Enable live submission. Paper-first otherwise. |
| `IMPERIAL_MAX_SIZE_USD` | `100` | Hard cap per order. |
| `IMPERIAL_ALLOWED_SYMS` | `SOL,ETH,BTC` | Allowlisted symbols. |
| `IMPERIAL_SLIPPAGE_BPS` | `50` | Default slippage tolerance. |
| `PERPS_AGG_VENUES` | all | Enabled venues, comma-separated subset of `phoenix,flash,jupiter,gmtrade`. |
| `PERPS_AGG_HOLD_SECONDS` | `3600` | Default hold horizon for funding-aware quoting. |
| `PERPS_AGG_PAPER` | auto | Force paper mode regardless of `IMPERIAL_LIVE`. |
| `BWS_ACCESS_TOKEN` | — | Bitwarden Secrets Manager token. When set, the CLI/MCP bin hydrate the above vars from Bitwarden at startup. |
| `SOLANA_CLAWD_BWS` | `1` | Set `0` to disable Bitwarden hydration. |

### Secret manager (Bitwarden)

The CLI (`clawd-perps-aggregator`) and standalone MCP bin (`clawd-perps-mcp`)
self-hydrate from **Bitwarden Secrets Manager** at startup when
`BWS_ACCESS_TOKEN` is set and the `bws` CLI is present — existing env always
wins, and it is a no-op otherwise. The hydrator is the zero-dependency
[`@openclawdsolana/clawd-secrets`](../clawd-secrets) package (re-exported here
for convenience):

```ts
import { hydrateSecretsFromBitwarden } from "@openclawdsolana/clawd-secrets";
hydrateSecretsFromBitwarden(); // before reading process.env
```

See [`docs/SECRETS.md`](../../docs/SECRETS.md) for the full install + runtime model.

---

## Architecture

```text
src/
  types.ts                      core types (incl. PoolStateView)
  config.ts                     env-driven AggregatorConfig
  venues/
    transport.ts                Imperial HTTP transport + httpToWebSocketBase
    adapter.ts                  VenueAdapter interface (with QuoteContext.action)
    base.ts                     BaseVenueAdapter — action-aware quoting + pool resolution
    poolState.ts                PoolStateProvider + StaticPoolStateProvider + syntheticPoolState
    phoenix.ts / flash.ts / jupiter.ts / gmtrade.ts
    registry.ts                 buildVenueAdapters()
  aggregator/
    slippage.ts                 book-VWAP and AMM-impact models
    ammMath.ts                  poolImpact, utilization, predictFunding, borrow ladder, health score
    scoring.ts                  composite venue scoring
    router.ts                   SmartRouter (single-best-venue)
    splitRouter.ts              SplitRouter (greedy multi-leg allocator)
  realtime/
    marketStream.ts             WS multiplexer + cache
    positionAggregator.ts       Cross-venue positions + totals
    marketScore.ts              OODA composite signal
  sdk/
    client.ts                   PerpsAggregator (main entry) + summarisePool
    transactions.ts             payload + tx helpers
    signing.ts                  base64 tx signing helpers
  mcp/
    server.ts                   MCP server entry
    tools.ts                    Tool definitions (17 tools)
    bin.ts                      bin: clawd-perps-mcp
  cli.ts                        bin: clawd-perps-aggregator
  index.ts                      public exports
```

---

## License

MIT. See `LICENSE` at the repository root.
