# my-project-public — Public Submission Surface

**Path:** `my-project-public/`
**Role:** Public-facing mirror of the core Clawd stack, used for the GitHub public submission and npm publishing pipeline.

---

## Overview

`my-project-public/` is the curated public surface of the Solana Clawd project. It contains the same architecture as the main repo — leviathan, ooda, gateway, tui, sdk, agents, adk, automaton — but is maintained as the clean, publishable version for public consumption, npm releases, and hackathon submission visibility.

The top-level `index.html` is the entry point for the hosted SDK graph at `x402.wtf/sdk`.

---

## Directory Map

| Path | What it contains |
| --- | --- |
| [`adk/`](../my-project-public/adk/) | Google ADK entrypoint and agent metadata integration for the public surface |
| [`agents/`](../my-project-public/agents/) | Public agent catalog: templates, manifests, AGENTS.md, changelog, citation |
| [`automaton-main/`](../my-project-public/automaton-main/) | Automation runtime and bootstrap flows for agent operations |
| [`gateway/`](../my-project-public/gateway/) | HTTP gateway: agent registry, ADK manifest, governed destinations, API routing |
| [`leviathan/`](../my-project-public/leviathan/) | Sovereign AI runtime: OODA, wallet, x402, skills, Metaplex identity |
| [`MemeBRain/`](../my-project-public/MemeBRain/) | MemeBRain agent: meme intelligence, community signals, token launch awareness |
| [`ooda/`](../my-project-public/ooda/) | Observe, Orient, Decide, Act loop logic and market/agent decision workflow |
| [`sdk/`](../my-project-public/sdk/) | Developer SDK surface, install scripts, package integration helpers |
| [`tui/`](../my-project-public/tui/) | Terminal UI — public-facing TUI source and publishing pipeline |
| `index.html` | Hosted SDK graph entry (`x402.wtf/sdk`) |

---

## Key Subsystems

### leviathan — Sovereign AI Runtime

The local-first autonomous runtime. In `my-project-public/leviathan/`:

- `src/` — Core runtime source
- `three-laws.txt` — Three Laws Constitution (hashed into every agent spawn)
- `package.json` — Published as `@openclawdsolana/leviathan` v0.2.0

The OODA loop runs here: observe market state → orient with memory + intelligence → decide under policy constraints → act through tool surfaces → journal the result.

### ooda — Decision Loop

`my-project-public/ooda/` contains the public OODA implementation:

- `observe.ts` — Market state ingestion: price feeds, wallet state, OI, funding
- `loop.ts` — Main OODA tick: orchestrates observe → orient → decide → act
- `journal.ts` + `journal/` — Persistent action journal: every tick is logged
- `state.ts` — Shared state for the OODA cycle
- `validate.ts` — Pre-action validation gates
- `claude-decision.ts` — Claude-backed decision engine for the orient phase
- `tui.ts` — OODA TUI panel: live cycle visualization
- `goblin.md` / `RALPH.md` — Agent persona and decision character files

### gateway — Agent Registry + Routing

`my-project-public/gateway/` is the HTTP gateway service:

- Agent registry endpoints for agent discovery
- ADK manifest metadata for Google Agent interop
- Governed destination routing: public/private/gated paths
- API surface for external callers

```bash
npm --prefix my-project-public/gateway run build
```

### agents — Agent Catalog

`my-project-public/agents/` is the public agent catalog:

- `AGENTS.md` — Human-readable agent directory
- `Agent-Staking_Unstaking_solana_metaplex_core/` — Reference agent implementation
- `CHANGELOG.md`, `CITATION.cff`, `CONTRIBUTING.md` — Publication metadata
- `MASTERPLAN.md` — Agent roadmap and capability targets
- `PAPER_DRAFT.md` — Research paper draft on the Clawd agentic model

### MemeBRain — Meme Intelligence Agent

A specialized agent for meme token intelligence, community signal analysis, and launch awareness. Connects the agent stack to the memecoin meta that drives Solana retail volume.

---

## Relationship to Main Repo

```text
main repo (solana-clawd)           my-project-public
├── leviathan/ ─────────────────── leviathan/   (same runtime, public mirror)
├── ooda/ ───────────────────────── ooda/
├── gateway/ ───────────────────── gateway/
├── tui/ ───────────────────────── tui/
├── sdk/ ───────────────────────── sdk/
├── agents/ ────────────────────── agents/
├── adk/ ───────────────────────── adk/
└── automaton-main/ ────────────── automaton-main/
```

The public surface is a curated, publishable view — not a fork. Changes land in the main repo first and sync to `my-project-public` for public release.

---

## Commands

```bash
# Leviathan status check
npm run leviathan:status

# OODA tick (safe, no keys required)
npm run leviathan -- --ticks 1

# Agent catalog
npm run agents:catalog

# Gateway build
npm --prefix my-project-public/gateway run build

# Agent Kit validate
npm run agent-kit:validate
```
