# ClawdRouter Architecture

## Overview

ClawdRouter is a local-first LLM routing proxy designed for the Solana-native agent ecosystem. Every routing decision happens locally in <1ms — zero external API calls for classification.

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       Client Layer                            │
│  continue.dev │ Cursor │ VS Code │ OpenAI SDK │ Custom Agent │
└──────────────────────┬───────────────────────────────────────┘
                       │ POST /v1/chat/completions
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   ClawdRouter Proxy (:8402)                    │
│                                                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  15-Dimension    │  │  Tier Mapping    │  │  Profile      │ │
│  │  Scorer (<1ms)   │──│  SIMPLE/MED/     │──│  ECO/AUTO/    │ │
│  │                  │  │  COMPLEX/REASON  │  │  PREMIUM      │ │
│  └─────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Solana Wallet   │  │  x402 Payment    │  │  Model       │ │
│  │  Ed25519 Auth    │  │  USDC on Solana  │  │  Registry    │ │
│  │                  │  │                  │  │  55+ models  │ │
│  └─────────────────┘  └──────────────────┘  └──────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │ x402 USDC payment
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Upstream API (blockrun.ai)                  │
│                                                                │
│  OpenAI │ Anthropic │ Google │ xAI │ DeepSeek │ NVIDIA │ etc  │
└──────────────────────────────────────────────────────────────┘
```

## Request Flow

1. **Client sends request** to `http://localhost:8402/v1/chat/completions`
2. **Scorer analyzes** the request across 15 dimensions in <1ms
3. **Tier determination**: SIMPLE (score <0.20) → MEDIUM → COMPLEX → REASONING (score >0.70)
4. **Profile applies**: ECO (cheapest), AUTO (balanced), PREMIUM (best quality)
5. **Model selected** from TIER_MAPPING based on tier + profile
6. **x402 payment**: Request forwarded with Ed25519-signed USDC authorization
7. **Response returned** with routing metadata in headers

## 15-Dimension Scoring

| # | Dimension | Weight | What it detects |
|---|-----------|--------|-----------------|
| 1 | tokenCount | 8% | Input length → model capacity needed |
| 2 | complexity | 10% | Vocabulary diversity, sentence structure |
| 3 | technicalDepth | 10% | Domain-specific terminology density |
| 4 | codeGeneration | 12% | Code blocks, programming keywords |
| 5 | reasoning | 12% | "explain", "prove", logical patterns |
| 6 | creativity | 5% | "write", "compose", creative keywords |
| 7 | multiStep | 8% | "step by step", sequential markers |
| 8 | contextLength | 5% | How much context window is needed |
| 9 | toolUse | 6% | Function calling, tool invocation |
| 10 | vision | 4% | Image content or vision keywords |
| 11 | mathScience | 6% | Mathematical operations, algorithms |
| 12 | solanaSpecific | 4% | Solana/blockchain domain terms |
| 13 | agentAutonomy | 4% | Agent/pipeline/workflow patterns |
| 14 | structuredOutput | 3% | JSON/schema/format requirements |
| 15 | latencySensitivity | 3% | Short queries = more latency-sensitive |

## Directory Structure

```
clawdrouter/
├── src/
│   ├── index.ts              # CLI entry point & server startup
│   ├── types.ts              # All TypeScript interfaces
│   ├── router/
│   │   ├── scorer.ts         # 15-dimension request classifier
│   │   ├── profiles.ts       # ECO/AUTO/PREMIUM routing logic
│   │   └── tiers.ts          # Tier definitions & cost analysis
│   ├── models/
│   │   └── registry.ts       # 55+ model registry with pricing
│   ├── proxy/
│   │   └── server.ts         # OpenAI-compatible HTTP proxy
│   ├── wallet/
│   │   └── solana.ts         # Solana Ed25519 wallet management
│   ├── x402/
│   │   └── payment.ts        # x402 USDC payment protocol
│   └── commands/
│       └── slash.ts          # Slash command engine
├── tests/
│   ├── scorer.test.ts        # Scoring engine tests
│   └── router.test.ts        # Routing & registry tests
├── docs/
│   ├── architecture.md       # This file
│   ├── configuration.md      # Environment variables
│   └── routing-profiles.md   # Profile deep dive
├── package.json
├── tsconfig.json
└── README.md
```

## Integration with solana-clawd

ClawdRouter integrates with the existing solana-clawd ecosystem:

- **Vault**: Can read keypairs from `~/.clawd/vault/vault.json` via the `SolanaVault` class
- **x402 Service**: Compatible with `src/services/x402/` payment flow
- **Gateway**: Can act as an upstream for the gateway SSE transport
- **Grok Service**: Models include all Grok variants used by `src/services/grok.ts`

## Security Model

- **Wallet keys** stored with `0o600` permissions at `~/.clawd/clawdrouter/wallet.json`
- **Per-request limits** prevent overspending ($0.10 default)
- **Per-session limits** cap total spend ($5.00 default)
- **Non-custodial**: USDC stays in your wallet until each request is paid
- **Ed25519 signatures** — same cryptography as Solana transactions
