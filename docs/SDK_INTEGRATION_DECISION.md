# SDK Integration Decision

Question: should this repo integrate `x402agent/Solana-Clawd-SDK`, or should Solana Clawd keep its own SDK?

Decision: keep and harden the local `sdk/` package as the canonical SDK. Use `x402agent/Solana-Clawd-SDK` as an upstream reference, not as a vendored dependency or submodule.

## What The GitHub Repo Contains

The GitHub repo is public at:

```text
https://github.com/x402agent/Solana-Clawd-SDK
```

Observed branch: `newnew`.

It is not only an SDK. It contains a full OpenClawd-style monorepo: runtime, automation, packages, pay, x402, MCP, skills, examples, data, and vendored experiments. Its `package.json` publishes `@openclawdsolana/leviathan`, while this repo already has `openclawd-framework`, root `sdk/`, `x402/sdk`, `automation`, `MCP`, and perps integrations.

## Local SDK Status

Local package:

```text
sdk/package.json
name: @solanaclawd/sdk
```

Verified:

```sh
npm --prefix sdk run build
```

The local SDK already exposes:

- `createClawd`
- `createAgent`
- `createWallet`
- `ToolRegistry`
- Three Laws guards
- MCP client
- OpenShell helpers

Known limitation: some calls are facade/stubbed and should be wired to the working runtime modules in `openclawd-framework`.

## Why Not Vendor The Full External Repo

- It duplicates folders already present here: `automation`, `x402`, `pay`, `packages`, `skills`, `src`, and examples.
- It would increase repo size and cleanup complexity.
- It publishes/brands some packages differently than this repo.
- It does not solve the current integration gap by itself; the local framework has newer working Metaplex Pay/commerce code.

## Recommended Integration Plan

1. Keep `sdk/` as `@solanaclawd/sdk`.
2. Add stable adapters from `sdk/` to `openclawd-framework` for production features:
   - Metaplex mint/read/delegate/token launch.
   - Pay autonomous spending policy/client.
   - Vulcan perps adapter.
   - x402 `clawdFetch`.
3. Keep `x402/sdk` as `@solanaclawd/x402-client`, or re-export it from `@solanaclawd/sdk/x402` later.
4. Do not import raw private keys. Keep wallet signing behind vault/framework boundaries.
5. Publish one developer-facing SDK with small, stable subpaths.

## Target Public API

```ts
import { createClawd } from '@solanaclawd/sdk';
import { createMCPClient } from '@solanaclawd/sdk/mcp';
import { PayAutonomyClient } from '@solanaclawd/sdk/pay';
import { readClawdAgent, mintClawdAgent } from '@solanaclawd/sdk/metaplex';
import { clawdFetch } from '@solanaclawd/sdk/x402';
```

## Current Usage

```ts
import { createClawd } from '@solanaclawd/sdk';

const clawd = await createClawd({
  cluster: 'devnet',
  paperOnly: true,
  devnetOnly: true,
});

console.log(clawd.tools.available());
console.log(await clawd.agent.tailFlick());
```

For production Metaplex/Pay calls today, use `openclawd-framework` directly:

```ts
import { readClawdAgent } from '@openclawdsolana/leviathan/commerce/metaplex-agent-commerce.js';
import { PayAutonomyClient } from '@openclawdsolana/leviathan/commerce/pay-client.js';
```

## Next Implementation Tasks

- Add `sdk/src/metaplex.ts` that wraps `openclawd-framework/src/commerce/metaplex-agent-commerce.ts`.
- Add `sdk/src/pay.ts` that wraps `PayAutonomyClient`.
- Add `sdk/src/x402.ts` that re-exports `clawdFetch` from `x402/sdk`.
- Add `sdk/src/perps.ts` for the Vulcan quote/market/paper-order surface.
- Add an SDK smoke test that imports every public subpath after build.
