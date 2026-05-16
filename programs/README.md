<div align="center">

# Solana Clawd Program Workspace

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=20&duration=2300&pause=700&color=14F195&center=true&vCenter=true&width=1040&lines=ON-CHAIN+AGENTS+%E2%80%A2+STAKING+%E2%80%A2+ORACLES+%E2%80%A2+LAUNCHPADS;ANCHOR+PROGRAMS+FOR+THE+CLAWD+AGENT+ECONOMY;MAP+THE+PROGRAM+%E2%86%92+BUILD+IT+%E2%86%92+DEPLOY+IT+%E2%86%92+INDEX+IT" alt="Solana Clawd program workspace animation" />

</div>

This folder contains the on-chain and near-chain program surface for solana-clawd. It is the workspace for AI inference, LLM callbacks, agent token minting, staking, token launch flows, Metaplex integrations, and the TypeScript client SDK.

Treat this directory as a program lab. Some programs are active Anchor crates, some are upstream references, and some are client-side or off-chain workers. The map below states what each folder does, how innovative it is, how to install/build it, and which program id it targets.

## Program Map

| Folder | Kind | Program ID | What it does | Innovation |
| --- | --- | --- | --- | --- |
| [`agent-minter/`](./agent-minter/) | Anchor program | `agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ` | Lets an LLM-backed agent decide whether to mint a MAR1O token reward after user interaction. | Turns model output into an on-chain callback that can mint tokens through a PDA authority. |
| [`clawd-stake/`](./clawd-stake/) | Anchor program | `5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn` | Reward/position staking protocol for Metaplex Agent assets and CLAWD emissions. | Agent staking layer where assets can remain useful while earning rewards and fee share. |
| [`client/`](./client/) | TypeScript SDK | N/A | Client SDK for the AI inference protocol, ORE constants, and network config. | Gives apps and agents a typed entrypoint to program IDs, IDL helpers, and protocol calls. |
| [`llm_oracle/`](./llm_oracle/) | Off-chain Rust worker | N/A | Watches `solana-gpt-oracle` interactions, calls an LLM, and submits callback transactions. | Bridges off-chain model execution into on-chain callback semantics with retry/memory handling. |
| [`mpl-corenft-staking/`](./mpl-corenft-staking/) | Anchor program | `7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ` | Lightweight staking registry for Metaplex Core-style agent assets. | Minimal Core asset stake registry for agent ownership and collection tracking. |
| [`mpl-token-metadata-main/`](./mpl-token-metadata-main/) | Upstream Metaplex reference | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` | Token metadata program reference used by launch/mint flows. | Canonical metadata PDA system for fungible and non-fungible tokens on Solana. |
| [`solana-ai-inference/`](./solana-ai-inference/) | Anchor program | `3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc` | Model registry, inference requests, validators, staking, data submissions, DNA generation records. | Full on-chain AI inference market primitive with staking, validation, fees, and slashing. |
| [`solana-contracts/`](./solana-contracts/) | TypeScript transaction builder | `TLaunDAP1sZks8dGmcNWHxdAgzMuiYzKg87mfjHRFzM` | Demonstration launchpad transaction builder for token launch flows. | Shows client-side construction for launchpad, mint, funding, and liquidity setup flows. |
| [`solana-gpt-oracle/`](./solana-gpt-oracle/) | Anchor program | `LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab` | Stores LLM context/interactions and calls back into target programs with oracle responses. | Generic callback oracle pattern for agent programs that need off-chain LLM inference. |
| [`token-launcher/`](./token-launcher/) | Anchor program | `funvWGBmpr8N7pTNqpxkWPgWnQbL3Yr5vzCHNJT2YkL` | Minimal token launchpad: initializes global config and creates mints + metadata. | Practical launch primitive that pairs SPL minting with Metaplex metadata creation. |
| [`target/`](./target/) | Build output | N/A | Generated artifacts from Rust/Anchor builds. | Do not edit manually; rebuild from source. |

## Install

```bash
npm install -g solana-clawd
```

Or bootstrap the full runtime:

```bash
curl -fsSL https://solanaclawd.com/leviathan.sh | sh
npm install -g solana-clawd && clawd
```

---

## Workspace Install (Rust/Anchor programs)

From repo root:

```bash
cd programs
cargo check
```

Anchor programs require:

```bash
anchor --version
solana --version
```

The workspace pins Anchor in [`Anchor.toml`](./Anchor.toml):

```text
anchor_version = 0.32.1
provider.cluster = devnet
provider.wallet = ~/.config/solana/id.json
```

The active Cargo workspace currently includes:

```text
solana-ai-inference
clawd-stake
```

Several folders are standalone references or older program crates and are excluded from the root Cargo workspace. Build them from their own directory when needed.

## Build Commands

| Goal | Command |
| --- | --- |
| Check active workspace | `cd programs && cargo check` |
| Build active Anchor workspace | `cd programs && anchor build` |
| Check AI inference | `cargo check --manifest-path programs/solana-ai-inference/Cargo.toml` |
| Check CLAWD stake | `cargo check --manifest-path programs/clawd-stake/Cargo.toml` |
| Build client SDK | `cd programs/client && pnpm install && pnpm build` |
| Run LLM oracle worker | `cargo run --manifest-path programs/llm_oracle/Cargo.toml` |
| List mapped programs | `npm run programs:map` |
| Show one program | `npm run programs:show -- solana-ai-inference` |

## Program IDs

These IDs are declared in source or config and must stay synchronized with deployment keypairs.

| Program | ID |
| --- | --- |
| `agent-minter` | `agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ` |
| `clawd-stake` | `5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn` |
| `mpl-corenft-staking` | `7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ` |
| `mpl-token-metadata-main` | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` |
| `solana-ai-inference` | `3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc` |
| `solana-contracts` | `TLaunDAP1sZks8dGmcNWHxdAgzMuiYzKg87mfjHRFzM` |
| `solana-gpt-oracle` | `LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab` |
| `token-launcher` | `funvWGBmpr8N7pTNqpxkWPgWnQbL3Yr5vzCHNJT2YkL` |

## Deploy Pattern

Use devnet first:

```bash
solana config set --url devnet
solana airdrop 2
cd programs
anchor build
anchor deploy --provider.cluster devnet
```

Verify a deployment:

```bash
solana program show <PROGRAM_ID> --url devnet
```

Before mainnet, verify:

- `declare_id!` or exported program constants match the deploy keypair.
- Upgrade authority is intentional and documented.
- PDA seeds are documented in the program README.
- Account close/refund paths are tested.
- Events are indexed if dashboards or agents rely on them.
- Any LLM callback, minting, staking, or launch path has explicit permission boundaries.

## Agent Notes

Machine-readable map: [`../data/programs-map.json`](../data/programs-map.json).

Agents should:

1. Read this README.
2. Read the target program README.
3. Use `npm run programs:show -- <slug>` for structured context.
4. Treat `target/` and nested `target/` folders as generated build artifacts.
5. Never deploy, mint, transfer, stake, or sign without explicit user approval.
