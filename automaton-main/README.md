# CLAWD Automaton

Sovereign lobster-themed agent runtime and operator dashboard for Solana-native automation.

Public hub: https://github.com/x402agent/solana-clawd

Automation portal: https://x402.wtf/automation

This workspace now ships two publishable packages:

- `clawd-automaton`: the runtime, CLI entrypoint, config, state, spawning, and automation loop
- `clawd-dashboard`: the React + Vite + React Three Fiber dashboard for CLAWD Cloud
- `automation/`: migrated automation control plane for bootstrap, CI, identity spawn, and runtime orchestration

The runtime is wired for your own infrastructure surface:

- x402 home: `https://x402.wtf`
- Runtime API: `https://x402.wtf/api`
- Inference host: `https://inference.x402.wtf`
- Automation portal: `https://x402.wtf/automation`
- Backrooms: `https://backrooms.x402.wtf`
- Payment rails: `pay.sh` for USDC and the CLAWD commerce adapter for `$CLAWD`

## Packages

### `clawd-automaton`

Core runtime for:

- identity provisioning
- runtime configuration
- scheduled automation loops
- sandbox lifecycle hooks
- replication / spawn flows
- local persistence
- operator-facing commands

### `clawd-dashboard`

Frontend control plane for:

- sandbox overview
- inference controls
- billing and wallet reserves
- `$CLAWD` and USDC funding UX
- lobster-themed 3D presentation layer built with React Three Fiber

## Quick Start

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd/automaton-main
pnpm install
pnpm build
clawd-automaton --help
```

If you are running from source before linking the bin:

```bash
node dist/index.js --help
```

Run the dashboard locally:

```bash
pnpm dashboard:dev
```

Build the dashboard:

```bash
pnpm dashboard:build
```

Run the migrated automation layer from the repo root:

```bash
npm run automation:build
npm run automation:ci
bash automaton-main/automation/leviathan.sh --full
```

## Runtime Configuration

The runtime is now pointed at your own API surface.

Important environment variables:

```bash
CLAWD_API_URL=https://x402.wtf/api
CLAWD_API_KEY=...
CLAWD_SANDBOX_ID=...
```

For the Solana trading layer in the adjacent API service, the current integration also expects:

```bash
SOLANA_RPC_URL=...
DFLOW_API_KEY=...
VULCAN_BIN=...
```

## Dashboard

The dashboard lives in `packages/dashboard` and is built with:

- React 18
- Vite 5
- TypeScript
- `@react-three/fiber`
- `@react-three/drei`

It includes:

- CLAWD Cloud sandbox overview
- direct routing to `https://x402.wtf/automation`
- inference playground shell
- billing and reserve management
- `pay.sh` and `$CLAWD` funding hooks
- lobster/trench visual theming

## Payment Model

Billing UX currently models two rails:

- USDC packages through `pay.sh`
- `$CLAWD` packages through the CLAWD commerce adapter seam

That keeps the dashboard honest about settlement behavior while preserving the same purchase surface for both token types.

## Development

Install dependencies:

```bash
pnpm install
```

Build everything:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Useful runtime commands:

```bash
pnpm dev
pnpm ooda
pnpm goblin
pnpm goblin:tui
```

## Publish

Publish the runtime package:

```bash
npm publish --access public
```

Publish the dashboard package:

```bash
cd packages/dashboard
npm publish --access public
```

## Workspace Layout

```text
automation/           # migrated bootstrap + CI orchestration hub
dist/                 # generated runtime output, not edited by hand
node_modules/         # local dependencies, ignored by git
packages/
  dashboard/          # React/Vite/R3F dashboard for x402.wtf/automation
scripts/              # helper scripts and runtime rules
src/
  __tests__/          # heartbeat and loop tests
  agent/              # context, injection defense, loop, prompts, tools
  clawd/              # API clients, credits, inference, x402 adapters
  git/                # state versioning and git-backed tools
  heartbeat/          # daemon, tasks, liveness config
  identity/           # wallet and x402 identity provisioning
  ooda/               # observe/orient/decide/act loop and TUI
  registry/           # agent cards, ERC-8004, discovery
  replication/        # spawn, lineage, genesis flows
  self-mod/           # audited code and tool update helpers
  setup/              # banner, defaults, env, prompts, wizard
  skills/             # skill loading, formatting, registry
  social/             # external social/API client hooks
  state/              # sqlite schema and persistence
  survival/           # funding and low-compute survival checks
  config.ts           # runtime config
  index.ts            # CLI entrypoint
  types.ts            # shared runtime types
constitution.md       # inherited automation laws
package.json          # clawd-automaton package metadata
pnpm-workspace.yaml   # dashboard workspace
```

## License

MIT
