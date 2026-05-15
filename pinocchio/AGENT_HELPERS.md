# CLAWD Agent Helpers: p-token & Pinocchio Detection

This file documents how CLAWD agents should query and classify Pinocchio/p-token accounts.

## tRPC Procedure

```typescript
// Inspect any Solana account
const result = await trpc.agents.metaplex.inspectAccount.query({
  address: "So11111111111111111111111111111111111111112"
});

// Response shape:
// {
//   exists: boolean,
//   owner: string | null,       // base58 program ID that owns this account
//   executable: boolean | null, // true if this account IS a program
//   lamports: number | null,
//   dataLen: number | null,
// }
```

## Classification Logic

```typescript
import { PROGRAMS } from "./PROGRAMS.md"; // use the JSON tables

function classifyAccount(owner: string | null): {
  label: string;
  kind: "spl" | "token22" | "pinocchio" | "system" | "unknown";
  cuNote?: string;
} {
  if (!owner) return { label: "Not found", kind: "unknown" };

  const known: Record<string, { label: string; kind: any; cuNote?: string }> = {
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": {
      label: "SPL Token",
      kind: "spl",
      cuNote: "Transfer: ~4,736 CU"
    },
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": {
      label: "Token-2022",
      kind: "token22",
      cuNote: "Slightly higher CU than SPL Token"
    },
    "11111111111111111111111111111111": {
      label: "System Program",
      kind: "system"
    },
  };

  return known[owner] ?? {
    label: "Unknown Program (possible Pinocchio/custom)",
    kind: "unknown"
  };
}
```

## Agent Terminal Commands

When a user asks "is this token p-token?" or "what program owns this mint?":

1. Call `trpc.agents.metaplex.inspectAccount({ address: mintAddress })`
2. Check `result.owner` against known program IDs
3. If unknown → suggest Solscan link and note "could be a Pinocchio-based custom program"
4. Show CU comparison from `P_TOKEN.md` if relevant

## Mint Type Detection Example

```typescript
async function detectMintType(mintAddress: string) {
  const info = await inspectAccount(mintAddress);
  
  if (!info.exists) return "Account not found";
  
  switch (info.owner) {
    case "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA":
      return `SPL Token mint (standard, ~4,736 CU per transfer)`;
    
    case "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb":
      return `Token-2022 mint (extensions supported)`;
    
    default:
      return `Unknown program: ${info.owner}. May be a Pinocchio-based program. ` +
             `Check https://solscan.io/account/${mintAddress}`;
  }
}
```

## Explorer Integration

The `/agents/explorer` page has a PINOCCHIO / P-TOKEN tab with:
- Live account inspector (calls `inspectAccount` tRPC procedure)
- CU comparison table  
- Known program registry
- Links to Pinocchio ecosystem

The `/p` page has full documentation, code examples, and the account inspector tool.

## System Prompt Hint

For agents that receive a token mint address and need to classify it:

> "To check if a token uses p-token or Pinocchio, call `trpc.agents.metaplex.inspectAccount`
> with the mint address and compare the `owner` field against known SPL program IDs.
> If unknown, the token may be from a Pinocchio-based program — link to `/p` for details."
