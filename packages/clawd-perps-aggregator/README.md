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
clawd-perps-aggregator positions <wallet>
clawd-perps-aggregator risk <wallet>
clawd-perps-aggregator mcp                   # start MCP server on stdio
```

---

## Smart order routing

The router scores each venue on four normalised components and picks the
single best venue (split-execution API is in place but unused — flip the
weights when you want to ship it). Default weights:

| Component | Weight | Direction | Source |
|-----------|--------|-----------|--------|
| Cost | 0.55 | lower better | slippage + fee + funding-over-hold |
| Liquidity | 0.20 | higher better | venue meta / pool depth |
| Open Interest | 0.10 | higher better | venue meta |
| Funding | 0.15 | lower better | hold-weighted funding cost |

Slippage is computed two ways:

- **Phoenix** (CLOB): walks the orderbook to compute the VWAP of a market
  order for the requested USD notional, then converts to bps vs. mid.
- **Flash / Jupiter / GMTrade** (AMM-style): square-root impact model
  parameterised by venue liquidity, calibrated against Solana perps pool
  depths (10k–100k USD ≈ 5–30 bps).

The router will return an unfillable quote (with a `reason`) when a venue
either lacks depth or would breach the operator's slippage tolerance.

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

---

## Architecture

```text
src/
  types.ts                      core types
  config.ts                     env-driven AggregatorConfig
  venues/
    transport.ts                Imperial HTTP transport
    adapter.ts                  VenueAdapter interface
    base.ts                     BaseVenueAdapter (shared behavior)
    phoenix.ts / flash.ts / jupiter.ts / gmtrade.ts
    registry.ts                 buildVenueAdapters()
  aggregator/
    slippage.ts                 book-VWAP and AMM-impact models
    scoring.ts                  composite venue scoring
    router.ts                   SmartRouter
  realtime/
    marketStream.ts             WS multiplexer + cache
    positionAggregator.ts       Cross-venue positions + totals
    marketScore.ts              OODA composite signal
  sdk/
    client.ts                   PerpsAggregator (main entry)
    transactions.ts             payload + tx helpers
    signing.ts                  base64 tx signing helpers
  mcp/
    server.ts                   MCP server entry
    tools.ts                    Tool definitions
    bin.ts                      bin: clawd-perps-mcp
  cli.ts                        bin: clawd-perps-aggregator
  index.ts                      public exports
```

---

## License

MIT. See `LICENSE` at the repository root.
