# solana-ai-inference

Anchor program for an on-chain AI inference market: model registry, inference requests, validators, staking, quality scoring, protocol fees, slashing, and DNA generation records.

## Program ID

```text
3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc
```

The same ID is configured for localnet/devnet/mainnet in [`../Anchor.toml`](../Anchor.toml).

## What It Does

- Initializes protocol config and treasury.
- Registers AI models with endpoint, type, fee, and training status.
- Lets data providers submit and rate datasets.
- Lets users request model inference.
- Lets model authorities submit inference results.
- Tracks failed inference requests.
- Supports staking, unstake cooldowns, validator registration, and slashing.
- Records DNA generation metadata for agent/AI lineage.

## Why It Is Innovative

This program moves AI inference coordination onto Solana. It does not run the model on-chain; it creates an accountable market structure around who owns a model, who validates it, who pays for inference, and how confidence/reputation flows through the protocol.

## Key Instructions

| Group | Instructions |
| --- | --- |
| Admin | `initialize_protocol`, `set_paused`, `propose_admin`, `accept_admin`, `update_protocol_fee` |
| Models | `initialize_model`, `update_model`, `finalize_training` |
| Data | `submit_data`, `rate_data` |
| Inference | `request_inference`, `submit_inference_result`, `fail_inference` |
| Staking | `stake_tokens`, `request_unstake`, `execute_unstake` |
| Validators | `register_validator`, `slash_validator` |
| Agent DNA | `record_dna_generation` |

## Install and Build

```bash
cargo check --manifest-path programs/solana-ai-inference/Cargo.toml
cd programs
anchor build
```

## Program Accounts

The program uses Anchor PDAs for protocol config, model registries, inference requests, validators, stake records, and DNA records. See [`src/lib.rs`](./src/lib.rs) for exact seeds and account constraints.

## Deployment

```bash
cd programs
anchor deploy --provider.cluster devnet
solana program show 3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc --url devnet
```

## Safety Notes

- Protocol pause is admin-controlled.
- Fee updates are capped in program logic.
- Validator slashing is powerful and should be governed before mainnet.
- Off-chain model endpoints are not trustless; validators and confidence records are the accountability layer.

