# p-token Launches and Bonding Curves

This folder supports agent-driven p-token launches without requiring agents to
hold keys or sign transactions. The launch flow is split into planning,
program implementation, mint verification, registry update, and x402 routing.

## Local commands

```sh
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo"
```

The planner emits JSON only. It does not deploy a Pinocchio program, create a
mint, transfer SOL, or sign launch transactions.

## Launch stages

1. Scaffold from `pinocchio/templates/p-token-launcher`.
2. Choose the p-token program id and mint authorities.
3. Configure metadata, decimals, initial supply, and optional curve reserves.
4. Implement and test Pinocchio account checks, PDA seeds, fees, and close paths.
5. Launch on devnet first and inspect the mint with `ptoken:inspect`.
6. Register the verified mint in `data/ptokens.json`.
7. Enable payment usage through `P_TOKEN_PROGRAM_ID` or `USE_P_TOKEN`.

## Constant-product curve

The default planner model uses virtual reserves:

```txt
x = virtual SOL reserve
y = virtual token reserve
k = x * y
buy tokens out = y - k / (x + net_sol_in)
sell SOL out = x - k / (y + tokens_in)
```

Use virtual reserves to shape the starting price and early slippage. Use real
reserves to track actual custody. Program logic should explicitly enforce fee
collection, reserve ownership, account mutability, signer requirements, and
graduation state.

## Agent/MCP tools

- `ptoken_launch_plan` returns an unsigned launch config and checklist.
- `ptoken_bonding_curve_quote` returns a simulated buy or sell quote.
- `ptoken_registry_list` reads `data/ptokens.json`.
- `ptoken_inspect` verifies a mint over RPC.
- `ptoken_registry_add` registers a verified mint for site and agent discovery.

## Site

The static `/p/` page documents the p-token explorer, launch planner, bonding
curve quote model, templates, and MCP tools for developers and agents.
