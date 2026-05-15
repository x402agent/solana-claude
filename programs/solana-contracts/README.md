# solana-contracts

TypeScript transaction-building examples for Solana launchpad flows. The current file, [`src/token-launch-program.ts`](./src/token-launch-program.ts), demonstrates how a client could construct launchpad, mint, funding, liquidity, trading, and proceeds instructions.

## Program ID

```text
TLaunDAP1sZks8dGmcNWHxdAgzMuiYzKg87mfjHRFzM
```

## What It Does

- Defines launchpad instruction discriminators.
- Derives launchpad, token-launch, and liquidity-pool PDAs.
- Builds transactions for token launch setup.
- Initializes SPL mints and token launch state.
- Demonstrates launch funding and liquidity flow construction.

## Innovation

This folder is the client-builder counterpart to on-chain launch programs. It shows developers how launch instructions can be assembled from `@solana/web3.js`, SPL Token helpers, PDAs, and custom binary instruction payloads.

## Install

This folder does not currently include its own `package.json`. Use the root/package workspace dependencies or copy the source into a package that has:

```bash
npm install @solana/web3.js @solana/spl-token bn.js
```

## Usage Pattern

```ts
import { TokenLaunchInstruction } from "./src/token-launch-program";

const tx = await TokenLaunchInstruction.initializeLaunchpad(
  connection,
  payer,
  authority,
  250
);
```

## Safety Notes

- The source states it is a demonstration implementation.
- Binary layouts should be replaced with audited serialization before production.
- Do not hard-code a production launch program id without verifying deployment and upgrade authority.

