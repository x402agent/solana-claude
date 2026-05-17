# 🦞 Lobster Library Development Guidelines

> The nano Solana financial trading, deep research, ML prediction market & agentic vision AI agent library.

## Project Overview

Lobster Library is a collection of `73` specialized AI agents for Solana DeFi, perpetuals, quantitative trading, payment routing, and autonomous market analysis. The current catalog is split into `48` core market/research agents plus `25` newer payment, x402, OpenClawd, NanoClawd, and NemoClawd agents. Built with TypeScript, deployed as static JSON via GitHub Pages.

### Agent Categories

- **Trading & DEX** — Jupiter, Drift, Raydium, MEV protection, arbitrage
- **ML & Prediction** — Price prediction, sentiment, anomaly detection, quant research
- **DeFi & Yield** — Yield optimization, liquid staking, lending strategies
- **Risk Management** — Portfolio VaR, position sizing, protocol risk
- **Deep Research** — Tokenomics, audits, whitepapers, narrative tracking
- **Infrastructure** — RPC, Anchor, bots, data pipelines
- **Agentic** — Multi-agent orchestration, autonomous trading
- **Payments** — x402 routing, wallet approvals, treasury float, settlement, provider catalogs

### Terminal Management

- **Always use background terminals** (`isBackground: true`) for every command
- **Always kill the terminal** after completion
- Do not reuse foreground shell sessions

## Contributing

- All agents must be Solana-specific (not generic crypto)
- Include actionable outputs (code, price levels, strategies)
- Always consider risk management
- Follow the existing JSON schema
- Test changes before submitting PRs
