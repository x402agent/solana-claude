<div align="center">

<h1>🔀 ClawdRouter</h1>

<h3>The LLM router built for autonomous Solana agents</h3>

<p>Agents can't sign up for accounts. Agents can't enter credit cards.<br>
Agents can only sign transactions.<br><br>
<strong>ClawdRouter is the only LLM router that lets Solana agents operate independently.</strong></p>

<br>

<img src="https://img.shields.io/badge/🤖_Agent--Native-black?style=for-the-badge" alt="Agent native">&nbsp;
<img src="https://img.shields.io/badge/🔑_Solana_Wallet_Auth-9945FF?style=for-the-badge" alt="Solana wallet auth">&nbsp;
<img src="https://img.shields.io/badge/⚡_Local_Routing-yellow?style=for-the-badge" alt="Local routing">&nbsp;
<img src="https://img.shields.io/badge/💰_x402_USDC-purple?style=for-the-badge" alt="x402 USDC">&nbsp;
<img src="https://img.shields.io/badge/🔓_MIT_Licensed-green?style=for-the-badge" alt="MIT licensed">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Solana](https://img.shields.io/badge/Solana-USDC-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com)
[![x402 Protocol](https://img.shields.io/badge/x402-Micropayments-purple?style=flat-square)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

> **ClawdRouter** is the Solana-native LLM router for the [solana-clawd](https://github.com/x402agent/solana-clawd) ecosystem. It reduces AI API costs by up to 92% by analyzing each request across 15 dimensions and routing to the cheapest capable model in under 1ms — entirely locally. Ed25519 wallet signatures for authentication (no API keys), USDC micropayments via x402 on Solana (no credit cards). 55+ models from OpenAI, Anthropic, Google, xAI, DeepSeek, NVIDIA, and more.

---

## Why ClawdRouter Exists

Every other LLM router was built for **human developers** — create an account, get an API key, pick a model, pay with a credit card.

**Solana agents can't do any of that. They can only sign transactions.**

ClawdRouter is built for the Solana-first agent world:

- **No accounts** — an Ed25519 keypair is generated locally, no signup
- **No API keys** — your Solana wallet signature IS authentication
- **No model selection** — 15-dimension scoring picks the right model automatically
- **No credit cards** — agents pay per-request with USDC on Solana via [x402](https://x402.org)
- **No trust required** — runs locally, <1ms routing, zero external dependencies

This is the stack that lets Solana agents operate autonomously: **x402 + USDC + Ed25519 + local routing**.

---

## How It Compares

|                  | OpenRouter        | LiteLLM          | Martian           | Portkey           | **ClawdRouter**          |
| ---------------- | ----------------- | ---------------- | ----------------- | ----------------- | ----------------------- |
| **Models**       | 200+              | 100+             | Smart routing     | Gateway           | **55+**                 |
| **Routing**      | Manual selection  | Manual selection | Smart (closed)    | Observability     | **Smart (open source)** |
| **Auth**         | Account + API key | Your API keys    | Account + API key | Account + API key | **Solana Ed25519**      |
| **Payment**      | Credit card       | BYO keys         | Credit card       | $49-499/mo        | **USDC on Solana**      |
| **Runs locally** | No                | Yes              | No                | No                | **Yes**                 |
| **Open source**  | No                | Yes              | No                | Partial           | **Yes**                 |
| **Solana-native**| No                | No               | No                | No                | **Yes**                 |
| **Agent-ready**  | No                | No               | No                | No                | **Yes**                 |

✓ Open source · ✓ Smart routing · ✓ Runs locally · ✓ Solana native · ✓ Agent ready

**We're the only one that checks all five boxes.**

---

## Quick Start

### 1. Start the proxy

```bash
cd clawdrouter
npm install
npx tsx src/index.ts
```

### 2. Fund your wallet

Your Solana wallet address is printed on first run. Send a few USDC on Solana — $5 covers thousands of requests.

### 3. Point your client at `http://localhost:8402`

<details>
<summary><strong>continue.dev</strong> — <code>~/.continue/config.yaml</code></summary>

```yaml
models:
  - name: ClawdRouter Auto
    provider: openai
    model: clawdrouter/auto
    apiBase: http://localhost:8402/v1/
    apiKey: x402
    roles:
      - chat
      - edit
      - apply
```

</details>

<details>
<summary><strong>Cursor</strong> — Settings → Models → OpenAI-compatible</summary>

Set base URL to `http://localhost:8402`, API key to `x402`, model to `clawdrouter/auto`.

</details>

<details>
<summary><strong>Any OpenAI SDK</strong></summary>

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8402", api_key="x402")
response = client.chat.completions.create(
    model="clawdrouter/auto",
    messages=[{"role": "user", "content": "Write a Solana program"}]
)
```

```typescript
import OpenAI from 'openai';

const client = new OpenAI({ baseURL: 'http://localhost:8402', apiKey: 'x402' });
const response = await client.chat.completions.create({
  model: 'clawdrouter/auto',
  messages: [{ role: 'user', content: 'Write a Solana program' }],
});
```

</details>

---

## Routing Profiles

Choose your routing strategy with `/model <profile>`:

| Profile          | Strategy           | Savings | Best For         |
| ---------------- | ------------------ | ------- | ---------------- |
| `/model auto`    | Balanced (default) | 74-100% | General use      |
| `/model eco`     | Cheapest possible  | 95-100% | Maximum savings  |
| `/model premium` | Best quality       | 0%      | Mission-critical |

**Shortcuts:** `/model grok`, `/model claude`, `/model opus`, `/model gemini`, `/model free`

---

## How It Works

**100% local routing. <1ms latency. Zero external API calls for classification.**

```
Request → 15-Dimension Scorer → Tier → Profile → Best Model → x402 USDC → Response
```

| Tier      | ECO Model                           | AUTO Model                            | PREMIUM Model                |
| --------- | ----------------------------------- | ------------------------------------- | ---------------------------- |
| SIMPLE    | nvidia/gpt-oss-120b (**FREE**)      | gemini-2.5-flash ($0.30/$2.50)        | kimi-k2.5                    |
| MEDIUM    | gemini-2.5-flash-lite ($0.10/$0.40) | kimi-k2.5 ($0.55/$2.50)              | gpt-5.3-codex ($1.75/$14.00) |
| COMPLEX   | gemini-2.5-flash-lite ($0.10/$0.40) | gemini-3.1-pro ($2/$12)              | claude-opus-4.6 ($5/$25)     |
| REASONING | grok-4-1-fast ($0.20/$0.50)         | grok-4-1-fast-reasoning ($0.20/$0.50) | claude-sonnet-4.6 ($3/$15)   |

**Blended average: ~$2.05/M** vs $25/M for Claude Opus = **92% savings**

### 15-Dimension Scoring

Each request is scored across these dimensions (all <1ms, local):

| # | Dimension | Weight | Detects |
|---|-----------|--------|---------|
| 1 | Token Count | 8% | Input length → model capacity |
| 2 | Complexity | 10% | Vocabulary diversity |
| 3 | Technical Depth | 10% | Domain-specific terms |
| 4 | Code Generation | 12% | Programming patterns |
| 5 | Reasoning | 12% | Logical analysis patterns |
| 6 | Creativity | 5% | Creative writing signals |
| 7 | Multi-Step | 8% | Sequential planning |
| 8 | Context Length | 5% | Context window needs |
| 9 | Tool Use | 6% | Function calling |
| 10 | Vision | 4% | Image understanding |
| 11 | Math/Science | 6% | Computation needs |
| 12 | **Solana-Specific** | 4% | Blockchain/DeFi domain |
| 13 | Agent Autonomy | 4% | Agent patterns |
| 14 | Structured Output | 3% | JSON/schema needs |
| 15 | Latency Sensitivity | 3% | Response speed needs |

---

## Models & Pricing

55+ models across 9 providers, one Solana wallet. **Starting at $0/request.**

### Free Models (11 models, $0)

| Model | Context | Features |
|-------|---------|----------|
| nvidia/gpt-oss-120b | 128K | — |
| nvidia/nemotron-ultra-253b | 131K | reasoning |
| nvidia/deepseek-v3.2 | 131K | reasoning |
| nvidia/mistral-large-3-675b | 131K | reasoning |
| nvidia/qwen3-coder-480b | 131K | code |
| nvidia/devstral-2-123b | 131K | code |
| nvidia/llama-4-maverick | 131K | reasoning |
| + 4 more | | |

### Budget Models ($0.0002–$0.0018/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| openai/gpt-5-nano | $0.05 | $0.40 | $0.0002 |
| google/gemini-2.5-flash-lite | $0.10 | $0.40 | $0.0003 |
| xai/grok-4-1-fast-reasoning | $0.20 | $0.50 | $0.0004 |
| google/gemini-2.5-flash | $0.30 | $2.50 | $0.0014 |
| moonshot/kimi-k2.5 | $0.60 | $3.00 | $0.0018 |

### Mid-Range Models ($0.002–$0.009/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| anthropic/claude-haiku-4.5 | $1.00 | $5.00 | $0.0030 |
| google/gemini-2.5-pro | $1.25 | $10.00 | $0.0056 |
| openai/gpt-5.3-codex | $1.75 | $14.00 | $0.0079 |
| google/gemini-3.1-pro | $2.00 | $12.00 | $0.0070 |
| openai/gpt-5.4 | $2.50 | $15.00 | $0.0088 |

### Premium Models ($0.009+/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| anthropic/claude-sonnet-4.6 | $3.00 | $15.00 | $0.0090 |
| anthropic/claude-opus-4.6 | $5.00 | $25.00 | $0.0150 |
| openai/o1 | $15.00 | $60.00 | $0.0375 |
| openai/gpt-5.4-pro | $30.00 | $180.00 | $0.1050 |

---

## Payment

No account. No API key. **Your Solana wallet IS your identity.**

```
Request → 402 (price: $0.003) → Ed25519 signs USDC → retry → response
```

USDC stays in your wallet until spent — non-custodial. Price is visible in the 402 header before signing.

**Solana-first:** Pay with **USDC on Solana mainnet**. Ed25519 keypair generated on first run.

### Slash Commands

```bash
/wallet              # Check balance and address
/wallet export       # Export mnemonic + keys for backup
/wallet recover      # Restore wallet from mnemonic
/wallet solana       # Ensure Solana mainnet payments
/wallet devnet       # Switch to devnet (testing)
/stats               # View usage and savings
/stats clear         # Reset usage statistics
/model auto          # Switch to balanced routing
/model eco           # Switch to cheapest routing
/model premium       # Switch to best quality
/model free          # Show free models
/models              # List all 55+ models with pricing
/tiers               # Show tier breakdown and costs
/exclude             # Show excluded models
/exclude add <model> # Block a model from routing
/exclude clear       # Remove all exclusions
/help                # Show all commands
```

**Fund your wallet:**

- Send USDC on Solana to the address printed on first run
- $5 USDC covers thousands of requests

---

## CLI Commands

```bash
# Start the proxy server (default)
npx tsx src/index.ts

# Run diagnostics
npx tsx src/index.ts doctor

# List all models with pricing
npx tsx src/index.ts models

# Show tier cost breakdown
npx tsx src/index.ts tiers

# Show routing profiles
npx tsx src/index.ts profiles

# Test the 15-dimension scorer
npx tsx src/index.ts score "Write a Solana program for token staking"

# Show wallet info
npx tsx src/index.ts wallet

# Show version
npx tsx src/index.ts version
```

---

## Configuration

For basic usage, no configuration needed. For advanced options:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWDROUTER_PORT` | `8402` | Local proxy port |
| `CLAWDROUTER_PROFILE` | `auto` | Routing: auto, eco, premium |
| `CLAWDROUTER_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC |
| `CLAWDROUTER_NETWORK` | `solana-mainnet` | solana-mainnet or solana-devnet |
| `CLAWDROUTER_MAX_PER_REQUEST` | `0.10` | Max USDC per request |
| `CLAWDROUTER_MAX_PER_SESSION` | `5.00` | Max USDC per session |
| `CLAWDROUTER_DEBUG` | `false` | Debug logging |

**Full reference:** [docs/configuration.md](docs/configuration.md)

---

## Troubleshooting

**Run the doctor:**

```bash
npx tsx src/index.ts doctor
```

```
🩺 ClawdRouter Doctor v0.1.0
═══════════════════════════════════════════════════════

System
  ✓ OS: darwin arm64
  ✓ Node: v20.11.0

Wallet
  ✓ Address: 7xKXt...abc
  ✓ SOL: 0.0500
  ✓ USDC: $12.50

Network
  ✓ Upstream API: reachable (200)
  ✗ Local proxy: not running on :8402
  ✓ Solana RPC: reachable

Models
  ✓ Registry: 55 models
  ✓ Free: 11 models
  ✓ Providers: 9
```

---

## Development

```bash
# Clone the repo
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd/clawdrouter

# Install dependencies
npm install

# Start dev server
npx tsx src/index.ts

# Run tests
npx tsx --test tests/*.test.ts

# Build for production
npm run build
```

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full technical deep dive.

```
Client → ClawdRouter Proxy (:8402) → 15-Dim Scorer → Tier/Profile → x402 USDC → Upstream
```

### Integration with solana-clawd

ClawdRouter integrates with the existing ecosystem:

- **SolanaVault** — reads keypairs from `~/.clawd/vault/`
- **x402 Service** — compatible with `src/services/x402/` payment flow
- **Gateway** — can act as upstream for SSE transport
- **Grok Service** — all Grok model variants included

---

## Resources

| Resource | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design & request flow |
| [Configuration](docs/configuration.md) | Environment variables & file locations |
| [Routing Profiles](docs/routing-profiles.md) | ECO/AUTO/PREMIUM deep dive |

---

## From the solana-clawd Ecosystem

<table>
<tr>
<td width="50%">

### 🔀 ClawdRouter

**The LLM router built for autonomous Solana agents**

You're here. 55+ models, local smart routing, x402 USDC on Solana — the only stack that lets agents operate independently with Ed25519.

</td>
<td width="50%">

### 🤖 [solana-clawd](https://github.com/x402agent/solana-clawd)

**The autonomous Solana agent engine**

Full agentic engine with MCP tools, Telegram bot, vault management, gateway protocol, and 95+ skills. ClawdRouter powers model selection.

</td>
</tr>
</table>

---

<div align="center">

**MIT License** · [solana-clawd](https://github.com/x402agent/solana-clawd) — Solana-native AI agent infrastructure

⭐ If ClawdRouter powers your agents, consider starring the repo!

</div>
