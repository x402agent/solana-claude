# OpenClawd Automation

Migrated automation control plane for `automaton-main`.

This package is the direct automation surface under the main `clawd-automaton` workspace. It carries bootstrap scripts, CI orchestration, identity spawn helpers, runtime state, heartbeat tasks, registry discovery, self-modification helpers, and the x402/backrooms client adapters.

Public surfaces:

- GitHub hub: `https://github.com/x402agent/solana-clawd`
- Automation portal: `https://x402.wtf/automation`
- Runtime API: `https://x402.wtf/api`
- Backrooms: `https://backrooms.x402.wtf`

## Quick Start

From the main workspace:

```bash
cd automaton-main
pnpm install
pnpm build
pnpm test
```

Run this package directly:

```bash
cd automaton-main/automation
pnpm install
pnpm build
pnpm test
```

Run the automation installer/orchestrator:

```bash
bash automaton-main/automation/leviathan.sh --help
bash automaton-main/automation/leviathan.sh --full
```

From the repository root:

```bash
npm run automation:build
npm run automation:ci
npm run automation:full
```

## Package Layout

```text
automation/
├── index.ts                 # command dispatcher used by root npm scripts
├── ci.ts                    # local CI/build orchestration
├── runtime.ts               # package/runtime discovery helpers
├── leviathan.sh             # shell bootstrap and orchestration entrypoint
├── src/
│   ├── agent/               # loop, context, prompts, tool execution
│   ├── clawd/               # x402, backroom, inference, credit clients
│   ├── git/                 # state versioning and git-backed tools
│   ├── heartbeat/           # scheduled liveness tasks
│   ├── identity/            # wallet and identity provisioning
│   ├── registry/            # agent cards, ERC-8004, discovery
│   ├── replication/         # spawn, lineage, genesis helpers
│   ├── self-mod/            # audited update helpers
│   ├── setup/               # banner, defaults, env, prompts, wizard
│   ├── skills/              # skill loader and formatter
│   ├── state/               # SQLite schema and persistence
│   └── survival/            # funding and low-compute checks
└── src/__tests__/           # heartbeat and loop tests
```

## Verified Commands

These direct package commands are expected to pass:

```bash
pnpm build
pnpm test
```

The parent workspace also verifies the dashboard package:

```bash
cd ..
pnpm build
pnpm dashboard:build
pnpm test
```

## Secret Handling

Keep credentials in environment variables or ignored local `.env` files. Do not commit private keys, wallet exports, deployment keypairs, API keys, or generated `target/` artifacts.

The runtime expects signing and paid-operation credentials to be provided intentionally by the operator. The package does not include fallback private keys.

## License

MIT
