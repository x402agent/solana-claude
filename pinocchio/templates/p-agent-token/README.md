# {{project_name}}

Pinocchio p-agent-token starter.

This template is for a faster agent token path:

- p-token mint/account operations for lower compute-unit cost.
- Pinocchio zero-copy account validation and state access.
- MPL Core / Agent Registry compatible identity metadata.
- One-way agent-token binding similar to Metaplex agent token linking.
- Constant-product launch curve planning.

This scaffold is intentionally incomplete and unaudited. It defines the public
program shape and state contract, but you must implement CPI transfers, PDA
signer seeds, curve reserve custody, fee distribution, graduation, and tests
before deployment.

## Planned Instructions

| Discriminator | Instruction | Purpose |
| ---: | --- | --- |
| `0` | `initialize_agent` | Create zero-copy agent state and point to agent metadata/Core asset. |
| `1` | `initialize_agent_mint` | Create or validate the p-token mint for the agent. |
| `2` | `bind_agent_token` | Permanently bind the p-token mint to the agent state. |
| `3` | `delegate_executor` | Record an executive wallet allowed to operate the agent. |
| `4` | `buy` | Buy along the launch curve. |
| `5` | `sell` | Sell along the launch curve. |
| `6` | `graduate` | Freeze the launch curve and prepare AMM migration. |

## Planner

From the repo root:

```sh
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
```

## Security Checklist

- Validate every account owner, signer, writable flag, and PDA bump.
- Keep p-token mint owner checks explicit.
- Keep token state zero-copy; avoid owned token account deserialization in hot paths.
- Make `bind_agent_token` one-way after finalization.
- Separate curve reserves from agent operating balances.
- Test malformed accounts, duplicate accounts, incorrect token programs, overflow,
  fee math, and graduation boundaries.
- Treat p-token as unaudited unless your chosen deployment has an independent
  review for the exact commit and program id.
