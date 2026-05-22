<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,18:9945FF,42:14F195,70:FF5F1F,100:05060d&height=260&section=header&text=Solana%20Clawd&fontSize=64&fontColor=ffffff&animation=twinkling&fontAlignY=40&desc=AI-native%20Solana%20research%20market%20intelligence%20and%20onchain%20execution&descAlignY=62&descSize=18" alt="Solana Clawd hackathon header" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=18&duration=1800&pause=450&color=14F195&center=true&vCenter=true&width=980&lines=Discover+tokens+%E2%86%92+analyze+wallets+%E2%86%92+monitor+signals+%E2%86%92+execute+faster;105+MCP+tools+%E2%80%A2+17+perps+tools+%E2%80%A2+SOR+across+Phoenix+%C2%B7+Flash+%C2%B7+Jupiter+%C2%B7+GMTrade;Research%2C+market+intelligence%2C+MCP%2C+agents%2C+perps%2C+SDK%2C+TUI%2C+and+verification+in+one+interface;Built+for+Colosseum+judges+who+want+the+fastest+route+from+demo+to+technical+depth" alt="Animated Solana Clawd pitch" />

<br/>

[![Colosseum](https://img.shields.io/badge/Colosseum-Solana%20Clawd-14F195?style=for-the-badge)](https://arena.colosseum.org/projects/explore/solana-clawd)
[![GitHub](https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github)](https://github.com/x402agent/solana-clawd)
[![TUI](https://img.shields.io/badge/TUI-clawd--tui-9945FF?style=for-the-badge)](../tui)
[![MCP](https://img.shields.io/badge/MCP-Orchestrator-FF5F1F?style=for-the-badge)](../mcp)
[![SDK](https://img.shields.io/badge/SDK-TypeScript-3178C6?style=for-the-badge&logo=typescript)](../sdk)

</div>

---

## Hackathon Submission

Solana Clawd is an AI-native Solana product that combines research, market intelligence, and onchain execution in a single interface. It helps users discover tokens, analyze wallets and market activity, monitor real-time signals, and take action faster without juggling multiple tools.

The submitted project is this repository:

```text
https://github.com/x402agent/solana-clawd
```

Colosseum project page:

```text
https://arena.colosseum.org/projects/explore/solana-clawd
```

This `hackathon/` folder is the judge path. It maps the repository, gives demo flows, and explains how the pieces fit together without requiring judges to reverse-engineer a large monorepo.

## Judge Fast Path

| Time | Path | What to inspect |
| ---: | --- | --- |
| 2 minutes | [JUDGES.md](./JUDGES.md) | Product thesis, what is built, why Solana matters |
| 5 minutes | [DEMOS.md](./DEMOS.md) | Safe local demos and command checklist |
| 10 minutes | [REPO_MAP.md](./REPO_MAP.md) | Every major subsystem and what it contributes |
| Deep dive | repo source | MCP, TUI, SDK, Agent Kit, perps, oracle, gateway, formal verification |

## What Is New For The Hackathon

| Surface | Why it matters |
| --- | --- |
| TUI | A single operator interface for wallet, agent registry, SDK explorer, perps, Agent Kit, and runtime actions. |
| SDK | TypeScript integration layer for wallet, commerce, packages, and app developers. |
| Skills | Installable agent capability files for repeatable Solana workflows. |
| Agent Kit | Local catalog and runtime profile builder for Solana Clawd agents. |
| MCP (105 tools) | Orchestration plane across 14 categories: Solana, market, x402, agents, docs, gateway, federation, and perps. |
| Perps Aggregator | Smart-order router across Phoenix · Flash · Jupiter · GMTrade. 17 MCP tools. AMM pool intel, split execution, paper-first live gating. |
| Formal verification | Risk and registry gates that make execution policy auditable. |
| LLM Oracle | Solana oracle adapter for model-driven callbacks and Percolator-related operational references. |
| Gateway | Agent registry, ADK metadata, governed destinations, and API surface for public/private routing. |
| Leviathan + OODA | Local-first autonomous runtime with identity, memory, market observation, and constrained action loop. |
| ClawdRouter | LLM routing service with x402 payment gating and OpenRouter attribution (solanaclawd.com). |

## Architecture At A Glance

```text
User / Judge
    |
    v
TUI + CLI + SDK + ClawdRouter (OpenRouter / x402)
    |
    v
MCP Orchestrator (105 tools, 14 categories)
    |---- Agent Kit / Skills / Agents Catalog
    |---- Perps Aggregator (17 tools: SOR · AMM · split · positions)
    v
Market Data + Wallets + OODA + Deep Clawd
    |
    v
Gateway + x402 + Attestation + Formal Verification
    |
    v
Solana Programs / Oracle / Onchain Actions
```

## Core Claim

The project is not just a token dashboard, a chatbot, or a wallet script. Solana Clawd is a full agentic execution stack:

1. Observe market and wallet state.
2. Orient with research, memory, and signal processors.
3. Decide with agent policy, risk gates, and route scoring.
4. Act through SDK, CLI, MCP, perps, gateway, or onchain program surfaces.
5. Prove actions through attestations, receipts, formal checks, and reproducible logs.

## Files In This Folder

| File | Purpose |
| --- | --- |
| [JUDGES.md](./JUDGES.md) | Complete guide for hackathon judges. |
| [DEMOS.md](./DEMOS.md) | Demo script, safe commands, expected outcomes, and judging flow. |
| [REPO_MAP.md](./REPO_MAP.md) | Complete map of the submitted repository modules. |
| [SUBMISSION.md](./SUBMISSION.md) | Submission summary, checklist, and links. |
| [PERPS_AGGREGATOR.md](./PERPS_AGGREGATOR.md) | Deep-dive: SOR, AMM pool intel, split execution, 17 MCP tools. |
| [PACKAGES.md](./PACKAGES.md) | Deep-dive: all 8 npm packages in the workspace. |
| [PROGRAMS.md](./PROGRAMS.md) | Deep-dive: 10 Anchor/Rust programs (inference market, staking, oracle, launchpad). |
| [SDK.md](./SDK.md) | Deep-dive: Leviathan sovereign runtime + clawd-sdk, Three Laws, proof receipts. |
| [TUI.md](./TUI.md) | Deep-dive: Bloomberg-style terminal, screens, agent mint, keyboard nav. |
| [MY_PROJECT_PUBLIC.md](./MY_PROJECT_PUBLIC.md) | Deep-dive: public submission surface — leviathan, ooda, gateway, agents, MemeBRain. |

## One-Command Verification

From the repository root:

```bash
npm run check
npm run build
git submodule status --recursive
```

The project currently targets Node 20, 22, or 24. Newer Node versions may print a warning from `repo-doctor`, but the check/build flow is the source of truth.

