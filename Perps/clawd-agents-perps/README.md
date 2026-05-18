# Clawd Agents Perps

Unified perpetuals trading workspace for Clawd agents.

This package does not replace the upstream repos under `Perps/`. It provides a
single integration surface that agents can use safely.

## Goals

- read Phoenix perp markets through the Rise SDK
- bridge compatible CLI workflows through Vulcan when needed
- expose a market-maker runtime for Clawd agents
- expose Telegram and frontend integration points
- keep secrets out of source control
- be deployable to Solana mainnet only after explicit config, simulation, and
  operator confirmation

## Layout

- `src/adapters/phoenixRise.ts`: wraps `packages/clawd-perps` for live Phoenix reads
- `src/adapters/vulcan.ts`: generates Vulcan CLI execution plans
- `src/marketMaker.ts`: Clawd runtime for observe, paper, and live previews
- `src/telegram.ts`: Telegram command handler surface
- `src/frontend.ts`: frontend status payload builder
- `src/config.ts`: env parsing, preflight, and risk gates

## Safety

- no private keys in source
- paper/sim mode must be the default
- live mode requires explicit env flags and runtime preflight
- symbol, notional, leverage, spread, and wallet presence are checked before live routes
- signing belongs in wallet/runtime integration, not this workspace
