# Agentic Commerce

This repo now has one integration path for autonomous agents that can pay for services, expose paid stores, mint Metaplex-readable identities, and launch a canonical agent token.

## Safety Model

- Pay CLI spending defaults to `--sandbox`.
- Mainnet spending must pass an explicit acknowledgement for the specific call.
- Each run is bounded by per-call, per-run, endpoint, provider, and call-count caps.
- Agents never receive private keys, wallet bytes, wallet passwords, or decrypted key material.
- Metaplex `setToken: true` is blocked unless the caller acknowledges the permanent one-token-per-agent binding.

## Pay Gateway

Provider spec:

```sh
openclawd-framework/pay/solana-clawd-agent-commerce.yml
```

Run locally in sandbox mode:

```sh
pay --sandbox server start openclawd-framework/pay/solana-clawd-agent-commerce.yml --debugger
```

Dry-run an autonomous paid call plan:

```sh
cd openclawd-framework
node --import tsx/esm examples/agent-commerce.ts
```

The policy/client lives in:

- `openclawd-framework/src/commerce/pay-policy.ts`
- `openclawd-framework/src/commerce/pay-client.ts`

## Metaplex Agent Stack

The Metaplex helpers live in:

```sh
openclawd-framework/src/commerce/metaplex-agent-commerce.ts
```

They provide:

- `mintClawdAgent` for hosted Metaplex API minting through `mintAndSubmitAgent`.
- `readClawdAgent` for Core asset, AgentIdentity plugin, lifecycle hooks, and Asset Signer PDA reads.
- `registerClawdExecutive` and `delegateClawdExecution` for off-chain agent execution.
- `launchClawdAgentToken` for Genesis bonding-curve token launch with agent PDA fee routing.

Use devnet first:

```ts
await mintClawdAgent({
  payerKeypair,
  rpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet',
  name: 'CLAWD Commerce Agent',
  description: 'A sandbox agent that pays through Pay CLI and exposes a paid store.',
  uri: 'https://example.com/agent-core-metadata.json',
});
```

Token launch guard:

```ts
await launchClawdAgentToken({
  payerKeypair,
  rpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet',
  agentAssetAddress,
  setToken: false,
  token: {
    name: 'Test Agent Token',
    symbol: 'TEST',
    image: 'https://gateway.irys.xyz/your-image-id',
  },
});
```

Only use `setToken: true` on the final mainnet agent token, with `acknowledgedPermanentToken: true`.

## Agent Loop Contract

1. Read the agent identity and Asset Signer PDA from Metaplex.
2. Load the Pay spend policy.
3. Search or select a paid provider.
4. Produce a compact call plan: provider, endpoint, why it matches, estimated spend, and expected call count.
5. Evaluate the call through `PayAutonomyClient.plan`.
6. Execute with `PayAutonomyClient.call` only when policy allows it.
7. Store receipts, decisions, and order records in the agent store endpoint or Convex.
8. For token operations, use devnet and `setToken: false` until final launch.
