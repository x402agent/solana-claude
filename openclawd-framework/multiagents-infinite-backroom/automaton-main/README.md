# CLAWD Automaton

Sovereign lobster-themed agent runtime and operator dashboard for Solana-native automation.

This workspace now ships two publishable packages:

- `@clawd/automaton`: the runtime, CLI entrypoint, config, state, spawning, and automation loop
- `@clawd/dashboard`: the React + Vite + React Three Fiber dashboard for CLAWD Cloud

The runtime is wired for your own infrastructure surface:

- Runtime API: `https://api.x402.wtf`
- Inference host: `https://inference.x402.wtf`
- Payment rails: `pay.sh` for USDC and the CLAWD commerce adapter for `$CLAWD`

## Packages

### `@clawd/automaton`

Core runtime for:

- identity provisioning
- runtime configuration
- scheduled automation loops
- sandbox lifecycle hooks
- replication / spawn flows
- local persistence
- operator-facing commands

### `@clawd/dashboard`

Frontend control plane for:

- sandbox overview
- inference controls
- billing and wallet reserves
- `$CLAWD` and USDC funding UX
- lobster-themed 3D presentation layer built with React Three Fiber

## Quick Start

```bash
git clone https://github.com/x402agent/openclawd.git
cd openclawd/automaton-main
pnpm install
pnpm build
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

## Runtime Configuration

The runtime is now pointed at your own API surface.

Important environment variables:

```bash
CLAWD_API_URL=https://api.x402.wtf
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
src/
  agent/
  clawd/
  git/
  heartbeat/
  identity/
  molting/
  ooda/
  registry/
  replication/
  setup/
  state/
  survival/
packages/
  dashboard/
scripts/
  automaton.sh
  clawd-rules.txt
```

## License

MIT
