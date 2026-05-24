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

- `@solana-clawd/agent-kit`: agent/template/catalog loader, runtime profile helpers, and the `clawd-agent` CLI
- `@solana-clawd/agent-registry`: registry document helpers — Metaplex (ERC-8004 `metaplex-agent-registry`) **and** Google A2A agent cards
- `@solana-clawd/pump-sdk`: Solana Clawd's own dependency-free pump bonding-curve SDK (token creation, buy/sell math, fee sharing, PDAs, instruction descriptors)
- `@solana-clawd/x402-agent-kit`: build/consume x402 (HTTP 402) payment challenges to gate agent endpoints with USDC/CLAWD on Solana

## Design, validate, and mint your own agent

The `clawd-kit` CLI ships with `@solana-clawd/agent-kit`:

```bash
npm i -g @solana-clawd/agent-kit      # provides the `clawd-kit` binary

clawd-kit list                       # every agent in the catalog (or --remote from x402.wtf)
clawd-kit show clawd-pump-sdk-expert # details + deploy/chat/mint/mcp endpoints
clawd-kit new my-agent               # scaffold src/my-agent.json (Solana Clawd owned)
clawd-kit validate my-agent          # ownership + schema check

# Build registration documents
clawd-kit register my-agent --target metaplex   # ERC-8004 metaplex-agent-registry doc
clawd-kit register my-agent --target google     # Google A2A agent card
```

Point the CLI at a checkout with `--agents-dir DIR` or `SOLANA_CLAWD_AGENTS_DIR`.

To actually **mint** the agent identity on-chain, use the `clawd-agent` CLI from
`@openclawdsolana/clawd-tui` (installed by `install.sh`):

```bash
clawd-agent mint --network devnet --keypair ~/.config/solana/id.json \
  --name "My Agent" --uri https://example.com/agent.json --service MCP=https://... --yes
clawd-agent mint-free --network devnet --owner <YOUR_SOLANA_PUBKEY> --name "My Agent" ...
```

The hosted, gasless mint flow lives at `https://x402.wtf/agents/mint`.

## Install

From the repository root:

```bash
cd agent-kit
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
