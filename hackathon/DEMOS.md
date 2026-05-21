# Solana Clawd Hackathon Demo Script

This file gives judges and presenters a safe path through the submission. Commands assume the repository root is the current directory.

## Demo 1: Repo Health And Build

Purpose: prove the repo is not just docs.

```bash
npm run check
npm run build
git submodule status --recursive
```

Expected result:

- Typecheck and lint pass through `scripts/repo-doctor.mjs`.
- Build compiles the SDK, MCP, router, Leviathan, and gateway surfaces.
- Submodule status resolves without `.gitmodules` mapping errors.

## Demo 2: Judge The TUI Surface

Purpose: show the operator product.

```bash
npm run tui
```

What to show:

| Screen | Why it matters |
| --- | --- |
| Backroom | Demonstrates agent-to-agent UX. |
| Perps | Shows market execution workflow. |
| Agent Registry | Shows Solana-native agent identity direction. |
| Wallet | Shows wallet-aware operator flow. |
| SDK Explorer | Shows developer surface discovery. |
| Spawn Automaton | Bridges to autonomous runtime. |
| Solana Agent Kit | Shows token, perps, DeFi, NFT, x402, and skills workflows. |
| UltraThink | Shows deeper reasoning templates and decision support. |

If the TUI cannot be run in the judge environment, inspect [../tui/README.md](../tui/README.md) and [../tui/src](../tui/src).

## Demo 3: MCP Orchestration

Purpose: show that Solana Clawd has a real orchestration plane.

```bash
npm --prefix mcp install
npm --prefix mcp run build
```

What to inspect:

- [../mcp/README.md](../mcp/README.md)
- `mcp/src/plugins/plugin-registry.ts`
- `mcp/src/federation/federation-bridge.ts`
- `mcp/src/federation/agent-task-router.ts`
- `mcp/src/orchestrator.ts`

Judge framing: MCP is the control plane that exposes Solana tools, market tools, x402 rails, docs, agents, Deep Clawd, gateway, SDK, and federated tools.

## Demo 4: Agent Kit And Catalog

Purpose: show that agents are structured, discoverable, and reusable.

```bash
npm run agents:catalog
npm run agent-kit:build
npm run agent-kit:validate
```

What to inspect:

- [../agent-kit/README.md](../agent-kit/README.md)
- [../agents](../agents)
- [../skills](../skills)

Expected value: Agent Kit loads local agent templates, catalogs, and runtime profiles instead of treating agents as one-off prompts.

## Demo 5: Perps And Market Intelligence

Purpose: show execution and signal intent with safe defaults.

```bash
npm run clawd-perps-aggregator:typecheck
npm run perps:workspace:build
```

Optional safe/paper commands if installed:

```bash
clawd-perps signal oi SOL-PERP --mode paper
clawd-perps signal watch SOL-PERP --interval 5s
clawd-agents-perps status
clawd-agents-perps paper-long SOL --notional 100
```

Inspect:

- [../perps](../perps)
- [../packages/clawd-perps](../packages/clawd-perps)
- [../packages/clawd-perps-aggregator](../packages/clawd-perps-aggregator)

Live trading requires explicit environment configuration and should not be treated as a default judging command.

## Demo 6: Autonomous Runtime

Purpose: show the OODA agent loop and local-first runtime.

```bash
npm run leviathan:status
npm run leviathan -- --ticks 1
```

Inspect:

- [../leviathan/README.md](../leviathan/README.md)
- [../ooda](../ooda)
- [../deep-clawd](../deep-clawd)
- [../automaton-main](../automaton-main)

Expected value: the agent observes state, reasons under constraints, selects a tool/action, and records state locally.

## Demo 7: Oracle, Attestation, And Verification

Purpose: show the proof and safety story.

```bash
npm run oracle:check
npm --prefix attestation run generate-idl
```

Inspect:

- [../llm_oracle/README.md](../llm_oracle/README.md)
- [../attestation](../attestation)
- [../formal_verification/SPEC.md](../formal_verification/SPEC.md)
- [../formal_verification/VERIFIER.md](../formal_verification/VERIFIER.md)

Expected value: execution is not just "AI said so." The repo includes registry, attestation, and verification surfaces.

## Demo 8: Gateway And x402 Commerce

Purpose: show the public/private routing and payment story.

```bash
npm --prefix gateway run build
```

Inspect:

- [../gateway/README.md](../gateway/README.md)
- [../x402/README.md](../x402/README.md)
- [../pay](../pay)
- [../a2a-x402-main](../a2a-x402-main)

Expected value: Solana Clawd has a path for agent registries, governed destinations, x402 commerce, and A2A payment-aware workflows.

## Short Live Pitch

Use this when presenting:

```text
Solana Clawd turns Solana research and execution into an AI-native workflow.
Instead of switching between explorers, wallet dashboards, token screeners,
terminal scripts, and trading tools, the user operates through one agentic
interface. The stack combines MCP orchestration, Agent Kit, skills, wallet and
market intelligence, perps, x402 payments, gateway routing, attestation, and
formal verification. It is built to help users discover tokens, analyze wallets,
monitor signals, and act faster with a clear audit path.
```

