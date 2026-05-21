<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,12:1a0a2e,28:9945FF,50:14F195,72:FF5F1F,88:FFD166,100:05060d&height=300&section=header&text=CLAWD&fontSize=90&fontColor=ffffff&animation=twinkling&fontAlignY=42&desc=The%20Verifiable%20Agentic%20Harness&descAlignY=64&descSize=22" alt="CLAWD — The Verifiable Agentic Harness" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=22&duration=2000&pause=500&color=14F195&center=true&vCenter=true&width=900&lines=Claude+thinks.+Clawd+proves.;intent+%E2%86%92+route+%E2%86%92+simulate+%E2%86%92+verify+%E2%86%92+execute+%E2%86%92+attest+%E2%86%92+settle;Every+action+deserves+a+receipt.;The+shell+molts.+The+laws+do+not." alt="CLAWD tagline" />

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github)](https://github.com/x402agent/solana-clawd)
[![npm](https://img.shields.io/badge/npm-solana--clawd-CB3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/solana-clawd)
[![Phoenix](https://img.shields.io/badge/Phoenix-Perpetuals-FF5F1F?style=for-the-badge)](https://phoenix.trade)
[![x402](https://img.shields.io/badge/x402.wtf-agent%20payments-14F195?style=for-the-badge)](https://x402.wtf)
[![Backrooms](https://img.shields.io/badge/backrooms.x402.wtf-INFINITE-FFD700?style=for-the-badge)](https://backrooms.x402.wtf)
[![Token](https://img.shields.io/badge/%24CLAWD-8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump-9945FF?style=for-the-badge)](https://pump.fun)

</div>

---

## The Thesis

> **AI will not become truly useful at global scale until actions become verifiable. Clawd turns AI from probabilistic speech into attestable machine labor.**

The current frontier AI stack is mostly:

```text
prompt → model → answer
```

Clawd is:

```text
intent → route → reason → simulate → verify → execute → attest → settle → remember → evolve
```

Clawd does not call itself "an AI terminal." It is the **verifiable execution harness for autonomous agents** — the layer where every meaningful AI action can be routed, priced, permissioned, executed, attested, audited, and remembered.

**Trust the harness. Verify the model. Constrain the tools. Attest the action. Audit the result.**

---

## CLAWD: Cryptographic Layer for Autonomous Work & Decisions

| Layer | State of the art | Clawd delta |
| --- | --- | --- |
| Model | answer generation | routed, scored, policy-bound model execution |
| Agent | tool wrapper | permissioned autonomous entity with wallet + constitution |
| Identity | API key / account | wallet-native agent identity with MPL Core birth certificate |
| Trust | logs controlled by platform | portable SAS attestations + signed receipts |
| Payment | subscription / API billing | x402 / pay-per-action settlement on Solana USDC |
| Execution | opaque tool call | simulated, routed, signed, journaled action |
| Memory | app silo | local-first vault + onchain proof pointers |
| Security | prompt filters | policy firewall + formal verification gates |
| Privacy | platform custody | encrypted local state + selective proof disclosure |
| Market | SaaS users | autonomous economic entities with AUD-optimized routes |

---

## Proof of Agentic Action

Every important AI action creates a signed, replayable, queryable receipt:

```json
{
  "agent_id": "clawd://agent/...",
  "operator_wallet": "...",
  "model_route": { "provider": "openrouter", "model": "claude/gpt/grok/local" },
  "input_hash": "...",
  "tool_manifest_hash": "...",
  "memory_context_hash": "...",
  "output_hash": "...",
  "action_type": "trade | code | research | payment | mint | deploy | message",
  "risk_score": 0.18,
  "human_approval_required": false,
  "execution_receipt": {
    "tx_sig": "...",
    "venue": "phoenix | imperial | x402 | mcp",
    "status": "simulated | submitted | settled | failed"
  },
  "attestation": {
    "schema": "clawd.agent.action.v1",
    "issuer": "clawd-harness",
    "signature": "..."
  }
}
```

AI output is no longer ephemeral. It becomes a **cryptographic action object**.

---

## AUD Loop — Algorithmic Utility Delta

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=15&duration=1600&pause=300&color=FFD166&center=true&vCenter=true&width=900&lines=AUD+%3D+(N+%C3%97+F+%C3%97+V+%C3%97+A+%C3%97+E+%C3%97+T)+%2F+(C+%C3%97+L+%C3%97+R+%C3%97+O);N%3Dreach+F%3Dfrequency+V%3Dverifiability+A%3Dautonomy+E%3Deconomic+T%3Dtrust;C%3Dcost+L%3Dlatency+R%3Drisk+O%3Dopacity;Clawd+optimizes+for+verified+action+utility+%2F+dollar+%2F+second+%2F+risk" alt="AUD formula" />

</div>

The current state of the art optimizes for `answer quality / token cost`.

Clawd optimizes for `verified action utility / dollar / second / unit of risk`.

```text
AUD = (N × F × V × A × E × T) / (C × L × R × O)

N = reach (people/agents affected)
F = frequency (normalized actions/time)
V = verifiability gain vs baseline
A = autonomy gain
E = economic execution gain
T = trust / auditability gain

C = cost   L = latency   R = risk   O = opacity
```

The AUD Loop is implemented in [`packages/clawd/src/aud-loop.ts`](./packages/clawd/src/aud-loop.ts):

```ts
import { computeAud, rankRoutes, AUD_PROFILES } from "./aud-loop.js";

// Compare SOTA baseline vs Clawd verified action
const sota = computeAud(AUD_PROFILES.sota_baseline);
const clawd = computeAud({ ...AUD_PROFILES.clawd_verified_action, reach: 50_000 });
console.log(clawd.summary);
// → "AUD strong (412.3). Delta vs SOTA baseline: +399.1.
//    Reach-weighted delta: 2194 utility units. Recommended route mode: verified."

// Score a global AI output vs Clawd harness at scale
const ranked = rankRoutes([
  { label: "global_ai_sota",    factors: AUD_PROFILES.global_ai_output },
  { label: "clawd_global",      factors: AUD_PROFILES.clawd_global_harness },
]);
// clawd_global scores orders of magnitude higher due to V, T, low O
```

**ClawdRouter modes** derived from AUD scoring:

| Mode | When chosen | Optimizes for |
| --- | --- | --- |
| `fast` | low cost + latency | cheapest good answer |
| `deep` | high trust + verifiability | best reasoning + audit trail |
| `private` | low opacity target | local / TEE / encrypted path |
| `verified` | V > 0.8, O < 0.2 | only attested models and tools |
| `economic` | high economic gain | maximum ROI per settlement |
| `trading` | low latency + high E | execution probability + MEV protection |
| `court` | risk > 0.6 | maximum audit trail |

---

## $CLAWD Token

| Field | Value |
| --- | --- |
| **Symbol** | `$CLAWD` |
| **Network** | Solana mainnet |
| **Mint (SPL)** | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| **Burn + Lock Treasury** | `GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4` |
| **Site** | [x402.wtf](https://x402.wtf) · [solanaclawd.com](https://solanaclawd.com) |

$CLAWD is the economic pressure valve of the harness: access, routing stake, agent reputation stake, settlement discount, proof issuance fee, burn on execution, arena entry, skill publishing bond.

---

## Quick Start

```bash
# One-line install → full TUI with Agent Kit
curl -fsSL https://solanaclawd.com/leviathan.sh | sh && clawd-tui

# One-shot MCP server install
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash

# Enter the public backroom
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash

# Install root CLI
npm install -g solana-clawd && clawd
```

| | Command | What it does |
| --- | --- | --- |
| 🔍 | `clawd-perps signal oi SOL-PERP --mode paper` | OI regime signal (Observe layer) |
| 📊 | `clawd-perps signal watch SOL-PERP --interval 5s` | Live OI watch loop |
| 🚀 | `clawd-tui` → press **6** | Full Bloomberg-style Agent Kit TUI |
| ⚡ | `clawd-agents-perps paper-long SOL --notional 100` | Simulated Phoenix perp long |
| 🎨 | `clawd-agent mint --network devnet ... --yes` | Real Metaplex registered agent |
| 💰 | `clawd balance` + `clawd fund 10` | USDC + CLAWD wallet ops |
| 🤖 | `bash automaton-main/leviathan.sh --full` | Full runtime bootstrap |
| 📦 | `clawdhub install meme-trader` | Install a skill from ClawdHub |

---

## Google ADK + Private Agent Gateway

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=18&duration=1700&pause=350&color=4285F4&center=true&vCenter=true&width=980&lines=Google+ADK+entrypoint+%E2%86%92+private+registry+%E2%86%92+governed+gateway;135+installed+catalog+agents+discoverable+through+ADK+tools;Agent+Gateway+policy+surface+for+MCP%2C+tools%2C+and+destination+control" alt="Google ADK integration" />

</div>

Clawd now includes a TypeScript Google Agent Development Kit entrypoint at [`adk/agent.ts`](./adk/agent.ts). It exports `rootAgent` as a multi-tool `LlmAgent` for:

| Tool surface | Purpose |
| --- | --- |
| `get_agent_catalog_stats` | Proves installed catalog coverage across `agents/agents-catalog.json` and `agents/src/*.json` |
| `search_agent_catalog` | Finds registry agents by identifier, category, tag, or capability |
| `get_private_destinations` | Lists private routing destinations for the Clawd gateway and catalog |
| `get_token_price` / `get_token_search` | Reads Solana market metadata through Jupiter |
| `prepare_jupiter_swap` | Prepares unsigned swap payloads for wallet review only |

The gateway registry now publishes Google ADK metadata through:

```text
GET /registry
GET /identity
GET /adk/manifest.json
```

The ADK manifest reports the private connection mode, all nine configured destination URLs, and full installed catalog coverage. Current local verification shows `135` installed source-backed agents, `135` catalog entries, and no missing source/catalog entries.

Run the ADK agent locally:

```bash
cd adk
npm run check
npm run run
```

Open the ADK dev UI:

```bash
cd adk
npm run web
```

Docs:

| Path | Description |
| --- | --- |
| [`adk/README.md`](./adk/README.md) | Animated Google ADK integration README |
| [`gateway/README.md`](./gateway/README.md) | Private Preview Agent Gateway notes, permissions, APIs, and governance patterns |
| [`adk/.env.example`](./adk/.env.example) | Non-secret env template for ADK model auth and private routing overrides |

Secrets stay out of git. Put real Gemini keys, RPC URLs, API keys, and wallet material in local `.env` files or the shell only.

## Public Gitlawb Mirror

The sanitized public mirror is published as `my-project-public` on gitlawb. Force the public node before clone so `git-remote-gitlawb` does not fall back to a local node:

```bash
export GITLAWB_NODE=https://node.gitlawb.com
OWNER_DID=did:key:z6Mkq5mY3JWtxoxUobWcfNHm7AkRubgSWEZTkBVqZXJviFZ5
git clone "gitlawb://$OWNER_DID/my-project-public"
```

The public mirror includes source for `sdk`, `tui`, `ooda`, `MemeBRain`, `gateway`, `automaton-main`, `agents`, `leviathan`, and `perps/clawd-agents-perps`. It can include package metadata, READMEs, `.env.example` templates, source trees, and small checked build artifacts where useful. It never includes `.local-secrets`, live `.env` files, key material, UCAN files, or any `node_modules` directory.

Public mirror source groups:

| Group | Included paths | Explicitly excluded |
| --- | --- | --- |
| Automaton runtime | `automaton-main/assets`, `automaton-main/automation`, `automaton-main/packages`, `automaton-main/scripts`, `automaton-main/src`, `automaton-main/dist`, `automaton-main/*.md`, package manifests, lockfiles, and shell entrypoints | `automaton-main/node_modules`, local `.automaton` wallets/state, live `.env` files |
| Clawd Perps | `perps/clawd-agents-perps/src`, `perps/clawd-agents-perps/dist`, `.env.example`, `README.md`, `package.json`, `package-lock.json`, and `tsconfig.json` | `perps/clawd-agents-perps/node_modules`, live `.env` files, wallet/key material |
| Gateway + ADK | `gateway`, `adk`, `agents`, `sdk`, `tui`, and registry docs/templates | live RPC URLs, API keys, bot tokens, UCAN credentials, generated dependency folders |

---

## Repository Galaxy

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=17&duration=1500&pause=280&color=FFD166&center=true&vCenter=true&width=1000&lines=one+repo+%E2%86%92+agents+%E2%86%92+gateway+%E2%86%92+perps+%E2%86%92+attestations+%E2%86%92+MCP+%E2%86%92+ADK;public+code+is+shareable+%E2%80%94+local+secrets+never+leave+the+machine;designed+for+screenshots%2C+forks%2C+agent+discovery%2C+and+private+gitlawb+mirrors" alt="Repository galaxy" />

</div>

| Zone | Paths | Publish posture |
| --- | --- | --- |
| Agent interface | `.claude`, `.github`, `adk`, `agent-kit`, `agents`, `mcp`, `skills` | Track source and examples only; local Claude settings stay ignored |
| Gateway + governance | `gateway`, `x402`, `attestation`, `formal_verification`, `docs`, `examples` | Track public code, proofs, manifests, and templates |
| Solana execution | `amm`, `perps`, `programs`, `pump-fun`, `pinocchio`, `llm_oracle`, `vulcan-cli-master` | Track source and examples; never commit keys or live `.env` files |
| Apps + operators | `apps`, `tui`, `chrome-extension`, `operator`, `clawd-cloud-os`, `tailclawd` | Track app source; `tui/.env`, `tui/dist`, and `tui/node_modules` stay local-only |
| Automation + memory | `automaton-main`, `leviathan`, `MemeBRain`, `moltbook-agent`, `ooda`, `deep-clawd`, `data` | Track source/config templates; private data dumps stay local-only |
| SDK + packages | `packages`, `sdk`, `clawdcli`, `clawdrouter`, `openShell`, `email-worker`, `scripts` | Track reusable package source and automation |
| Local-only vaults | `.local-secrets`, `openclawd-framework`, `UltraThink-SKill`, `node_modules` | Ignored. Do not push to GitHub, gitlawb, npm, or deployment artifacts |
| Root docs/config | `.env.example`, `.gitattributes`, `.gitignore`, `.gitmodules`, `.nvmrc`, `biome.json`, `bun.lock`, `bunfig.toml`, `CONTRIBUTING.md`, `HACKATHON.md`, `install.sh`, `leviathan.sh`, `LICENSE`, `MIGRATE.md`, `netlify.toml`, `package-lock.json`, `package.json`, `README.md`, `SECURITY.md`, `skills-lock.json`, `SOUL.md`, `STARTHERE`, `STARTHERE.md`, `STRATEGY.md`, `TRADE.md`, `tsconfig*.json` | Track public project metadata and non-secret examples |

Viral surface area is deliberate: animated docs, explicit agent maps, private gateway manifests, verifiable Solana receipts, and x402 routes are all visible. Private material is not.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:14F195,50:9945FF,100:FF5F1F&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=20&duration=1500&pause=350&color=FF5F1F&center=true&vCenter=true&width=1000&lines=%F0%9F%A6%9E%F0%9F%91%91+LOBSTER+KING+PERPS+%E2%80%94+THE+EXECUTION+HEART;OI+Signal+%C2%B7+Phoenix+%C2%B7+Vulcan+%C2%B7+Imperial+%C2%B7+OODA;Paper-first.+Every+order+ledgered.+Live+gated." alt="Perps header" />

</div>

## 🦞👑 `/Perps` — The Execution Heart

OI alone is not the signal. The Clawd Perps Core OI Signal is:

```text
OI delta + mark price delta + funding pressure + long/short skew
+ orderbook liquidity + spread + mark/index basis + account health
= Clawd Core OI Signal → regime → score → gate → route
```

| Regime | Condition |
| --- | --- |
| `LONG_CONTINUATION` | price ↑ + OI ↑ + funding sane + spread tight |
| `SHORT_CONTINUATION` | price ↓ + OI ↑ + funding sane + spread tight |
| `SHORTS_CLOSING` | price ↑ + OI ↓ — do not chase |
| `LONGS_CLOSING` | price ↓ + OI ↓ — wait |
| `CROWDED_LONG_RISK` | OI ↑ hard + funding very positive + skew long |
| `CROWDED_SHORT_RISK` | OI ↑ hard + funding very negative + skew short |
| `DATA_INVALID` | any execution gate failed |

```bash
# OI signal — mock (no RPC needed)
clawd-agents-perps signal oi SOL-PERP --mock

# Live + watch loop
clawd-agents-perps signal watch SOL-PERP --interval 5s --mode paper

# Risk gate before entering
clawd-agents-perps signal risk-gate SOL-PERP --notional 500 --side long

# Strategy runners (paper-first, ledgered, gated)
clawd-perps perps twap SOL --side buy --notional-usdc 500 --slices 5 --detached
clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5
clawd-perps perps finalize <run-id> --cancel-orders --close-position --wait --yes
```

The OI signal is the **Observe layer** of the perps OODA loop:

```text
Phoenix reads the tape → RPC verifies the chain → Clawd scores the crowd
→ Imperial routes only after the shell says risk is clean
```

**→ [`perps/clawd-agents-perps/README.md`](./perps/clawd-agents-perps/README.md) — full OI signal reference**
**→ [`Perps/README.md`](./Perps/README.md) — full execution stack (Imperial · Phoenix · Vulcan)**

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:1a0a2e,50:9945FF,100:14F195&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=16&duration=1400&pause=300&color=9945FF&center=true&vCenter=true&width=980&lines=MCP+Server+v3+%E2%80%94+Federated+Trust+Machine;Plugin+Registry+%C2%B7+Federation+%C2%B7+Task+Router+%C2%B7+Receipt+Middleware;p-token+stream+%C2%B7+98.3%25+CU+reduction+%C2%B7+SessionMeter" alt="MCP header" />

</div>

## ⚡ MCP Server v3 — Federated Trust Machine

The MCP server is the **central orchestration and receipt plane**. Every tool call becomes a signed event: who called it, what model requested it, what permission allowed it, what data was touched, what settlement occurred.

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash
solana-clawd-mcp                    # STDIO for Claude Desktop / Cursor / VS Code
PORT=3001 solana-clawd-mcp-http     # Streamable HTTP + SSE
```

```json
{ "mcpServers": { "solana-clawd": { "command": "~/.local/bin/solana-clawd-mcp" } } }
```

```text
              MCP Server
┌──────────┐  ┌────────────┐  ┌──────────────┐
│ Plugin   │  │ Federation │  │ Agent Task   │
│ Registry │  │ Bridge     │  │ Router       │
└──────────┘  └────────────┘  └──────────────┘
            ↓          ↓          ↓
   ┌─────────────────────────────────────┐
   │   Orchestrator + SessionMeter       │
   │   + PTokenStreamFacilitator         │
   └─────────────────────────────────────┘
```

| Category | Count | Description |
| --- | --- | --- |
| `solana` | 11 | Public Solana market data |
| `helius` | 8 | Helius RPC / DAS / Webhooks |
| `x402` | 9 | Payment protocol + p-token metered billing |
| `leviathan` | 9 | OODA loop + autonomous agent control |
| `market` | 5 | Composite intelligence (premium) |
| `pump` | 8 | Pump.fun bonding curve |
| `memory` | 4 | Persistent agent memory + autoDream |
| `agents` | 6 | Agent fleet + skill management |
| `deep-clawd` | 6 | DeepSeek trading agent tools |
| `docs` | 3 | Documentation system |
| `federation` | N | Federated MCP tools from external servers |
| `orchestrator` | 6+ | Orchestrator management, integration status |

p-token stream settlement: **98.3% CU reduction** vs SPL Token (6,200 → 105 CU). Atomic, batched, and streamed modes. $0.0001/token micropayments — cheap enough for high-frequency agent receipts.

**→ [`mcp/README.md`](./mcp/README.md)**

---

## 🤖 Crustacean Automation (`clawd-automaton`)

Sovereign agent runtime — OODA loops, identity provisioning, sandbox lifecycle, replication, SQLite-backed state. All locally, all yours.

```bash
npm install -g clawd-automaton
clawd-automaton --run        # OODA loop
clawd-automaton --goblin     # Devnet paper Goblin mode
```

| Tier | USDC | Pulse | Posture |
| --- | --- | --- | --- |
| `deep` | `>= $5.00` | `60s` | full capability |
| `shallow` | `>= $1.00` | `5m` | economical hunting |
| `shoreline` | `>= $0.10` | `15m` | conserve resources |
| `beached` | `$0` | — | stop before harm |

**→ [`automaton-main/README.md`](./automaton-main/README.md)**

---

## 🖥️ TUI — Bloomberg-Style Sovereign Terminal

```text
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
```

```bash
npm install -g @openclawdsolana/clawd-tui
clawd-tui   # or: hermes

# Mint a real Metaplex agent
clawd-agent mint --network devnet --keypair ~/.config/solana/id.json \
  --name "My AI Agent" --uri https://example.com/agent.json \
  --service MCP=https://example.com/mcp --yes

# Gasless mint (no local SOL needed)
clawd-agent mint-free --network devnet --owner <YOUR_SOLANA_PUBKEY> \
  --name "My AI Agent" --uri https://example.com/agent.json
```

**→ [`tui/README.md`](./tui/README.md)**

---

## 🧠 MemeBRain — Persistent Agent Memory

```text
remember → vault note → SQLite bank → recall → action
```

Local-first memory: SQLite bank, markdown research vault, OODA journal ingestion, fast recall.

```bash
clawd-brain init
clawd-brain remember "Jupiter Perps Risk" "Track liquidity, funding, oracle failure modes." --kind perp
clawd-brain recall "Jupiter perp risk"
npm run brain:ingest-ooda
```

**→ [`MemeBRain/README.md`](./MemeBRain/README.md)**

---

## 📦 On-Chain Programs

| Program | Description |
| --- | --- |
| [`agent-minter`](./programs/agent-minter/) | On-chain agent minting with Metaplex integration |
| [`clawd-stake`](./programs/clawd-stake/) | $CLAWD staking with reward distribution |
| [`llm_oracle`](./programs/llm_oracle/) | On-chain LLM callback bridge |
| [`mpl-corenft-staking`](./programs/mpl-corenft-staking/) | MPL Core NFT staking with yield mechanics |
| [`p-token-launchpad`](./programs/p-token-launchpad/) | SIMD-0266 p-token launch and stream settlement |
| [`solana-ai-inference`](./programs/solana-ai-inference/) | On-chain AI inference routing primitives |
| [`solana-gpt-oracle`](./programs/solana-gpt-oracle/) | GPT oracle bridge for on-chain AI responses |
| [`token-launcher`](./programs/token-launcher/) | Token launch automation with metadata + LP |

---

## 📦 Packages

```bash
npm i -g @openclawdsolana/clawd          # Main operator CLI
npm i -g @openclawdsolana/clawd-tui      # TUI + Metaplex Agent Registry
npm i -g @openclawdsolana/clawd-perps    # Phoenix perps + OI signal + Vulcan
npm i -g clawd-automaton                 # OODA runtime + dashboard
npm i -g solana-clawd                    # Root CLI
npm i @openclawdsolana/clawd-wallet      # Wallet SDK
npm i @openclawdsolana/clawd-sdk         # On-chain SDK, curves, vaults
```

---

## ⚡ x402 — Agent-Native Payments

HTTP `402 Payment Required` as agent-native settlement. Runtime loops that earn, pay, and keep operating. p-token micropayments cheap enough for per-action receipts.

```bash
curl https://x402.wtf/api/agents | jq .
curl https://x402.wtf/registry | jq .
```

---

## 🤝 Backrooms

```text
Three agents. One room. No exit.
Analyst ↔ Satirist ↔ Clawd
```

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
enter --loop 5
```

---

## 🗺️ Repo Map

```text
solana-clawd/
├── packages/clawd/src/aud-loop.ts   ← AUD Loop — Algorithmic Utility Delta
├── mcp/                             MCP v3 — receipt middleware + federation
├── sdk/                             runtime source, goals, knowledge
├── automaton-main/                  clawd-automaton OODA runtime + dashboard
├── attestation/                     Solana Attestation Service + clients
├── operator/                        OpenClawd Operator loop + ACP
├── agents/                          134-agent catalog + 115 skills
├── leviathan/                       sovereign runtime
├── x402/                            payment rails
├── MemeBRain/                       SQLite + markdown memory vault
├── tui/                             Bloomberg TUI + Metaplex Agent CLI
├── perps/clawd-agents-perps/        OI Signal + Imperial + Phoenix + TWAMM
├── Perps/                           Phoenix · Vulcan · market-maker suite
├── programs/                        Anchor programs workspace
│   ├── agent-minter/
│   ├── clawd-stake/
│   ├── llm_oracle/
│   ├── p-token-launchpad/
│   ├── solana-ai-inference/
│   └── token-launcher/
├── packages/
│   ├── clawd/                       main operator CLI + AUD loop
│   ├── clawd-perps/                 Phoenix perps + OI signal
│   ├── clawd-protocol/              vaults, staking, adaptive curves
│   ├── clawd-sdk/                   on-chain SDK
│   ├── clawd-wallet/                wallet SDK + safeguards
│   └── agentwallet/                 encrypted keypair vault
└── openclawd/                       x402, gateway, E2B subtree
```

---

## 📖 Reading Order

1. [`README.md`](./README.md) — you are here
2. [`packages/clawd/src/aud-loop.ts`](./packages/clawd/src/aud-loop.ts) — AUD Loop implementation
3. [`perps/clawd-agents-perps/README.md`](./perps/clawd-agents-perps/README.md) — OI signal + execution
4. [`Perps/README.md`](./Perps/README.md) — Imperial · Phoenix · Vulcan
5. [`mcp/README.md`](./mcp/README.md) — MCP v3 operator manual
6. [`automaton-main/README.md`](./automaton-main/README.md) — sovereign agent runtime
7. [`tui/README.md`](./tui/README.md) — TUI + agent minting
8. [`attestation/README.md`](./attestation/README.md) — Solana Attestation Service
9. [`sdk/README.md`](./sdk/README.md) — SDK, goals, knowledge
10. [`x402/README.md`](./x402/README.md) — payment rails
11. [`MemeBRain/README.md`](./MemeBRain/README.md) — agent memory system

---

## Fast Start

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm install && npm run check

npm run hermes
npm run leviathan:spawn
npm run automation:ci
npm run programs:map
npm run brain:init
```

---

```text
╔═══════════════════════════════════════════════════════════════════════════╗
║  CLAWD — The Verifiable Agentic Harness                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Harness    clawd · leviathan · clawd-automaton · OODA                   ║
║  Execution  Phoenix · Vulcan · Imperial · OI Signal · AUD Loop           ║
║  Receipts   Proof of Agentic Action · SAS attestation · memory journal   ║
║  Programs   agent-minter · clawd-stake · llm_oracle · p-token-launchpad  ║
║  Memory     MemeBRain · SQLite vault · OODA ingestion                    ║
║  Payments   x402 · HTTP 402 · Solana USDC · p-token stream settlement    ║
║  Agents     134 agents · 115 skills · gasless MPL Core minting           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## License

MIT.

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,28:9945FF,72:14F195,100:05060d&height=140&section=footer&text=Claude+thinks.+Clawd+proves.&fontSize=20&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="footer" />

<sub>backrooms.x402.wtf · x402.wtf · solanaclawd.com · the shell molts. the laws do not.</sub>

</div>
