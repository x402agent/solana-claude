# agent-minter

`agent-minter` is an Anchor program that wires an on-chain LLM oracle response into token minting. Users interact with an AI agent context, the oracle returns JSON, and the callback can mint MAR1O tokens to the caller when the agent chooses a positive amount.

## Program ID

```text
agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ
```

## What It Does

- Creates an LLM context in `solana-gpt-oracle`.
- Creates a PDA-controlled SPL mint for the agent token.
- Creates Metaplex token metadata for the mint.
- Sends user text to the oracle interaction account.
- Receives a callback from the oracle.
- Parses the response JSON and mints tokens when `amount > 0`.

## Why It Is Innovative

This program turns an LLM response into a constrained on-chain action. The model cannot sign transactions directly; it writes a response through the oracle callback path, and this program enforces the mint authority through a PDA.

## Instructions

| Instruction | Purpose |
| --- | --- |
| `initialize` | Creates the agent state, LLM context, mint PDA, and metadata account. |
| `interact_agent` | Creates or updates an oracle interaction and registers this program as the callback target. |
| `callback_from_agent` | Validates the oracle identity signer, parses JSON, logs the reply, and mints tokens. |

## Important Accounts

| Account | Seeds / Notes |
| --- | --- |
| `Agent` | `["agent"]`; stores the LLM context account. |
| `mint_account` | `["mint"]`; mint address and mint authority. |
| `metadata_account` | Metaplex metadata PDA: `["metadata", token_metadata_program, mint]`. |
| `llm_context` | Created through `solana-gpt-oracle`. |
| `interaction` | Oracle interaction PDA created by `solana-gpt-oracle`. |

## Install and Build

```bash
cd programs/agent-minter
cargo check
anchor build
```

This crate depends on:

- `anchor-lang`
- `anchor-spl`
- `serde_json`
- `solana-gpt-oracle` with CPI features

## Deployment Notes

- Keep `declare_id!` synchronized with the deployment keypair.
- Deploy `solana-gpt-oracle` first.
- Keep the oracle identity PDA and callback signer checks intact.
- The callback parser expects JSON with `reply` and `amount`.

## Safety Notes

- The LLM response is untrusted input.
- Keep mint limits and anti-abuse logic tight before any real-value launch.
- Do not let arbitrary programs spoof callback authority.
- Metadata URI and token authority should be reviewed before deployment.

