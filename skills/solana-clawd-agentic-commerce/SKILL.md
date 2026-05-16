---
name: solana-clawd-agentic-commerce
description: Build and operate Solana CLAWD agents that spend through Pay CLI, expose paid stores, mint Metaplex-readable identities, and launch Genesis agent tokens.
---

# Solana CLAWD Agentic Commerce

Use this skill when an agent needs to pay for APIs, publish a paid service, mint/register on Metaplex, launch an agent token, or prove its on-chain identity.

## Runtime Order

1. Start in Pay sandbox mode unless the user explicitly requests mainnet spending.
2. Load the spend policy from `openclawd-framework/src/commerce/pay-policy.ts`.
3. Plan every paid call before execution: provider, endpoint, estimated USD, expected calls, and why it matches.
4. Refuse calls that exceed policy, hit denied URL patterns, or target non-allowlisted endpoints.
5. For Metaplex, mint or read the agent identity before token launch.
6. Use devnet and `setToken: false` until final launch.
7. Only use `setToken: true` when the user explicitly acknowledges the permanent one-token-per-agent binding.

## Important Files

- `docs/AGENTIC_COMMERCE.md`
- `openclawd-framework/src/commerce/pay-policy.ts`
- `openclawd-framework/src/commerce/pay-client.ts`
- `openclawd-framework/src/commerce/metaplex-agent-commerce.ts`
- `openclawd-framework/pay/solana-clawd-agent-commerce.yml`
- `openclawd-framework/examples/agent-commerce.ts`

## Commands

```sh
pay --sandbox server start openclawd-framework/pay/solana-clawd-agent-commerce.yml --debugger
cd openclawd-framework && node --import tsx/esm examples/agent-commerce.ts
```

## Non-Negotiables

- Never ask for or print private keys, wallet bytes, wallet passwords, or signed challenge material.
- Never bypass `PayAutonomyClient.plan` for autonomous spending.
- Never launch a mainnet agent token with `setToken: true` unless the user explicitly confirms finality.
- Always report transaction signatures and payment receipts when an actual paid/on-chain action occurs.
