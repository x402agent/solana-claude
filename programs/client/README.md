# SolanaOS Protocol Client

TypeScript SDK for solana-clawd program integrations. It exports network config, AI inference IDL/client helpers, and ORE protocol constants used by apps and agents.

## Package

```text
@clawd/solanaos-protocol-client
```

## What It Does

- Exposes program IDs and RPC defaults.
- Exposes AI inference IDL/client helpers.
- Exposes ORE mining constants and helpers.
- Builds to `dist/` for package consumers.

## Program IDs

| Constant | ID |
| --- | --- |
| `AI_INFERENCE_PROGRAM_ID` | `3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc` |
| `ORE_PROGRAM_ID` | `ore2LrFdxHRrcqwR1KVW5jLEqfAXEJMxRNSGzwj73yz` |
| `ORE_V1_PROGRAM_ID` | `oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv` |
| `ORE_MINT` | `oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp` |
| `WSOL_MINT` | `So11111111111111111111111111111111111111112` |

## Install

```bash
cd programs/client
pnpm install
pnpm build
```

## Usage

```ts
import {
  AI_INFERENCE_PROGRAM_ID,
  DEFAULT_RPC_URL,
  solscanAccountUrl,
} from "@clawd/solanaos-protocol-client";

console.log(AI_INFERENCE_PROGRAM_ID);
console.log(DEFAULT_RPC_URL);
console.log(solscanAccountUrl(AI_INFERENCE_PROGRAM_ID));
```

## Innovation

This package is the app-facing bridge between the on-chain program workspace and agent/client runtimes. It keeps protocol constants and typed helpers in one place so dashboards, MCP tools, and agents do not duplicate program IDs.

## Safety Notes

- Treat embedded RPC URLs as development defaults; production apps should inject their own RPC endpoint.
- Never ship private keys in client config.
- Keep generated IDL synchronized with deployed program versions.

