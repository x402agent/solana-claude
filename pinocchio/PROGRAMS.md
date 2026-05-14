# Known Pinocchio Programs

This document lists known programs built with or related to Pinocchio, used by CLAWD agents for account classification.

## Canonical SPL Programs (NOT Pinocchio)

These are well-known programs built on `solana-program`. An account owned by these is standard, not Pinocchio.

```json
{
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": {
    "name": "SPL Token",
    "kind": "spl",
    "description": "Canonical fungible token program. Borsh deserialization. Baseline CU.",
    "cuNote": "Transfer: ~4,736 CU"
  },
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": {
    "name": "Token-2022 (Token Extensions)",
    "kind": "token22",
    "description": "Extended token program: metadata pointer, confidential transfers, transfer hooks, etc.",
    "cuNote": "Slightly higher CU than SPL Token"
  },
  "11111111111111111111111111111111": {
    "name": "System Program",
    "kind": "system",
    "description": "Core Solana system program — CreateAccount, Transfer SOL, Assign.",
    "cuNote": "N/A"
  },
  "BPFLoaderUpgradeab1e11111111111111111111111": {
    "name": "BPF Loader (upgradeable)",
    "kind": "loader",
    "description": "Upgradeable program loader. Owner of all deployed program accounts.",
    "cuNote": "N/A"
  },
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8bXV": {
    "name": "Associated Token Account Program",
    "kind": "ata",
    "description": "Derives and creates associated token accounts.",
    "cuNote": "N/A"
  }
}
```

## Pinocchio-Based Programs

These programs are built with Pinocchio. An account owned by one of these benefits from zero-copy efficiency.

```json
{
  "p-token": {
    "name": "p-token",
    "status": "active-development",
    "description": "Pinocchio replacement for SPL Token. 75–90% CU reduction per instruction. Unaudited.",
    "github": "https://github.com/febo/p-token",
    "mainnetAddress": "TBD — check github.com/febo/p-token for latest deployment",
    "cuNote": "Transfer: ~1,188 CU vs 4,736 SPL (−75%)"
  }
}
```

## Classification Logic for Agents

When inspecting an account's `owner` field:

1. **Match against canonical programs** → label with program name
2. **Match against pinocchio programs** → label as Pinocchio program + show CU stats
3. **Unknown owner** → label as "Unknown Program (possible Pinocchio/custom)" and link to Solscan
4. **owner == address** → self-owned program account (BPF program data)
5. **BPFLoaderUpgradeab1e11111111111111111111111** → deployed program, check `programData` account

## Detecting p-token Mints vs SPL Token Mints

The simplest check is the owner field:
- `owner == TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` → SPL Token mint
- `owner == TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` → Token-2022 mint
- `owner == <p-token program id>` → p-token mint (once stable address is known)

For Token-2022, check byte 165 of account data to distinguish Mint (0x01) from TokenAccount (0x02).
