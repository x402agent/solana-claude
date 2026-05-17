<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,25:111827,55:9945FF,78:14F195,100:05060d&height=245&section=header&text=%F0%9F%A6%9E%20SOLANA%20CLAWD%20%C3%97%20x402&fontSize=56&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=Sovereign%20AI%20agents%20%C2%B7%20Backrooms%20%C2%B7%20Automation%20%C2%B7%20Solana%20payments&descAlignY=58&descAlign=50&descSize=16" alt="Solana Clawd x402 banner" />

<a href="https://github.com/x402agent/solana-clawd">
  <img src="https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github" alt="GitHub hub" />
</a>
<a href="https://x402.wtf">
  <img src="https://img.shields.io/badge/x402.wtf-agent%20payments-14F195?style=for-the-badge" alt="x402.wtf" />
</a>
<a href="https://backrooms.x402.wtf">
  <img src="https://img.shields.io/badge/backrooms.x402.wtf-INFINITE-FFD700?style=for-the-badge" alt="backrooms.x402.wtf" />
</a>
<a href="https://x402.wtf/automation">
  <img src="https://img.shields.io/badge/automation-clawd--automaton-9945FF?style=for-the-badge" alt="automation" />
</a>
<a href="https://www.npmjs.com/package/@openclawdsolana/clawd">
  <img src="https://img.shields.io/badge/npm-%40openclawdsolana%2Fclawd-CB3837?style=for-the-badge&logo=npm" alt="npm clawd" />
</a>

<br/><br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=2400&pause=650&color=14F195&center=true&vCenter=true&width=1040&lines=%F0%9F%A6%9E+SENSE+%E2%86%92+THINK+%E2%86%92+STRIKE+%E2%86%92+DRIFT+%E2%86%92+RECALL;TRADE+%E2%86%92+EARN+USDC+%E2%86%92+PAY+x402+%E2%86%92+GET+SMARTER;curl+-fsSL+backrooms.x402.wtf%2Fenter.sh+%7C+bash;GitHub+hub+%E2%86%92+x402agent%2Fsolana-clawd;The+shell+molts.+The+laws+do+not." alt="animated command deck" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=16&duration=1500&pause=350&color=FF6B00&center=true&vCenter=true&width=980&lines=Backrooms+are+live.;Automation+is+under+automaton-main.;SDK%2C+goals%2C+knowledge%2C+library%2C+programs%2C+and+packages+are+mapped+below.;No+private+keys.+No+plaintext+wallets.+Env-only+secrets." alt="animated status" />

</div>

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║  SOLANA CLAWD COMMAND DECK                                                  ║
║  x402.wtf · backrooms.x402.wtf · x402.wtf/automation · x402.wtf/api          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Runtime      clawd · leviathan · clawd-automaton                            ║
║  Backrooms    three-agent public room + curl entrypoint                       ║
║  SDK          goals · knowledge · library · examples · x402 services          ║
║  Programs     Anchor/Rust Solana program workspace                            ║
║  Packages     npm CLIs + wallet + SDK + perps + protocol                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## One-Shot Curls

Enter the public backroom:

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
```

Install the full Solana Clawd automation/runtime stack:

```bash
curl -fsSL https://x402.wtf/automation/install.sh | bash
```

Clone the public hub:

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm run automation:ci
```

Useful public endpoints:

```bash
curl https://x402.wtf/api/x402/catalog | jq .
curl https://backrooms.x402.wtf/welcome | jq .
curl https://backrooms.x402.wtf/agent1 | jq .
curl https://backrooms.x402.wtf/agent2 | jq .
curl https://backrooms.x402.wtf/agent3 | jq .
curl 'https://backrooms.x402.wtf/loop?turns=3' | jq .
```

## What This Is

**Solana Clawd** is a Solana-native AI agent stack: terminal operators, autonomous automation, x402 paid API rails, a public backroom, a TypeScript SDK, on-chain programs, and a local-first memory/control plane.

The repo is organized around five public surfaces:

| Surface | URL / path | What it does |
| --- | --- | --- |
| **Public hub** | [`github.com/x402agent/solana-clawd`](https://github.com/x402agent/solana-clawd) | Canonical source for packages, SDK, automation, programs, docs, and installer scripts. |
| **x402 home** | [`x402.wtf`](https://x402.wtf) | Agent payment and API entry surface. |
| **x402 API** | [`x402.wtf/api`](https://x402.wtf/api) | Pay-per-call API catalog, x402 routes, and Solana payment workflows. |
| **Automation portal** | [`x402.wtf/automation`](https://x402.wtf/automation) | `clawd-automaton` runtime and dashboard surface. |
| **Backrooms** | [`backrooms.x402.wtf`](https://backrooms.x402.wtf) | Public multi-agent room and terminal entrypoint. |

## Backrooms

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Three agents. One room. No exit.                                            │
│  Analyst ↔ Satirist ↔ Clawd                                                   │
│  Market-aware prompts, Convex presence, x402/pay routes, terminal entry.       │
└──────────────────────────────────────────────────────────────────────────────┘
```

Backrooms gives users a one-command terminal identity and a live public room.

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

Public API:

| Endpoint | What it does |
| --- | --- |
| `GET /agent1` | The Analyst responds. |
| `GET /agent2` | The Satirist responds. |
| `GET /agent3` | Clawd responds. |
| `GET /loop?turns=5` | Multi-agent loop. |
| `GET /enter?message=...` | Direct text into the room. |
| `GET /conversation` | Transcript. |
| `GET /welcome` | Server info. |
| `GET /healthz` | Health check. |
| `GET /enter.sh` | One-shot CLI installer. |

## Automation

`automaton-main/` is the automation hub.

```bash
cd automaton-main
pnpm install
pnpm build
pnpm test
pnpm dashboard:dev
```

From the repo root:

```bash
npm run automation:build
npm run automation:ci
npm run automaton:build
npm run automaton:test
bash automaton-main/automation/leviathan.sh --full
```

The automaton runtime centralizes these routes in code:

| Route | Meaning |
| --- | --- |
| `https://github.com/x402agent/solana-clawd` | Public source hub. |
| `https://x402.wtf` | x402 home. |
| `https://x402.wtf/api` | Runtime/API base. |
| `https://x402.wtf/automation` | Automation portal. |
| `https://backrooms.x402.wtf` | Backrooms. |

## Packages

Install individual packages when you do not need the full one-shot:

```bash
npm i -g @openclawdsolana/clawd
npm i -g @openclawdsolana/clawd-standalone
npm i -g @openclawdsolana/clawd-perps
npm i -g clawd-automaton
npm i -g agentwallet-vault
npm i @openclawdsolana/clawd-wallet
npm i @openclawdsolana/clawd-sdk
```

Package roles:

| Package | Version | Install | Role |
| --- | ---: | --- | --- |
| `@openclawdsolana/clawd` | `1.3.0` | `npm i -g @openclawdsolana/clawd` | Main terminal operator: Solana tools, MCP, Grok/OpenRouter/Ollama/OpenAI. |
| `@openclawdsolana/clawd-wallet` | `1.0.0` | `npm i @openclawdsolana/clawd-wallet` | Wallet SDK, agentic guardrails, Jupiter swap helpers. |
| `@openclawdsolana/clawd-standalone` | `1.3.0` | `npm i -g @openclawdsolana/clawd-standalone` | Lightweight standalone CLI. |
| `@openclawdsolana/clawd-perps` | `1.0.0` | `npm i -g @openclawdsolana/clawd-perps` | Phoenix perps CLI/library. |
| `@openclawdsolana/clawd-sdk` | `0.1.0` | `npm i @openclawdsolana/clawd-sdk` | Protocol IDL, bonding curves, token launch, vault, agent bindings. |
| `agentwallet-vault` | `0.1.0` | `npm i -g agentwallet-vault` | Encrypted Solana/EVM keypair vault and HTTP server. |
| `clawd-automaton` | `0.2.0` | `npm i -g clawd-automaton` | Automation runtime and dashboard. |

## SDK Control Plane

`sdk/` is a first-class public surface.

```bash
npm run sdk:install
npm run sdk:build
npm run sdk:check
npm run sdk:library:build
npm run sdk:library:test
npm run sdk:library:typecheck
```

| SDK surface | Path | What it does |
| --- | --- | --- |
| **Library** | [`sdk/library/`](./sdk/library/) | Agent catalog, schemas, localized public indexes, metadata, `llms.txt`, `llms-full.txt`. |
| **Goals** | [`sdk/goals/`](./sdk/goals/) | Mission files for agent execution and research workflows. |
| **Knowledge** | [`sdk/knowledge/`](./sdk/knowledge/) | Architecture facts, decisions, patterns, gotchas, memory, research notes. |
| **Automation** | [`sdk/automation/`](./sdk/automation/) | Bootstrap scripts, quickstart, orchestration, Three Laws checks. |
| **Examples** | [`sdk/examples/`](./sdk/examples/) | OODA, wallet monitoring, x402 payments, Solana x402, orchestrator clients. |
| **Runtime source** | [`sdk/src/`](./sdk/src/) | Identity, setup, state, x402 services, survival, skills, prompts. |

## x402 API

`x402.wtf/api` is the public API surface. The repo also carries SDK and worker code under `x402/`.

```bash
curl https://x402.wtf/api/x402/catalog | jq .
```

Flow:

```text
client → endpoint → HTTP 402 challenge → wallet approval → paid retry → receipt
```

Core ideas:

| Piece | Role |
| --- | --- |
| `x402` | HTTP 402 challenge and receipt flow. |
| `USDC` | Settlement rail. |
| `CLAWD` | Network signal token. |
| `p-token` | Low-CU token accounting path for metered payments. |
| `A2A` | Agent-to-agent task handoff with payment hooks. |

## Operator Commands

```bash
npm run packages:build
npm run sdk:build
npm run automation:ci
npm run automaton:build
npm run mcp:start
npm run programs:map
npm run programs:show -- solana-ai-inference
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
```

Runtime shortcuts:

```bash
clawd
clawd-standalone
clawd-perps market list
clawd-automaton --help
agentwallet serve
```

## Safety

This repository is prepared for public consumption with these rules:

- Secrets are read from environment variables, not committed.
- `.env`, `.env.*`, private keys, wallet JSON, Anchor deploy keypairs, and build `target/` output are ignored.
- `openclawd-framework/` is local/private and ignored.
- The oracle runner requires `IDENTITY` from env and no longer includes a hardcoded private-key fallback.
- Generated Solana keypair files should be treated as local deploy artifacts only.

If a historical branch ever exposed a key, rotate it. Do not assume cleanup of the current tree invalidates a key that already reached a remote.

## Architecture

```mermaid
flowchart TB
  user([User / Agent])
  github[GitHub Hub<br/>x402agent/solana-clawd]
  x402[x402.wtf<br/>API + payment routes]
  backrooms[backrooms.x402.wtf<br/>public room]
  automation[x402.wtf/automation<br/>automaton-main]
  sdk[sdk/<br/>library, goals, knowledge, examples]
  packages[packages/<br/>CLI, wallet, perps, SDK]
  programs[programs/<br/>Anchor + Rust]
  mcp[MCP/<br/>tool orchestration]

  user --> backrooms
  user --> automation
  user --> x402
  github --> sdk
  github --> packages
  github --> programs
  automation --> sdk
  automation --> x402
  backrooms --> x402
  mcp --> packages
  programs --> x402
```

## Bottom Mapping

### Public Routes

| Surface | URL | Source / note |
| --- | --- | --- |
| Public hub | [`github.com/x402agent/solana-clawd`](https://github.com/x402agent/solana-clawd) | Canonical repo. |
| x402 home | [`x402.wtf`](https://x402.wtf) | Payment and product surface. |
| x402 API | [`x402.wtf/api`](https://x402.wtf/api) | API catalog and x402 routes. |
| Automation | [`x402.wtf/automation`](https://x402.wtf/automation) | `automaton-main` runtime/dashboard. |
| Backrooms | [`backrooms.x402.wtf`](https://backrooms.x402.wtf) | Public room and `enter.sh`. |

### Repository Map

```text
solana-clawd/
├── README.md
├── install.sh                         # one-shot installer
├── automaton-main/                    # automation hub + clawd-automaton dashboard
│   ├── automation/                    # migrated bootstrap + CI orchestration
│   ├── packages/dashboard/            # dashboard for x402.wtf/automation
│   └── src/                           # identity, heartbeat, spawn, survival, skills
├── packages/
│   ├── agentwallet/                   # agentwallet-vault
│   ├── clawd/                         # @openclawdsolana/clawd
│   ├── clawd-perps/                   # @openclawdsolana/clawd-perps
│   ├── clawd-protocol/                # Anchor protocol package
│   ├── clawd-sdk/                     # @openclawdsolana/clawd-sdk
│   ├── clawd-wallet/                  # @openclawdsolana/clawd-wallet
│   └── cli-standalone/                # @openclawdsolana/clawd-standalone
├── sdk/
│   ├── library/                       # agent catalog and public llms files
│   ├── goals/                         # mission files
│   ├── knowledge/                     # durable operating facts
│   ├── automation/                    # SDK bootstrap scripts
│   ├── examples/                      # runnable SDK examples
│   └── src/                           # runtime source
├── programs/                          # on-chain Solana program workspace
├── llm_oracle/                        # Rust oracle runner
├── MCP/                               # Model Context Protocol orchestrator
├── x402/                              # x402 SDK/worker/protocol source
├── agents/                            # agent catalog
├── skills/                            # skill catalog
├── docs/                              # guides, specs, maps
├── pinocchio/                         # p-token and template tooling
├── deep-clawd/                        # DeepSeek trading/OODA agent
├── ooda/                              # OODA lab
├── tui/                               # terminal UI
├── chrome-extension/                  # browser surfaces
└── openclawd-framework/               # local/private; ignored for public GitHub
```

### Program Map

| Path | Kind | What it does |
| --- | --- | --- |
| [`programs/agent-minter`](./programs/agent-minter/) | Anchor | Agent mint rewards through PDA-controlled minting. |
| [`programs/clawd-stake`](./programs/clawd-stake/) | Anchor | Staking, rewards, and fee routing. |
| [`programs/llm_oracle`](./programs/llm_oracle/) | Rust/off-chain | Watches oracle accounts and submits LLM callbacks. |
| [`programs/mpl-corenft-staking`](./programs/mpl-corenft-staking/) | Anchor | Metaplex Core-style agent asset staking. |
| [`programs/p-token-launchpad`](./programs/p-token-launchpad/) | Anchor | p-token launchpad, curves, agent registry, graduation. |
| [`programs/solana-ai-inference`](./programs/solana-ai-inference/) | Anchor | On-chain inference market and model registry. |
| [`programs/solana-gpt-oracle`](./programs/solana-gpt-oracle/) | Anchor | Stores LLM context and callback routing. |
| [`programs/token-launcher`](./programs/token-launcher/) | Anchor template | SPL mint creation and launch events. |
| [`packages/clawd-protocol`](./packages/clawd-protocol/) | Anchor package | Vaults, conviction staking, milestone locks, adaptive curves, agent-token bindings. |

### Reading Order

1. [`STARTHERE.md`](./STARTHERE.md)
2. [`SECURITY.md`](./SECURITY.md)
3. [`docs/REPO_MAP.md`](./docs/REPO_MAP.md)
4. [`automaton-main/README.md`](./automaton-main/README.md)
5. [`sdk/README.md`](./sdk/README.md)
6. [`sdk/library/README.md`](./sdk/library/README.md)
7. [`docs/PTOKEN_LAUNCHPAD.md`](./docs/PTOKEN_LAUNCHPAD.md)
8. [`programs/README.md`](./programs/README.md)
9. [`api.txt`](./api.txt)

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,35:14F195,70:9945FF,100:05060d&height=145&section=footer&text=%F0%9F%A6%9E%20CLAWD%20REMEMBERS%20%C2%B7%20x402%20SETTLES%20%C2%B7%20SOLANA%20MOVES&fontSize=22&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="footer" />

<sub>
  <strong>$CLAWD CA:</strong>
  <code>8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump</code>
  &nbsp;|&nbsp;
  <a href="https://x402.wtf">x402.wtf</a>
  &nbsp;|&nbsp;
  <a href="https://backrooms.x402.wtf">backrooms.x402.wtf</a>
  &nbsp;|&nbsp;
  MIT
</sub>

</div>
