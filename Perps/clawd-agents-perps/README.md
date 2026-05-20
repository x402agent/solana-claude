# Clawd Agents Perps

The perp nerve center for Clawd agents.

This workspace is where the repo stops sounding like infrastructure and starts
reading like an active trading machine: Phoenix prices coming in through Rise,
Vulcan command surfaces mapped into agent-safe plans, and operator-facing
status payloads that tell you what is armed, what is blocked, and what still
needs human approval.

It does not replace the upstream repos under `Perps/`. It metabolizes them.

## Mission

- pull live Phoenix perp reads through the Rise SDK
- map Vulcan CLI and MCP surfaces into compatible agent routes
- expose a market-maker runtime for observe, paper, and gated live previews
- provide Telegram and frontend entrypoints that feel operational, not abstract
- keep secrets, signing, and irreversible actions out of the wrong layer
- stay mainnet-capable without pretending every environment is safe by default

## Mental Model

This package has three jobs:

1. Observe the market cleanly.
2. Describe execution paths clearly.
3. Refuse unsafe live behavior unless the runtime is explicitly armed.

If one of those jobs is blurry, the whole perp stack gets sloppy.

## Layout

- `src/cli.ts`
  runnable agent entry point used by `clawd-perps perps agent`
- `src/adapters/phoenixRise.ts`
  Rise-powered Phoenix read plane for markets, tickers, positions, and health
- `src/adapters/vulcan.ts`
  Vulcan execution-plan generator for paper routes and CLI-compatible live paths
- `src/vulcanCatalog.ts`
  loader for the upstream Vulcan command catalog and MCP launch contract
- `src/marketMaker.ts`
  Clawd runtime for observe, paper, and live-preview orchestration
- `src/telegram.ts`
  operator command surface for runtime health, markets, positions, and route previews
- `src/frontend.ts`
  dashboard/status payload builder for cards, runtime mood, and integration posture
- `src/config.ts`
  env parsing, trading-mode resolution, and hard preflight gating
- `src/api.ts`
  thin API surface that exposes frontend and Telegram-oriented handlers
- `src/onchainMarketMaker.ts`
  safe bridge for the Phoenix on-chain market-maker reference workspace
- `src/twammAutomation.ts`
  gated bridge for TWAMM build/test/crank automation inside the perps runtime

## Safety Posture

- no private keys in source
- paper/sim mode is the default mood of the system
- live mode requires explicit env flags and passing preflight checks
- symbol, notional, leverage, spread, and wallet presence are validated before live routes
- signing belongs in wallet/runtime integration, not this workspace

## Vulcan Integration

- reads `vulcan-cli-master/agents/tool-catalog.json` as the canonical command inventory
- reads `vulcan-cli-master/.mcp.json` to surface the upstream MCP launch contract
- exposes Vulcan catalog posture to Telegram and frontend consumers
- keeps Rise as the market-read source of truth while using Vulcan for execution planning and operational compatibility

## CLI Agent Surface

Build it, then launch it directly or through the npm perps package:

```bash
npm --prefix Perps/clawd-agents-perps run build

node Perps/clawd-agents-perps/dist/cli.js status
node Perps/clawd-agents-perps/dist/cli.js frontend
node Perps/clawd-agents-perps/dist/cli.js telegram "/perps"
node Perps/clawd-agents-perps/dist/cli.js imperial-scan --symbols SOL,BTC,ETH --size 100
node Perps/clawd-agents-perps/dist/cli.js onchain-mm status
node Perps/clawd-agents-perps/dist/cli.js onchain-mm plan --market HhHRvLFvZid6FD7C96H93F2MkASjYfYAx8Y2P8KMAr6b --ticker SOL-USD --rpc-url local
node Perps/clawd-agents-perps/dist/cli.js twamm status
node Perps/clawd-agents-perps/dist/cli.js twamm crank-plan --token-a So11111111111111111111111111111111111111112 --token-b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --once

clawd-perps perps agent status
clawd-perps perps agent telegram "/perps_vulcan"
clawd-perps perps onchain-mm status
```

The npm `clawd-perps` package resolves this CLI automatically inside the monorepo, or from `CLAWD_PERPS_TS_AGENT_CLI` in external installs. If it is missing, `clawd-perps perps agent` falls back to the Python Phoenix/Vulcan agent.

`onchain-mm run` is intentionally gated because the Phoenix reference runner signs quote update transactions in a loop. It requires `CLAWD_ONCHAIN_MM_LIVE=true`, `OPERATOR_CONFIRMED=true`, and a CLI `--yes`.

`twamm crank` is gated the same way because it signs recurring TWAMM crank transactions. It requires `CLAWD_TWAMM_LIVE=true`, `OPERATOR_CONFIRMED=true`, and `--yes`; use `--once` for scheduler-friendly single crank attempts.

## Reading Order

If you want to understand the system fast, read in this order:

1. `src/config.ts`
2. `src/marketMaker.ts`
3. `src/adapters/phoenixRise.ts`
4. `src/adapters/vulcan.ts`
5. `src/frontend.ts`
6. `src/telegram.ts`
