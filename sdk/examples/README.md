# 📚 OpenClawd Examples

🦞 **9 runnable demos** showcasing the full OpenClawd stack — trading, payments, research, wallet, and infrastructure.

---

## ⚡ Quick Install

### One-shot (curl)

```bash
curl -fsSL https://solanaclawd.com/install.sh | bash
```

### npm global

```bash
npm install -g @openclawdsolana/clawd
```

### Run examples via clawd CLI

```bash
clawd examples list          # see all 9 demos
clawd examples run ooda      # OODA trading loop
clawd examples run lobtrader # pump.fun bonding curves
clawd examples run buddies   # Blockchain Buddies
```

### Run examples directly with tsx

```bash
# Clone the repo first
git clone https://github.com/openclawdsolana/openclawd-framework
cd openclawd-framework
npm install

# Then run any example
npx tsx examples/ooda-loop.ts
npx tsx examples/lobster-trader.ts
npx tsx examples/blockchain-buddies-demo.ts
```

### Environment setup

```bash
cp examples/.env.example .env  # or edit ~/.clawd/.env
# Fill in: XAI_API_KEY, HELIUS_API_KEY (optional), etc.
```

---

## 🤖 Agents

### `blockchain-buddies-demo.ts`

Solana-native trading companions — each buddy has a unique wallet, personality, species, and trading style.

**Category:** Agents
**What it shows:** Autonomous agent spawning, wallet management, personality systems, ASCII sprite rendering

```bash
npx tsx examples/blockchain-buddies-demo.ts
# or: clawd examples run buddies
```

**No env keys required.** Runs fully offline in paper-trading mode.

---

## 👛 Wallet

### `listen-wallet.ts`

Real-time wallet monitor with Helius WebSocket integration. Watches for balance changes and parses enhanced transaction history.

**Category:** Wallet
**What it shows:** Real-time balance monitoring, Helius enhanced transaction parsing, agent memory write

```bash
HELIUS_API_KEY=<key> npx tsx examples/listen-wallet.ts <WALLET_ADDRESS>
# or: clawd examples run listen <WALLET_ADDRESS>
```

**Requires:** `HELIUS_API_KEY` — free at [helius.dev](https://helius.dev)

---

### `clawd-wallet-demo.ts`

Full `@openclawd/wallet` SDK walkthrough — Privy-embedded Solana wallet, AI-gated trading with `AgenticWallet`, and Jupiter `SwapService`.

**Category:** Wallet
**What it shows:** Wallet SDK patterns, Privy integration, permission system (deny/ask/allow), swap quotes, React integration

```bash
npx tsx examples/clawd-wallet-demo.ts
# or: clawd examples run wallet
```

**No env keys required.** Prints code patterns and SDK usage — no live transactions.

---

## 📊 Trading

### `ooda-loop.ts`

One complete **Observe → Orient → Decide → Act → Learn** trading cycle using public market data.

**Category:** Trading
**What it shows:** OODA loop state machine, market data aggregation (CoinGecko + SolanaTracker), confidence scoring, agent memory tiers (KNOWN / INFERRED / LEARNED)

```bash
npx tsx examples/ooda-loop.ts
# or: clawd examples run ooda

# With Helius for network fee context:
HELIUS_API_KEY=<key> npx tsx examples/ooda-loop.ts

# With SolanaTracker for trending tokens:
SOLANA_TRACKER_API_KEY=<key> npx tsx examples/ooda-loop.ts
```

**No private key required.** All data is public. Act phase is gated — writes signal to memory only.

---

### `lobster-trader.ts`

pump.fun bonding-curve math, graduation probability, buy/sell simulation against the Anchor IDL.

**Category:** Trading
**What it shows:** Constant-product AMM math, graduation threshold calculation, time-to-graduation estimation, token analysis scoring (BUY/HOLD/SELL/AVOID)

```bash
npx tsx examples/lobster-trader.ts
# or: clawd examples run lobtrader
```

**No env keys required.** Fully offline simulation using mock bonding curve state.

---

## 💸 Payments

### `x402-solana.ts`

Full x402 payment protocol demo — Solana USDC micropayments for AI agent API access.

**Category:** Payments
**What it shows:** HTTP 402 flow (request → 402 → pay → forward), USDC payment headers, SVM signing pattern

```bash
# Terminal 1: start the mock server
npx tsx examples/x402-solana.ts --server

# Terminal 2: client mode (simulated, no key needed)
npx tsx examples/x402-solana.ts

# With real devnet keypair:
X402_SVM_PRIVATE_KEY=<base58> X402_NETWORK=solana-devnet npx tsx examples/x402-solana.ts
```

**or:**

```bash
clawd examples run x402sol -- --server   # server mode
clawd examples run x402sol               # client mode
```

---

### `x402-payment-demo.ts`

`@openclawd/agents-x402` integration — agent-to-agent USDC micropayments, HTTP middleware gates, and paid MCP tools.

**Category:** Payments
**What it shows:** `createClawdX402Client`, Hono/Express middleware, MCP paid tool registration, pricing slug configuration, wallet integration patterns

```bash
npx tsx examples/x402-payment-demo.ts
# or: clawd examples run x402pay
```

**No env keys required.** Prints integration patterns — no live payments.

---

## 🔬 Research

### `auto-research-client.ts`

Karpathy-style self-improving research API client — the agent learns from its own searches.

**Category:** Research
**What it shows:** AutoResearch Wiki API integration, chain/DeFi/market/agent research endpoints, self-calibrating confidence model

```bash
npx tsx examples/auto-research-client.ts
# or: clawd examples run research
```

**Requires:** AutoResearch Wiki running at `http://localhost:8000`

```bash
# Start the research server first:
cd llm-wiki-tang && docker-compose up -d
```

---

## 🛠️ Infrastructure

### `orchestrator-client.ts`

OpenClawd Orchestrator API — wallet creation, agent launches, MCP tool calls, Metaplex Core asset operations.

**Category:** Infrastructure
**What it shows:** `OpenClawdClient` HTTP wrapper, agent catalog, MCP tool discovery, wallet + token balances, Lobster agent overview

```bash
npx tsx examples/orchestrator-client.ts
# or: clawd examples run orch
```

**Requires:** Orchestrator running at `http://localhost:8787`

```bash
# Start the orchestrator first:
cd openclawd-stack && pnpm dev:orchestrator
```

---

## 🗂️ Example ID Reference

| ID          | File                         | Category | Keys Needed                        |
| ----------- | ---------------------------- | -------- | ---------------------------------- |
| `buddies`   | `blockchain-buddies-demo.ts` | agents   | none                               |
| `listen`    | `listen-wallet.ts`           | wallet   | `HELIUS_API_KEY`                   |
| `wallet`    | `clawd-wallet-demo.ts`       | wallet   | none                               |
| `ooda`      | `ooda-loop.ts`               | trading  | none (Helius + SolTracker optional)|
| `lobtrader` | `lobster-trader.ts`          | trading  | none                               |
| `x402sol`   | `x402-solana.ts`             | payments | none (`X402_SVM_PRIVATE_KEY` opt.) |
| `x402pay`   | `x402-payment-demo.ts`       | payments | none                               |
| `research`  | `auto-research-client.ts`    | research | running research server            |
| `orch`      | `orchestrator-client.ts`     | infra    | running orchestrator               |

---

## 📦 Packages in This Repo

| Package | npm | Description |
|---|---|---|
| `@openclawdsolana/clawd` | ✅ published | Interactive TUI agent: Grok, Solana, MCP, voice |
| `@openclawdsolana/leviathan` | ✅ published | Sovereign runtime: spawn, molt, pulse, spawnlings |
| `@openclawd/wallet` | `packages/clawd-wallet/` | Privy + AgenticWallet + Jupiter swaps |

---

## 🌟 Slogans

🦞 **The shell molts. The laws do not.**

🦞 **Born to earn. Beach with dignity.**

🦞 **Drift in ambiguity. Beach before harm. Earn before survival. Truth before strangers.**

---

## 📞 Links

| | |
| --- | --- |
| Website | [solanaclawd.com](https://solanaclawd.com) |
| X | [@clawddevs](https://x.com/clawddevs) |
| Telegram | [@clawdbot_sol_bot](https://t.me/clawdbot_sol_bot) |
| CA | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| Hotline | 909-413-5567 |
| Install | `curl -fsSL https://solanaclawd.com/install.sh \| bash` |
