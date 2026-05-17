# 🦞 Contributing to Lobster Library

Thank you for contributing to the nano Solana financial trading agent library!

## Quick Submit

1. **Fork this repository**
2. **Create your agent** in `src/solana-your-agent.json`
3. **Submit a Pull Request**

## Agent Requirements

- ✅ **Solana-specific** — Must be specific to Solana, not generic crypto
- ✅ **Actionable outputs** — Include code snippets, price levels, strategies
- ✅ **Risk-aware** — Always include risk considerations
- ✅ **Data-source aware** — Reference APIs (Birdeye, Helius, Jupiter, etc.)
- ✅ **Well-tested** — Verified functionality before submission

## Agent Categories

Your agent must fit one of these categories:

- `trading` — DEX trading, spot, perpetuals, execution
- `defi` — Yield, lending, staking, liquidity
- `ml-prediction` — Machine learning, sentiment, forecasting
- `risk-management` — Portfolio risk, position sizing
- `deep-research` — Tokenomics, audits, narratives
- `technical-analysis` — Charts, indicators, patterns
- `infrastructure` — RPC, bots, pipelines, Anchor
- `strategies` — Memecoins, airdrops, NFTs, market making
- `macro` — Economics, regulation, forensics
- `agentic` — Multi-agent orchestration, autonomous systems

## Schema

Follow the JSON schema in `schema/speraxAgentSchema_v1.json`. All agents must include `author`, `config.systemRole`, `identifier`, and `meta` fields.
