# OpenClawd Architecture — How the Four Core Pieces Fit Together

There are four moving parts in this repo whose names overlap in confusing ways. This doc disambiguates them so a fresh reader (or future-you) doesn't burn a day figuring out which "gateway" is which.

## TL;DR

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│ openclawd-framework          │      │ plugin.delivery (sub-mono)   │
│   @openclawdsolana/leviathan │      │ ┌──────────────────────────┐ │
│   - the runtime               │      │ │ packages/sdk             │ │
│   - molting / pulse / state   │      │ │   @openclawdsolana/      │ │
│   - identity / wallet         │      │ │   plugin-sdk  v1.1.0     │ │
│                               │      │ └────────────┬─────────────┘ │
│   packages/clawd              │      │              │ depends on    │
│     @openclawdsolana/         │      │ ┌────────────▼─────────────┐ │
│     clawd-leviathan v1.3.0    │      │ │ packages/gateway         │ │
│     bin: clawd-leviathan      │      │ │   @openclawdsolana/      │ │
│     (private — not on npm)    │      │ │   chat-plugins-gateway   │ │
│                               │      │ │   v1.9.0 (edge runtime)  │ │
│   packages/cli-standalone     │      │ └──────────────────────────┘ │
│     @openclawdsolana/         │      └──────────────────────────────┘
│     clawd-standalone v1.3.0   │
│     bin: clawd-standalone     │      ┌──────────────────────────────┐
└──────────────────────────────┘      │ packages/membrain (Go)       │
                                       │   github.com/.../membrane    │
┌──────────────────────────────┐      │   - gRPC memory daemon       │
│ gateway/  (root)              │      │   - SQLite + pgvector        │
│   @openclawdsolana/gateway    │      │   bin/membraned              │
│   v1.0.0 (private)            │      │                              │
│   - Telegram bot              │      │ packages/membrain-types      │
│   - Birdeye / Helius wrapper  │      │   @openclawdsolana/          │
│   - Spawns leviathan agents   │      │   membrain-types v1.0.0      │
└──────────────────────────────┘      │   (TS gRPC-web client)       │
                                       └──────────────────────────────┘

┌──────────────────────────────┐      ┌──────────────────────────────┐
│ clawd-tui/ (npm)              │      │ clawd-vault-master/          │
│   @openclawdsolana/clawd-tui  │      │   @openclawdsolana/          │
│   v0.2.1                      │      │   clawd-vault                │
│   bin: clawd, clawd-tui       │      │   v0.0.0-dev (placeholder)   │
└──────────────────────────────┘      │   See AGENT-TASK.md           │
                                       └──────────────────────────────┘
┌──────────────────────────────┐
│ clawd-code-cli/  (npm)        │      ┌──────────────────────────────┐
│   @openclawdsolana/           │      │ clawdhub/  (Vite + Convex)   │
│   clawd-code-cli v0.2.3       │      │   - Skills marketplace UI    │
│   bin: clawd-code,            │      │   - Sub-monorepo (Bun)       │
│        clawd-code-cli         │      └──────────────────────────────┘
└──────────────────────────────┘
```

## The four pieces

### 1. `openclawd-framework/` → `@openclawdsolana/leviathan`

The **runtime**. Pure library code: identity, wallet, molting (spawn), pulse (lifecycle), state, survival. Used by anything that needs to spin up a Solana-aware autonomous agent.

- Sub-package `openclawd-framework/packages/clawd` provides the standalone CLI that exposes the runtime.
- Sub-package `openclawd-framework/packages/cli-standalone` is a zero-dep build for distribution.
- Consumed by: itself (`packages/clawd` declares `"@openclawdsolana/leviathan": "file:../.."`).

### 2. `gateway/` → `@openclawdsolana/gateway`

The **Leviathan control plane**. A Node service that:

- Runs a Telegram bot (`grammy`) for human↔agent commands
- Wraps Birdeye + Helius for price/portfolio queries
- Spawns leviathan instances on demand

Marked `private: true` — not published. Run with `npm --prefix gateway run dev`.

### 3. `plugin.delivery/packages/sdk` → `@openclawdsolana/plugin-sdk` v1.1.0

The **public plugin SDK**. Build a chat plugin with on-chain attestation, OpenAPI parsing, Zod schemas, and Solana Attestation Service helpers.

- Published to npm at v1.1.0.
- Exports: `./client`, `./schema`, `./openapi`.
- Consumed by `plugin.delivery/packages/gateway` and every plugin template under `plugin.delivery/templates/*`.

### 4. `plugin.delivery/packages/gateway` → `@openclawdsolana/chat-plugins-gateway` v1.9.0

The **plugin runtime gateway**. An edge-runtime Cloudflare-Workers-compatible gateway that:

- Validates incoming agent → plugin requests
- Applies deny-first permission policies
- Forwards to the actual plugin manifest

Built on top of `@openclawdsolana/plugin-sdk`.

## Why both monorepos?

`plugin.delivery/` is a **pnpm sub-monorepo** with its own `pnpm-workspace.yaml`. The root is an **npm workspaces** monorepo. They don't share `node_modules` and they can't directly cross-link via workspaces.

That's intentional — `plugin.delivery` is published as a coherent product (the plugin SDK + its gateway + plugin templates) and ships independently of the rest of the repo. Mixing it into root npm workspaces would couple their release cadences.

## How they communicate

There is **no live runtime IPC** between the four — they're libraries you wire into your own service. The "communication" is at the **package contract** layer:

| From → To | Mechanism |
|--|--|
| `plugin.delivery/gateway` → `plugin-sdk` | Direct workspace import in `src/edge.ts`, `src/gateway.ts`, `src/node.ts` |
| Plugin templates → `plugin-sdk` | `import` from `@openclawdsolana/plugin-sdk` (resolved to v1.1.0 from npm or workspace) |
| `gateway/` (Telegram) → `leviathan` | Spawns child processes via `openclawd-framework` exports |
| Top-level CLIs (`clawd-tui`, `clawd-code-cli`) | Standalone — talk to Helius/Birdeye directly, don't depend on the four |

## Name collision (resolved)

Until v0.2 there were **two packages claiming `@openclawdsolana/plugin-sdk`**:

- `packages/plugin-sdk/` (root, private internal helper, different exports)
- `plugin.delivery/packages/sdk` (the published v1.1.0 public SDK)

The root one was renamed to `@openclawdsolana/plugin-sdk-internal` so the public name is unambiguous. No external consumers were affected (the root one was never imported by package name — only by relative path within its own siblings).

## Bootstrap order

A clean install runs:

```bash
# At root, runs npm workspaces for everything declared in package.json#workspaces
npm install

# Then the cross-workspace install/build chain
npm run install:framework         # leviathan
npm run install:gateway           # @openclawdsolana/gateway (Telegram)
npm run install:plugin-delivery   # plugin.delivery sub-monorepo (pnpm)

npm run build:framework
npm run build:gateway
npm run build:plugin-delivery
```

`install.sh` runs all of this automatically when Node 20+ is available. If pnpm isn't installed it falls back to per-package `npm install` inside `plugin.delivery/packages/*` (slower, but works).

## Verifying the wiring

```bash
npm run install:all
npm run build:release
npm --prefix plugin.delivery/packages/gateway run type-check
npm --prefix plugin.delivery/packages/sdk run type-check
npm --prefix gateway run build
npm --prefix openclawd-framework run build
```

If all four pass, the contracts hold and the four pieces speak the same TypeScript dialect.
