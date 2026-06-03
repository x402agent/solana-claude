# DarkDefi Interoperability Contract

DarkDefi is designed as a narrow, composable release gate. External systems should integrate with it through explicit inputs, deterministic outputs, and auditable GitHub release artifacts.

## Public Inputs

| Input | Source | Required | Notes |
| --- | --- | --- | --- |
| `BIRDEYE_API_KEY` | GitHub Secret | Yes | Used only by the release workflow and local dry runs. |
| `CLAWD_TOKEN_ADDRESS` | GitHub Secret | Yes | Solana mint address for the gated asset. |
| `CLAWD_MARKET_CAP_TARGET` | GitHub Variable | No | Defaults to `100000`. Must be a positive number. |

## Release Output

When the gate opens, the workflow creates a single GitHub release:

- Tag: `clawd-unlocked`
- Source of truth: GitHub release metadata
- Data included: token address, Birdeye market cap, target, source field, timestamp

The stable tag prevents repeated scheduled releases after the threshold has been crossed.

## Local Dry Run

```bash
BIRDEYE_API_KEY=... \
CLAWD_TOKEN_ADDRESS=So11111111111111111111111111111111111111112 \
CLAWD_MARKET_CAP_TARGET=100000 \
node scripts/check-clawd-market-cap.mjs
```

The checker exits non-zero on missing secrets, malformed token addresses, invalid targets, unreachable Birdeye responses, unsuccessful Birdeye payloads, or unusable market-cap data.

## Web3 Integration Boundaries

DarkDefi intentionally does not custody funds, sign swaps, publish trading instructions, or infer profit expectations from market data. Integrators should treat the release as an automation checkpoint, not a trading signal.

Recommended downstream integration pattern:

1. Watch GitHub releases for the `clawd-unlocked` tag.
2. Validate the release notes against your own policy.
3. Re-query market data from your own trusted provider if value transfer is involved.
4. Require a human or multisig approval before treasury, deployer, or wallet actions.

## Compatibility

The repository keeps separate boundaries for the TUI, autonomous loop primitives, private deployment APIs, Solana program references, and package artifacts. Shared behavior should be connected by documented APIs, typed payloads, environment-configured endpoints, or release artifacts rather than hidden local state.
