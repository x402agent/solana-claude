# Threat Model

## Assets

- GitHub repository contents and release artifacts
- GitHub Actions secrets and variables
- Birdeye API key
- `$CLAWD` token address configuration
- Build outputs and package artifacts
- Local wallet files created by development tools outside the repository

## Trust Boundaries

- GitHub Actions is trusted to run the release gate, but workflows use minimum required permissions.
- Birdeye is an external data provider; market data is treated as untrusted until parsed and validated.
- Local developer environments are untrusted for repository secrets. `.env` files are ignored and must not be committed.
- Nested reference projects are treated as separate packages with their own dependency and build surfaces.

## Primary Risks

| Risk | Control |
| --- | --- |
| Repeated releases after threshold | Stable `clawd-unlocked` tag and release existence check. |
| Workflow fails before gate check | Bun install uses the committed root `bun.lock`. |
| Malformed token address opens gate | Solana base58 shape validation. |
| Bad market-cap payload opens gate | Checker fails closed on missing, zero, negative, or unsuccessful payloads. |
| External API hang | Per-request timeout plus bounded retries. |
| Overbroad workflow token | Autonomous workflow uses `contents: write`; CI uses read-only contents. |
| Secret leakage | `.env*` ignored except examples; secrets documented as GitHub-only. |

## Non-Goals

DarkDefi does not provide custody, wallet recovery, trading execution guarantees, market manipulation defenses, token price guarantees, or profit expectations.

## Maintainer Checklist

- Keep branch protection enabled for `main`.
- Require CI and CodeQL before merge.
- Enable GitHub private vulnerability reporting.
- Rotate Birdeye keys if logs or local shells expose them.
- Review dependency updates before merging.
- Re-run the release gate locally with test credentials after changing `scripts/check-clawd-market-cap.mjs`.
