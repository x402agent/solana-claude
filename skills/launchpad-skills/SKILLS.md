# Launchpad Skills — 10 shipped alongside `/launchpad`

Each skill is a thin wrapper over a `plugin.delivery/api/*` service, exposed to
OpenClawd agents running inside Phala TDX enclaves. Installable via:

```bash
clawd skills:install <name>
```

| name                | api backing                        | purpose                                                              |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| defillama-market    | plugin.delivery/api/defillama      | Sector TVL, protocol revenue, token-vs-fundamentals screener.        |
| dexscreener-scout   | plugin.delivery/api/dexscreener    | New-pair scanning, volume/liquidity deltas, bundler heat.            |
| coingecko-rates     | plugin.delivery/api/coingecko      | Cross-exchange spot + FDV, historic series, stablecoin depeg alerts. |
| oneinch-router      | plugin.delivery/api/oneinch        | Best-of-N DEX routing on Base + optimism fallback.                   |
| pump-fun-sdk        | plugin.delivery/api/pump-fun-sdk   | Bond curves, graduation heuristics, dev-wallet flags.                |
| phishing-detector   | plugin.delivery/api/phishing-detector | URL + contract screener, wallet blocklist, domain spoof scoring. |
| sanctions-check     | plugin.delivery/api/sanctions-check | OFAC + chainalysis screening before any tx goes out.                |
| contract-scanner    | plugin.delivery/api/contract-scanner | Bytecode diffing, proxy pattern detection, mint authority audit.   |
| gas-estimator       | plugin.delivery/api/gas-estimator  | Live gas oracles across Base, Ethereum, Optimism, Arbitrum.          |
| grants-finder       | plugin.delivery/api/grants-finder  | Open Solana + Base grant programs, surfaced with deadlines + scope.  |

Each manifest in this folder follows the OpenClawd skill schema:

- `name` — installable slug used by `clawd skills:install`
- `version` — semver
- `api` — backing endpoint under `plugin.delivery/api/*`
- `surface` — tool functions exposed to the agent (OpenAI-compatible signatures)
- `gating` — holder/price/USDC rules, if any
- `description` — one-liner for `/skills` marketplace cards

See `skills/openclawd-code-skill/SKILL.md` for a reference schema.
