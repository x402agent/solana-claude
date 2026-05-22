# Packages Workspace — Deep Dive

**Path:** `packages/`
**Install:** `npm run packages:install && npm run packages:build`

---

## Overview

`packages/` is the project-owned npm workspace that makes up the reusable Solana Clawd distribution. Each package is a standalone publishable unit. They are consumed by the TUI, MCP server, CLI, gateway, and agent surfaces.

---

## Package Map

| Package | npm name | Version | Role |
| --- | --- | --- | --- |
| [`clawd/`](../packages/clawd/) | `@openclawdsolana/clawd` | latest | Main Clawd runtime: agent loop, AUD optimizer, buddies, commands, gates |
| [`clawd-sdk/`](../packages/clawd-sdk/) | `@openclawdsolana/clawd-sdk` | 0.1.0 | TypeScript SDK: adaptive bonding curves, Token2022, pTokens, vault mechanics |
| [`clawd-wallet/`](../packages/clawd-wallet/) | `@openclawdsolana/clawd-wallet` | latest | Wallet helper: SPL, USDC, Ed25519 identity, vault server bridge |
| [`agentwallet/`](../packages/agentwallet/) | `@openclawdsolana/agentwallet` | latest | Agent wallet vault server: custody, signing, fee relay |
| [`clawd-perps/`](../packages/clawd-perps/) | `@openclawdsolana/clawd-perps` | latest | Perps agent: signals, OI, funding, position tracking |
| [`clawd-perps-aggregator/`](../packages/clawd-perps-aggregator/) | `@openclawdsolana/clawd-perps-aggregator` | latest | Multi-venue SOR + AMM pool intel + 17 MCP tools (see [PERPS_AGGREGATOR.md](./PERPS_AGGREGATOR.md)) |
| [`clawd-protocol/`](../packages/clawd-protocol/) | `@openclawdsolana/clawd-protocol` | latest | Rust/Anchor protocol: vaults, conviction staking, milestone locks, burn engine, adaptive curves |
| [`cli-standalone/`](../packages/cli-standalone/) | `@openclawdsolana/clawd-standalone` | latest | Standalone CLI build for one-shot npm install |

---

## Package Detail

### `clawd` — Main Runtime

The core Clawd agent package. Contains:

- `src/agent/` — AUD loop (Autonomous Unit of Delivery): policy-bound agent execution
- `src/buddies/` — Blockchain Buddies: multi-agent coordination and skill dispatch
- `src/commands/` — CLI command surface
- `src/gates/` — Formal policy gates: risk checks, allowlists, live-trading guards
- `src/hooks/` — Lifecycle hooks for agent spawn, act, attest, settle
- `src/integrations/` — Helius, Jupiter, Metaplex, x402 adapters
- `src/examples/` — Runnable agent examples

```bash
npm install -g @openclawdsolana/clawd
clawd --help
```

### `clawd-sdk` — TypeScript SDK

> "OpenClawd Solana SDK — Agent & token launches with adaptive bonding curves, Token2022, pTokens, and intelligent vault mechanics"

Covers token launch flows, p-token economics, vault mechanics, and app-developer-facing helpers. Published at `@openclawdsolana/clawd-sdk@0.1.0`.

### `clawd-wallet` — Wallet Helper

Wallet-aware package for SPL token operations, USDC settlement, Ed25519 agent identity, and vault server bridging. Used by the TUI wallet screen and the agent payment flows.

### `agentwallet` — Vault Server

HTTP vault server for agent custody. Provides:
- Signing endpoints for unsigned transactions (returned by perps build tools)
- Fee relay for gasless devnet operations
- Key isolation: private keys stay in the vault, not in agent code

### `clawd-perps` — Perps Agent Package

Signal and position layer:
- Open interest monitoring across venues
- Funding rate feeds
- Position state tracking
- Paper-mode execution wrappers

### `clawd-perps-aggregator` — Multi-Venue SOR

See [PERPS_AGGREGATOR.md](./PERPS_AGGREGATOR.md) for the full deep-dive. Summary:
- 4 venues: Phoenix (CLOB), Flash (AMM), Jupiter Perps (AMM), GMTrade (AMM)
- Smart-order routing with 4-factor scoring
- AMM pool intelligence: utilization, OI skew, funding prediction, health score
- Split execution for large orders
- 17 MCP tools wired into the MCP server

### `clawd-protocol` — Anchor Protocol Package

Rust/Anchor-style protocol layer. Program ID: `CLAWDpRoToCoLv1pRoGRaM111111111111111111111`

Covers:
- **Vaults:** custody and withdrawal flows
- **Conviction staking:** time-weighted stake with OI-linked rewards
- **Milestone locks:** conditional unlock based on on-chain state
- **Burn engine:** `$CLAWD` deflationary mechanics
- **Adaptive curves:** bonding curve mechanics for agent token launches
- **pToken hooks:** p-token transfer cost and fee distribution
- **Agent-token bindings:** agent NFT ↔ token registry mappings

### `cli-standalone` — Standalone CLI

Bundled CLI distribution for `npm install -g @openclawdsolana/clawd-standalone`. Wraps the main CLI surface without requiring the full monorepo.

---

## Smoke Commands

```bash
# Install all packages
npm run packages:install

# Build all packages
npm run packages:build

# Typecheck the perps aggregator
npm run clawd-perps-aggregator:typecheck

# Full perps workspace build
npm run perps:workspace:build
```

---

## SDK One-Shot Install

```bash
# Install the full published surface
npm install -g @openclawdsolana/clawd @openclawdsolana/clawd-tui \
  @openclawdsolana/clawd-sdk @openclawdsolana/clawd-standalone \
  @openclawdsolana/clawd-wallet @openclawdsolana/clawd-perps \
  clawd-automaton x402.wtf x402agent-nanoclawd-cli

# Or one-shot:
curl -fsSL https://solanaclawd.com/install.sh | bash
```
