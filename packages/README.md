# Packages

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=14F195&center=true&vCenter=true&width=900&lines=SDK+%E2%86%92+wallet+%E2%86%92+perps+%E2%86%92+aggregator+%E2%86%92+CLI;published+package+surface+for+Solana+Clawd" alt="Packages animated header" />
</p>

`packages/` contains the project-owned npm and protocol packages that make up the reusable Solana Clawd distribution.

## Package Map

| Path | Package |
| --- | --- |
| [`agentwallet/`](./agentwallet/) | Agent wallet vault server. |
| [`clawd/`](./clawd/) | Main Clawd runtime package. |
| [`clawd-perps/`](./clawd-perps/) | Perps agent package. |
| [`clawd-perps-aggregator/`](./clawd-perps-aggregator/) | Multi-venue perps routing package. |
| [`clawd-protocol/`](./clawd-protocol/) | Rust/Anchor protocol package. |
| [`clawd-sdk/`](./clawd-sdk/) | TypeScript SDK package. |
| [`clawd-wallet/`](./clawd-wallet/) | Wallet helper package. |
| [`cli-standalone/`](./cli-standalone/) | Standalone CLI build. |

## Smoke

```bash
npm run packages:install
npm run packages:build
npm run clawd-perps-aggregator:typecheck
```
