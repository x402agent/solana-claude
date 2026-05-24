# ORE

ORE is a crypto mining protocol.


## API
- [`Consts`](api/src/consts.rs) – Program constants.
- [`Error`](api/src/error.rs) – Custom program errors.
- [`Event`](api/src/error.rs) – Custom program events.
- [`Instruction`](api/src/instruction.rs) – Declared instructions and arguments.

## Instructions

#### Mining
- [`Automate`](program/src/automate.rs) - Configures a new automation.
- [`Checkpoint`](program/src/checkpoint.rs) - Checkpoints rewards from an prior round.
- [`ClaimORE`](program/src/claim_ore.rs) - Claims ORE mining rewards.
- [`ClaimSOL`](program/src/claim_sol.rs) - Claims SOL mining rewards.
- [`Deploy`](program/src/deploy.rs) – Deploys SOL to claim space on the board.
- [`Initialize`](program/src/initialize.rs) - Initializes program variables.
- [`Log`](program/src/log.rs) – Logs non-truncatable event data.
- [`ReloadSOL`](program/src/reload_sol.rs) - Reloads SOL mining rewards into automation.
- [`Reset`](program/src/reset.rs) - Resets the board for a new round.

#### Admin
- [`Bury`](program/src/bury.rs) - Executes a buy-and-bury transaction.
- [`Wrap`](program/src/wrap.rs) - Wraps SOL in the treasury for swap transactions. 
- [`SetAdmin`](program/src/set_admin.rs) - Re-assigns the admin authority.
- [`SetFeeCollector`](program/src/set_admin.rs) - Updates the fee collection address.
- [`SetFeeRate`](program/src/set_admin.rs) - Updates the fee charged per swap.

## State
- [`Automation`](api/src/state/automation.rs) - Tracks automation configs. 
- [`Board`](api/src/state/board.rs) - Tracks the current round number and timestamps.
- [`Config`](api/src/state/config.rs) - Global program configs.
- [`Miner`](api/src/state/miner.rs) - Tracks a miner's game state.
- [`Round`](api/src/state/round.rs) - Tracks the game state of a given round.
- [`Treasury`](api/src/state/treasury.rs) - Mints, burns, and escrows ORE tokens. 


## Tests

To run the test suite, use the Solana toolchain: 

```
cargo test-sbf
```

For line coverage, use llvm-cov:

```
cargo llvm-cov
```

## Solana Clawd Integration

This workspace is vendored by the sibling [`../automaton-main`](../automaton-main) runtime. Solana Clawd uses `ore-cli` as the local protocol bridge for ORE board/miner status, automation setup, executor deploys, checkpointing, and reward claims.

```bash
# From repo root
npm run ore:build

# Raw ORE CLI bridge
KEYPAIR=~/.config/solana/id.json \
RPC=https://your-rpc.example \
COMMAND=board \
npm run ore:cli

# Automaton-managed miner loop
cd automaton-main
ORE_KEYPAIR=~/.config/solana/id.json \
ORE_RPC_URL=https://your-rpc.example \
pnpm ore:miner -- --ore-setup --ore-once \
  --ore-amount-sol 0.001 \
  --ore-deposit-sol 0.05 \
  --ore-strategy random \
  --ore-num-squares 1
```

The Solana Clawd wrapper requires explicit keypair/RPC inputs and explicit amount/deposit inputs before it sends spending transactions.
