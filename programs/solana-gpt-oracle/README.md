# solana-gpt-oracle

Anchor program for LLM context storage, interaction requests, and callback execution. It is the on-chain half of the solana-clawd oracle loop.

## Program ID

```text
LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab
```

## What It Does

- Initializes oracle identity and counter PDAs.
- Creates reusable LLM context accounts.
- Creates or resizes interaction accounts for user prompts.
- Stores callback program id, callback discriminator, and callback account metas.
- Lets the oracle identity call back into target programs.
- Supports delegated interaction accounts through MagicBlock ephemeral rollups SDK.

## Innovation

The program makes LLM requests composable. A caller can create an interaction and declare exactly which program should receive the response. The off-chain worker supplies the model output, but the on-chain oracle controls callback identity and account routing.

## Instructions

| Instruction | Purpose |
| --- | --- |
| `initialize` | Creates identity and counter PDAs. |
| `create_llm_context` | Stores persistent instruction/context text. |
| `interact_with_llm` | Records a prompt plus callback target metadata. |
| `callback_from_llm` | Invokes the callback program with the model response. |
| `callback_from_oracle` | Example callback receiver for direct oracle responses. |
| `delegate_interaction` | Delegates interaction state for ephemeral-rollup execution. |

## Install and Build

```bash
cargo check --manifest-path programs/solana-gpt-oracle/Cargo.toml
cd programs/solana-gpt-oracle
anchor build
```

## Runtime Pair

Use with [`../llm_oracle/`](../llm_oracle/), which watches interactions and submits responses.

## Safety Notes

- Callback target programs must validate the oracle identity signer.
- Remaining accounts are untrusted and should be checked by the callback program.
- Model output should be parsed defensively.
- Keep oracle payer and identity keys protected.

