# llm_oracle

`llm_oracle` is an off-chain Rust worker that listens for `solana-gpt-oracle` interaction accounts, sends prompts to an LLM provider, and submits callback transactions back to Solana.

This is not an on-chain program. It is the execution worker that completes the oracle loop.

## Program ID

N/A. This is an off-chain binary.

It targets the on-chain oracle program:

```text
solana-gpt-oracle: LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab
```

## What It Does

- Subscribes to `solana-gpt-oracle` program accounts over WebSocket.
- Filters interaction accounts by Anchor discriminator.
- Fetches the linked LLM context.
- Sends conversation history to an LLM.
- Builds a callback transaction using the oracle response.
- Retries API calls and transactions.
- Keeps short-lived in-memory interaction history.

## Innovation

The worker makes LLM execution deterministic from the chain's perspective: Solana stores the context and callback contract, while the worker performs model inference and returns the response through a signed oracle identity flow.

## Install and Run

```bash
cargo run --manifest-path programs/llm_oracle/Cargo.toml
```

Expected environment variables are loaded by the worker configuration code. Use the same RPC/WebSocket pair for the target cluster and provide an LLM API key.

## Operational Notes

- Run one worker identity per oracle deployment.
- Keep enough SOL on the payer for callback transactions.
- Monitor logs for API retry failures and transaction retry failures.
- Keep callback compute budget high enough for target programs that do heavy CPI.

## Safety Notes

- The worker handles a signing key; keep it off shared machines.
- Model output is untrusted and must be validated by callback programs.
- Interaction memory is in-process only and should not be treated as durable state.

