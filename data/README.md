# Data

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=FFD166&center=true&vCenter=true&width=900&lines=public+maps+%E2%86%92+templates+%E2%86%92+registry+inputs;no+secrets%2C+no+wallets%2C+no+private+keys" alt="Data animated header" />
</p>

`data/` holds public JSON maps used by scripts and docs. It should not contain live wallets, private RPC keys, API tokens, or local session output.

## Files

| File | Purpose |
| --- | --- |
| [`programs-map.json`](./programs-map.json) | Solana program inventory input. |
| [`pinocchio-programs.json`](./pinocchio-programs.json) | Pinocchio template/program map. |
| [`ptokens.json`](./ptokens.json) | P-token explorer data. |

## Smoke

```bash
node -e "for (const f of ['data/programs-map.json','data/pinocchio-programs.json','data/ptokens.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"
npm run programs:map
```
