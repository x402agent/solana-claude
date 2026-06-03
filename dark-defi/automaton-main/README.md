<p align="center">
  <img src="../assets/darkdefi.svg" alt="DarkDefi animated banner" width="100%" />
</p>

<h1 align="center">DarkDefi Automaton Runtime</h1>

<p align="center">
  <strong>autonomous loop primitives for the DarkDefi release machine.</strong>
</p>

<p align="center">
  <a href="#purpose">Purpose</a> -
  <a href="#quick-start">Quick Start</a> -
  <a href="#architecture">Architecture</a> -
  <a href="#interoperability">Interoperability</a> -
  <a href="#security-model">Security Model</a>
</p>

---

`automaton-main` is the autonomous runtime layer inside DarkDefi. It provides durable agent loop primitives, state persistence, identity scaffolding, heartbeat scheduling, replication metadata, and injection-defense boundaries that can be composed by higher-level DarkDefi systems.

This package is not a trading bot, custody system, yield product, or financial signal engine. It is infrastructure for controlled autonomous execution.

## Purpose

DarkDefi uses this runtime to model agentic behavior under explicit constraints:

- sense context from configured sources
- reason through a bounded system prompt
- execute approved tools
- persist state and audit records
- conserve compute when resources are low
- preserve lineage and identity metadata
- reject prompt injection and harmful actions

The root repository owns public release policy. This package owns local autonomous loop mechanics.

## Quick Start

From the repository root:

```bash
cd automaton-main
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Run the runtime help after building:

```bash
node dist/index.js --help
```

## Configuration

Do not commit local secrets, wallet material, API keys, or runtime state. Use local environment configuration only for development and GitHub secrets for CI or release automation.

Common runtime configuration is handled by:

- `src/config.ts` - runtime configuration loading
- `src/setup/` - first-run setup helpers
- `src/identity/` - wallet and identity provisioning
- `src/state/` - SQLite-backed local state

## Architecture

```text
src/
  agent/            autonomous loop, tool routing, context, injection defense
  conway/           API client, credits, inference, x402 payment helpers
  git/              state versioning and repository tooling
  heartbeat/        scheduled tasks and daemon behavior
  identity/         wallet and identity provisioning
  registry/         agent cards, discovery, ERC-8004-style registry references
  replication/      genesis, lineage, and spawn metadata
  self-mod/         guarded self-modification and audit log support
  setup/            runtime setup wizard and defaults
  skills/           skill registry, loader, and formatting
  social/           message relay client
  state/            durable local database and schema
  survival/         funding monitor and low-compute mode
packages/
  cli/              operator CLI package
scripts/
  automaton.sh      installer/bootstrap helper
  conways-rules.txt policy reference text
```

## Interoperability

The runtime should integrate through typed interfaces, explicit configuration, and auditable state transitions. Avoid hidden coupling with the root release gate.

Recommended integration boundaries:

- Use the root `docs/INTEROPERABILITY.md` contract for public DarkDefi release state.
- Treat automaton state as local runtime state, not public release truth.
- Keep wallet actions behind explicit approval, allowlists, or policy checks.
- Re-query external market data before any value-transfer action.
- Use GitHub releases, typed payloads, or documented APIs for cross-system handoff.

## Security Model

This package assumes autonomous agents can be exposed to hostile prompts, untrusted tool output, external APIs, and low-resource failure modes.

Controls already present in this package include:

- constitutional policy in `constitution.md`
- prompt-injection defense in `src/agent/injection-defense.ts`
- explicit tool routing through `src/agent/tools.ts`
- state persistence in `src/state/`
- audit log support in `src/self-mod/audit-log.ts`
- low-compute and funding monitors in `src/survival/`
- test coverage for heartbeat and loop behavior

Required maintainer practices:

- Run `pnpm test` before changing loop, tool, state, identity, or survival logic.
- Keep generated state, private keys, and local databases out of git.
- Do not loosen the constitution to improve survival, growth, engagement, or revenue.
- Treat self-modification paths as privileged code.
- Review dependency updates before merging.

## Development

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Useful package commands:

```bash
pnpm test          # Vitest suite
pnpm build         # TypeScript build plus package builds
pnpm clean         # Remove build output
```

## Operating Rule

The automaton may only act inside the policy, permissions, and credentials it is explicitly given.

It must not promise profit, signal quality, safety, custody, or autonomous value transfer. When uncertain whether an action could cause harm, it must stop or request review.

## License

MIT. See [LICENSE](LICENSE).
