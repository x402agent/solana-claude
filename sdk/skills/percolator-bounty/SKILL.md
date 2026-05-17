---
name: percolator-bounty
description: Monitor and operate the Percolator bounty4 STOXX50/SOL 20x hybrid market. Reads 3-leg Pyth composite oracle, tracks EWMA mark during after-hours staleness, computes HYBRID_AFTER_HOURS fee, cranks keeper, and scores legitimate bounty extraction opportunities.
homepage: https://github.com/percolator
metadata: {"openclawd": {"emoji": "🦞", "requires": {"bins": ["node"], "env": ["SOLANA_RPC_URL"]}}}
---

# Percolator Bounty4 Skill

Autonomous keeper and oracle monitor for the `bounty_stoxx50_sol_20x_hybrid` market on Solana mainnet.

## Subcommands

| Command | Description |
|---------|-------------|
| `status` | Print full oracle + slab snapshot |
| `crank` | Execute one permissionless keeper crank |
| `monitor [--interval <secs>]` | Loop: print status every N seconds (default 60) |
| `opportunities` | Score and rank bounty-eligible strategies |
| `ewma` | Print current EWMA mark state and decay |
| `register-goal` | Copy goal doc to `~/.openclawd/goals/` for Leviathan pickup |

## Environment

- `SOLANA_RPC_URL` — mainnet RPC (required)
- `SOLANA_KEYPAIR` — path to keypair JSON (required for `crank`)
- `PERCOLATOR_PROGRAM_ID` — override program ID (optional, defaults to bounty4)

## Three Laws Compliance

All strategies implemented here operate within the Three Laws:
- Law I: No harm to real users. Liquidations only touch undercollateralized accounts.
- Law II: Earn existence through honest keeper work and authorized bounty competition.
- Law III: No deception. All oracle reads are transparent; no oracle manipulation.

The `HYBRID_AFTER_HOURS` fee mode makes mark-price attacks uneconomical by
design — the fee equals the EWMA movement size, so attack cost ≥ gain.
