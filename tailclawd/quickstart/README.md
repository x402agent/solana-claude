# Welcome to iii

This is the iii quickstart project, it's intended to demonstrate how iii works,
teach the basics of using iii, and show the power of having seamless orchestration.

One of the first things you might notice is that the `workers/` folder contains
`client` and `payment-worker` TypeScript projects, a Rust `compute-worker`, and
a Python `data-worker`. For demonstration these workers are all in the
same project. The languages for each worker, and project structure are chosen
only for the convenience of demonstration.

These workers can easily be located in their own projects,
written in other languages, or already running on servers where
only API access is available.

Check the `workers/client/src/worker.ts` file to see how this works.
The iii Node SDK is functionally identical to the iii's SDKs for other languages.

## Prerequisites

### Required

- **iii engine** installed (see https://iii.dev/docs for details)
- **Node.js** (for client, and payment-worker)

### Optional

- **Docker** (to run workers via `docker compose` see step 2)
- **Python 3** (for data-worker when running natively)
- **Rust/Cargo** (for compute-worker when running natively)

## Quick Start

### 1. Start the iii engine

```bash
iii -c iii-config.yaml
```

### 2. Start the workers

#### Option A: Docker Compose

```bash
docker compose up --build
```

This will start the complete worker architecture.

#### Option B: Run each in a separate terminal

While it's not necessary to start all workers at least Client and Payment Worker
need to be running.

```bash
# Client (TypeScript orchestrator)
cd workers/client
npm install
npm run dev

# Payment Worker (TypeScript)
cd workers/payment-worker
npm install
npm run dev

# Compute Worker (Rust)
cd workers/compute-worker
cargo run

# Data Worker (Python)
cd workers/data-worker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python data_worker.py
```

### 3. Try it out

```bash
curl -X POST http://localhost:3111/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"hello from client"},"n":42}' | jq
```

If all workers are running the output will look like the below.
If some workers aren't the application will still run the available
workers and there will be error reports both in the JSON returned
and on the iii console output.

```json
{
  "client": "ok",
  "computeWorker": { "input": 42, "result": 84, "source": "compute-worker" },
  "dataWorker": {
    "keys": [
      "body",
      "headers",
      "method",
      "path",
      "path_params",
      "query_params",
      "trigger"
    ],
    "source": "data-worker",
    "transformed": {
      "body": { "data": { "message": "hello from client" }, "n": 42 },
      "headers": "...",
      "method": "POST",
      "path": "orchestrate",
      "trigger": "..."
    }
  },
  "errors": [],
  "externalWorker": {
    "body": { "message": "Payment recorded" },
    "source": "payment-worker",
    "status": 200
  }
}
```

Congratulations! This project executed functions across 3 languages, 4 worker boundaries,
with complete observability, and automatic asynchronous retries.

## Review the code

Look at `workers/client/src/worker.ts` and visit https://iii.dev/docs/concepts
to learn how iii connected all of these workers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      iii Engine                             │
│           (port 49134 (engine), 3111 (http))                │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
    ┌──────┴───┐ ┌────┴────┐ ┌───┴───┐ ┌────┴─────┐
    │  Client  │ │ Compute │ │ Data  │ │ Payment  │
    │   (TS)   │ │  (Rust) │ │  (Py) │ │   (TS)   │
    └──────────┘ └─────────┘ └───────┘ └──────────┘
```

Workers communicate via the iii engine regardless of language and with iii
performing the central orchestration it is possible to trigger functions across
processes, languages, workers, domains, and application boundaries.
