# Agent Tasks — NanoClawd Sprint Registry

> Self-contained tasks for autonomous agents. Each task is matched to
> agent personas at spawn time via the **Task Loader** (`nano-core/src/claw/task-loader.ts`).

## How It Works

### Task ↔ Persona Integration

```
Agent Spawn → Persona Selected → Task Loader → Keyword Match → MISSION OBJECTIVES
                                      ↓
                                 ScgVault LEARNED ← task assignments stored
```

1. Agent is spawned via `/spawn <role> --persona <id>`
2. The **Task Loader** scans all task files and extracts keywords/domains
3. Keywords are matched against the persona's tags, title, and domain affinities
4. Top 5 matching tasks are injected into the agent's **system prompt** as MISSION OBJECTIVES
5. Tasks are also stored in the agent's **ScgVault LEARNED** memory

### Persona-Domain Affinity Map

| Persona | Matched Domains |
|---------|----------------|
| `whale-watcher` | monitoring, trading, analytics |
| `pump-fun-sdk-expert` | sdk, defi, trading, fees, testing |
| `smart-contract-auditor` | security, sdk, solana |
| `yield-dashboard-builder` | frontend, analytics, defi |
| `rug-pull-detective` | security, monitoring, defi |
| `crypto-news-analyst` | documentation, analytics |
| `mev-researcher` | trading, security, solana |

## How to Use Manually

1. Open a **new chat** for each task
2. Paste the contents of the `.md` file as the first message
3. Let the agent work autonomously
4. Tasks are designed to be **independent** — no task blocks another

## Task List

| # | File | Scope | Domains |
|---|------|-------|---------|
| 01 | `01-pumpkit-web-tests.md` | React component + hook tests for @pumpkit/web | testing, frontend, sdk |
| 02 | `02-pumpkit-lint-infrastructure.md` | ESLint configs + lint scripts for pumpkit | infrastructure |
| 03 | `03-swarm-bot-readme.md` | swarm-bot/ README documentation | documentation, bot |
| 11 | `11-deployment-guides.md` | Deployment guides (Railway/Docker/Vercel) | devops |
| 15 | `15-website-consolidation.md` | Website/ site/ directory consolidation | frontend, documentation |
| 18 | `18-changelog-release-notes.md` | CHANGELOG + release notes | documentation |
| 20 | `20-live-whales-page.md` | Whale Trades live page | monitoring, trading, frontend |
| 21 | `21-live-graduations-page.md` | Live Graduations feed | defi, monitoring, frontend |
| 22 | `22-live-claims-page.md` | Live Fee Claims dashboard | fees, monitoring, frontend |
| 23 | `23-live-cto-distributions-page.md` | CTO Fee Distribution view | fees, monitoring, frontend |
| 30 | `30-pump-sdk-integration-tests.md` | Pump SDK math/analytics tests | testing, sdk, defi |
| 31 | `31-persona-system-enhancements.md` | Persona runtime customization | bot, defi |
| 32 | `32-swarm-dashboard-live-data.md` | Wire swarm UI to live gateway data | frontend, bot, monitoring |

## Pump Skills Integration

The following 20 Pump skills are integrated and available to all agents:

| Skill | Domain |
|-------|--------|
| `pump-admin-ops` | Infrastructure administration |
| `pump-ai-agents` | AI agent configuration |
| `pump-bonding-curve` | Bonding curve analytics |
| `pump-build-release` | Build & release pipeline |
| `pump-claims-readonly` | Read-only fee claim queries |
| `pump-fee-sharing` | Fee sharing configuration |
| `pump-fee-system` | Fee tier & computation |
| `pump-mcp-server` | Model Context Protocol |
| `pump-rust-vanity` | Rust vanity address gen |
| `pump-sdk-core` | Core SDK operations |
| `pump-security` | Security audit tools |
| `pump-shell-scripts` | Shell automation |
| `pump-solana-architecture` | Solana architecture patterns |
| `pump-solana-dev` | Solana development tools |
| `pump-solana-wallet` | Wallet management |
| `pump-testing` | Testing infrastructure |
| `pump-token-incentives` | $PUMP token incentives |
| `pump-token-lifecycle` | Token lifecycle management |
| `pump-ts-vanity` | TypeScript vanity gen |
| `pump-website` | Website development |

Plus 5 additional Pump skills created in this integration:

| Skill | Domain |
|-------|--------|
| `pumpfun-launcher` | Token launch via SDK |
| `pumpfun-analytics` | Bonding curve analytics |
| `pumpfun-trading` | Buy/sell execution |
| `pumpfun-fees` | Fee sharing & claims |
| `swarm-orchestrator` | Multi-bot swarm management |

**Total: 25 Pump skills + 52 other skills = 77 skills available to all agents**

## Adding New Tasks

Create a new `.md` file following the naming convention: `XX-task-name.md`

The Task Loader auto-detects:
- **Priority** from the numeric prefix (lower = higher priority)
- **Title** from the first `# Heading`
- **Summary** from the `## Objective` section
- **Keywords** from domain keyword matching against the content
- **Domains** from aggregated keyword matches

Tasks are automatically matched to personas at spawn time — no manual mapping needed.
