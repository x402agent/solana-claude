# @openclawdsolana/clawd-wallet

**Privy-embedded Solana wallet + Grok-gated agentic trading + Jupiter swap aggregator.**

Part of the [OpenClawd](https://solanaclawd.com) framework.

---

## Install

```bash
npm install @openclawdsolana/clawd-wallet
```

[![npm](https://img.shields.io/npm/v/@openclawdsolana/clawd-wallet)](https://www.npmjs.com/package/@openclawdsolana/clawd-wallet)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## What's inside

| Export | Description |
|--------|-------------|
| `ClawdWallet` | Low-level Privy wallet wrapper — sign transactions, send SOL/tokens, query balance |
| `AgenticWallet` | Permission-gated agentic trading. Every swap/transfer is screened by Grok before execution. Configurable limits per operation type. |
| `SwapService` | Jupiter aggregator integration — best-route token swaps on Solana mainnet |

---

## Quick start

```typescript
import { ClawdWallet, AgenticWallet, SwapService } from "@openclawdsolana/clawd-wallet";

// Basic wallet
const wallet = new ClawdWallet({ chain: "mainnet" });
const balance = await wallet.getBalance();

// AI-gated trading wallet
const agent = new AgenticWallet({
  permissions: {
    maxSwapUsd: 100,      // max $100 per swap
    maxSolTransfer: 1.0,  // max 1 SOL per transfer
    permissionLevel: "ask", // ask Grok before every trade
  }
});

// Jupiter swap
const swap = new SwapService();
const quote = await swap.getQuote({
  inputMint: "So11111111111111111111111111111111111111112", // SOL
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  amount: 1_000_000_000, // 1 SOL in lamports
});
```

---

## Environment variables

```bash
PRIVY_APP_ID=           # Privy application ID
PRIVY_APP_SECRET=       # Privy application secret
XAI_API_KEY=            # Grok API key (for AgenticWallet permission screening)
SOLANA_RPC_URL=         # Solana RPC endpoint (default: mainnet-beta)
```

---

## Links

- **npm:** https://www.npmjs.com/package/@openclawdsolana/clawd-wallet
- **Homepage:** https://solanaclawd.com
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
