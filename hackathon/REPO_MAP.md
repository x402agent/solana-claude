# Solana Clawd Repository Map

This map covers the hackathon submission repository and the modules called out for judging.

## Submission Root

| Path | Role |
| --- | --- |
| [../README.md](../README.md) | Main public project README. |
| [../package.json](../package.json) | Root scripts for build, check, TUI, MCP, SDK, agents, perps, oracle, and automation. |
| [../hackathon](./README.md) | Judge-facing submission guide. |

## Required Hackathon Modules

| Path | What it contributes |
| --- | --- |
| [../mcp](../mcp) | MCP orchestration plane for tools, docs, federation, sessions, market intelligence, x402, agents, skills, gateway, and SDK visibility. |
| [../llm-wiki-tang](../llm-wiki-tang) | Knowledge/vault web surface for local reference and research-oriented workflows. |
| [../llm_oracle](../llm_oracle) | Rust Solana LLM oracle adapter plus Percolator references for oracle, keeper, market, and risk operations. |
| [../leviathan](../leviathan) | Local-first autonomous runtime with identity, memory bridge, OODA loop, constrained tool execution, and state journals. |
| [../gateway](../gateway) | HTTP gateway for registry, ADK manifest metadata, governed destinations, agent capabilities, and API surfaces. |
| [../formal_verification](../formal_verification) | Verification specs, registry gates, STRIDE modeling, risk harness, and policy checks. |
| [../deep-clawd](../deep-clawd) | Deep research/trading agent workspace for market intelligence workflows. |
| [../clawdrouter](../clawdrouter) | Routing service for model/tool/action paths and gateway-style coordination. |
| [../clawdcli](../clawdcli) | CLI-facing user surface for Solana Clawd commands. |
| [../attestation](../attestation) | Attestation, IDL, client generation, and proof-oriented Solana support. |
| [../automaton-main](../automaton-main) | Automation runtime, dashboard, and bootstrap flows for agent operations. |
| [../agents](../agents) | Agent catalog, templates, manifests, and source-backed agent definitions. |
| [../agent-tasks](../agent-tasks) | Task backlog and implementation plan files for agent-driven development. |
| [../agent-kit](../agent-kit) | Solana Clawd-owned agent kit for loading catalogs, templates, runtime profiles, and registry documents. |
| [../adk](../adk) | Google ADK entrypoint and agent metadata integration. |
| [../a2a-x402-main](../a2a-x402-main) | A2A and x402 reference package/demo content for agent payment workflows. |
| [../ooda](../ooda) | Observe, Orient, Decide, Act loop logic and market/agent decision workflow. |
| [../openclawd](../openclawd) | OpenClawd stack snapshot/submodule for sovereign AI agent runtime references. |
| [../openShell](../openShell) | Shell/operator surface and runtime-facing scripts. |
| [../operator](../operator) | Python operator workspace and tests for operational workflows. |
| [../packages](../packages) | Main TypeScript package workspace: Clawd, wallet, SDK, perps, aggregator, protocol, and standalone packages. |
| [../pay](../pay) | Solana Pay/payment reference submodule used by the payment story. |
| [../perps](../perps) | Perpetuals workspace and agent-oriented perps flows. |
| [../pinocchio](../pinocchio) | Token/agent launch templates and p-token planning surfaces. |
| [../programs](../programs) | Solana program workspace and onchain program references. |
| [../sdk](../sdk) | Developer SDK surface, install scripts, package integration, and app-facing helpers. |
| [../tui](../tui) | Bloomberg-style terminal UI for user-facing Solana Clawd workflows. |
| [../ultra](../ultra) | Deep reasoning/UltraThink skill and operator knowledge surface. |
| [../x402](../x402) | x402 commerce, SDK, worker, and payment-aware Solana agent surfaces. |
| [../skills](../skills) | Installable skill catalog for reusable agent capabilities. |

## Package Workspace Highlights

| Path | Role |
| --- | --- |
| [../packages/agentwallet](../packages/agentwallet) | Wallet and vault-facing package. |
| [../packages/clawd](../packages/clawd) | Core Clawd package and CLI/TUI integration surface. |
| [../packages/clawd-perps](../packages/clawd-perps) | Perps package for signals and execution workflows. |
| [../packages/clawd-perps-aggregator](../packages/clawd-perps-aggregator) | Aggregator package for perps market intelligence and CLI/MCP surfaces. |
| [../packages/clawd-protocol](../packages/clawd-protocol) | Rust/Anchor-style protocol package. |
| [../packages/clawd-sdk](../packages/clawd-sdk) | TypeScript SDK package. |
| [../packages/clawd-wallet](../packages/clawd-wallet) | Wallet package for app and agent flows. |
| [../packages/cli-standalone](../packages/cli-standalone) | Standalone CLI package. |
| [../perps/clawd-agents-perps](../perps/clawd-agents-perps) | Agent-oriented perps package for status, paper trading, and live-gated flows. |

## How The Modules Connect

```text
tui / clawdcli / sdk
    |
    v
mcp orchestrator + clawdrouter
    |
    +--> agents + agent-kit + skills
    +--> ooda + deep-clawd + leviathan + automaton-main
    +--> perps + packages/clawd-perps + perps/clawd-agents-perps
    +--> gateway + adk + a2a-x402-main + x402 + pay
    +--> attestation + formal_verification + programs + llm_oracle
```

## Verification Commands

| Command | Covers |
| --- | --- |
| `npm run check` | Typecheck and lint through repo doctor. |
| `npm run build` | SDK, MCP, clawdrouter, leviathan, gateway. |
| `npm run agent-kit:validate` | Agent Kit catalog/template correctness. |
| `npm run agents:catalog` | Agent catalog generation. |
| `npm run perps:workspace:build` | Perps workspace package build. |
| `npm run oracle:check` | Rust oracle check. |
| `git submodule status --recursive` | Submodule metadata integrity. |

