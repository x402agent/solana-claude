# Perps Aggregator — Deep Dive

**Package:** `packages/clawd-perps-aggregator/`
**MCP bridge:** `MCP/src/tools/perps-tools.ts`
**Tool count:** 17 `perps_*` tools wired into the Clawd MCP server

---

## What It Is

The Solana perps aggregator is a smart-order router (SOR) and AMM pool intelligence layer for four Solana perpetuals venues: **Phoenix**, **Flash**, **Jupiter**, and **GMTrade**. It is exposed as an SDK, a CLI, and 17 MCP tools that any agent or LLM client can call directly.

The core idea: instead of guessing which venue is best, the router models each venue's real mechanics — order book depth for CLOBs, pool utilization and OI skew for AMMs — and picks the execution path with the lowest expected cost for the given order size.

---

## Venue Coverage

| Venue | Type | How slippage is modeled |
| --- | --- | --- |
| Phoenix | CLOB (orderbook) | Walk the book to a true VWAP; slippage = (VWAP − mid) / mid |
| Flash | AMM pool | Convex borrow-rate ladder; per-side OI cap enforcement |
| Jupiter Perps | AMM pool | Pool utilization curve; heavy-side penalty on skewed pools |
| GMTrade | AMM pool | Composite pool-health score; utilization + funding + OI skew |

---

## Smart-Order Routing (SOR)

The router scores every venue on four weighted dimensions:

| Dimension | Weight | What it captures |
| --- | --- | --- |
| Cost (fee + slippage) | 40% | Total execution cost for the notional size |
| Liquidity depth | 25% | Available capacity without blowing the price |
| Open interest skew | 20% | Directional OI imbalance; heavy side pays a premium |
| Funding rate | 15% | Current funding cost projected to next period |

The venue with the highest composite score wins. The output includes a per-venue breakdown and a one-line human-readable rationale so the agent (and the judge) can audit the decision.

---

## AMM Pool Intelligence

For pool-backed venues (Flash, Jupiter, GMTrade) the aggregator models real pool mechanics beyond simple fee lookup:

- **Per-side utilization** — long and short pools are tracked separately. Opening into the heavy side of a skewed pool correctly costs more.
- **OI skew** — directional open interest imbalance triggers a dynamic premium on the over-crowded side.
- **Predicted funding** — next-period funding is estimated from the current skew and utilization trajectory.
- **Borrow-rate ladder** — Flash uses a convex curve; rates accelerate as utilization approaches the ceiling.
- **Composite pool-health score** — a single 0–100 number that summarizes capacity, skew, and cost. Orders that would breach per-side OI caps are refused before submission.

---

## Split Execution

When no single pool can clear a large order cheaply, a greedy multi-leg allocator fans the order across venues:

1. Sort venues by marginal cost at current pool state.
2. Fill from cheapest venue until its per-side OI cap or liquidity ceiling is reached.
3. Overflow into the next cheapest venue, repeating until the full notional is allocated.
4. Return a `SplitPlan` with per-leg sizes, expected costs, and rationale.

```bash
npm run clawd-perps-aggregator:cli -- route-split SOL long 25000
```

---

## Paper-First Safety Model

Live submission is gated behind explicit environment flags:

| Flag | Default | Effect |
| --- | --- | --- |
| `IMPERIAL_LIVE` | `false` | Must be `true` to submit a live order |
| `PERPS_AGG_PAPER` | `true` | Overrides `IMPERIAL_LIVE`; forces paper mode |
| `IMPERIAL_MAX_SIZE_USD` | `10000` | Hard per-order USD cap |
| `IMPERIAL_ALLOWED_SYMS` | `SOL,BTC,ETH` | Symbol allowlist; unlisted symbols are refused |

Private keys never enter the aggregator package. Build tools return base64-encoded transactions for the caller to sign externally.

---

## The 17 MCP Tools

Wired into the MCP server via `MCP/src/tools/perps-tools.ts`. The bridge adopts the aggregator's `buildTools()` output wholesale and re-tags each tool into the `perps` category.

| Tool | Category | Description |
| --- | --- | --- |
| `perps_list_venues` | market data | List all supported venues with status and capabilities |
| `perps_get_venue` | market data | Detailed info for a single venue |
| `perps_get_market` | market data | Market metadata for a symbol on a venue |
| `perps_get_orderbook` | market data | Live orderbook snapshot (Phoenix CLOB) |
| `perps_get_funding_rate` | market data | Current and predicted funding rate |
| `perps_get_pool_state` | AMM intel | Full pool state: utilization, OI, health score |
| `perps_list_pools` | AMM intel | All pools for a symbol across AMM venues |
| `perps_route_order` | SOR | Best venue + breakdown for a given order |
| `perps_route_split` | SOR | Multi-leg split plan for large orders |
| `perps_build_order` | execution | Build a base64 transaction (unsigned) |
| `perps_execute_order` | execution | Submit live (requires `IMPERIAL_LIVE=true`) |
| `perps_get_position` | positions | Open position for a wallet + symbol |
| `perps_list_positions` | positions | All open positions for a wallet |
| `perps_close_position` | positions | Build close transaction (unsigned) |
| `perps_get_risk` | risk | Risk metrics: PnL, liquidation price, margin ratio |
| `perps_get_account` | risk | Full account summary with margin and leverage |
| `perps_subscribe_prices` | realtime | Price feed subscription (websocket-backed) |

---

## CLI Quick Reference

```bash
# Build once
npm run clawd-perps-aggregator:build

# Route a single order — returns best venue + rationale
npm run clawd-perps-aggregator:cli -- route SOL long 250

# AMM pool intelligence for a symbol
npm run clawd-perps-aggregator:cli -- pools SOL

# Capacity-aware split across all venues
npm run clawd-perps-aggregator:cli -- route-split SOL long 25000

# Get funding rates across all venues
npm run clawd-perps-aggregator:cli -- funding SOL

# List all venues
npm run clawd-perps-aggregator:cli -- venues
```

No private key is required for any of the above commands. All market data uses public APIs.

---

## SDK Usage

```typescript
import { PerpsAggregator, buildTools } from '@openclawdsolana/clawd-perps-aggregator';

const agg = new PerpsAggregator();

// Smart-order route
const route = await agg.routeOrder({ symbol: 'SOL', side: 'long', notionalUsd: 250 });
console.log(route.bestVenue, route.rationale);

// AMM pool intel
const pools = await agg.listPools('SOL');
console.log(pools.map(p => `${p.venue}: health=${p.healthScore}`));

// MCP tool surface (used by perps-tools.ts bridge)
const tools = buildTools(agg);
// → 17 MCP-compatible tool definitions with handlers
```

---

## File Map

```text
packages/clawd-perps-aggregator/
├── src/
│   ├── aggregator.ts        ← PerpsAggregator class (main entry)
│   ├── router.ts            ← SOR scoring + split allocator
│   ├── venues/
│   │   ├── phoenix.ts       ← CLOB depth + VWAP walk
│   │   ├── flash.ts         ← AMM pool model + borrow ladder
│   │   ├── jupiter-perps.ts ← Jupiter pool utilization curve
│   │   └── gmtrade.ts       ← GMTrade pool health scoring
│   ├── tools.ts             ← buildTools() → 17 MCP tool defs
│   └── cli.ts               ← CLI entrypoint
├── package.json
└── tsconfig.json

MCP/src/tools/perps-tools.ts  ← thin bridge: adopts buildTools(), tags as 'perps'
```

---

## Integration Status

The aggregator is lazy-loaded by the MCP server. If the package hasn't been built yet, the server logs to stderr and boots with zero perps tools — it does not crash. Once built, `tools/list` returns all 105 tools including all 17 `perps_*` tools, and `tools/call perps_list_venues` executes end-to-end through the orchestrator.
