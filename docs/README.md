# Docs

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=4285F4&center=true&vCenter=true&width=900&lines=architecture+%E2%86%92+risk+%E2%86%92+demos+%E2%86%92+maps;operator+documentation+for+the+whole+repo" alt="Docs animated header" />
</p>

`docs/` contains long-form architecture, migration, risk, dFlow, and launch documentation that supports the root README and hackathon guide.

## Recommended Reading

| File | Purpose |
| --- | --- |
| [`REPO_MAP.md`](./REPO_MAP.md) | Repository map and ownership boundaries. |
| [`architecture.md`](./architecture.md) | System architecture. |
| [`DFLOW_STACK.md`](./DFLOW_STACK.md) | dFlow integration notes. |
| [`PTOKEN_LAUNCHPAD.md`](./PTOKEN_LAUNCHPAD.md) | P-token launchpad guide. |
| [`risk-engine-spec.md`](./risk-engine-spec.md) | Risk engine specification. |

## Smoke

```bash
find docs -maxdepth 2 -type f -name '*.md' | sort
npm run smoke:readme
```
