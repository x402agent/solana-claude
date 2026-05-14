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

## Config

See [`launch-config.example.json`](./launch-config.example.json) and
[`bonding-curve.example.json`](./bonding-curve.example.json).
