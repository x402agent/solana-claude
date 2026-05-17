# Solana Clawd Agent Kit

Local TypeScript packages for working with the Solana Clawd agent registry in this repository. This workspace is part of the main codebase: it is wired into the root workspace, referenced by `agents/package.json`, and used to keep `agents/`, the public x402 catalog, and gateway registry documents aligned.

This is not the upstream Solana Agent Kit plugin bundle. The imported plugin packages, examples, generated docs, and third-party package metadata were removed so this directory only contains Solana Clawd-owned code.

## What This Kit Does

- Loads agents from `../agents/src/*.json`
- Loads the canonical templates:
  - `../agents/agent-template.json`
  - `../agents/agent-template-full.json`
  - `../agents/agent-template-attested.json`
- Reads `../agents/agents-catalog.json` and `../agents/agents-manifest.json`
- Builds runtime profiles for Solana Clawd agents
- Produces registry documents for catalog/API publishing
- Validates that this workspace stays scoped to `@solana-clawd/*`
- Supports the free and gasless agent path documented at `https://x402.wtf/agents`

## Packages

- `@solana-clawd/agent-kit`: agent/template/catalog loader and runtime profile helpers
- `@solana-clawd/agent-registry`: registry document helpers for publishable Solana Clawd agent metadata

## Install

From the repository root:

```bash
cd solana-clawd-agent-kit
pnpm install
pnpm build
pnpm validate
```

The main `agents` codebase references the kit with local `file:` dependencies, so package changes are consumed without publishing.

From the repository root:

```bash
npm run agent-kit:build
npm run agent-kit:validate
```

## Usage

```ts
import { SolanaClawdAgentKit } from "@solana-clawd/agent-kit";

const kit = new SolanaClawdAgentKit({
  agentsDir: "../agents",
});

const agents = kit.listAgents();
const profile = kit.createRuntimeProfile("solana-clawd-wallet-guardian");

console.log(agents.length, profile.catalogEntry?.title);
```

## Validation

```bash
pnpm validate
```

The validator checks:

- package names are `@solana-clawd/*`
- no upstream `solana-agent-kit` package names remain
- the required `agents` templates, catalog, and manifest exist
- representative agent JSON files can be loaded through the kit

## Catalog Rebuild

```bash
pnpm agents:catalog
```

This delegates to `../agents/build-catalog.cjs`, which remains the source of truth for the public catalog output.

## Public Agent Path

The public hub lets anyone discover agents and mint/register Solana agent identities without paying SOL for transaction fees:

```text
https://x402.wtf/agents
```

Gateway routes used by that flow:

```bash
curl https://x402.wtf/registry | jq .
curl https://x402.wtf/identity | jq .
curl https://x402.wtf/metadata/agent1.json | jq .
curl https://x402.wtf/sas/agent1.json | jq .

curl -X POST https://x402.wtf/api/mint/agent \
  -H 'Content-Type: application/json' \
  -d '{"agentId":1,"ownerPubkey":"<YOUR_SOLANA_PUBKEY>"}'
```
