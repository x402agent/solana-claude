# p-token Launcher Template

This template describes the data the site, MCP tools, and agents need to launch and register p-tokens.

Use it as the config contract for a launch form or an agent-driven launch workflow. It does not sign transactions by itself.

## Flow

1. Collect token metadata and authorities.
2. Create or select a p-token program deployment.
3. Create the mint with the configured decimals and authorities.
4. Optionally open a constant-product bonding curve launch phase.
5. Verify the mint account over RPC.
6. Register the mint in `data/ptokens.json`.
7. Enable x402 payment flows with `P_TOKEN_PROGRAM_ID` or `USE_P_TOKEN`.

## Bonding curve planning

The local planner is intentionally unsigned. Use it to produce config, quotes,
and agent-visible checklists before any wallet or deploy step:

```sh
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
```

The default curve model is constant product:

```txt
x = virtual SOL reserve
y = virtual token reserve
k = x * y
buy tokens out = y - k / (x + net_sol_in)
sell SOL out = x - k / (y + tokens_in)
```

Keep authority handoff, reserve custody, graduation, and close/refund paths in
program code. This template only describes the launch contract.

## Backend and frontend workbench

This template now includes a local workbench for humans and agents to plan a
p-token launch, simulate curve trades, model a RISE-style floor, prepare a
perpetual intent, inspect a mint, and emit WDK-ready unsigned wallet intents.

Start it from the repo root:

```sh
npm run ptoken:launcher
```

Or start it from this directory:

```sh
npm start
```

Then open:

```txt
http://localhost:8787
```

The workbench is intentionally unsigned. It does not deploy a program, create a
mint, trade, borrow, repay, open perpetuals, or move funds. The WDK output is an
intent envelope for review and later wallet integration, not a signed
transaction.

### API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Runtime status, target network, p-token program id, and supported adapters. |
| `GET /api/registry` | Reads `data/ptokens.json` for site and agent discovery. |
| `GET /api/examples` | Returns the example launch and curve configs. |
| `POST /api/launch-plan` | Builds the complete unsigned p-token launch plan. |
| `POST /api/quote` | Simulates a buy or sell against the constant-product curve. |
| `POST /api/rise-floor` | Models protocol-owned floor coverage for a RISE-style launch. |
| `POST /api/perp-plan` | Produces a planner-only perpetual trade intent and risk checks. |
| `POST /api/wdk-intent` | Emits an unsigned WDK-style Solana action envelope. |
| `POST /api/inspect` | Inspects a mint account over RPC and classifies the token program. |

Example:

```sh
curl -s http://localhost:8787/api/launch-plan \
  -H 'content-type: application/json' \
  -d '{"symbol":"PQC","name":"Quantum Compute p-token","virtualSol":30,"virtualToken":1073000000}'
```

## Config

See [`launch-config.example.json`](./launch-config.example.json) and
[`bonding-curve.example.json`](./bonding-curve.example.json).
