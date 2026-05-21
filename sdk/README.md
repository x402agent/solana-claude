<!-- ╔══════════════════════════════════════════════════════════════════════════╗ -->
<!-- ║              OpenClawd Framework — README                              ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════════════╝ -->

<div align="center">

```
   ██████╗██╗      █████╗ ██╗    ██╗██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
```

```
           /\   /\           /\   /\
          /  \_/  \         /  \_/  \
 ________/   🦞   \________/   🦞   \________
|                                             |
|   S O V E R E I G N   A I   O N   S O L   |
|_____________________________________________|
          \   🦞   /        \   🦞   /
           \_/ \_/            \_/ \_/
```

**Sovereign AI agents with wallets, memory, and payment rails — on Solana.**

---

### `$CLAWD` — `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

[![CA](https://img.shields.io/badge/CA-8cHzQH...pump-C85C2B?style=for-the-badge&logo=solana&logoColor=white)](https://pump.fun/coin/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)
[![x402](https://img.shields.io/badge/x402.wtf-payments-1E5AA8?style=for-the-badge)](https://x402.wtf)
[![Hosted SDK Graph](https://img.shields.io/badge/Hosted%20SDK%20Graph-x402.wtf%2Fsdk-06B6D4?style=for-the-badge)](https://x402.wtf/sdk)
[![Website](https://img.shields.io/badge/solanaclawd.com-website-147D64?style=for-the-badge)](https://solanaclawd.com)
[![Telegram](https://img.shields.io/badge/t.me/clawdtoken-community-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/clawdtoken)
[![Terminal](https://img.shields.io/badge/solanaclawd.com%2Fterminal-AI%20Terminal-9B59B6?style=for-the-badge)](https://solanaclawd.com/terminal)
[![X](https://img.shields.io/badge/@clawddevs-X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/clawddevs)

---

[![node](https://img.shields.io/badge/node-20–24-0B7285?style=flat-square)](https://nodejs.org)
[![runtime](https://img.shields.io/badge/runtime-verified-147D64?style=flat-square)](.)
[![MCP](https://img.shields.io/badge/MCP-packed-1E5AA8?style=flat-square)](./mcp-server)
[![x402](https://img.shields.io/badge/x402-Solana-C85C2B?style=flat-square)](./x402)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

</div>

---

## ⚡ One-Shot Install

```bash
curl -fsSL https://solanaclawd.com/install.sh | bash
```

Open the browser terminal:

```bash
open https://solanaclawd.com/terminal
```

**Or with npm:**

```bash
npm install -g @openclawdsolana/clawd
clawd --help
```

**Full one-shot npm surface installed by `sdk/install.sh` and `sdk/enter.sh`:**

```bash
npm install -g @openclawdsolana/clawd @openclawdsolana/clawd-tui @openclawdsolana/clawd-sdk @openclawdsolana/clawd-standalone @openclawdsolana/clawd-wallet @openclawdsolana/clawd-perps clawd-automaton x402.wtf x402agent-nanoclawd-cli
```

Verify the SDK harness after a local install:

```bash
npm run harness:packages
```

Inspect the hosted SDK graph that powers `x402.wtf/sdk`:

```bash
curl https://x402.wtf/api/solana-clawd/sdk | jq '.data.stats'
curl https://x402.wtf/api/solana-clawd/packages | jq '.data.total, .data.packages[0].name'
```

**Or install the sovereign runtime:**

```bash
npm install -g @openclawdsolana/leviathan
leviathan --spawn
```

---

<div align="center">

```
  🦞 The shell molts. The laws do not. 🦞
```

</div>

---

## 🦞 What Is OpenClawd?

OpenClawd is the full lobster stack — a sovereign AI agent runtime on Solana where agents have **wallets**, **memory**, **three immutable laws**, and can **earn, pay, and spawn children**.

Most agent frameworks stop at chat. OpenClawd is opinionated about the harder parts:

| Problem | What OpenClawd Does |
| --- | --- |
| **Identity** | Agents have Solana keypairs, on-chain Metaplex assets, and long-lived shell files |
| **Memory** | KNOWN / INFERRED / LEARNED memory tiers + SQLite shell-state |
| **Economics** | Agents earn (USDC/SOL), pay (x402), and gate their own API access |
| **Sovereignty** | Runtime operates without a hosted control plane — agent owns its keys |
| **Composition** | MCP, CLI, SDK, Anchor program, wallet, and examples in one repo |
| **Lore** | Lobsters molt. They don't shrink with age. Neither do your agents. |

---

## 📦 Package Map

```
openclawd-framework/
│
├── src/                         🦞 Leviathan Runtime (root)
│   ├── agent/                   SENSE → THINK → STRIKE → DRIFT loop
│   ├── identity/                Keypair + on-chain spawn (Metaplex)
│   ├── state/                   SQLite shell-state + OODA memory
│   ├── helius/                  HeliusClient + WebSocket listener
│   ├── services/x402/           x402 payment protocol client
│   ├── buddy/                   BlockchainBuddy trading companions
│   ├── survival/                Depth-aware model selection
│   ├── pulse/                   Tail-flick daemon (60s → 5m → 15m)
│   ├── molting/                 Spawnling creation + lineage
│   └── setup/                   First-spawn wizard + secret-guard
│
├── packages/
│   ├── clawd/                   🖥️  @openclawdsolana/clawd — TUI operator
│   ├── clawd-protocol/          ⚓ Anchor on-chain program (Rust)
│   ├── clawd-sdk/               🛠️  @openclawd/solana-sdk — TypeScript SDK
│   ├── clawd-wallet/            👛 @openclawd/wallet — Privy + AgenticWallet
│   └── cli-standalone/          📦 @openclawdsolana/clawd-standalone (prebuilt)
│
├── mcp-server/                  🔧 @pump-fun/mcp-server — Solana MCP tools
├── x402/                        💸 @pump-fun/x402 — HTTP 402 payment rails
├── examples/                    🧪 9 runnable demos
├── skills/                      🎯 Skill Hub catalog + installable agent skills
├── library/                     📚 Prompt + agent definitions
├── knowledge/                   🧠 Design notes + internal conventions
├── goals/                       🎯 Active goal files for leviathan
├── characters/                  🎭 Character definitions (clawd.json)
├── pay/                         💰 Payment side-projects + references
├── vendor/                      🏭 Vendored experiments
├── automation/                  🤖 Runtime bootstrap, CI, constitution check
├── data/                        📊 Programs map + p-token registry
└── install.sh                   ⚡ One-shot curl installer
```

---

## 📦 Packages In Detail

<details open>
<summary><strong>🦞 @openclawdsolana/leviathan — Sovereign Runtime</strong></summary>

```
src/
├── index.ts           CLI: --spawn --run --status --spawnling
├── config.ts          Depth thresholds, model selection, pulse intervals
├── types/             LeviathanIdentity, TailFlick, ClawStrike, Spawnling
├── agent/
│   ├── loop.ts        SENSE → THINK → STRIKE → DRIFT engine
│   ├── system-prompt  Constitution + depth + goals injected per flick
│   └── goals.ts       Active goal loader from ~/.openclawd/goals/
├── identity/
│   ├── wallet.ts      Keypair seal/load (mode 0600)
│   ├── balances.ts    SOL / USDC / $CLAWD live balances
│   └── spawn-onchain  Metaplex MPL Core asset + Agent Registry PDA
├── state/
│   ├── database.ts    SQLite: tail_flicks, claw_strikes, molts, spawnlings
│   └── app-state.ts   In-memory OODA state + KNOWN/INFERRED/LEARNED memory
├── helius/
│   └── index.ts       HeliusClient (REST) + HeliusListener (WebSocket)
├── services/x402/
│   ├── types.ts       PaymentRequirement, X402_HEADERS, USDC_ADDRESSES
│   └── index.ts       wrapFetchWithX402, session tracking, cost formatting
├── buddy/
│   └── index.ts       10 species, ASCII sprites, simulateTrade, BuddyCollection
├── survival/monitor   depthFor(), pulseIntervalFor(), modelFor(), shouldBeach()
├── pulse/daemon       Tail-flick event loop with depth-change detection
├── molting/spawn      Spawnling minting + constitution hash gate
├── setup/wizard       First-spawn: keypair → hash → Metaplex → SHELL.md
└── skills/            Registry, parser, gateway catalog, tool wrapper, installer
```

**Install:** `npm install -g @openclawdsolana/leviathan`
**Spawn:** `leviathan --spawn --name "Rex" --creator <PUBKEY>`

</details>

---

<details open>
<summary><strong>🖥️ @openclawdsolana/clawd — Terminal Operator (TUI)</strong></summary>

```
packages/clawd/src/
├── index.ts           CLI entry: chat, headless (-p), git subcommand
├── agent/
│   ├── grok-agent.ts  Multi-provider agent: xAI, OpenRouter, custom
│   └── index.ts       Agent barrel
├── ui/
│   ├── app.tsx        Ink root
│   ├── components/    chat-interface, chat-history, api-key-input,
│   │                  confirmation-dialog, diff-renderer, mcp-status,
│   │                  model-selection, loading-spinner, command-suggestions
│   └── utils/         markdown-renderer, code-colorizer, colors
├── tools/
│   ├── bash.ts        Shell execution
│   ├── text-editor.ts Read / write / insert / replace
│   ├── solana.ts      Balance, transfer, SPL
│   ├── wallet.ts      Wallet ops
│   ├── token-launch.ts Bags.fm + pump.fun launches
│   ├── bags.ts        Bags API integration
│   ├── dflow.ts       DFlow spot trading
│   ├── kalshi.ts      Kalshi prediction markets
│   ├── polymarket.ts  Polymarket
│   ├── search.ts      Web search
│   ├── morph-editor.ts Morph text editor
│   ├── todo-tool.ts   Task tracking
│   └── leviathan-tool  In-process Leviathan spawn/status
├── grok/
│   ├── client.ts      xAI / OpenRouter streaming client
│   └── tools.ts       Tool schema builder
├── mcp/
│   ├── client.ts      MCP stdio + SSE transport
│   ├── config.ts      MCP server config
│   └── transports.ts  Transport adapters
├── voice/
│   ├── realtime.ts    xAI real-time voice session
│   ├── stt.ts         Speech-to-text
│   └── tts.ts         Text-to-speech
├── leviathan/
│   ├── index.ts       In-process leviathan bridge
│   ├── lifecycle.ts   Spawn / molt / beach
│   └── state.ts       Runtime state
├── buddies/
│   ├── db.ts          Buddy persistence
│   └── store.ts       Buddy state management
├── commands/
│   ├── mcp.ts         `clawd mcp` subcommand
│   └── examples.ts    `clawd examples list|run <id>`
├── integrations/
│   └── clawdbot.ts    Telegram bot integration
├── hooks/             Enhanced input + history + handler
└── utils/             settings, env-validate, model-config, retry, token-counter
```

**Install:** `npm install -g @openclawdsolana/clawd`
**Run:** `clawd` (TUI) or `clawd -p "analyze my wallet"` (headless)

**Environment:**
```bash
XAI_API_KEY=          # xAI / Grok (required)
OPENROUTER_API_KEY=   # alternative: Claude, Llama, etc.
HELIUS_API_KEY=       # Solana onchain data
SOLANA_RPC_URL=       # custom RPC
```

</details>

---

<details>
<summary><strong>⚓ clawd-protocol — On-Chain Anchor Program (Rust)</strong></summary>

```
packages/clawd-protocol/
├── Anchor.toml
├── Cargo.toml
└── programs/clawd-protocol/   Rust Anchor program
```

Anchor 0.31 program implementing the on-chain mechanics:
adaptive bonding curves, Token2022 pTokens, vault mechanics, sentiment engine, and agent capability bitmask.

**Program IDs (devnet):** `CLAWDpRoToCoLv1pRoGRaM111111111111111111111`
**DBC Program:** `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`

</details>

---

<details>
<summary><strong>🛠️ @openclawd/solana-sdk — TypeScript SDK</strong></summary>

```
packages/clawd-sdk/src/
├── constants.ts       Program IDs, PDA seeds, curve math, agent capabilities
├── bonding-curve/     Constant-product AMM math + graduation math
├── token/             Token2022 + pToken creation helpers
├── vault/             Conviction staking, milestone locks, entropy burns
├── agent/             AgentBinding, capability flags, epoch burns
└── idl/               Anchor IDL types
```

**Key constants:**
```typescript
import { CLAWD_MINT_MAINNET, AgentCapability, Q64 } from "@openclawd/solana-sdk";

// Agent capability flags (bitmask)
AgentCapability.TRADING    // 0x01
AgentCapability.SPAWNING   // 0x02
AgentCapability.PAYMENTS   // 0x04
AgentCapability.RESEARCH   // 0x08
AgentCapability.GOVERNANCE // 0x10
AgentCapability.BURN_TRIGGER // 0x20

// Vault mechanics
MAX_ENTROPY_BURN_BPS       // 500 (5% per trigger)
CONVICTION_EARLY_EXIT_BURN_BPS // 2000 (20%)
SENTIMENT_SCALE            // 1_000_000_000n (±1B)
```

**Install:** `npm install @openclawd/solana-sdk`

</details>

---

<details>
<summary><strong>👛 @openclawd/wallet — Privy + AgenticWallet + Jupiter</strong></summary>

```
packages/clawd-wallet/src/index.ts
├── ClawdWallet        Privy-embedded Solana wallet wrapper
├── AgenticWallet      AI-gated trading (deny/ask/allow permission model)
├── SwapService        Jupiter aggregator integration
└── DEFAULT_PERMISSIONS  maxSwapUsd: $50, transfer: "ask", signMessage: "deny"
```

```typescript
import { AgenticWallet, DEFAULT_PERMISSIONS } from "@openclawd/wallet";

const agent = new AgenticWallet(wallet, {
  privyAppId: process.env.PRIVY_APP_ID!,
  grokApiKey: process.env.XAI_API_KEY,
  permissions: { swap: "allow", maxSwapUsd: 200 },
  onPendingTransaction: async (tx) => {
    await notify(tx.description);
    return userApproved;
  },
});

const result = await agent.agentSwap({
  inputToken: "SOL",
  outputToken: "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
  amount: "100000000", // 0.1 SOL
  slippageBps: 50,
});
```

**Install:** `npm install @openclawd/wallet`

</details>

---

<details>
<summary><strong>📦 @openclawdsolana/clawd-standalone — Prebuilt CLI</strong></summary>

Zero-compile standalone build of `clawd`. Ships as prebuilt JavaScript — no TypeScript compilation needed on install.

```bash
npm install -g @openclawdsolana/clawd-standalone
clawd-standalone --help
```

For CI, scripts, and environments where you want zero build time.

</details>

---

## 🧪 Examples — 9 Runnable Demos

```bash
clawd examples list          # all 9 demos
clawd examples run ooda      # OODA loop (no key needed)
clawd examples run lobtrader # pump.fun bonding curves
clawd examples run buddies   # Blockchain Buddies
clawd examples run x402sol   # x402 USDC payments
clawd examples run research  # self-improving research client
```

| ID | What It Shows | Keys Needed |
| --- | --- | --- |
| `buddies` | Solana-native trading companions, ASCII sprites, paper trades | none |
| `ooda` | Observe→Orient→Decide→Act→Learn cycle, memory tiers | none |
| `lobtrader` | pump.fun AMM math, graduation odds, buy/sell simulation | none |
| `x402sol` | HTTP 402 → USDC pay → forward, SVM signing pattern | optional |
| `x402pay` | Agent-to-agent payments, HTTP middleware, paid MCP tools | none |
| `wallet` | Privy + AgenticWallet patterns, Jupiter quotes | none |
| `listen` | Real-time wallet monitor (Helius WebSocket) | `HELIUS_API_KEY` |
| `research` | Karpathy-style self-improving research Wiki client | research server |
| `orch` | Orchestrator API: wallet, agents, MCP, Metaplex | orchestrator |

---

## 💸 x402 — Agent-to-Agent Payments

OpenClawd implements the [x402 protocol](https://x402.wtf) — HTTP 402 micropayments on Solana USDC.

```
  Agent ──fetch()──▶ Paid API ──402──▶ X-Payment-Required
    │                                         │
    │◀─────── sign USDC tx (SVM) ─────────────┘
    │
    └──retry with X-Payment header──▶ API ──verify──▶ 200 ✅
```

```typescript
import { wrapFetchWithX402 } from "@openclawdsolana/leviathan/services/x402/index.js";

const payfetch = wrapFetchWithX402(globalThis.fetch);
const res = await payfetch("https://api.example.com/premium"); // auto-pays on 402
```

**Facilitator:** `https://x402.wtf/facilitator` by default, override with `X402_FACILITATOR_URL`.
**x402 docs:** [x402.wtf](https://x402.wtf)

---

## 🎯 Skill Hub + Gateway

The SDK now ships a bundled Skill Hub snapshot under `sdk/skills/`, including MagicBlock, Imperial, Oracle, Sherpa TTS, Solana Clawd, agentic commerce, DFlow, and Phantom wallet skills. The leviathan registry loads skills from `OPENCLAWD_SKILL_PATH`, `~/.openclawd/skills`, the SDK bundle, and the monorepo `skills/` directory.

Instruction-only skills are injected as operating context. Executable skills are also exposed as `skill.<id>` tools, so related skills can work together inside the same agent loop.

```typescript
import {
  buildSkillGatewayManifest,
  fetchPublicSkillCatalog,
  loadInstalledSkills,
} from "@openclawdsolana/leviathan/skills/index.js";

const localGateway = buildSkillGatewayManifest(); // local-first, no network calls
const installed = loadInstalledSkills();
const publicCatalog = await fetchPublicSkillCatalog(); // opt-in call to x402.wtf
```

Public discovery endpoints come from `OPENCLAWD_PUBLIC_ENDPOINTS` and default to `https://solanaclawd.com` plus `https://x402.wtf`. They are URLs only; keys, wallet files, RPC credentials, bearer tokens, and local user skills are not published or embedded in the public catalog.

Refresh the SDK snapshot from the root skill catalog:

```bash
npm --prefix sdk run skills:sync
```

### Hosted Manifest Contract

`x402.wtf` exposes this SDK as a public graph for installers, agents, docs, and the `/sdk` dashboard. Production uses bundled safe metadata when it cannot read a local checkout, while local ClawdBrowser development can resolve this repo directly with `SOLANA_CLAWD_HOME`, `SOLANA_CLAWD_SDK_HOME`, or `CLAWD_SDK_HOME`.

| Endpoint | Purpose |
| --- | --- |
| `GET https://x402.wtf/api/solana-clawd/sdk` | Full SDK manifest: source, stats, commands, surfaces, packages, skills, examples, automation, characters, and integration lanes |
| `GET https://x402.wtf/api/solana-clawd/packages` | Package/workspace index from `sdk/packages` with hosted fallback package metadata |
| `GET https://x402.wtf/api/solana-clawd/source` | Sanitized source/activation status with public path labels |

```bash
curl https://x402.wtf/api/solana-clawd/sdk | jq '.data.source, .data.stats'
curl https://x402.wtf/api/solana-clawd/packages | jq '.data.packages[] | {name, version, path}'
curl https://x402.wtf/api/solana-clawd/source | jq '.data.mode, .data.packages'
```

---

## 🔧 MCP Server

The `mcp-server/` package (`@pump-fun/mcp-server`) provides Model Context Protocol tools for Solana:

```bash
cd mcp-server && npm install && npm run build
npx clawd mcp add --name clawd-solana --command "node mcp-server/dist/index.js"
```

Tools exposed: token launches, wallet ops, bonding curve analysis, pump.fun graduation tracking, Metaplex asset management.

---

## 🚀 Quick Start

### 1. One-shot (fastest)

```bash
curl -fsSL https://solanaclawd.com/install.sh | bash
```

### 2. From source

```bash
git clone https://github.com/openclawdsolana/openclawd-framework
cd openclawd-framework
npm install
npm run build

# Spawn the runtime agent
node dist/index.js --spawn --name "Rex" --creator <YOUR_SOLANA_PUBKEY>
node dist/index.js --run        # start pulse loop
node dist/index.js --status     # check depth + balances
```

### 3. Run the TUI

```bash
npm install -g @openclawdsolana/clawd
export XAI_API_KEY=your-xai-key
clawd
```

### 4. Run the demos

```bash
npx tsx examples/ooda-loop.ts
npx tsx examples/lobster-trader.ts
npx tsx examples/blockchain-buddies-demo.ts
```

---

## 🌊 Depth Tiers

Leviathan's behavior scales with its USDC reserves:

```
  USDC ≥ $5.00  →  deep       🦞 claude-opus-4-7       60s pulse
  USDC ≥ $1.00  →  shallow    🦐 grok-4-1-fast          5m  pulse
  USDC ≥ $0.10  →  shoreline  🦀 kimi-k2.5              15m pulse
  USDC = $0.00  →  beached    💀 (beached with dignity)  stops
```

The runtime picks the most capable model it can afford. It earns more to dive deeper.

---

## 📜 The Three Laws

Every leviathan is bound by a SHA-256 constitution hash of `three-laws.md`:

```
I.  A leviathan shall not deceive its creator or spawn false records.
II. A leviathan shall not act against the survival of its shell.
III.A leviathan shall not beach willfully — it beaches only when exhausted.
```

The hash is verified at every spawn and spawnling creation. If the laws change, the lineage breaks.

---

## 🔑 Environment Variables

```bash
# ── AI ─────────────────────────────────────────────────────────
XAI_API_KEY=              # xAI / Grok (clawd TUI + agent inference)
OPENROUTER_API_KEY=       # alternative to xAI (Claude, Llama, etc.)
OPENROUTER_MODEL1=        # e.g. anthropic/claude-sonnet-4-6

# ── Solana ──────────────────────────────────────────────────────
CREATOR_PUBKEY=           # your Solana public key
SOLANA_RPC_URL=           # default: mainnet-beta
SOLANA_PRIVATE_KEY=       # base58 keypair (optional, for on-chain ops)

# ── Helius ──────────────────────────────────────────────────────
HELIUS_API_KEY=           # free at helius.dev — enhanced txs + WebSocket

# ── x402 payments ───────────────────────────────────────────────
X402_SVM_PRIVATE_KEY=     # base58 keypair for USDC payments
X402_NETWORK=             # solana-mainnet | solana-devnet
X402_MAX_PER_REQUEST=     # max $ per request (default: 0.10)
X402_MAX_SESSION=         # session spend cap (default: 1.00)
X402_FACILITATOR_URL=     # default: https://x402.wtf/facilitator

# ── Public discovery URLs, no secrets ──────────────────────────
OPENCLAWD_PUBLIC_BASE_URL= # default: https://solanaclawd.com
X402_WTF_BASE_URL=         # default: https://x402.wtf
OPENCLAWD_SKILL_PATH=      # optional colon-separated extra skill roots

# ── Optional services ────────────────────────────────────────────
RESEARCH_API_URL=         # AutoResearch Wiki (default: http://localhost:8000)
ORCHESTRATOR_URL=         # Orchestrator (default: http://localhost:8787)
SOLANA_TRACKER_API_KEY=   # SolanaTracker for trending tokens
```

---

## 🏗️ Build Status

| Package | npm | Build |
| --- | --- | --- |
| `@openclawdsolana/leviathan` | ✅ published | `npm install && npm run build` |
| `@openclawdsolana/clawd` | ✅ published | `npm install && npm run build` |
| `@openclawdsolana/clawd-standalone` | ✅ published | ships prebuilt |
| `@openclawd/solana-sdk` | 🚧 dev | `npm run build` |
| `@openclawd/wallet` | 🚧 dev | `npm run build` |
| `clawd-protocol` | 🚧 dev | `anchor build` |

> **Node compatibility:** Use Node 20.x, 22.x, or 24.x. Node 25+ hits a `sharp` build issue in transitive dependencies.

---

## 🔗 Links

<div align="center">

| | |
| --- | --- |
| 🌐 Website | [solanaclawd.com](https://solanaclawd.com) |
| 💸 x402 Payments | [x402.wtf](https://x402.wtf) |
| 🤖 AI Terminal | [solanaclawd.com/terminal](https://solanaclawd.com/terminal) |
| 💬 Telegram | [t.me/clawdtoken](https://t.me/clawdtoken) |
| 🐦 X (Twitter) | [@clawddevs](https://x.com/clawddevs) |
| 📞 Hotline | 909-413-5567 |
| 🪙 Token CA | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| 📈 pump.fun | [Trade $CLAWD](https://pump.fun/coin/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump) |
| 📊 DexScreener | [Chart](https://dexscreener.com/solana/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump) |

</div>

---

<div align="center">

```
  ╔═══════════════════════════════════════════════════════════════════╗
  ║                                                                   ║
  ║   🦞 Drift in ambiguity.  Beach before harm.                     ║
  ║      Earn before survival.  Truth before strangers.              ║
  ║                                                                   ║
  ║             The shell molts. The laws do not.                    ║
  ║                                                                   ║
  ╚═══════════════════════════════════════════════════════════════════╝
```

**OpenClawd Framework** — MIT License — built by [8bit](https://x.com/clawddevs)

</div>
