# Claude Code -> Solana-Clawd Adaptation Plan

This is the working plan for turning the local `claude-code-main 2/src` tree into a hardened Solana-clawd runtime without collapsing into a fragile fork.

## Goal

Build a blockchain-based, Solana-native, privacy-first Clawd application that:

- runs locally first
- supports optional cloud and remote bridge modes
- keeps wallets, signing, and trading behind explicit policy gates
- preserves the mature Claude Code operator surface where it helps
- routes blockchain-specific behavior through Solana-clawd subsystems instead of generic upstream abstractions

## Non-Goal

Do not copy every upstream file mechanically. That would erase the Solana-specific runtime already present in this repo and turn the codebase into a hard-to-maintain fork.

The correct unit of work is:

1. identify an upstream behavior or interface
2. map it to the current Solana-clawd location
3. adapt it behind Solana-clawd policy, memory, wallet, and transport constraints
4. verify the build still passes

## Design Rules

### 1. Local-first by default

- local CLI, local MCP, and local memory stay the default path
- cloud sync, remote bridge, and hosted surfaces remain opt-in
- secrets never move from local env or vault into source-controlled config

### 2. Privacy-first execution

- wallet, trade, and signing actions stay deny-first
- local vault and agentwallet remain the canonical secret layers
- remote capabilities must degrade cleanly when disabled

### 3. Keep Solana-specific modules first-class

These are not temporary patches. They are the runtime:

- `src/engine`
- `src/helius`
- `src/pump`
- `src/metaplex`
- `src/memory`
- `src/monitor`
- `src/agents`
- `src/gateway`
- `src/telegram`

### 4. Preserve compatibility where useful

When an upstream Claude Code contract already exists in this repo, prefer adapting behavior in place rather than inventing a second abstraction.

## Execution Phases

### Phase 1: Runtime Core

Scope:

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/context.ts`
- `src/state/`
- `src/bootstrap/`
- `src/constants/`
- `src/schemas/`
- `src/memdir/`
- `src/migrations/`
- `src/utils/`

Deliverable:

- stable parity layer for core runtime primitives
- no regressions in local execution

### Phase 2: Operator Surfaces

Scope:

- `src/cli/`
- `src/commands/`
- `src/components/`
- `src/ink/`
- `src/screens/`
- `src/hooks/`
- `src/outputStyles/`
- `src/keybindings/`
- `src/main.tsx`

Deliverable:

- a branded Solana-clawd operator interface that remains compatible with upstream concepts where useful

### Phase 3: Orchestration

Scope:

- `src/tools/`
- `src/tasks/`
- `src/services/`
- `src/plugins/`
- `src/skills/`
- `src/coordinator/`
- `src/Tool.ts`
- `src/Task.ts`

Deliverable:

- upstream-capable agent loops running through Solana-clawd permission, memory, and task policy

### Phase 4: Privacy + Local/Cloud

Scope:

- `src/bridge/`
- `src/remote/`
- `src/server/`
- `src/voice/`
- `src/upstreamproxy/`

Deliverable:

- local-first runtime with optional cloud relay, remote sessions, and voice surfaces

### Phase 5: Solana Specialization

Scope:

- `src/engine/`
- `src/agents/`
- `src/helius/`
- `src/pump/`
- `src/metaplex/`
- `src/monitor/`
- `src/gateway/`
- `src/telegram/`
- wallet and vault packages

Deliverable:

- Solana-clawd becomes the authoritative blockchain adaptation, not just an upstream skin

## Working Method

For each folder or root file:

1. compare upstream and current target
2. decide whether the current target is:
   - already present
   - adapted
   - missing
3. merge behavior, not just text
4. record the result in the adaptation report
5. run the relevant checks before moving on

## Tooling

Run the adaptation inventory anytime:

```bash
npm run adaptation:report
```

That command generates:

- `docs/claude-code-adaptation-report.md`
- `docs/claude-code-adaptation-report.json`

## Immediate Next Steps

1. finish the generated adaptation report baseline
2. start Phase 1 with `QueryEngine`, `query`, `state`, and `bootstrap`
3. verify local CLI, MCP, and web entrypoints still build
4. only then move folder-by-folder across the higher-level operator surfaces
