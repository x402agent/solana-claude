# Solana Clawd SDK

`@solanaclawd/sdk` is the local, canonical TypeScript SDK for this repo. It is based on the public `x402agent/Solana-Clawd-SDK` shape, but this checkout should remain the source of truth for package names, safety gates, and runtime wiring.

## Current Status

- The SDK builds with `npm --prefix sdk run build`.
- The public API exposes `createClawd`, `createAgent`, `createWallet`, `ToolRegistry`, MCP helpers, OpenShell helpers, and Three Laws guards.
- Some runtime calls are intentionally still facade/stubbed. For production Metaplex minting, Pay spending, and live runtime execution, use `openclawd-framework` exports until those adapters are wired into this SDK.

## Install And Build

From this monorepo:

```sh
npm --prefix sdk install
npm --prefix sdk run build
```

In another project after publishing:

```sh
npm install @solanaclawd/sdk @solana/web3.js
```

## Basic Use

```ts
import { createClawd, SDK_VERSION } from '@solanaclawd/sdk';

const clawd = await createClawd({
  cluster: 'devnet',
  paperOnly: true,
  devnetOnly: true,
  spawnPrompt: 'Observe Solana, do no harm, and only propose safe actions.',
});

console.log(SDK_VERSION);
console.log(clawd.tools.available().map((tool) => tool.name));

const tick = await clawd.agent.tailFlick();
console.log(tick);
```

## Tool Registry

```ts
import { ToolRegistry } from '@solanaclawd/sdk/tools';

const tools = new ToolRegistry({
  depth: 'shallow',
  paperOnly: true,
  devnetOnly: true,
  cluster: 'devnet',
});

console.log(tools.available());
```

Live trading and mainnet operations must remain blocked by default. Consumers should start with `paperOnly: true` and `devnetOnly: true`.

## MCP Client

```ts
import { createMCPClient } from '@solanaclawd/sdk/mcp';

const mcp = createMCPClient({
  serverUrl: 'http://localhost:3000',
  apiKey: process.env.MCP_API_KEY,
});

const listed = await mcp.listTools();
const balance = await mcp.callTool('solana_balance', { address: '<pubkey>' });
```

## Use OpenClawd Framework For Production Runtime Calls

The framework package currently owns the working Metaplex and Pay integrations:

```ts
import { readClawdAgent } from '@openclawdsolana/leviathan/commerce/metaplex-agent-commerce.js';
import { PayAutonomyClient } from '@openclawdsolana/leviathan/commerce/pay-client.js';
```

Use these for:

- Metaplex agent mint/read/executive delegation.
- Genesis agent-token launch.
- Pay CLI spend policy and paid API calls.

## SDK Direction

Do not vendor the full `x402agent/Solana-Clawd-SDK` repository into this repo. It is a full monorepo, not a focused SDK package. Selectively port useful SDK modules into `sdk/`, then expose stable framework integrations from `@solanaclawd/sdk`.
