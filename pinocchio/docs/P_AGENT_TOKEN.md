# p-agent-token

`p-agent-token` is the solana-clawd agent-token path for builders who want the
agent identity pattern of Metaplex with the compute profile of p-token and
Pinocchio.

It is not a fork of Metaplex Genesis. It is a native Pinocchio planning and
program template that can interoperate with Metaplex concepts:

- **MPL Core asset** as the agent identity shell.
- **Agent Registry style metadata** for discoverability and delegation.
- **p-token mint** as the fungible agent token.
- **one-way agent-token binding** once the owner finalizes the relationship.
- **constant-product launch curve** for initial distribution.

## Why p-token for agent tokens

The hot paths for an agent token are minting, transfers, fee movement, burns,
and account closure. p-token reduces compute by keeping token state zero-copy:
the program checks account data length and reads fields by reference instead of
deserializing token accounts into owned structs.

Reference benchmark deltas from the local p-token notes:

| Operation | SPL Token CU | p-token CU | Reduction |
| --- | ---: | ---: | ---: |
| InitializeMint | 2,906 | 352 | 88% |
| Transfer | 4,736 | 1,188 | 75% |
| MintTo | 4,301 | 849 | 80% |
| Burn | 4,219 | 849 | 80% |
| CloseAccount | 2,708 | 441 | 84% |

## Flow

1. Create or select an MPL Core asset for the agent identity.
2. Prepare agent metadata JSON and token metadata JSON.
3. Plan the p-token mint, supply, authorities, launch curve, and fees.
4. Scaffold the Pinocchio `p-agent-token` template.
5. Implement and test CPI calls, PDA seed checks, fee math, and graduation.
6. Launch on devnet and inspect the mint owner with `ptoken:inspect`.
7. Register the verified mint in `data/ptokens.json`.
8. Finalize the one-way agent-token binding only after review.

## Commands

```sh
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PCLAWD --name "Clawd Agent Token" --p-token-program-id <program>
```

The planner is unsigned. It does not deploy a program, create a mint, register
an agent, bind a token, sign a transaction, or move funds.

## Program Shape

| Instruction | Purpose |
| --- | --- |
| `initialize_agent` | Create or validate zero-copy agent state. |
| `initialize_agent_mint` | Create or validate the p-token mint and authorities. |
| `bind_agent_token` | Permanently bind the token mint to the agent state. |
| `delegate_executor` | Store an executive wallet allowed to operate the agent. |
| `buy` | Buy from the constant-product launch curve. |
| `sell` | Sell back into the launch curve before graduation. |
| `graduate` | Freeze the launch curve and prepare external AMM liquidity migration. |

## Metaplex Compatibility Notes

Metaplex Agent Registry and Genesis provide a mature agent-token model:
identity, execution delegation, token launch, and token linking. `p-agent-token`
keeps those concepts but moves the token hot path to p-token:

| Concept | Metaplex route | p-agent-token route |
| --- | --- | --- |
| Agent identity | MPL Core asset + Agent Registry | MPL Core-compatible asset reference + local agent state |
| Execution wallet | Asset signer PDA / executive delegation | Agent PDA and optional executive field |
| Token launch | Genesis launchpool or bonding curve | Pinocchio constant-product p-token curve |
| Token binding | `setAgentTokenV1` / agent token link | one-way `bind_agent_token` |
| Token program | SPL Token / Token Metadata ecosystem | p-token mint, with Token Metadata compatibility planned at the metadata layer |

## Safety Status

p-token and this template are not treated as audited production infrastructure.
Before mainnet:

- audit the exact p-token program id and commit;
- audit the generated Pinocchio program;
- add SBF or Mollusk tests for every instruction;
- verify overflow behavior in curve math;
- prove reserve ownership and graduation invariants;
- run devnet launches and inspect every account owner.
