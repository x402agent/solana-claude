# OpenClawd Payments

`payments/pay-main` vendors the Solana Pay/Pay stack used by OpenClawd for
Solana-native commerce, HTTP 402 flows, MCP payment access, Pay.sh-compatible
agent-to-API payment, and local point of sale demos.

Pay.sh was announced by Solana Foundation in collaboration with Google Cloud on
May 5, 2026. OpenClawd treats it as the reference gateway pattern for agents
that need accountless, pay-per-request access to APIs through x402/MPP and
stablecoin settlement on Solana. See [PAYSH.md](./PAYSH.md).

## Companion: self-hosted x402 facilitator

`pay` is the **client side** of the 402 loop — it signs payment payloads and
retries requests. To run the **server side** (verify signatures and settle
on-chain) for your own service on Solana or Base, see the bundled facilitator:

- [`../x402/`](../x402) — overview and architecture
- [`../x402/SETUP.md`](../x402/SETUP.md) — end-to-end deploy walkthrough
- [`../x402/x402-facilitator/`](../x402/x402-facilitator) — Cloudflare Worker source
- [`../x402/x402-core/`](../x402/x402-core) — shared types, CAIP-2 IDs, signature verification

## Build

```bash
npm run install:payments
npm run build:payments
npm run typecheck:payments
```

## Pay CLI First Workflows

Install and verify Pay before client, agent, or server flows:

```bash
brew install pay
pay --version
```

Use sandbox mode for test-only flows because it creates and funds an ephemeral
local sandbox wallet automatically:

```bash
pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL
pay --sandbox clawd "find one paid weather endpoint and make a test call"
pay --sandbox server demo
```

Use `pay setup --update` when Pay is already installed and only the agent MCP
configuration needs refreshing. Do not run mainnet `pay setup` or replace an
account unless the user explicitly asks for account setup.

## Generate A Merchant Kit

```bash
npm run payments:merchant -- create demo-store \
  --recipient 11111111111111111111111111111111 \
  --label "Demo Store" \
  --pay-gateway https://pay.sh
```

The generated project lands in `generated/merchants/<name>` and includes:

- `solana-pay/core` copied from `payments/pay-main`
- the Solana Pay point-of-sale example
- the agentic merchant payment-flow example
- `openclawd.merchant.json` for OpenClawd agents, merchant tooling, and Pay.sh
  gateway routing
- local scripts for POS development, SSL proxying, and merchant-flow simulation

Use `--type pos`, `--type merchant`, or `--type both` to choose which examples
are included.
