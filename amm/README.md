# OpenClawd AMM Aggregator

`amm/` is a standalone TypeScript package for AMM/perps routing on top of the existing Imperial venue plane.

It provides:

- Venue adapters for `phoenix`, `flash`, `jupiter`, and `gmtrade`
- A smart router that ranks venues by fee, slippage, liquidity, open interest, funding, and confidence
- Paper-first order building, simulation, and execution guards
- Cross-venue position aggregation and liquidation risk bands
- A small CLI
- A standalone MCP server for agent use

## Install

```bash
cd amm
npm install
```

## Build

```bash
npm run typecheck
npm run build
npm run test:math
```

From the repository root:

```bash
npm run amm:typecheck
npm run amm:build
npm run amm:test
```

## CLI

```bash
npm --prefix amm run build
node amm/dist/cli.js venues
node amm/dist/cli.js markets
node amm/dist/cli.js quote SOL-PERP long 1000
node amm/dist/cli.js route SOL-PERP long 1000
node amm/dist/cli.js simulate <wallet> SOL-PERP long 1000 3
```

## MCP

```bash
node amm/dist/mcp/bin.js
```

The MCP server exposes:

- `amm_list_venues`
- `amm_list_markets`
- `amm_get_quote`
- `amm_route_trade`
- `amm_build_order_tx`
- `amm_simulate_order`
- `amm_execute_order`
- `amm_get_positions`
- `amm_get_aggregated_positions`
- `amm_liquidation_risks`
- `amm_score_market`

## Safety

The default mode is paper-first:

```env
CLAWD_AMM_PAPER=true
CLAWD_AMM_LIVE=false
CLAWD_AMM_MAX_NOTIONAL_USD=5000
```

Live execution requires both:

```env
CLAWD_AMM_PAPER=false
CLAWD_AMM_LIVE=true
```

Set `CLAWD_AMM_ALLOWED_SYMBOLS` and `CLAWD_AMM_ALLOWED_VENUES` to restrict what agents can route.
