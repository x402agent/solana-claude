# Hackathon Submission Summary

## Project

Solana Clawd

## Links

| Resource | URL |
| --- | --- |
| Colosseum project | https://arena.colosseum.org/projects/explore/solana-clawd |
| GitHub submission | https://github.com/x402agent/solana-clawd |
| Hackathon guide | [./README.md](./README.md) |

## One-Liner

Solana Clawd is an AI-native Solana interface for token discovery, wallet and market intelligence, real-time signal monitoring, and faster onchain action through a unified agentic stack.

## Problem

Solana users and builders often juggle separate tools for token discovery, wallet analysis, market signals, agent workflows, payment rails, perps, and execution. That slows down decisions and makes it hard to audit what happened.

## Solution

Solana Clawd brings those workflows into one stack:

- TUI and CLI for operators.
- SDK for developers.
- MCP for tool orchestration.
- Agent Kit and skills for reusable agent capabilities.
- OODA, Deep Clawd, and Leviathan for autonomous research/action loops.
- Perps and x402 for market and payment workflows.
- Gateway, attestation, oracle, programs, and formal verification for Solana-native proof and policy.

## Built Surfaces

| Surface | Location |
| --- | --- |
| Hackathon docs | [./](./README.md) |
| TUI | [../tui](../tui) |
| SDK | [../sdk](../sdk), [../packages/clawd-sdk](../packages/clawd-sdk) |
| MCP | [../mcp](../mcp) |
| Agent Kit | [../agent-kit](../agent-kit) |
| Skills | [../skills](../skills) |
| Agents catalog | [../agents](../agents) |
| Perps | [../perps](../perps), [../packages/clawd-perps](../packages/clawd-perps), [../packages/clawd-perps-aggregator](../packages/clawd-perps-aggregator) |
| Formal verification | [../formal_verification](../formal_verification) |
| Attestation | [../attestation](../attestation) |
| Gateway | [../gateway](../gateway) |
| LLM oracle | [../llm_oracle](../llm_oracle) |
| x402/payments | [../x402](../x402), [../pay](../pay), [../a2a-x402-main](../a2a-x402-main) |

## Judge Commands

```bash
npm run check
npm run build
git submodule status --recursive
npm run agent-kit:validate
npm run agents:catalog
```

## Safety Notes

Default judge demos should be read-only, local, or paper-mode. Live trading, mainnet minting, and funded wallet operations require explicit operator configuration and confirmation.

## Submission Checklist

| Item | Status |
| --- | --- |
| GitHub submission mapped | Done |
| Colosseum project linked | Done |
| Judge guide added | Done |
| Demo guide added | Done |
| Full repo map added | Done |
| TUI, SDK, skills, Agent Kit included | Done |
| Perps agents and packages included | Done |
| Formal verification and Python/operator surfaces included | Done |
| MCP, gateway, x402, oracle, attestation included | Done |

