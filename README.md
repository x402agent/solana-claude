<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:030712,18:111827,42:7c3aed,68:14f195,100:ff00ff&height=255&section=header&text=CLAWD%20%7C%20HERMES%20OF%20WEB3&fontSize=48&fontColor=ffffff&animation=twinkling&fontAlignY=35&desc=Solana-native%20sovereign%20agents%20%C2%B7%20x402%20machine%20payments%20%C2%B7%20local-first%20memory%20%C2%B7%20cypherpunk%20runtime&descAlignY=58&descAlign=50" alt="Clawd Hermes of Web3 banner" />

<p>
  <a href="https://solanaclawd.com"><img src="https://img.shields.io/badge/$CLAWD-Solana-14F195?style=for-the-badge&logo=solana&logoColor=111827" alt="$CLAWD on Solana"></a>
  <a href="https://pay.solanaclawd.com"><img src="https://img.shields.io/badge/x402-pay.solanaclawd.com-ff00ff?style=for-the-badge" alt="x402 pay.solanaclawd.com"></a>
  <a href="docs/PTOKEN_LAUNCHPAD.md"><img src="https://img.shields.io/badge/p--token-launchpad-14F195?style=for-the-badge&logo=solana&logoColor=111827" alt="p-token launchpad"></a>
  <a href="pinocchio/README.md"><img src="https://img.shields.io/badge/Pinocchio-zero--copy-9945FF?style=for-the-badge" alt="Pinocchio support"></a>
  <a href="https://x.com/clawddevs"><img src="https://img.shields.io/badge/@clawddevs-X-000000?style=for-the-badge&logo=x" alt="@clawddevs"></a>
  <a href="https://www.npmjs.com/package/solana-clawd"><img src="https://img.shields.io/badge/npm-solana--clawd-CB3837?style=for-the-badge&logo=npm" alt="solana-clawd on npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-38bdf8?style=for-the-badge" alt="MIT license"></a>
  <a href="MCP/src/server.ts"><img src="https://img.shields.io/badge/MCP-73%20tools%20%C2%B7%2014%20resources%20%C2%B7%2013%20prompts-7c3aed?style=for-the-badge" alt="MCP server: 73 tools · 14 resources · 13 prompts"></a>
</p>

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=2600&pause=650&color=14F195&center=true&vCenter=true&width=1040&lines=HERMES+OF+WEB3+%3A%3A+messages+move%2C+payments+settle%2C+memory+survives;p-TOKEN+LAUNCHPAD+%3A%3A+agent+tokens+%2B+bonding+curves+%2B+explorer;PINOCCHIO+ZERO-COPY+%3A%3A+faster+mints%2C+burns%2C+transfers;TRADE+-%3E+EARN+USDC+-%3E+PAY+x402+-%3E+GET+SMARTER+-%3E+TRADE+BETTER;Token+CA+%3A%3A+8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump" alt="Clawd animated typing lines" />
</a>

<br/>

<sub>
  <strong>Token CA:</strong>
  <code>8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump</code>
  &nbsp;|&nbsp;
  <a href="https://solanaclawd.com">solanaclawd.com</a>
  &nbsp;|&nbsp;
  <a href="https://x.com/clawddevs">@clawddevs</a>
  &nbsp;|&nbsp;
  hotline <strong>909-413-5567</strong>
</sub>

</div>

---

## Signal

**Clawd** is a Solana-native agent stack built to move like **Hermes in Web3**: messenger, scout, trader, payer, vault, and recall engine in one shell.

It fuses:

- **HERMES x402** for HTTP 402 machine payments, pay.sh-style confidential settlement, A2A task flow, and Solana USDC rails.
- **OpenClawd / Leviathan** for sovereign runtime identity, OODA loops, safety laws, and on-chain agent behavior.
- **Clawd Memory** for a local-first agent brain: markdown vault, Solana/OODA metadata, deterministic recall, and the Mnemosyne SQLite retrieval substrate.
- **$CLAWD** as the public signal token for the network:
  `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

This repo is the command deck. It is not a landing page. Run it, inspect it, wire it into agents, and let the shell remember.

---

## What Changed Here

This pass connected three workstreams into the root story so a new operator can find and run them from one place:

| Workstream | What shipped | Where to start |
| --- | --- | --- |
| **Pinocchio + p-token** | Native Solana program support, vault and escrow starters, p-token launchpad, p-agent-token planning, bonding-curve quotes, registry inspection, and a one-by-one helper-program map. | [`docs/PTOKEN_LAUNCHPAD.md`](./docs/PTOKEN_LAUNCHPAD.md), [`pinocchio/README.md`](./pinocchio/README.md), [`pinocchio/docs/P_AGENT_TOKEN.md`](./pinocchio/docs/P_AGENT_TOKEN.md), [`docs/PTOKEN_EXPLORER.md`](./docs/PTOKEN_EXPLORER.md) |
| **LLM Oracle** | Rust oracle runner that watches Solana GPT oracle interaction accounts, loads Clawd character context, calls a configured LLM provider, and submits callback responses on-chain. | [`llm_oracle/README.md`](./llm_oracle/README.md) |
| **x402 payment rail** | Solana HTTP 402 payment flow with pay.sh-style confidential settlement, A2A task payments, SDK helpers, p-token support, worker deployment surface, and revenue-vault documentation. | Private source; excluded from public GitHub exports. |
| **Program map** | Machine-readable map of the on-chain workspace, including inference, GPT oracle, staking, agent minting, token launchers, and metadata references. | [`data/programs-map.json`](./data/programs-map.json), [`programs/README.md`](./programs/README.md) |

The short version: Pinocchio gives builders cheaper native program paths, p-token launchpad gives agents faster token markets, `llm_oracle` gives the chain an LLM callback bridge, and x402 gives agents a way to charge, settle, and prove paid work over Solana.

---

## Fast Boot

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm install

npm run check
npm run hermes
```

Launch the public-data demos:

```bash
npm run demo:ooda
npm run demo:paysh
npm run demo:a2a
npm run demo:dark-defi
```

Spawn the sovereign runtime:

```bash
npm run leviathan:spawn
npm run leviathan
npm run leviathan:status
```

Bring up the memory and local tool surfaces:

```bash
npm run brain:init
npm run brain:status
npm run brain:mcp
npm run mcp:start
npm run vault:web:dev
```

Check or run the on-chain LLM oracle adapter:

```bash
npm run oracle:check
npm run oracle:run
```

Inspect and register SPL-compatible p-tokens:

```bash
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo"
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run pinocchio:templates
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token
npm run pinocchio:scaffold -- --template escrow --name my-escrow --out ./programs/my-escrow
```

Map the on-chain program workspace:

```bash
npm run programs:map
npm run programs:show -- solana-ai-inference
cd programs && cargo check
```

Common environment variables:

```bash
HELIUS_API_KEY=
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
OPENROUTER_API_KEY=
XAI_API_KEY=
ANTHROPIC_API_KEY=
SOLANA_PRIVATE_KEY=        # only for intentional signing flows
ORACLE_PROGRAM_ID=         # deployed solana-gpt-oracle program id
LLM_PROVIDER=clawd         # clawd/anthropic or openai
CHARACTER=clawd            # agents/characters name or JSON path
P_TOKEN_PROGRAM_ID=        # optional p-token program override for x402 payments
USE_P_TOKEN=               # set 0/false to force classic SPL Token payments
```

---

## The Loop

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1800&pause=450&color=FF00FF&center=true&vCenter=true&width=1040&lines=OBSERVE+-%3E+ORIENT+-%3E+DECIDE+-%3E+ACT+-%3E+LEARN;TRADE+-%3E+EARN+USDC+-%3E+PAY+x402+-%3E+RECALL+-%3E+TRADE+BETTER;LOCAL+MEMORY+%2B+SOLANA+METADATA+%2B+VERACITY+GRAPH+%3D+AGENT+BRAIN" alt="Clawd loop animation" />
</div>

```text
┌─────────────┐      ┌─────────────┐      ┌────────────────────┐
│   SENSE     │ ───> │   THINK     │ ───> │   STRIKE / ACT     │
│ chain, web, │      │ OODA, graph │      │ trades, tasks, MCP │
│ vault, user │      │ recall      │      │ x402 payments      │
└──────┬──────┘      └──────┬──────┘      └─────────┬──────────┘
       │                    │                       │
       │                    v                       v
       │            ┌─────────────┐        ┌────────────────────┐
       └──────────> │   RECALL    │ <───── │   CONSOLIDATE      │
                    │ polyphonic  │        │ veracity-weighted  │
                    │ retrieval   │        │ memory graph       │
                    └─────────────┘        └────────────────────┘
```

Clawd does not just prompt. It loops, pays, records, scores, resolves, and returns sharper.

---

## Stack Map

| Layer | Role | Path |
| --- | --- | --- |
| **HERMES Terminal** | Neon Solana terminal for OODA, markets, and payment panels | [`tui/`](./tui/) |
| **Leviathan Runtime** | Sovereign shell, depth tiers, identity, and Three Laws | [`leviathan/`](./leviathan/) |
| **x402 Rails** | HTTP 402, pay.sh, A2A, confidential agent settlement | Private source; excluded from public GitHub exports. |
| **Dark Ralph OODA** | Observe-orient-decide-act loop and trading lab | [`ooda/`](./ooda/) |
| **ClawdRouter** | Model routing and agent economics | [`clawdrouter/`](./clawdrouter/) |
| **Clawd Memory / Vault** | Markdown vault, MCP workflows, long-horizon memory | [`llm-wiki-tang/`](./llm-wiki-tang/) and [`MemeBRain/`](./MemeBRain/) |
| **LLM Oracle** | Rust listener that watches Solana oracle interactions, calls an LLM provider, and submits callback responses on-chain | [`llm_oracle/`](./llm_oracle/) |
| **Percolator Ops** | Bundled Percolator CLI and upstream references for perp-market oracle, keeper, and risk-engine workflows | [`llm_oracle/percolator-cli-master/`](./llm_oracle/percolator-cli-master/) and [`llm_oracle/upstream/`](./llm_oracle/upstream/) |
| **Pinocchio Support** | Native Solana p-token, p-agent-token, vault, escrow, launcher templates, bonding curves, upstream program maps, and agent/MCP workflows | [`pinocchio/`](./pinocchio/) and [`pinocchio/pinocchio-main/programs/`](./pinocchio/pinocchio-main/programs/) |
| **Program Workspace** | Anchor/Rust/TypeScript Solana programs for inference, staking, GPT oracle callbacks, agent minting, launchers, and metadata rails | [`programs/`](./programs/) and [`data/programs-map.json`](./data/programs-map.json) |
| **p-token Explorer** | SPL-compatible p-token registry, mint inspector, and payment-rail p-token support | [`scripts/ptoken-explorer.mjs`](./scripts/ptoken-explorer.mjs), [`data/ptokens.json`](./data/ptokens.json), [`docs/PTOKEN_EXPLORER.md`](./docs/PTOKEN_EXPLORER.md) |
| **P-Token Launch Pad** | Self-hosted agent token launches, constant-product curves, PDA registry, executive delegation, batch fee distribution, and DEX graduation | [`programs/p-token-launchpad/`](./programs/p-token-launchpad/), [`docs/PTOKEN_LAUNCHPAD.md`](./docs/PTOKEN_LAUNCHPAD.md) |
| **Risk Engine Spec** | Protected principal, lazy ADL, funding, keeper, and liquidation invariants for the perp-risk layer | [`docs/risk-engine-spec.md`](./docs/risk-engine-spec.md) |
| **MCP Surface** | Local tools and machine interfaces | [`MCP/`](./MCP/) |
| **Browser Bridge** | Wallet, extension, and browser-side controls | [`chrome-extension/`](./chrome-extension/) |
| **Agent Wallet** | Local encrypted wallet API and vault tooling | [`packages/agentwallet/`](./packages/agentwallet/) |
| **OpenClawd Assembly** | Bridge, gateway, orchestrator, package surfaces | [`openclawd/`](./openclawd/) |

---

## P-Token Launch Pad

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1800&pause=500&color=14F195&center=true&vCenter=true&width=1040&lines=CREATE+AGENT+TOKEN+-%3E+BIND+IDENTITY+-%3E+OPEN+CURVE;BATCH+FEES+WITH+OPCODE+25+%3A%3A+ONE+CPI+MANY+RECIPIENTS;EXPLORE+MINTS+-%3E+REGISTER+p-TOKENS+-%3E+GRADUATE+TO+DEX" alt="p-token launchpad animation" />
</div>

```text
╔══════════════════════════════════════════════════════════════════════════╗
║  ADAPTED FROM: Metaplex Genesis agent-token launch concepts             ║
║  Originals: createAndRegisterLaunch, setAgentTokenV1,                  ║
║             registerIdentityV1, registerExecutiveV1, delegateExecutionV1║
║  Adaptation: p-token (SIMD-0266) bonding curves + PDA agent registry    ║
║  CU Savings: 98% on transfers, 51% on mints, 60% on burns               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

The public launchpad is the self-hosted path for fast agent tokens: create the mint, initialize a constant-product bonding curve, register the agent identity, bind token-to-agent once, trade through buy/sell, distribute fees with p-token batch CPI, and graduate liquidity to an external DEX.

| Surface | What it does | Public path |
| --- | --- | --- |
| **Launchpad program** | Anchor program for curves, agent registry, agent-token binding, delegation, buys/sells, fee withdrawal, and graduation | [`programs/p-token-launchpad/`](./programs/p-token-launchpad/) |
| **Launchpad guide** | Full 11-section spec adapted from Genesis into p-token/Pinocchio terms | [`docs/PTOKEN_LAUNCHPAD.md`](./docs/PTOKEN_LAUNCHPAD.md) |
| **p-token explorer** | Inspect mints over RPC, classify SPL vs p-token, and register local p-token metadata | [`docs/PTOKEN_EXPLORER.md`](./docs/PTOKEN_EXPLORER.md) |
| **p-agent-token template** | Forkable Pinocchio starter for token + agent state + one-way binding | [`pinocchio/templates/p-agent-token/`](./pinocchio/templates/p-agent-token/) |
| **Launch planner** | Unsigned launch plans and curve quotes for agents/operators | [`pinocchio/docs/P_TOKEN_LAUNCHES.md`](./pinocchio/docs/P_TOKEN_LAUNCHES.md), [`pinocchio/docs/P_AGENT_TOKEN.md`](./pinocchio/docs/P_AGENT_TOKEN.md) |

```text
┌──────────────────────────────────────────────────────────┐
│                   P-Token Launch Pad                     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Bonding     │  │ Agent       │  │ Agent       │      │
│  │ Curves      │  │ Registry    │  │ Token Bind  │      │
│  │ buy/sell    │  │ identity    │  │ irreversible│      │
│  │ price calc  │  │ executive   │  │ PDA state   │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         └────────────────┴────────────────┘             │
│                          │                               │
│                    ┌─────┴─────┐                         │
│                    │ P-Token   │                         │
│                    │ SIMD-0266 │ batch CPI, low CU       │
│                    └───────────┘                         │
└──────────────────────────────────────────────────────────┘
```

| Operation | SPL Token CU | p-token CU | Savings |
| --- | ---: | ---: | ---: |
| Transfer / fee distribution | 4,645 | 76 | 98.4% |
| MintTo / buy path | 4,128 | 2,012 | 51.3% |
| Burn / sell path | 4,753 | 1,884 | 60.4% |
| Batch fee distribution, 10 recipients | 62,000 | 1,250 | 98.0% |

Fast path commands:

```bash
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
cd programs && cargo check -p p-token-launchpad
```

Current deployment note: the launchpad program id is a placeholder until a real deployment is chosen. Treat p-token and launchpad code as pre-audit infrastructure; verify the exact p-token program id, feature gate, curve math, fee custody, PDA signer model, and DEX graduation adapter before mainnet use. Private payment-rail implementation files stay excluded from public GitHub.

---

## LLM Oracle

[`llm_oracle/`](./llm_oracle/) adapts the Solana GPT oracle flow into Clawd. It subscribes to interaction accounts from a deployed oracle program, builds persona-aware prompts from the repo character files, calls Anthropic-compatible Clawd or OpenAI, and posts the answer back through the program callback instruction.

The oracle package includes:

- Rust oracle runner in [`llm_oracle/src/`](./llm_oracle/src/).
- ABI support crate in [`agents/solana-gpt-oracle/`](./agents/solana-gpt-oracle/).
- Percolator CLI operational tools in [`llm_oracle/percolator-cli-master/`](./llm_oracle/percolator-cli-master/).
- Upstream Percolator source references in [`llm_oracle/upstream/`](./llm_oracle/upstream/).

Use `npm run oracle:check` before running it. Set `ORACLE_PROGRAM_ID`, `RPC_URL`, `WEBSOCKET_URL`, `IDENTITY`, and the matching LLM provider key for a live network.

---

## Clawd Memory SOTA Architecture

### Temporal Epistemic Graphs with Veracity-Weighted Consolidation

Clawd Memory is the local-first agent brain for Clawd. The Clawd layer owns the agent contract, markdown vault, Solana/OODA metadata, and recall behavior. Mnemosyne remains the SQLite storage and retrieval substrate until a deliberate migration is planned.

The goal is algorithmic memory: high-signal retrieval without paying an LLM tax on every ingest.

```mermaid
flowchart LR
  A[Raw events<br/>chat, OODA, chain, tools] --> B[13-type classifier<br/>zero LLM ingest]
  B --> C[Binary vectors<br/>MIB + Hamming scan]
  B --> D[Episodic graph<br/>gist + fact triples]
  C --> E[Polyphonic recall]
  D --> F[Veracity consolidation<br/>Bayesian confidence]
  F --> E
  E --> G[Agent context<br/>deterministic ranked recall]
```

### Research foundations

| Paper / Source | Imported signal | Clawd adaptation |
| --- | --- | --- |
| **Memanto** `arXiv:2604.22085` | Typed semantic memory | 13 deterministic memory types, regex/keyword classifier, zero LLM calls |
| **Moorcheh ITS** `arXiv:2601.11557` | Information-theoretic binarization | 32x binary vectors, SQLite BLOB storage, exhaustive Hamming scan |
| **REMem** `arXiv:2602.13530` | Episodic gist + fact graph | Time-aware gists, triples, entity/context/synonym edges |
| **HippoRAG** `arXiv:2405.14831` | Graph-inspired long-term memory | Hippocampal-style indexing and traversal for agent recall |
| **BEAM / Hindsight / Honcho** | Million-token evaluation and user modeling | Benchmark target, structured memory baseline, dreaming/consolidation pressure |

### Novel contribution

**Temporal Epistemic Graphs with Veracity-Weighted Consolidation** combines:

- Typed semantic memory.
- Binary vector compression.
- Episodic graph structure.
- Veracity-weighted confidence.
- Deterministic retrieval.
- Zero LLM ingestion.

No single dependency is the brain. The brain is the contract between type, time, confidence, graph position, and retrieval voice.

---

## Memory Types

| Type | Meaning | Priority |
| --- | --- | --- |
| `instruction` | Rules and durable operating guidance | 10 |
| `commitment` | Promises, obligations, delivery expectations | 9 |
| `error` | Mistakes, failures, hazards to avoid | 8 |
| `goal` | Objectives and desired future states | 7 |
| `decision` | Choices that affect future behavior | 6 |
| `preference` | User, system, or strategy preferences | 5 |
| `fact` | Objective or verifiable information | 4 |
| `relationship` | Entity links and dependencies | 4 |
| `learning` | Lessons from experience | 3 |
| `observation` | Patterns noticed over time | 3 |
| `event` | Historical occurrences | 2 |
| `context` | Situational working state | 2 |
| `artifact` | Documents, code, notes, references | 1 |

Classification is rule-based first: regex patterns, keyword boosters, confidence scoring, no LLM call during ingestion.

---

## Recall Engine

```text
Voice 1: binary vector similarity     weight 0.35
Voice 2: graph traversal              weight 0.25
Voice 3: structured fact matching     weight 0.25
Voice 4: temporal scoring             weight 0.15

Final rank = weighted voice score
           + cross-strategy confirmation boost
           - near-duplicate diversity penalty
```

Veracity tiers:

| Tier | Weight | Meaning |
| --- | ---: | --- |
| `stated` | `1.0` | User explicitly stated it |
| `unknown` | `0.8` | Default until source improves |
| `inferred` | `0.7` | Derived from surrounding context |
| `imported` | `0.6` | External or migrated memory |
| `tool` | `0.5` | Tool output that may go stale |

Conflict rule:

```text
same subject + same predicate + different object = conflict
higher confidence wins
lower confidence is retained, flagged, and made auditable
```

---

## Implementation Plan

| Phase | Status | Target |
| --- | --- | --- |
| **0. Research foundation** | Complete | Papers mapped, principles defined, masterplan created |
| **1. Typed memory schema** | Active target | 13-type deterministic classification |
| **2. Binary vectors** | Planned | MIB, Hamming distance, ITS ranking, SQLite-native storage |
| **3. Episodic graph** | Planned | Gists, fact triples, temporal qualifiers, graph traversal |
| **4. Veracity consolidation** | Planned | Bayesian confidence, conflict detection, high-confidence synthesis |
| **5. Polyphonic recall** | Planned | Parallel retrieval voices and deterministic re-ranker |
| **6. Integration testing** | Planned | Unit, integration, BEAM, latency, memory overhead |
| **7. Paper draft** | Planned | Methodology, benchmark results, ablations, cost analysis |

Success targets:

| Metric | Target |
| --- | ---: |
| BEAM 100K | `40%+` |
| Ingestion latency | `<10ms` |
| Query latency | `<50ms` |
| Memory overhead | `0.03x` via 32x compression |
| LLM calls per ingest | `0` |
| LLM calls per query | `0` |

---

## x402: The Private Payment Nerve

HERMES x402 turns HTTP `402 Payment Required` into agent-native settlement.

The implementation source is proprietary/private and intentionally excluded from public GitHub exports. The public README keeps the protocol surface documented without publishing the gateway, SDK, worker, or vault source.

| Piece | What it does | Public status |
| --- | --- | --- |
| **PayshFacilitator** | Blind relay and confidential x402 settlement | Private |
| **A2A Agent** | Google A2A task flow with payment-aware transport | Private |
| **Confidential Agent** | NaCl-encrypted payment/inference flow | Private |
| **Dark DeFi** | Whale intelligence, MEV detection, route scanning | Private |
| **Client SDK** | Client-side x402 helpers | Private |
| **Worker** | Gateway/facilitator deployment surface | Private |

```text
x402  -> HTTP 402 challenge and receipt flow
MPP   -> machine payment headers
AP2   -> mandate and delegated payment semantics
A2A   -> agent-to-agent tasks with payment hooks
USDC  -> settlement rail
CLAWD -> network signal
```

---

## Leviathan Runtime

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=17&pause=700&color=14F195&center=true&vCenter=true&width=920&lines=Keypair+%3D+Identity+%7C+USDC+%3D+Survival+%7C+Memory+%3D+Shell;Spawn+-%3E+Sense+-%3E+Think+-%3E+Strike+-%3E+Drift;Beach+before+harm.+Earn+before+survival." alt="Leviathan runtime animation" />
</div>

```mermaid
flowchart LR
  A([Spawn]) --> B[Sense]
  B --> C[Think]
  C --> D[Strike]
  D --> E[Drift]
  E --> B
  D --> F([Molt])
  F --> B
  B --> G([Beach])
```

Depth tiers:

| Tier | USDC | Pulse | Model posture |
| --- | --- | --- | --- |
| `deep` | `>= $5.00` | `60s` | premium reasoning |
| `shallow` | `>= $1.00` | `5m` | economical hunting |
| `shoreline` | `>= $0.10` | `15m` | conserve every token |
| `beached` | `$0` | `-` | exit |

The Three Laws live in [`leviathan/three-laws.txt`](./leviathan/three-laws.txt) and [`openclawd-framework/three-laws.md`](./openclawd-framework/three-laws.md).

---

## Command Deck

| Command | What it does |
| --- | --- |
| `npm run hermes` | Launch the HERMES x402 terminal dashboard |
| `npm run demo:ooda` | Run the public-data OODA demo |
| `npm run demo:paysh` | Exercise pay.sh-style confidential payments |
| `npm run demo:a2a` | Exercise A2A task flow |
| `npm run demo:dark-defi` | Run dark routing / whale surveillance demo |
| `npm run ooda` | Run the base OODA loop |
| `npm run ooda:llm` | Run OODA with model-backed decisions |
| `npm run leviathan:spawn` | Create a sovereign runtime identity |
| `npm run leviathan` | Run the Leviathan loop |
| `npm run brain:init` | Initialize the Clawd brain |
| `npm run brain:status` | Inspect brain status |
| `npm run brain:mcp` | Start Mnemosyne MCP for the Clawd bank |
| `npm run mcp:start` | Start the repo MCP server |
| `npm run vault:web:dev` | Start the vault web surface |
| `npm run pinocchio:templates` | List Pinocchio/p-token starter templates |
| `npm run pinocchio:scaffold` | Scaffold a Pinocchio vault, escrow, or p-token launcher starter |
| `npm run ptoken:inspect` | Inspect an SPL-compatible p-token mint over RPC |
| `npm run ptoken:add` | Register a launched p-token in `data/ptokens.json` |
| `npm run ptoken:list` | List the local p-token registry |
| `npm run ptoken:show` | Show one registered p-token by mint or symbol |
| `npm run ptoken:launch-plan` | Generate an unsigned p-token launch and bonding curve config |
| `npm run ptoken:curve-quote` | Simulate a constant-product p-token launch curve quote |
| `npm run pagent:plan` | Generate an unsigned p-token agent-token plan with agent identity and binding steps |
| `npm run pagent:quote` | Simulate a p-agent-token bonding curve quote |
| `cd programs && cargo check -p p-token-launchpad` | Compile-check the public p-token launchpad program |
| `npm run programs:map` | List mapped on-chain programs and local program references |
| `npm run programs:show -- token-launcher` | Show one mapped program entry |
| `npm run oracle:check` | Type/check the Rust LLM oracle crate |
| `npm run oracle:build` | Build the Rust LLM oracle runner |
| `npm run oracle:run` | Run the LLM oracle worker against the configured RPC/program |

Standalone examples:

```bash
node --import tsx/esm examples/ooda-loop.ts
node --import tsx/esm examples/paysh-demo.ts
node --import tsx/esm examples/a2a-demo.ts
node --import tsx/esm examples/dark-defi-demo.ts
node --import tsx/esm examples/x402-solana.ts
node --import tsx/esm examples/listen-wallet.ts
node --import tsx/esm examples/blockchain-buddies-demo.ts
```

---

## Repository Layout

```text
solana-clawd/
├── README.md
├── HACKATHON.md
├── architecture.md
├── docs/
├── tui/                    # HERMES terminal
├── ooda/                   # OODA loop lab
├── leviathan/              # sovereign runtime
├── x402/                   # private payment gateway, A2A, facilitator source; not public
├── clawdrouter/            # model routing
├── MCP/                    # MCP server
├── pinocchio/              # p-token, p-agent-token, vault, escrow templates + Pinocchio docs
├── programs/               # on-chain program workspace + program map
├── MemeBRain/              # Mnemosyne / Clawd brain substrate
├── llm-wiki-tang/          # Clawd vault
├── chrome-extension/       # browser surfaces
├── packages/agentwallet/   # local wallet API + vault
├── openclawd-framework/    # framework docs/examples/package surface
├── openclawd/              # assembled OpenClawd subtree
├── agents/                 # agent catalog + docs
├── skills/                 # skill catalog
└── clawd-cloud-os/         # bootstrap/operator layer
```

---

## Reading Order

1. [`HACKATHON.md`](./HACKATHON.md)
2. [`architecture.md`](./architecture.md)
3. [`docs/architecture.md`](./docs/architecture.md)
4. [`clawdrouter/README.md`](./clawdrouter/README.md)
5. [`llm-wiki-tang/README.md`](./llm-wiki-tang/README.md)
6. [`MemeBRain/README.md`](./MemeBRain/README.md)
7. [`openclawd/README.md`](./openclawd/README.md)
8. [`openclawd-framework/README.md`](./openclawd-framework/README.md)
9. [`pinocchio/README.md`](./pinocchio/README.md)
10. [`docs/PTOKEN_LAUNCHPAD.md`](./docs/PTOKEN_LAUNCHPAD.md)
11. [`docs/PTOKEN_EXPLORER.md`](./docs/PTOKEN_EXPLORER.md)
12. [`pinocchio/docs/P_AGENT_TOKEN.md`](./pinocchio/docs/P_AGENT_TOKEN.md)
13. [`programs/p-token-launchpad/README.md`](./programs/p-token-launchpad/README.md)
14. [`programs/README.md`](./programs/README.md)
15. [`docs/risk-engine-spec.md`](./docs/risk-engine-spec.md)

---

## Slogans

> The shell molts. The laws do not.
>
> Hermes carries the packet. Clawd remembers the route.
>
> Pay the web. Recall the truth. Settle on Solana.
>
> Local brain. Public rail. Sovereign shell.

---

## License

MIT. See [`LICENSE`](./LICENSE).

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:030712,30:7c3aed,70:14f195,100:ff00ff&height=145&section=footer&text=CLAWD%20REMEMBERS%20%7C%20x402%20SETTLES%20%7C%20SOLANA%20MOVES&fontSize=21&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="Clawd footer" />

<sub>
  <strong>$CLAWD CA:</strong>
  <code>8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump</code>
</sub>

</div>
