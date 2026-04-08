# Solana Worker Swarm Quickstart

This `tailclawd/quickstart` project is the iii-powered Solana worker swarm used by `solana-clawd`. It replaces the stock iii demo with a real cross-language architecture:

- `client` in TypeScript orchestrates HTTP requests and fans work out
- `compute-worker` in Rust handles risk scoring, priority fees, and Jupiter swap transaction building
- `data-worker` in Python handles wallet and token analytics over Solana RPC
- `payment-worker` in TypeScript validates transfers, submits transactions, and supports devnet airdrops

The point of the example is not the languages themselves. The point is that iii lets these workers behave like one system even when they run in different runtimes, processes, or machines.

Check [worker.ts](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/workers/client/src/worker.ts) first. That file shows the orchestration layer and the HTTP surface exposed through the iii engine.

## Prerequisites

### Required

- `iii` engine installed and on your `PATH`
- Node.js 20+ for `client` and `payment-worker`

### Optional

- Docker for `docker compose`
- Python 3 for `data-worker`
- Rust/Cargo for `compute-worker`
- `HELIUS_API_KEY` for improved Solana RPC access
- `SOLANA_RPC_URL` if you do not want to use the default mainnet RPC

## Quick Start

### 1. Start the iii engine

From [quickstart](/Users/8bit/fraud/solana-claude/tailclawd/quickstart):

```bash
iii -c iii-config.yaml
```

The engine exposes:

- WebSocket worker bridge on `ws://localhost:49134`
- HTTP API on `http://localhost:3111`

### 2. Start the workers

#### Option A: Docker Compose

```bash
docker compose up --build
```

This starts all four workers and connects them to the host iii engine through `host.docker.internal`.

#### Option B: Run each worker natively

At minimum, the orchestrator in `workers/client` should be running. The more workers you start, the richer the responses become.

```bash
# Client orchestrator (TypeScript)
cd workers/client
npm install
npm run dev

# Payment worker (TypeScript)
cd ../payment-worker
npm install
npm run dev

# Compute worker (Rust)
cd ../compute-worker
cargo run

# Data worker (Python)
cd ../data-worker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python data_worker.py
```

## Try It Out

### Health

```bash
curl http://localhost:3111/health
```

Expected shape:

```json
{
  "healthy": true,
  "service": "solana-clawd-orchestrator",
  "rpc": "https://api.mainnet-beta.solana.com",
  "workers": ["data-worker", "compute-worker", "payment-worker"]
}
```

### Wallet lookup

```bash
curl -X POST http://localhost:3111/wallet \
  -H "Content-Type: application/json" \
  -d '{"address":"So11111111111111111111111111111111111111112"}'
```

The orchestrator fans out to:

- `data-worker::wallet_balance`
- `data-worker::wallet_tokens`

### Token research

```bash
curl -X POST http://localhost:3111/research \
  -H "Content-Type: application/json" \
  -d '{"mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'
```

The response combines:

- token analytics from Python
- heuristic risk scoring from Rust

### Swap flow

```bash
curl -X POST http://localhost:3111/swap \
  -H "Content-Type: application/json" \
  -d '{
    "input_mint":"So11111111111111111111111111111111111111112",
    "output_mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "amount_lamports":100000000,
    "slippage_bps":100,
    "wallet":"YOUR_WALLET_ADDRESS"
  }'
```

This path uses:

1. `compute-worker::build_swap_tx` for a Jupiter-routed swap transaction
2. `payment-worker::submit_transaction` for submission

### Full orchestration demo

This retains the backwards-compatible iii demo path, but uses the Solana workers:

```bash
curl -X POST http://localhost:3111/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"hello from solana-clawd"},"n":42}' | jq
```

Typical response:

```json
{
  "errors": [],
  "dataWorker": {
    "source": "data-worker",
    "transformed": {
      "message": "hello from solana-clawd"
    },
    "keys": ["message"]
  },
  "computeWorker": {
    "input": 42,
    "result": 84,
    "source": "compute-worker"
  },
  "paymentWorker": {
    "status": 200,
    "body": {
      "message": "Payment recorded",
      "charge": 0.0001
    },
    "source": "payment-worker"
  }
}
```

If one or more workers are offline, the client still returns partial results plus error entries. That is part of the point of the demo: iii gives you a unified orchestration layer, not an all-or-nothing monolith.

## HTTP Surface

The client worker registers these HTTP endpoints through iii:

- `GET /health`
- `POST /wallet`
- `POST /research`
- `POST /swap`
- `POST /transfer`
- `GET /fees`
- `POST /orchestrate`

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      iii Engine                             │
│           (port 49134 bridge, port 3111 http)              │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
    ┌──────┴───┐ ┌────┴────┐ ┌───┴──────┐ ┌─┴────────────┐
    │  Client  │ │ Compute │ │   Data   │ │   Payment    │
    │   (TS)   │ │  (Rust) │ │ (Python) │ │    (TS)      │
    └──────────┘ └─────────┘ └──────────┘ └──────────────┘
```

Worker responsibilities:

- `client` orchestrates wallet, research, transfer, fee, and swap routes
- `compute-worker` provides `compute`, `priority_fees`, `risk_score`, and `build_swap_tx`
- `data-worker` provides `transform`, `wallet_balance`, `wallet_tokens`, and `token_analytics`
- `payment-worker` provides `record`, `submit_transaction`, `transfer`, and `airdrop`

## Relevant Files

- [worker.ts](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/workers/client/src/worker.ts)
- [main.rs](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/workers/compute-worker/src/main.rs)
- [data_worker.py](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/workers/data-worker/data_worker.py)
- [external-worker.ts](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/workers/payment-worker/src/external-worker.ts)
- [docker-compose.yaml](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/docker-compose.yaml)
- [iii-config.yaml](/Users/8bit/fraud/solana-claude/tailclawd/quickstart/iii-config.yaml)

## Environment

Useful environment variables:

- `III_BRIDGE_URL`
- `SOLANA_RPC_URL`
- `HELIUS_API_KEY`
- `III_HOST_USER_ID`

The compose file already passes these through where needed.
