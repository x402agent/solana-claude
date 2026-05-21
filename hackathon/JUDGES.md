# Solana Clawd Judge Guide

## Product Summary

Solana Clawd is an AI-native Solana product that combines research, market intelligence, and onchain execution in one interface. The product goal is to help a user move from "what is happening on Solana?" to "what should I do next?" to "execute or simulate the action" without jumping between token explorers, wallet analytics tools, terminal scripts, dashboards, and agent frameworks.

Submission links:

| Resource | Link |
| --- | --- |
| Colosseum page | https://arena.colosseum.org/projects/explore/solana-clawd |
| GitHub repo | https://github.com/x402agent/solana-clawd |
| Root README | [../README.md](../README.md) |
| Hackathon README | [./README.md](./README.md) |

## What Judges Should Evaluate

| Criterion | Evidence in repo |
| --- | --- |
| Product completeness | [tui](../tui), [clawdcli](../clawdcli), [sdk](../sdk), [mcp](../mcp), [gateway](../gateway) |
| Solana-native design | [programs](../programs), [attestation](../attestation), [llm_oracle](../llm_oracle), [packages](../packages), [pay](../pay), [x402](../x402) |
| Agentic intelligence | [agents](../agents), [agent-kit](../agent-kit), [skills](../skills), [ooda](../ooda), [deep-clawd](../deep-clawd), [leviathan](../leviathan) |
| Market execution | [perps](../perps), [packages/clawd-perps](../packages/clawd-perps), [packages/clawd-perps-aggregator](../packages/clawd-perps-aggregator), [x402/sdk](../x402/sdk) |
| Safety and proof | [formal_verification](../formal_verification), [attestation](../attestation), [gateway](../gateway), [mcp](../mcp) |
| Developer usability | [sdk](../sdk), [packages](../packages), [agent-kit](../agent-kit), [mcp/README.md](../mcp/README.md), [examples](../examples) |

## Why Solana

Solana is the right substrate for this project because agentic execution needs low-latency state reads, cheap settlement, composable token and wallet primitives, and practical onchain identity. Solana Clawd uses those properties across:

| Solana capability | How Solana Clawd uses it |
| --- | --- |
| Wallet-native identity | Agents can be represented as wallet-controlled entities and registry metadata. |
| Cheap high-frequency actions | x402 and p-token-style settlement patterns make pay-per-action agents practical. |
| Market composability | Token discovery, Jupiter-style routing, perps, and wallet analytics can live in one workflow. |
| Verifiable state | Attestations, receipts, formal gates, and program references provide an audit path. |

## Main User Workflows

| Workflow | User value | Repo surfaces |
| --- | --- | --- |
| Discover tokens | Find new opportunities and understand token context faster. | [mcp](../mcp), [skills](../skills), [agents](../agents), [x402](../x402), [pinocchio](../pinocchio) |
| Analyze wallets | Inspect activity, holdings, and market behavior without manual explorer hopping. | [mcp](../mcp), [sdk](../sdk), [leviathan](../leviathan), [deep-clawd](../deep-clawd) |
| Monitor signals | Watch live OODA/perps/market signals from a terminal interface. | [tui](../tui), [ooda](../ooda), [perps](../perps), [automaton-main](../automaton-main) |
| Execute or simulate | Turn research into paper trades, signed actions, or gated live flows. | [packages](../packages), [perps](../perps), [programs](../programs), [pay](../pay), [x402](../x402) |
| Prove behavior | Attach policy, receipt, and verification context to actions. | [attestation](../attestation), [formal_verification](../formal_verification), [gateway](../gateway) |

## Technical Narrative

Solana Clawd is built as a layered system.

The interface layer is the TUI, CLI, SDK, and browser/gateway surfaces. Judges can inspect [tui](../tui), [clawdcli](../clawdcli), [sdk](../sdk), and [gateway](../gateway) to see how a user or developer enters the system.

The intelligence layer is MCP, Agent Kit, skills, agent catalogs, OODA, Deep Clawd, and Leviathan. These directories define how tasks are discovered, routed, reasoned about, and converted into constrained actions.

The execution layer is the packages workspace, perps tooling, x402/pay rails, programs, oracle, and attestation. These modules are where Solana-native execution, settlement, verification, and registry flows live.

The safety layer is formal verification, attestation, gateway policy, local-first identity handling, and explicit live-trading gates.

## Judge Checklist

1. Read [README.md](./README.md) for the submission overview.
2. Run the safe commands in [DEMOS.md](./DEMOS.md).
3. Inspect [REPO_MAP.md](./REPO_MAP.md) for complete module coverage.
4. Verify build health with `npm run check` and `npm run build`.
5. Inspect [mcp/README.md](../mcp/README.md), [tui/README.md](../tui/README.md), [agent-kit/README.md](../agent-kit/README.md), [leviathan/README.md](../leviathan/README.md), and [llm_oracle/README.md](../llm_oracle/README.md).

## What Is Safe To Demo

Safe demos should use read-only, paper-mode, or local build commands. Avoid live trading or mainnet execution unless the operator has configured keys, funds, RPC, and explicit confirmation.

Safe:

```bash
npm run check
npm run build
npm run agents:catalog
npm run agent-kit:validate
npm run leviathan:status
npm run amm:test
git submodule status --recursive
```

Live-gated:

```bash
clawd-agents-perps live-long SOL --notional 100 --leverage 2
clawd-agent mint --network mainnet --yes
```

