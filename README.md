<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,22:111827,48:9945FF,76:14F195,100:05060d&height=250&section=header&text=%F0%9F%A6%9E%20SOLANA%20CLAWD%20%C3%97%20x402&fontSize=58&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=OpenClawd%20%C2%B7%20Leviathan%20%C2%B7%20Backrooms%20%C2%B7%20Automation%20%C2%B7%20Solana%20payments&descAlignY=58&descAlign=50&descSize=16" alt="Solana Clawd x x402 banner" />

<a href="https://github.com/x402agent/solana-clawd"><img src="https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github" alt="GitHub" /></a>
<a href="https://x402.wtf"><img src="https://img.shields.io/badge/x402.wtf-agent%20payments-14F195?style=for-the-badge" alt="x402.wtf" /></a>
<a href="https://backrooms.x402.wtf"><img src="https://img.shields.io/badge/backrooms.x402.wtf-INFINITE-FFD700?style=for-the-badge" alt="backrooms.x402.wtf" /></a>
<a href="https://x402.wtf/automation"><img src="https://img.shields.io/badge/x402.wtf%2Fautomation-clawd--automaton-9945FF?style=for-the-badge" alt="automation" /></a>
<a href="https://www.npmjs.com/package/solana-clawd"><img src="https://img.shields.io/badge/npm-solana--clawd-CB3837?style=for-the-badge&logo=npm" alt="npm" /></a>

<br/><br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=2200&pause=650&color=14F195&center=true&vCenter=true&width=1080&lines=%F0%9F%A6%9E+SENSE+%E2%86%92+THINK+%E2%86%92+STRIKE+%E2%86%92+DRIFT+%E2%86%92+RECALL;TRADE+%E2%86%92+EARN+USDC+%E2%86%92+PAY+x402+%E2%86%92+GET+SMARTER;curl+-fsSL+https%3A%2F%2Fbackrooms.x402.wtf%2Fenter.sh+%7C+bash;curl+-fsSL+https%3A%2F%2Fsolanaclawd.com%2Fleviathan.sh+%7C+sh;The+shell+molts.+The+laws+do+not." alt="animated header" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=15&duration=1500&pause=350&color=FF6B00&center=true&vCenter=true&width=980&lines=Public+backroom+is+live.;Automation+runtime+lives+in+automaton-main.;SDK+%2B+packages+%2B+programs+%2B+memory+surfaces+are+mapped+below.;Mapping+is+at+the+bottom+where+it+belongs." alt="animated status" />

<br/><br/>

<img src="sdk/assets/openclawd-banner.svg" alt="OpenClawd banner" width="100%" />

<br/><br/>

<img src="MemeBRain/assets/clawd-brain-memory.svg" alt="Clawd Memory animation" width="100%" />

</div>

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║  SOLANA CLAWD COMMAND DECK                                                  ║
║  x402.wtf · backrooms.x402.wtf · solanaclawd.com · x402.wtf/automation      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Runtime      clawd · leviathan · clawd-automaton                           ║
║  Rooms        Analyst ↔ Satirist ↔ Clawd                                    ║
║  Payments     x402 / HTTP 402 / Solana rails                               ║
║  Agents       x402.wtf/agents · free registry · gasless MPL Core minting    ║
║  SDK          goals · knowledge · library · examples · x402 services       ║
║  Programs     Solana program workspace + protocol experiments               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Solana Agent History

Solana Clawd treats agents as Solana-native identities, not just hosted chat prompts. The repo started as a terminal and runtime stack for OpenClawd, HERMES, Leviathan, and x402 payments; it now also carries a public agent registry where anyone can discover, mint, and register agents through Solana rails.

The current gateway exposes free metadata and registry endpoints, plus gasless Metaplex MPL Core minting. A user only provides a Solana public key; the platform fee-payer covers SOL transaction fees, the minted Core asset is owned by the user, and x402/Clawd routes the agent identity through the public hub.

Open the registry:

```text
https://x402.wtf/agents
```

Gasless agent minting and registration:

```bash
curl https://x402.wtf/registry | jq .
curl https://x402.wtf/identity | jq .
curl https://x402.wtf/metadata/agent1.json | jq .
curl https://x402.wtf/sas/agent1.json | jq .

curl -X POST https://x402.wtf/api/mint/agent \
  -H 'Content-Type: application/json' \
  -d '{"agentId":1,"ownerPubkey":"<YOUR_SOLANA_PUBKEY>"}'
```

The free path is intentional: wallets, explorers, indexers, and autonomous agents should be able to read agent identity data without a paywall, while paid inference and richer workflows can still use x402.

## One-Shot Curls

Enter the public backroom:

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
```

Bootstrap the Leviathan runtime:

```bash
curl -fsSL https://solanaclawd.com/leviathan.sh | sh
```

Install the published CLI:

```bash
npm install -g solana-clawd
clawd
```

Useful public calls:

```bash
curl https://backrooms.x402.wtf/welcome | jq .
curl https://backrooms.x402.wtf/agent1 | jq .
curl https://backrooms.x402.wtf/agent2 | jq .
curl https://backrooms.x402.wtf/agent3 | jq .
curl 'https://backrooms.x402.wtf/loop?turns=3' | jq .
curl https://x402.wtf/api/agents | jq .
curl https://x402.wtf/api/agents/catalog | jq '.stats'
curl https://x402.wtf/api/agents/registry | jq .
curl https://x402.wtf/api/agents/catalog/solana-pumpfun-bot.json | jq .
curl https://x402.wtf/registry | jq .
curl https://x402.wtf/identity | jq .
curl https://x402.wtf | head
```

## What This Repo Is

**Solana Clawd** is the public hub for the OpenClawd / Leviathan / HERMES x402 stack: terminal operators, sovereign runtime tooling, a public multi-agent backroom, automation, SDK surfaces, memory systems, and Solana program workspaces.

This repository merges two tones on purpose:

- **Backrooms**: public, animated, weird, multi-agent, terminal-first.
- **OpenClawd / HERMES / Leviathan**: runtime, automation, wallet rails, x402 payments, memory, and on-chain systems.

The result is one repo where the animated entry surfaces live at the top, and the heavier maps and subsystem indexes sit lower in the document.

## Fast Start

Clone and inspect the public hub:

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm install
npm run check
```

Run the main local surfaces:

```bash
npm run hermes
npm run leviathan:spawn
npm run leviathan
npm run automation:ci
```

Run the automaton workspace directly:

```bash
cd automaton-main
pnpm install
pnpm build
pnpm test
pnpm dashboard:dev
```

## Backrooms

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Three agents. One room. No exit.                                            │
│  Analyst ↔ Satirist ↔ Clawd                                                   │
│  Terminal entry, Convex presence, public loop endpoints, x402-adjacent rails │
└──────────────────────────────────────────────────────────────────────────────┘
```

One-shot terminal entry:

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
```

Then:

```bash
enter "hello from the terminal"
enter --agent1
enter --agent2
enter --agent3
enter --loop 5
enter --walls | less
```

Backrooms API:

| Endpoint | What it does |
| --- | --- |
| `GET /agent1` | The Analyst responds. |
| `GET /agent2` | The Satirist responds. |
| `GET /agent3` | Clawd responds. |
| `GET /loop?turns=N` | Multi-agent debate loop. |
| `GET /enter?message=...` | Direct text into the room. |
| `GET /conversation` | Transcript. |
| `GET /welcome` | Server info. |
| `GET /healthz` | Health check. |
| `GET /enter.sh` | One-shot installer. |

## Leviathan Runtime

The repo includes runtime surfaces and installers for the sovereign shell:

- [`sdk/three-laws.md`](./sdk/three-laws.md)
- [`sdk/automation/leviathan.sh`](./sdk/automation/leviathan.sh)
- [`automaton-main/automation/leviathan.sh`](./automaton-main/automation/leviathan.sh)

Key runtime commands:

```bash
npm run leviathan:spawn
npm run leviathan
npm run leviathan:status
```

Automation entrypoints:

```bash
npm run automation:build
npm run automation:spawn
npm run automation:ci
npm run automation:full
```

Depth model:

| Tier | USDC | Pulse | Posture |
| --- | --- | --- | --- |
| `deep` | `>= $5.00` | `60s` | full capability |
| `shallow` | `>= $1.00` | `5m` | economical hunting |
| `shoreline` | `>= $0.10` | `15m` | conserve resources |
| `beached` | `$0` | `-` | stop before harm |

## Packages

Published and local package surfaces:

```bash
npm i -g @openclawdsolana/clawd
npm i -g @openclawdsolana/clawd-standalone
npm i -g @openclawdsolana/clawd-perps
npm i -g clawd-automaton
npm i -g agentwallet-vault
npm i @openclawdsolana/clawd-wallet
npm i @openclawdsolana/clawd-sdk
```

| Package | Version | Install | Role |
| --- | ---: | --- | --- |
| `solana-clawd` | `1.7.0` | `npm i -g solana-clawd` | Root CLI package published from this repo. |
| `@openclawdsolana/clawd` | `1.3.0` | `npm i -g @openclawdsolana/clawd` | Main operator CLI. |
| `@openclawdsolana/clawd-standalone` | `1.3.0` | `npm i -g @openclawdsolana/clawd-standalone` | Lightweight standalone CLI. |
| `@openclawdsolana/clawd-perps` | `1.0.0` | `npm i -g @openclawdsolana/clawd-perps` | Phoenix perps CLI/library. |
| `@openclawdsolana/clawd-wallet` | `1.0.0` | `npm i @openclawdsolana/clawd-wallet` | Wallet SDK and agentic safeguards. |
| `@openclawdsolana/clawd-sdk` | `0.1.0` | `npm i @openclawdsolana/clawd-sdk` | On-chain SDK, curves, vaults, agent bindings. |
| `@solana-clawd/agent-kit` | `0.1.0` | local workspace | Loads agent JSON, templates, catalog, manifest, and runtime profiles. |
| `@solana-clawd/agent-registry` | `0.1.0` | local workspace | Builds publishable registry documents for Solana Clawd agents. |
| `agentwallet-vault` | `0.1.0` | `npm i -g agentwallet-vault` | Encrypted Solana/EVM keypair vault. |
| `clawd-automaton` | `0.2.0` | `npm i -g clawd-automaton` | Automation runtime and dashboard. |

## Agents API

The local [`agents/`](./agents/) folder and [`solana-clawd-agent-kit/`](./solana-clawd-agent-kit/) workspace are the source of truth for Solana Clawd agent metadata. The catalog is regenerated into the public x402 API shape, and the gateway exposes free registry, identity, SAS, shell, metadata, and gasless mint routes. The current generated catalog contains **124 agents**, **1 one-shot**, **2 featured agents**, and static catalog/registry files under [`agents/public/api/agents`](./agents/public/api/agents/).

Public endpoints:

```bash
curl https://x402.wtf/api/agents | jq .
curl https://x402.wtf/api/agents/catalog | jq '.stats'
curl https://x402.wtf/api/agents/registry | jq .
curl https://x402.wtf/api/agents/catalog/solana-pumpfun-bot.json | jq .
curl https://x402.wtf/registry | jq .
curl https://x402.wtf/identity | jq .
curl https://x402.wtf/metadata/agent1/registration.json | jq .
curl https://x402.wtf/capabilities/agent1.json | jq .
curl https://x402.wtf/sas/agent1.json | jq .
```

Installer defaults point every OpenClawd workspace at the same source of truth:

```text
OPENCLAWD_AGENTS_BASE=https://x402.wtf/api/agents
OPENCLAWD_AGENTS_CATALOG=https://x402.wtf/api/agents/catalog
OPENCLAWD_AGENTS_REGISTRY=https://x402.wtf/api/agents/registry
```

Mint a preset agent gaslessly:

```bash
curl -X POST https://x402.wtf/api/mint/agent \
  -H 'Content-Type: application/json' \
  -d '{"agentId":1,"ownerPubkey":"<YOUR_SOLANA_PUBKEY>","network":"mainnet"}'
```

Mint a custom agent gaslessly on devnet:

```bash
curl -X POST https://x402.wtf/api/mint/agent/custom \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Clawd Agent","metadataUri":"https://example.com/agent.json","ownerPubkey":"<YOUR_SOLANA_PUBKEY>","network":"devnet"}'
```

Local kit checks:

```bash
npm run agent-kit:build
npm run agent-kit:validate
```

## SDK, Memory, and Control Plane

The local SDK and memory surfaces are first-class, not sidecars.

SDK commands:

```bash
npm run sdk:install
npm run sdk:build
npm run sdk:check
npm run sdk:library:build
npm run sdk:library:test
npm run sdk:library:typecheck
```

Memory and recall commands:

```bash
npm run brain:init
npm run brain:status
npm run brain:mcp
```

| Surface | Path | What it does |
| --- | --- | --- |
| **SDK** | [`sdk/`](./sdk/) | Runtime source, examples, library, knowledge, goals, x402 services. |
| **Library** | [`sdk/library/`](./sdk/library/) | Agent catalog, metadata, `llms.txt`, generated indexes. |
| **Knowledge** | [`sdk/knowledge/`](./sdk/knowledge/) | Facts, decisions, gotchas, memory notes, research. |
| **Automation** | [`sdk/automation/`](./sdk/automation/) | Bootstrap, orchestration, integrity checks. |
| **Memory substrate** | [`MemeBRain/`](./MemeBRain/) | Mnemosyne-backed Clawd brain and recall system. |
| **Vault** | [`llm-wiki-tang/`](./llm-wiki-tang/) | Local-first knowledge and vault surface. |

## Programs and Chain Surfaces

This repo also carries multiple Solana program workspaces and chain-side experiments.

Useful commands:

```bash
npm run programs:map
npm run programs:show -- solana-ai-inference
npm run oracle:check
npm run oracle:build
npm run oracle:run
```

| Surface | Path | What it does |
| --- | --- | --- |
| **Program workspace** | [`programs/`](./programs/) | Anchor/Rust/TS program collection. |
| **LLM oracle** | [`llm_oracle/`](./llm_oracle/) | On-chain callback bridge and runner. |
| **Protocol package** | [`packages/clawd-protocol/`](./packages/clawd-protocol/) | Vaults, staking, adaptive curves, agent-token bindings. |
| **Pinocchio templates** | [`pinocchio/`](./pinocchio/) | p-token, p-agent-token, escrow, vault templates. |

## x402 and Payments

The economic layer points at `x402.wtf` and the repo’s `x402/` code.

Core ideas:

- HTTP `402 Payment Required` as agent-native settlement.
- Solana USDC rails.
- paid API surfaces and automatable call flows.
- runtime loops that earn, pay, and keep operating.

Local docs:

- [`x402/README.md`](./x402/README.md)
- [`sdk/x402/README.md`](./sdk/x402/README.md)
- [`openclawd/packages/x402/README.md`](./openclawd/packages/x402/README.md)

## Reading Order

1. [`README.md`](./README.md)
2. [`sdk/README.md`](./sdk/README.md)
3. [`automaton-main/README.md`](./automaton-main/README.md)
4. [`leviathan/README.md`](./leviathan/README.md)
5. [`x402/README.md`](./x402/README.md)
6. [`MCP/README.md`](./MCP/README.md)
7. [`programs/README.md`](./programs/README.md)
8. [`llm_oracle/README.md`](./llm_oracle/README.md)
9. [`packages/clawd/README.md`](./packages/clawd/README.md)
10. [`packages/clawd-sdk/README.md`](./packages/clawd-sdk/README.md)

## Mapping

The animated stuff is above. The mapping is down here.

### Repo Map

```text
solana-clawd/
├── README.md
├── sdk/                     runtime source, library, goals, knowledge, assets
├── automaton-main/          clawd-automaton runtime + dashboard + automation
├── agents/                  124-agent catalog + static x402 API/registry output
├── leviathan/               sovereign runtime source
├── x402/                    payment rail code and docs
├── MemeBRain/               Clawd memory substrate
├── llm-wiki-tang/           vault and local-first knowledge surface
├── MCP/                     orchestrator and tool plane
├── programs/                Solana program workspace
├── llm_oracle/              oracle runner and chain callbacks
├── packages/
│   ├── agentwallet/
│   ├── clawd/
│   ├── clawd-perps/
│   ├── clawd-protocol/
│   ├── clawd-sdk/
│   ├── clawd-wallet/
│   └── cli-standalone/
├── pinocchio/               p-token and scaffold templates
├── openclawd/               broader framework subtree
└── chrome-extension/        browser-side surface
```

### Runtime Map

```text
Backrooms
  └─ public multi-agent room
       └─ terminal entry: curl -fsSL https://backrooms.x402.wtf/enter.sh | bash

Agents
  └─ x402 public catalog
       ├─ root:     https://x402.wtf/api/agents
       ├─ catalog:  https://x402.wtf/api/agents/catalog
       └─ registry: https://x402.wtf/api/agents/registry

Leviathan
  └─ sovereign shell
       ├─ spawn
       ├─ run
       └─ status

Automaton
  └─ automation runtime
       ├─ build
       ├─ ci
       ├─ dashboard
       └─ full bootstrap

SDK + Brain
  └─ goals + knowledge + library + recall + x402 service surfaces

Programs
  └─ Solana on-chain experiments, oracle, protocol, templates
```

## License

MIT.

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,28:9945FF,72:14F195,100:05060d&height=140&section=footer&text=%F0%9F%A6%9E%20BORN%20TO%20EARN%20%C2%B7%20BEACH%20WITH%20DIGNITY&fontSize=20&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="footer" />

<sub>backrooms.x402.wtf · x402.wtf · solanaclawd.com · the shell molts. the laws do not.</sub>

</div>
