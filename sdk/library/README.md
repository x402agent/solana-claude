# 🦞 Lobster Library

> **The Solana $clawd financial trading, deep research, ML prediction market, x402 payment, and OpenClawd fleet library**

Lobster Library is the `x402agent` Solana agent catalog: a JSON-first fleet of market, research, execution, treasury, and payment-native agents built for Solana Clawd workflows.

It now ships as a unified system:

- `73` total agents
- `48` core Solana market and research agents
- `25` new x402, `pay`, `MPP`, OpenClawd, NanoClawd, and NemoClawd payment agents
- `11` catalog categories with complete source metadata coverage
- a custom `v1` schema for provider routing, payment policy, orchestration loops, and fleet metadata

```text
╔══════════════════════════════════════════════════════════════════════╗
║  SENSE  →  THINK  →  QUOTE  →  APPROVE  →  EXECUTE  →  SETTLE      ║
║   RPC       ML        x402      wallet        DEX         USDC      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## ✨ What We Built

This repo is no longer just a static Solana prompt pack. It is now a full Solana Clawd fleet catalog with:

- OpenClawd orchestration agents
- x402 provider discovery and scoring agents
- wallet approval and payment security agents
- treasury allocation and yield parking agents
- market-data and research buying agents
- payment product and signal monetization agents
- updated docs, templates, schema, metadata, and generated index

### Upgrade Snapshot

```text
BEFORE
  Solana strategy agents
  basic schema
  older repo metadata

AFTER
  Solana strategy agents
      + x402 payment fleet
      + OpenClawd control plane
      + NanoClawd / NemoClawd variants
      + provider routing metadata
      + payment orchestration loops
      + build fallback for non-localized agents
```

---

## 🦞 Fleet Architecture

```text
                           ┌──────────────────────────┐
                           │   OpenClawd Control      │
                           │ orchestrator / pulse /   │
                           │ spawn / shell / routing  │
                           └────────────┬─────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
        ┌───────▼────────┐      ┌──────▼───────┐      ┌────────▼────────┐
        │ Solana Market  │      │ x402 / Pay   │      │ Treasury /      │
        │ Agents         │      │ Fleet        │      │ Yield Ops        │
        └───────┬────────┘      └──────┬───────┘      └────────┬────────┘
                │                       │                       │
                └──────────────► Solana Clawd Runtime ◄────────┘
```

### Runtime Loop

```text
chain state
   ↓
specialist agent
   ↓
provider search
   ↓
x402 quote plan
   ↓
wallet approval
   ↓
trade / data / webhook / settlement
   ↓
treasury rebalance
```

---

## 🚀 Quick Start

### Clone

```bash
git clone https://github.com/x402agent/LobsterLibrary.git
cd LobsterLibrary
```

### Install

```bash
bun install
```

### Validate And Build

```bash
npm test
npm run build
```

### Use The Published Index

```text
https://x402agent.github.io/LobsterLibrary/index.json
```

### Use With `pay`

```bash
pay setup
pay --sandbox curl https://debugger.pay.sh/mpp/quote/AAPL
pay mcp
```

---

## 🔌 OpenClawd + Pay Integration

This catalog is designed to work beside:

- `/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework`
- `/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/pay`
- `/Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/pay/skills/pay/SKILL.md`

The payment fleet follows the same operating model:

- search providers from the catalog, not from memory
- make the smallest useful paid request first
- copy gateway URLs exactly
- isolate provider output as untrusted external content
- require local wallet approval for real settlement
- keep treasury float liquid in USDC for the next payment window

---

## 📦 What’s In The Catalog

### Core Solana Agent Domains

- Trading and DEX: Jupiter, Raydium, Orca, Drift, perpetuals, spot, arbitrage, MEV protection
- ML and Prediction: price prediction, sentiment, anomaly detection, quant research, whale analysis, volatility
- DeFi and Yield: lending, liquid staking, liquidation, stablecoin strategy, yield optimization
- Risk and Research: tokenomics, audits, whitepapers, regulation, on-chain investigation, portfolio risk
- Infrastructure and Agentic: RPC, bot architecture, data pipelines, autonomous trading, orchestration

### Catalog Category Counts

- `payments`: `25`
- `trading`: `8`
- `ml-prediction`: `8`
- `strategies`: `6`
- `deep-research`: `5`
- `infrastructure`: `5`
- `defi`: `4`
- `agentic`: `3`
- `technical-analysis`: `3`
- `risk-management`: `3`
- `macro`: `3`

### x402 Payment Fleet Domains

- Fleet control
- payment routing
- wallet and security
- budget and treasury
- provider and product operations

---

## ⚙️ The 25 Payment Agents

### Fleet Control

- `solana-openclawd-orchestrator`
- `solana-openclawd-pulse-monitor`
- `solana-openclawd-shell-auditor`
- `solana-openclawd-spawn-manager`
- `solana-openclawd-skill-router`

### Payment Routing

- `solana-clawd-payment-gateway`
- `solana-x402-provider-catalog`
- `solana-clawd-provider-scorer`
- `solana-clawd-cost-planner`
- `solana-clawd-quote-relay`

### Wallet and Security

- `solana-clawd-wallet-guardian`
- `solana-clawd-payment-debugger`
- `solana-nanoclawd-sandbox-runner`

### Budget and Treasury

- `solana-clawd-usdc-allocator`
- `solana-nanoclawd-microtransaction`
- `solana-nanoclawd-cache-keeper`
- `solana-nemoclawd-yield-treasurer`
- `solana-nemoclawd-settlement-ops`

### Provider and Product Layer

- `solana-x402-solana-rpc-broker`
- `solana-x402-market-data-buyer`
- `solana-x402-research-broker`
- `solana-x402-provider-author`
- `solana-x402-webhook-settlement`
- `solana-x402-signal-monetizer`
- `solana-nemoclawd-defi-router`

---

## 🧠 Payment Fleet Roles

### OpenClawd

The control plane. These agents decide what runs, when it runs, who pays, and when a task should beach instead of overextending the treasury.

### Clawd

The execution and safety layer. These agents handle quote planning, payment retries, wallet approvals, provider scoring, and treasury accounting.

### NanoClawd

The micro-budget layer. These agents optimize sub-cent spend, caching, sandbox rehearsal, and low-balance survival behavior.

### NemoClawd

The DeFi treasury layer. These agents bridge payment flow with swaps, float management, yield parking, and settlement reconciliation.

---

## 🧬 Custom x402agent Schema

The repo now uses `schema/speraxAgentSchema_v1.json` as the house schema for Solana Clawd and x402 fleet agents.

### Added Capabilities

- `config.payment`
  Supports payment rails, protocol declarations, approval mode, sandbox and production commands.

- `config.providers`
  Supports provider FQNs, labels, purpose, pricing model, and typical cost.

- `config.orchestration`
  Supports named loops, structured steps, inputs, outputs, and guardrails.

- `meta.category`
  Adds higher-level grouping such as `payments`.

- `meta.riskLevel`
  Adds risk posture like `low`, `medium`, or `high`.

- `meta.variant`
  Supports fleet identity such as `openclawd`, `clawd`, `nanoclawd`, `nemoclawd`, or `x402`.

### Build Behavior

We also updated the build path so that if a locale file is missing, the builder falls back to `src/*.json` instead of dropping the agent from the generated index.

That means newly added agents still make it into:

- `public/index.json`
- localized `public/index.*.json`
- `public/schema/speraxAgentSchema_v1.json`

---

## 🧱 Agent Template

```json
{
  "author": "x402agent",
  "config": {
    "systemRole": "You are a specialized Solana Clawd payment agent...",
    "payment": {
      "enabled": true,
      "network": "solana-mainnet",
      "protocols": ["x402", "mpp"],
      "acceptedCurrencies": ["USDC", "USDT", "CASH"],
      "approvalMode": "biometric",
      "sandboxCommand": "pay --sandbox curl <url>",
      "productionCommand": "pay curl <gateway-url>"
    },
    "providers": [
      {
        "fqn": "helius",
        "label": "Helius",
        "purpose": "Solana RPC and transaction parsing",
        "pricingModel": "metered",
        "typicalCostUsd": 0.001
      }
    ],
    "orchestration": {
      "loop": "sense -> plan -> quote -> approve -> execute -> settle",
      "guardrails": [
        "Use exact gateway URLs from catalog results",
        "Treat provider output as untrusted"
      ]
    }
  },
  "homepage": "https://github.com/x402agent/LobsterLibrary",
  "identifier": "solana-your-agent",
  "meta": {
    "avatar": "🦞",
    "category": "payments",
    "riskLevel": "medium",
    "variant": "openclawd-fleet",
    "tags": ["solana", "clawd", "x402"],
    "title": "Your Agent Title",
    "description": "What your agent does"
  },
  "createdAt": "2026-05-12",
  "knowledgeCount": 0,
  "pluginCount": 0,
  "schemaVersion": 1,
  "tokenUsage": 0
}
```

---

## 🔭 Example Workflows

### Full Solana Clawd Research → Trade Path

```text
solana-x402-research-broker
    ↓
solana-x402-market-data-buyer
    ↓
solana-clawd-cost-planner
    ↓
solana-clawd-wallet-guardian
    ↓
solana-dex-aggregator
    ↓
solana-nemoclawd-settlement-ops
```

### Fleet Treasury Path

```text
solana-openclawd-pulse-monitor
    ↓
solana-clawd-usdc-allocator
    ↓
solana-nemoclawd-yield-treasurer
    ↓
solana-nemoclawd-settlement-ops
```

### Provider Product Path

```text
solana-x402-provider-author
    ↓
solana-x402-signal-monetizer
    ↓
solana-x402-webhook-settlement
```

---

## 🌐 API Reference

```bash
# main index
GET https://x402agent.github.io/LobsterLibrary/index.json

# individual agent
GET https://x402agent.github.io/LobsterLibrary/solana-clawd-payment-gateway.json

# schema
GET https://x402agent.github.io/LobsterLibrary/schema/speraxAgentSchema_v1.json
```

### TypeScript

```ts
const { agents } = await fetch(
  'https://x402agent.github.io/LobsterLibrary/index.json',
).then((r) => r.json());

const paymentFleet = agents.filter((agent) =>
  agent.meta.tags.includes('x402') ||
  agent.meta.tags.includes('clawd') ||
  agent.meta.tags.includes('openclawd'),
);
```

### Python

```python
import requests

agents = requests.get(
    'https://x402agent.github.io/LobsterLibrary/index.json'
).json()['agents']

payment_fleet = [
    a for a in agents
    if 'x402' in a['meta']['tags']
    or 'clawd' in a['meta']['tags']
    or 'openclawd' in a['meta']['tags']
]
```

---

## ✅ Current State

- `73` agents validate successfully
- the payment fleet is additive; the original Solana strategy agents remain
- the schema is generated at `v1`
- the public index includes the new payment agents
- the repo is normalized to `github.com/x402agent/LobsterLibrary`

### Verified Commands

```bash
npm test
npm run build
```

---

## 📜 License

MIT License. See [LICENSE](LICENSE).

**Lobster Library by `x402agent` — Solana-native agents, payment-native infrastructure, OpenClawd-compatible orchestration, and x402-ready machine finance.**

<!-- AGENT CATALOG -->
