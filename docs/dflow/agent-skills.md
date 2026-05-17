> ## Documentation Index
> Fetch the complete documentation index at: https://pond.dflow.net/llms.txt
> Use this file to discover all available pages before exploring further.

# Agent Skills

> Pre-built Claude Code Skills for DFlow

[Claude Code Skills](https://docs.claude.com/en/docs/claude-code/skills) are focused recipes that teach AI agents how to use a given tool or API. We publish two skills repositories, each for a different use case.

## DFlow Skills

For agents driving the [Agent CLI](/ai/agent-cli) or [Trading API](/build/trading-api/introduction) directly.

```bash theme={null}
npx skills add DFlowProtocol/dflow-skills
```

Includes the following skills:

| Skill                                                                                                                                | Description                                                                            |
| :----------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| [`dflow-spot-trading`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-spot-trading/SKILL.md)                   | Swap any pair of Solana tokens via the DFlow CLI or Trading API.                       |
| [`dflow-kalshi-trading`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-kalshi-trading/SKILL.md)               | Buy, sell, and redeem YES/NO outcome tokens on Kalshi prediction markets.              |
| [`dflow-kalshi-market-scanner`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-kalshi-market-scanner/SKILL.md) | Discover and filter Kalshi events, markets, series, tags, and historical candlesticks. |
| [`dflow-kalshi-market-data`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-kalshi-market-data/SKILL.md)       | Real-time orderbook, trade, and live-data streams for Kalshi markets.                  |
| [`dflow-kalshi-portfolio`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-kalshi-portfolio/SKILL.md)           | View open positions, unrealized P\&L, and reclaim rent from empty outcome accounts.    |
| [`dflow-proof-kyc`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-proof-kyc/SKILL.md)                         | Integrate Proof identity verification so wallets can buy on Kalshi.                    |
| [`dflow-platform-fees`](https://github.com/DFlowProtocol/dflow-skills/blob/main/skills/dflow-platform-fees/SKILL.md)                 | Take a builder cut on swaps and PM trades (`platformFeeBps`, `platformFeeScale`).      |

## Phantom Connect Skill

For full-stack web apps. Teaches Claude [Phantom's](https://phantom.app) wallet SDKs alongside DFlow's trading and Kalshi prediction market APIs. Covers wallet connection, transaction signing, token swaps, prediction markets, and KYC verification.

```bash theme={null}
npx skills add https://github.com/DFlowProtocol/dflow_phantom-connect-skill
```

<div className="contact-us-section mt-12 border-t border-zinc-200 pt-3 dark:border-zinc-800">
  <h2 className="mt-12 mb-2 text-2xl font-semibold">Need Help?</h2>

  <CardGroup cols={2}>
    <Card title="Join Our Discord" href="https://discord.gg/dflow" icon="https://mintcdn.com/dflow/a8Yx7HBusmKl4Z7w/images/meteor-icons_discord.svg?fit=max&auto=format&n=a8Yx7HBusmKl4Z7w&q=85&s=0ea834bc8a9fa3fe161ba181329effda" arrow width="24" height="24" data-path="images/meteor-icons_discord.svg">
      Connect with other developers, get help, and stay updated on the latest
      DFlow developments.
    </Card>

    <Card title="Dev Notifications" href="https://t.me/+GubbVyulzDFjZTkx" icon="https://mintcdn.com/dflow/a8Yx7HBusmKl4Z7w/images/meteor-icons_telegram.svg?fit=max&auto=format&n=a8Yx7HBusmKl4Z7w&q=85&s=e928c5dd68311ff0d419936a35c86eed" arrow width="24" height="24" data-path="images/meteor-icons_telegram.svg">
      Join the DFlow Dev Notifications Telegram group to stay in the loop on
      new features and other announcements.
    </Card>
  </CardGroup>
</div>
