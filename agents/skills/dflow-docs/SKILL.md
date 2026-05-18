---
name: dflow-docs
description: "Discover and use DFlow documentation, Agent CLI, Trading API, Metadata API, Proof KYC, prediction markets, and the hosted DFlow docs MCP. Use before implementing DFlow features or when field-level endpoint details are needed."
metadata:
  source: https://pond.dflow.net/llms.txt
  mcp-server: https://pond.dflow.net/mcp
  docs-index: skills/dflow-docs/llms.txt
---

# DFlow Docs

Use this skill as the DFlow routing layer for agents in this repo.

## Required First Step

Before exploring individual pages, read the local documentation index:

```bash
sed -n '1,220p' skills/dflow-docs/llms.txt
```

The canonical remote index is:

```text
https://pond.dflow.net/llms.txt
```

Refresh the local copy when needed:

```bash
curl -fsSL https://pond.dflow.net/llms.txt -o skills/dflow-docs/llms.txt
```

## Reference Entrypoints

- Local index: `skills/dflow-docs/llms.txt`
- Hosted docs MCP: `https://pond.dflow.net/mcp`

If a field shape, endpoint parameter, error code, or compliance detail matters, prefer the hosted DFlow docs MCP or the local OpenAPI spec over memory.

## Agent CLI

Install:

```bash
curl -fsS https://cli.dflow.net | sh
```

Set up:

```bash
dflow setup
```

Common read-only commands:

```bash
dflow whoami
dflow positions
dflow guardrails show
```

Trading commands submit real transactions. Only run them when the operator explicitly asks for live execution and local DFlow guardrails have been checked.

## Skill Routing

Use the focused skill when the task matches:

- `dflow-spot-trading`: Solana spot swaps, quotes, sponsored swaps, priority fees.
- `dflow-kalshi-trading`: buy, sell, redeem YES/NO prediction market tokens.
- `dflow-kalshi-market-scanner`: discover/filter events, markets, series, tags, candles.
- `dflow-kalshi-market-data`: orderbook, live data, trades, WebSocket streams.
- `dflow-kalshi-portfolio`: positions, P&L, rent reclaim.
- `dflow-proof-kyc`: wallet identity verification for Kalshi markets.
- `dflow-platform-fees`: builder fees through `platformFeeBps` or `platformFeeScale`.
- `dflow-phantom-connect`: full-stack Phantom wallet apps with DFlow trading.

## Safety Defaults

- CLI amounts are atomic units, not UI amounts.
- Prediction market buys require Proof KYC and jurisdiction checks.
- Kalshi maintenance is Thursdays, 3:00 AM to 5:00 AM ET.
- Use `dflow guardrails show` before autonomous execution.
- Do not ask for or print private keys, vault passwords, mnemonics, or exported wallet material.
