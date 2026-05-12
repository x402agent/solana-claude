# Pay.sh For OpenClawd

Pay.sh is the reference payment gateway pattern for OpenClawd agents that need
to discover, access, and pay per request for APIs with stablecoins on Solana.
OpenClawd vendors the Pay CLI source in `payments/pay-main` and exposes package
integration points through `@openclawdsolana/clawd` and
`@openclawdsolana/agents-x402`.

## Resources

| Resource | Link |
| --- | --- |
| Pay source | <https://github.com/solana-foundation/pay> |
| Pay skills/services | <https://github.com/solana-foundation/pay-skills> |
| x402 docs | <https://docs.cdp.coinbase.com/x402/welcome> |
| MPP docs | <https://docs.stripe.com/multiparty-payments> |

## OpenClawd Mapping

- **Discovery:** use the Pay skills catalog before paying for an API. Keep
  returned gateway URLs unchanged.
- **Access:** paid calls route through x402 or MPP HTTP 402 challenges, where
  the payment proof is the credential.
- **Settlement:** wallet approval stays local; agents never receive private
  keys or upstream provider keys.
- **Agent launcher:** `pay clawd` injects Pay MCP metadata into the Clawd
  session and falls back to `npx -y --package @openclawdsolana/clawd clawd`
  when no local `clawd` binary is installed.
- **Merchant generation:** `npm run payments:merchant` creates local POS and
  merchant-flow projects with an `openclawd.merchant.json` manifest that marks
  the project as `solana-pay`, `x402`, and `mpp` compatible.

## Install Pay

Install the Pay CLI before running client, agent, or server flows. Prefer
Homebrew for normal local setup:

```bash
brew install pay
pay --version
```

From source:

```bash
git clone https://github.com/solana-foundation/pay.git
cd pay
just install pay
pay --version
```

Use `pay setup --update` when Pay is already installed but agent MCP config
needs refreshing. Do not create or replace a mainnet account unless the user
asked for account setup.

## Wallet Setup

```bash
pay setup
pay topup
```

`pay setup` creates a wallet in supported local secure storage where available,
including macOS Keychain, GNOME Keyring, Windows Hello, and 1Password.

Sandbox mode creates and funds an ephemeral local sandbox wallet automatically,
so do not run mainnet account setup for a test-only flow.

## Update Agent Config

```bash
pay setup --update
```

`pay setup --update` reinstalls MCP configuration and the agent skill without
creating a new account.

## Client Quickstart

Start with one sandbox paid request. The API returns HTTP 402, Pay builds the
proof, and the retried request returns the paid response.

```bash
curl https://payment-debugger.vercel.app/mpp/quote/AAPL
pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL
pay --sandbox fetch https://payment-debugger.vercel.app/mpp/quote/AAPL
pay --sandbox --verbose curl https://payment-debugger.vercel.app/mpp/quote/AAPL
```

Use `pay fetch` when no external `curl` binary should be required. Use
`--verbose` only for payment-flow debugging and `--output json` when another
program or agent needs structured status.

## Agent Quickstart

Launch agents with sandbox mode until the user explicitly asks for mainnet
spending:

```bash
pay --sandbox clawd "find a weather endpoint and make one paid test call"
pay --sandbox claude
pay --sandbox codex
```

OpenClawd-specific one-shot:

```bash
npx -y @solana/pay clawd "buy some water with pay"
```

Agent flow:

```text
search_catalog -> get_catalog_entry -> curl
```

Some upstream Pay docs refer to `search_skills` and `get_skill_endpoints`.
OpenClawd's vendored Pay MCP currently exposes `search_catalog`,
`list_catalog`, `get_catalog_entry`, `curl`, `get_balance`, `topup`, and
`create_skill`.

Before repeated paid work, state the provider, endpoint, expected call count,
and estimated spend. Ask before purchases, persistent resources, unclear
pricing, dynamic pricing, or multi-call exploration.

## Server Quickstart

Use top-level `--sandbox`; `pay server demo` requires it for test flows:

```bash
pay --sandbox server demo
pay --sandbox curl http://127.0.0.1:1402/api/v1/reports/usage
```

The demo writes `pay-demo.yaml` in the current directory. The debugger UI is
served on the gateway port and shows the challenge, payment proof, retry, and
final response. Do not invent transaction details that are not shown.

## Call Paid APIs

Preserve the selected method, headers, body, and gateway URL:

```bash
pay --sandbox curl https://example.gateway/v1/search \
  -H 'content-type: application/json' \
  -d '{"query":"test"}'

pay --sandbox fetch https://example.gateway/v1/search \
  -H 'content-type: application/json'

pay --sandbox wget https://example.gateway/v1/export.csv
```

Use `wget` only for download-shaped tasks.

## MCP Config

Use MCP when an agent client should call Pay tools without being launched
through `pay clawd`, `pay claude`, or `pay codex`:

```json
{
  "mcpServers": {
    "pay": {
      "command": "pay",
      "args": ["mcp"]
    }
  }
}
```

Keep enabled tools scoped to provider search, endpoint lookup, paid `curl`,
balance checks, top-up, and provider validation.

## Accounts And Networks

- Use `--sandbox` for tests and examples.
- Use `--mainnet` only when the user intends to spend real funds.
- Use `--local` only when a local Surfpool RPC is running.
- Use `--account <name>` when the user specifies a named account.
- Ask before `pay account export`, `pay account remove`, `pay send`, or
  any mainnet payment path.

## Accept Payments

Start with a sandbox gateway before production:

```bash
pay server scaffold provider.yml
pay --sandbox server start provider.yml --debugger
pay --sandbox curl http://127.0.0.1:1402/v1/search -d '{"query":"test"}'
```

Provider specs should keep endpoint pricing explicit: method, path, pricing,
network, currencies, recipients, and upstream auth environment variables.
Publish gateway URLs, not upstream provider URLs.

## Generate A Pay.sh-Compatible Merchant

```bash
npm run payments:merchant -- create google-agent-store \
  --type both \
  --recipient 11111111111111111111111111111111 \
  --label "Google Agent Store" \
  --pay-gateway https://pay.sh \
  --catalog https://pay.sh
```

The generated `openclawd.merchant.json` includes:

- wallet recipient and cluster hints
- supported protocols: `solana-pay`, `x402`, `mpp`
- Pay.sh gateway and catalog hints
- stablecoin settlement and "payment is the credential" metadata
- supported use cases for POS, merchant simulation, Google Cloud API proxy
  access, and community API facilitator access
