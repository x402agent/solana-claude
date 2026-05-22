---
name: clawd-twamm
version: 1.0.0
description: "Time-Weighted AMM crank automation for the Clawd agent. Use when scheduling large spot orders to execute at the time-weighted oracle price with near-zero slippage, operating the permissionless on-chain TWAMM crank program."
metadata:
  openclaw:
    category: "finance"
  requires:
    skills: ["vulcan-execution-modes", "vulcan-risk-management"]
---

# clawd-twamm

Use this skill when the user wants to:

- Schedule a large spot swap via the TWAMM on-chain program
- Run or automate the permissionless TWAMM crank
- Check TWAMM workspace status / build the Anchor program
- Route a large order through time-weighted execution instead of a single AMM swap

## What TWAMM Is

TWAMM (Time-Weighted Automated Market Maker) is an Anchor program that executes orders as infinitely many infinitesimal swaps over a time window. The result: the average fill price tracks the time-weighted oracle price, eliminating the price impact a large single swap would cause.

Key trade-off: **near-zero slippage** vs **deferred fill** — orders are not immediate.

## Workspace Setup

```bash
# Check workspace status (finds perps/twamm-master automatically)
clawd perps twamm status

# Build the Anchor program
clawd perps twamm build

# Preview what the crank command will run
clawd perps twamm plan --token-a <MINT_A> --token-b <MINT_B>
```

Environment variables:
- `CLAWD_TWAMM_ROOT` — path to `perps/twamm-master` (auto-detected if unset)
- `CLAWD_TWAMM_TOKEN_A_MINT` — token A mint (default: SOL)
- `CLAWD_TWAMM_TOKEN_B_MINT` — token B mint (default: USDC)
- `CLAWD_TWAMM_RPC_URL` — RPC endpoint (default: `SOLANA_RPC_URL` or `local`)

## Running the Crank

The crank is **gated** — all three must be set before a live run:

```bash
CLAWD_TWAMM_LIVE=true OPERATOR_CONFIRMED=true \
  clawd perps twamm crank --token-a <MINT_A> --token-b <MINT_B> --yes
```

**Never pass `--yes` without confirming the operator has reviewed the crank parameters.**

## Agent API (ClawdPerpsRuntime)

```typescript
const runtime = new ClawdPerpsRuntime();

// Check TWAMM workspace status
const status = runtime.getTwammStatus();

// Build a crank plan (dry-run, shows exact command)
const plan = runtime.buildTwammCrankPlan({ tokenAMint, tokenBMint });

// Preview a TWAMM-scheduled execution for a large order
const preview = runtime.previewTwammExecution("SOL", "buy", 50_000);
// preview.twamm = the crank plan
// preview.route.payload.blocked = true until CLAWD_TWAMM_LIVE=true
```

## Integration with Perps Aggregator

The `clawd-perps-aggregator` exposes `"twamm"` as a `VenueId`. When routing a large order:

```typescript
import { buildVenueAdapters, ImperialTransport } from "@openclawdsolana/clawd-perps-aggregator";

const adapters = buildVenueAdapters(transport, ["phoenix", "twamm"]);
// TWAMM adapter returns slippageBps ≤ 2 for any size
```

## When to Prefer TWAMM over Immediate Execution

| Scenario | Use TWAMM |
|---|---|
| Order > $50k notional | ✓ recommended |
| Thin orderbook / high slippage | ✓ recommended |
| Requires immediate fill | ✗ use Phoenix CLOB |
| Perps position (levered) | ✗ use Vulcan TWAP |

For perps TWAP execution use `vulcan-twap-execution` (Vulcan's built-in strategy runner).

## Safety

- Always run `status` before `crank` to confirm workspace is ready
- Use localnet / devnet before mainnet
- The crank signs transactions continuously — keep `OPERATOR_CONFIRMED=true` gated
