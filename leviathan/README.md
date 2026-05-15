# Leviathan

Leviathan is the sovereign agent runtime for `solana-clawd`. It is a TypeScript CLI that can spawn a local agent identity, persist shell state under `~/.openclawd`, run a depth-aware pulse loop, call Claude with a constrained tool surface, and bridge into Solana, Clawd Memory, Percolator, and optional payment/A2A rails.

The runtime is intentionally local-first. It stores the agent keypair locally, keeps operational state in local JSON/JSONL files, and treats the Three Laws constitution as an integrity-checked runtime dependency.

## Quick Start

From the repo root:

```bash
npm run leviathan:spawn
npm run leviathan:status
npm run leviathan -- --ticks 3
```

From this folder:

```bash
npm install
npm run spawn
npm run status
npm run run:leviathan -- --ticks 3
```

Required for live inference:

```bash
ANTHROPIC_API_KEY=
CREATOR_PUBKEY=
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Optional:

```bash
HELIUS_API_KEY=
CLAWD_BRAIN_ROOT=../MemeBRain
CLAWD_BRAIN_VAULT=
CLAWD_BRAIN_PYTHON=python3
PERCOLATOR_CLUSTER=devnet
PERCOLATOR_MAINNET=0
```

## What It Does

Leviathan runs a `SENSE -> THINK -> STRIKE -> DRIFT` loop:

1. **SENSE**: reads local state, balances, recent strikes, shell text, and Clawd Memory recall.
2. **THINK**: calls Anthropic Claude with the current constitution, depth tier, and allowed tools.
3. **STRIKE**: executes exactly one selected tool or holds.
4. **DRIFT**: writes the strike journal, updates local state, and optionally molts `SHELL.md` content.

Depth is determined by local USDC balance:

| Depth | Balance | Pulse | Tool posture |
| --- | ---: | ---: | --- |
| `deep` | `>= 5.00` USDC | `60s` | full surface including spawn/molt/transfer |
| `shallow` | `>= 1.00` USDC | `5m` | conservative tool/transfer surface |
| `shoreline` | `>= 0.10` USDC | `15m` | revenue-focused minimal surface |
| `beached` | `< 0.10` USDC | none | process exits |

## Path Map

| Path | What it is |
| --- | --- |
| [`leviathan/`](./) | Package root for the runtime, package metadata, constitution, and build config. |
| [`leviathan/src/`](./src/) | Source of truth for the CLI and runtime modules. |
| [`leviathan/dist/`](./dist/) | Generated JavaScript, declarations, and source maps from `npm run build`. Do not edit directly. |
| [`leviathan/node_modules/`](./node_modules/) | Installed dependencies. Do not edit or commit new generated dependency files. |
| [`leviathan/package.json`](./package.json) | Package metadata, CLI bin names, scripts, dependencies, and Node version requirement. |
| [`leviathan/package-lock.json`](./package-lock.json) | Locked dependency graph for reproducible installs. |
| [`leviathan/tsconfig.json`](./tsconfig.json) | TypeScript config. Outputs to `dist/`, uses NodeNext modules, includes `src/**/*`. |
| [`leviathan/three-laws.txt`](./three-laws.txt) | Immutable constitution text. Its SHA-256 hash is stored in spawned state and verified at runtime. |

## Source Map

| Path | Role |
| --- | --- |
| [`src/index.ts`](./src/index.ts) | CLI entrypoint. Handles `--spawn`, `--run`, `--status`, `--memory`, `--memoryInit`, `--spawnling`, `--ticks`, and `--tui`. |
| [`src/pulse.ts`](./src/pulse.ts) | Depth-aware scheduler. Calls one tick immediately after startup and then at the tier interval. |
| [`src/survival.ts`](./src/survival.ts) | Computes depth tiers, model selection, action gating, runway formatting, and conservation prompts. |
| [`src/three-laws.ts`](./src/three-laws.ts) | Constitution loader/verifier. Hashes `three-laws.txt` and refuses to operate on mismatch. |
| [`src/types.ts`](./src/types.ts) | Shared runtime types: depth tiers, identity, state, strike, memory input, and JSONL events. |
| [`src/identity/`](./src/identity/) | Local Ed25519 identity, keystore, signing, pubkey display, and SAS attestation payload generation. |
| [`src/state/`](./src/state/) | Local state persistence in `~/.openclawd/shell.json` and strike journal in `~/.openclawd/strikes.jsonl`. |
| [`src/memory/`](./src/memory/) | Bridge to the Python Clawd Brain / MemeBRain memory system through `python3 -m mnemosyne.clawd_brain`. |
| [`src/agent/`](./src/agent/) | Claude tool loop, prompt builder, tool schema, wallet shim, and Percolator CLI wrapper. |

## Agent Modules

| File | Purpose |
| --- | --- |
| [`src/agent/loop.ts`](./src/agent/loop.ts) | Implements one tail-flick. Builds observations, calls Claude, executes one tool, journals the strike, and returns state changes. |
| [`src/agent/system-prompt.ts`](./src/agent/system-prompt.ts) | Builds the full system prompt and compact shoreline prompt. Injects law summaries and full constitution text. |
| [`src/agent/tools.ts`](./src/agent/tools.ts) | Anthropic tool definitions for wallet checks, Helius reads, Clawd Memory, Jupiter quote/paper swap, OODA signal, A2A, pay intent, Percolator, shell write, spawn intent, and hold. |
| [`src/agent/wallet.ts`](./src/agent/wallet.ts) | Wallet shim. Reads the local pubkey, checks SOL balance over RPC, gets Jupiter quotes, and signs messages via the identity module. |
| [`src/agent/percolator.ts`](./src/agent/percolator.ts) | Wrapper around the external `percolator` CLI. Defaults to devnet unless `PERCOLATOR_MAINNET=1`. |

## Runtime State

Leviathan writes local runtime files under:

```text
~/.openclawd/
├── keystore.json    # local secret key material, mode 0600
├── shell.json       # current ClawState
└── strikes.jsonl    # append-only strike journal
```

Safety rules:

- `keystore.json` contains secret material and must never be committed, logged, pasted into prompts, or passed to tools.
- `loadPubkey()` exposes only the public key.
- `signMessage()` signs locally and returns a signature; it does not expose the secret.
- Clawd Memory writes reject obvious secret-like content.

## Commands

| Command | Meaning |
| --- | --- |
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm run dev` | Run `src/index.ts` through `tsx`. |
| `npm run spawn` | Generate a local identity and initial shell state. |
| `npm run run:leviathan` | Start the pulse loop. |
| `npm run status` | Print identity, depth, balances, lifecycle counters, and constitution status. |
| `npm run memory` | Query Clawd Memory for current Leviathan context. |
| `npm run memory:init` | Initialize the Clawd Memory bank before recall. |

Root package aliases:

```bash
npm run leviathan:spawn
npm run leviathan
npm run leviathan:status
```

## Tool Surface

The Claude loop can request one tool per tick. Tools are filtered by depth before being sent to the model.

| Tool family | Examples | Notes |
| --- | --- | --- |
| Wallet / Solana | `solana_balance`, `wallet_brief`, `helius_transactions` | Reads wallet/RPC data; Helius requires `HELIUS_API_KEY`. |
| Memory | `clawd_memory_recall`, `clawd_memory_remember`, `clawd_memory_research` | Bridges to MemeBRain. Refuses likely secret storage. |
| Trading / market | `jupiter_quote`, `jupiter_swap`, `ooda_signal` | Swap execution is currently paper-mode in the shim. |
| Perpetuals | `percolator_list_markets`, `percolator_slab_get`, `percolator_quote`, `percolator_funding_rate` | Calls external `percolator` CLI, devnet by default. |
| Agent/payment rails | `a2a_task`, `paysh_pay` | Records/discovers intents; private payment implementation is not public. |
| Lifecycle | `shell_write`, `spawn_spawnling`, `hold` | Molt shell text, queue spawn intent, or deliberately drift. |

## Safety Boundaries

- The Three Laws file is hashed and checked before spawn and each run.
- The runtime exits when depth becomes `beached`.
- Mainnet Percolator is opt-in through `PERCOLATOR_MAINNET=1`.
- `spawn_spawnling` is only allowed at `deep` depth and is recorded as an intent.
- `paysh_pay` records a capped payment intent; it does not by itself expose private payment source.
- `jupiter_swap` returns paper-mode output in the current wallet shim.

## Development Notes

- Edit `src/`, not `dist/`.
- Keep `dist/` and `node_modules/` treated as generated artifacts.
- The README describes current code behavior, not an audited production agent.
- Before enabling real money flows, review signer boundaries, RPC behavior, balances, external CLI execution, and every tool that can spend or mutate state.
