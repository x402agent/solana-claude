# p-token Launcher Template

This template describes the data the site, MCP tools, and agents need to launch and register p-tokens.

Use it as the config contract for a launch form or an agent-driven launch workflow. It does not sign transactions by itself.

## Flow

1. Collect token metadata and authorities.
2. Create or select a p-token program deployment.
3. Create the mint with the configured decimals and authorities.
4. Verify the mint account over RPC.
5. Register the mint in `data/ptokens.json`.
6. Enable x402 payment flows with `P_TOKEN_PROGRAM_ID` or `USE_P_TOKEN`.

## Config

See [`launch-config.example.json`](./launch-config.example.json).

