# Programs Workspace — Deep Dive

**Path:** `programs/`
**Framework:** Anchor (Rust)
**Build:** `cd programs && cargo check` (requires `anchor` + `solana` CLI)

---

## Overview

`programs/` is the on-chain and near-chain program surface for Solana Clawd. It is the workspace for AI inference markets, LLM oracle callbacks, agent token minting, staking, token launch flows, and Metaplex integrations.

This is a program lab: some programs are active Anchor crates, some are upstream references, and some are client-side workers. The map below states what each folder does and which program ID it targets.

---

## Program Map

| Program | Kind | Program ID | What it does |
| --- | --- | --- | --- |
| [`agent-minter/`](../programs/agent-minter/) | Anchor | `agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ` | LLM-backed agent decides whether to mint a MAR1O token reward after user interaction. Turns model output into an on-chain mint callback through a PDA authority. |
| [`clawd-stake/`](../programs/clawd-stake/) | Anchor | `5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn` | Reward/position staking for Metaplex Agent assets and CLAWD emissions. Agent staking layer where assets earn rewards and fee share while remaining useful. |
| [`client/`](../programs/client/) | TypeScript SDK | N/A | Client SDK for the AI inference protocol, ORE constants, and network config. Typed entrypoint to program IDs, IDL helpers, and protocol calls. |
| [`llm_oracle/`](../programs/llm_oracle/) | Off-chain Rust worker | N/A | Watches `solana-gpt-oracle` interactions, calls an LLM off-chain, and submits callback transactions. Bridges model execution into on-chain callback semantics with retry and memory handling. |
| [`mpl-corenft-staking/`](../programs/mpl-corenft-staking/) | Anchor | `7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ` | Lightweight staking registry for Metaplex Core-style agent assets. Minimal Core asset stake registry for agent ownership and collection tracking. |
| [`mpl-token-metadata-main/`](../programs/mpl-token-metadata-main/) | Upstream Metaplex reference | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` | Token metadata program reference used by launch/mint flows. Canonical metadata PDA system for fungible and non-fungible tokens. |
| [`p-token-launchpad/`](../programs/p-token-launchpad/) | Anchor | deploy-time ID | Self-hosted p-token launchpad with agent bonding curves, agent registry, buy/sell flow, fee distribution, and DEX graduation. |
| [`solana-ai-inference/`](../programs/solana-ai-inference/) | Anchor | `3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc` | Full on-chain AI inference market: model registry, inference requests, validators, staking, data submissions, DNA generation records, slashing. |
| [`solana-contracts/`](../programs/solana-contracts/) | TypeScript tx builder | `TLaunDAP1sZks8dGmcNWHxdAgzMuiYzKg87mfjHRFzM` | Client-side launchpad transaction builder: mint, funding, liquidity setup flows. |
| [`solana-gpt-oracle/`](../programs/solana-gpt-oracle/) | Anchor | `LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab` | Stores LLM context/interactions and calls back into target programs with oracle responses. Generic callback oracle pattern for agent programs needing off-chain LLM inference. |
| [`token-launcher/`](../programs/token-launcher/) | Anchor | `funvWGBmpr8N7pTNqpxkWPgWnQbL3Yr5vzCHNJT2YkL` | Minimal token launchpad: initializes global config, creates mints + Metaplex metadata. |
| [`packages/clawd-protocol/`](../packages/clawd-protocol/) | Anchor package | `CLAWDpRoToCoLv1pRoGRaM111111111111111111111` | Vaults, conviction staking, milestone locks, burn engine, adaptive curves, pToken hooks, agent-token bindings. |

---

## Innovation Highlights

### `solana-ai-inference` — On-Chain AI Market Primitive

The most novel program in the workspace. It creates a full on-chain inference market:

1. **Model registry** — validators stake to register approved model fingerprints
2. **Inference requests** — callers submit prompts with a USDC bounty
3. **Validator responses** — validators compete to submit the best response
4. **Slashing** — bad or late responses slash the validator's stake
5. **DNA records** — each inference generates a unique on-chain record linking input hash, output hash, model ID, and validator

This is not a wrapper around a hosted API. It is a trustless inference settlement layer.

### `solana-gpt-oracle` + `llm_oracle` — Callback Oracle Pattern

The oracle pair implements the callback pattern for off-chain model execution:

1. A Solana program writes an inference request to `solana-gpt-oracle`
2. The off-chain `llm_oracle` Rust worker polls for new requests
3. The worker calls the LLM (any provider) and submits a callback transaction
4. The originating program receives the result through its callback handler

This gives any Solana program access to off-chain AI without trusting a centralized API.

### `p-token-launchpad` — Agent Token Economy

Combines p-token transfer-cost mechanics with:
- **Bonding curves** for agent token price discovery
- **Agent registry** linking token to agent NFT identity
- **DEX graduation** when liquidity threshold is reached
- **Fee distribution** to agent owners, $CLAWD buyback, and treasury

### `agent-minter` — LLM-Gated Minting

Unique pattern: the LLM output is the authorization signal for an on-chain mint. When an agent interaction meets a policy threshold (determined off-chain), the program mints a reward token through a PDA authority. No human approval required.

---

## Install

```bash
# Global CLI install (includes program client SDK)
npm install -g solana-clawd

# Or bootstrap:
curl -fsSL https://solanaclawd.com/leviathan.sh | sh

# Rust/Anchor workspace
cd programs
cargo check
anchor build   # requires Anchor CLI + local validator or devnet
```

---

## Safety Notes

- All live program calls require a funded keypair and explicit `--yes` confirmation.
- Devnet is the safe path for judging; mainnet requires operator configuration.
- The `llm_oracle` worker requires `OPENAI_API_KEY` or equivalent; it does not run in paper mode.
- `solana-ai-inference` staking and slashing only affect devnet funds in demo mode.
