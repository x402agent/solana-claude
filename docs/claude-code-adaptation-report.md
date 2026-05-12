# Claude Code -> Solana-Clawd Adaptation Report

Generated: 2026-04-09T18:41:58.611Z

This report inventories the local upstream tree at `claude-code-main 2/src` and maps it onto the active Solana-clawd runtime in `src/`. The objective is not a blind fork. The objective is a privacy-first, Solana-native adaptation that preserves the mature Claude Code operator surface while routing blockchain, wallet, and agent execution through Solana-clawd subsystems.

## Inventory

| Tree | Top-level dirs | Top-level files | Total dirs | Total files |
| --- | ---: | ---: | ---: | ---: |
| Upstream Claude Code | 36 | 18 | 308 | 1940 |
| Solana-clawd runtime | — | — | 368 | 2170 |

## Status Summary

- Present: 43
- Adapted: 11
- Missing: 0

## Upstream Mapping

| Upstream | Kind | Status | Phase | Solana-clawd target | Notes |
| --- | --- | --- | --- | --- | --- |
| `assistant` | dir | present | P1 Runtime Core | `src/assistant` | Session and assistant state can stay close to upstream while remaining local-first. |
| `bootstrap` | dir | present | P1 Runtime Core | `src/bootstrap` | Boot flow should stay compatible, then layer Solana services during initialization. |
| `bridge` | dir | adapted | P1 Runtime Core | `src/bridge`, `src/gateway` | Split generic remote bridge concerns from Solana-clawd gateway transports and event routing. |
| `buddy` | dir | present | P5 Review | `src/buddy` | Buddy layer is already blockchain-native and should remain a Solana specialization rather than an upstream clone. |
| `cli` | dir | present | P2 Operator Surfaces | `src/cli` | Top-level structure already exists in Solana-clawd. |
| `commands` | dir | present | P2 Operator Surfaces | `src/commands` | Top-level structure already exists in Solana-clawd. |
| `components` | dir | present | P2 Operator Surfaces | `src/components` | Top-level structure already exists in Solana-clawd. |
| `constants` | dir | present | P1 Runtime Core | `src/constants` | Top-level structure already exists in Solana-clawd. |
| `context` | dir | present | P1 Runtime Core | `src/context` | Top-level structure already exists in Solana-clawd. |
| `coordinator` | dir | adapted | P3 Agent Orchestration | `src/coordinator`, `src/agents` | Coordinator behavior maps to upstream, while `src/agents` is the Solana-clawd specialization for role policy. |
| `entrypoints` | dir | present | P2 Operator Surfaces | `src/entrypoints` | Top-level structure already exists in Solana-clawd. |
| `hooks` | dir | present | P2 Operator Surfaces | `src/hooks` | Top-level structure already exists in Solana-clawd. |
| `ink` | dir | present | P2 Operator Surfaces | `src/ink` | Top-level structure already exists in Solana-clawd. |
| `keybindings` | dir | present | P2 Operator Surfaces | `src/keybindings` | Top-level structure already exists in Solana-clawd. |
| `memdir` | dir | present | P1 Runtime Core | `src/memdir` | Top-level structure already exists in Solana-clawd. |
| `migrations` | dir | present | P1 Runtime Core | `src/migrations` | Top-level structure already exists in Solana-clawd. |
| `moreright` | dir | present | P1 Runtime Core | `src/moreright` | Top-level structure already exists in Solana-clawd. |
| `native-ts` | dir | present | P1 Runtime Core | `src/native-ts` | Top-level structure already exists in Solana-clawd. |
| `outputStyles` | dir | present | P2 Operator Surfaces | `src/outputStyles` | Top-level structure already exists in Solana-clawd. |
| `plugins` | dir | present | P3 Agent Orchestration | `src/plugins` | Top-level structure already exists in Solana-clawd. |
| `query` | dir | adapted | P1 Runtime Core | `src/query`, `src/engine` | Generic query helpers stay in `src/query`; provider execution and permission/risk loops live in `src/engine`. |
| `remote` | dir | adapted | P4 Privacy + Local/Cloud | `src/remote`, `src/server`, `src/gateway` | Privacy-first local/cloud mode requires remote transport to stay opt-in and separable from local execution. |
| `schemas` | dir | present | P1 Runtime Core | `src/schemas` | Top-level structure already exists in Solana-clawd. |
| `screens` | dir | present | P2 Operator Surfaces | `src/screens` | Top-level structure already exists in Solana-clawd. |
| `server` | dir | adapted | P4 Privacy + Local/Cloud | `src/server`, `src/gateway` | Server layer is preserved, with gateway additions for MCP, web, and Solana operator surfaces. |
| `services` | dir | adapted | P3 Agent Orchestration | `src/services`, `src/memory`, `src/monitor` | Most services port directly; memory extraction and monitoring are split into Solana-specific subsystems. |
| `shims` | dir | present | P1 Runtime Core | `src/shims` | Top-level structure already exists in Solana-clawd. |
| `skills` | dir | present | P3 Agent Orchestration | `src/skills` | Top-level structure already exists in Solana-clawd. |
| `state` | dir | present | P1 Runtime Core | `src/state` | Top-level structure already exists in Solana-clawd. |
| `tasks` | dir | present | P3 Agent Orchestration | `src/tasks` | Background task model is shared and should stay close to upstream interfaces. |
| `tools` | dir | adapted | P3 Agent Orchestration | `src/tools`, `src/engine` | Tool inventory ports directly; execution policy stays in Solana-clawd permission and risk layers. |
| `types` | dir | present | P1 Runtime Core | `src/types` | Top-level structure already exists in Solana-clawd. |
| `upstreamproxy` | dir | present | P4 Privacy + Local/Cloud | `src/upstreamproxy` | Top-level structure already exists in Solana-clawd. |
| `utils` | dir | present | P1 Runtime Core | `src/utils` | Top-level structure already exists in Solana-clawd. |
| `vim` | dir | present | P2 Operator Surfaces | `src/vim` | Top-level structure already exists in Solana-clawd. |
| `voice` | dir | adapted | P4 Privacy + Local/Cloud | `src/voice`, `web/app/voice` | Voice core remains local/cloud capable, with Solana-clawd surfacing it in both CLI and web. |
| `QueryEngine.ts` | file | adapted | P1 Runtime Core | `src/QueryEngine.ts`, `src/engine/query-engine.ts` | Keep compatibility shim plus runtime engine implementation for staged adaptation. |
| `Task.ts` | file | adapted | P3 Agent Orchestration | `src/Task.ts`, `src/tasks` | Retain task contracts while extending runtime task kinds for monitors and local workflows. |
| `Tool.ts` | file | adapted | P3 Agent Orchestration | `src/Tool.ts`, `src/engine/tool-base.ts` | Preserve upstream tool typing while enforcing Solana-clawd permission levels and schemas. |
| `commands.ts` | file | present | P2 Operator Surfaces | `src/commands.ts` | Top-level structure already exists in Solana-clawd. |
| `context.ts` | file | present | P1 Runtime Core | `src/context.ts` | Top-level structure already exists in Solana-clawd. |
| `cost-tracker.ts` | file | present | P1 Runtime Core | `src/cost-tracker.ts` | Top-level structure already exists in Solana-clawd. |
| `costHook.ts` | file | present | P1 Runtime Core | `src/costHook.ts` | Top-level structure already exists in Solana-clawd. |
| `dialogLaunchers.tsx` | file | present | P2 Operator Surfaces | `src/dialogLaunchers.tsx` | Top-level structure already exists in Solana-clawd. |
| `history.ts` | file | present | P1 Runtime Core | `src/history.ts` | Top-level structure already exists in Solana-clawd. |
| `ink.ts` | file | present | P2 Operator Surfaces | `src/ink.ts` | Top-level structure already exists in Solana-clawd. |
| `interactiveHelpers.tsx` | file | present | P2 Operator Surfaces | `src/interactiveHelpers.tsx` | Top-level structure already exists in Solana-clawd. |
| `main.tsx` | file | present | P2 Operator Surfaces | `src/main.tsx` | Top-level structure already exists in Solana-clawd. |
| `projectOnboardingState.ts` | file | present | P2 Operator Surfaces | `src/projectOnboardingState.ts` | Top-level structure already exists in Solana-clawd. |
| `query.ts` | file | present | P1 Runtime Core | `src/query.ts` | Top-level structure already exists in Solana-clawd. |
| `replLauncher.tsx` | file | present | P2 Operator Surfaces | `src/replLauncher.tsx` | Top-level structure already exists in Solana-clawd. |
| `setup.ts` | file | present | P1 Runtime Core | `src/setup.ts` | Top-level structure already exists in Solana-clawd. |
| `tasks.ts` | file | present | P3 Agent Orchestration | `src/tasks.ts` | Top-level structure already exists in Solana-clawd. |
| `tools.ts` | file | present | P3 Agent Orchestration | `src/tools.ts` | Top-level structure already exists in Solana-clawd. |

## Solana-Only Runtime Modules

These modules have no direct upstream equivalent and should remain first-class Solana-clawd surfaces during adaptation.

| Module | Target path | Why it exists |
| --- | --- | --- |
| `agents` | `src/agents` | Built-in Solana research, OODA, scanner, monitor, and minting agents. |
| `engine` | `src/engine` | Solana-clawd execution core: multi-LLM routing, permission engine, and risk engine. |
| `gateway` | `src/gateway` | Privacy-preserving local/cloud transport bridge beyond upstream bridge abstractions. |
| `helius` | `src/helius` | Helius RPC, DAS, webhooks, and streaming integrations. |
| `memory` | `src/memory` | KNOWN / LEARNED / INFERRED extraction and consolidation. |
| `metaplex` | `src/metaplex` | On-chain agent identity, minting, and wallet delegation. |
| `monitor` | `src/monitor` | Solana market and wallet monitoring services. |
| `pump` | `src/pump` | Pump.fun market scanner and bonding curve logic. |
| `shared` | `src/shared` | Shared Solana-clawd message, model, and policy contracts. |
| `telegram` | `src/telegram` | Telegram operator terminal for Solana trading and monitoring workflows. |

## Recommended Execution Order

1. P1 Runtime Core
   Stabilize `QueryEngine`, state, context, memory, schemas, constants, and bootstrap behavior so upstream-compatible internals can land without destabilizing Solana services.
2. P2 Operator Surfaces
   Reconcile CLI, commands, Ink UI, components, output styles, and onboarding while preserving Solana-clawd branding and operator workflows.
3. P3 Agent Orchestration
   Port task, tool, service, plugin, and skill behaviors behind existing Solana-clawd permission and orchestration layers.
4. P4 Privacy + Local/Cloud
   Keep remote, bridge, server, voice, and upstream proxy behavior optional and privacy-first, with local execution as the default.
5. P5 Review
   Audit anything still marked missing before any broad copy-forward work.
