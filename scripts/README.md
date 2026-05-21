# Scripts

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=9945FF&center=true&vCenter=true&width=900&lines=audit+%E2%86%92+build+%E2%86%92+catalog+%E2%86%92+smoke;repo+automation+for+safe+public+shipping" alt="Scripts animated header" />
</p>

`scripts/` contains repo automation for setup, cleanup, generated catalogs, P-token planning, program maps, and safety checks.

## Key Scripts

| Script | Purpose |
| --- | --- |
| [`repo-doctor.mjs`](./repo-doctor.mjs) | Main check/build harness used by `npm run check` and `npm run build`. |
| [`smoke-readme.mjs`](./smoke-readme.mjs) | README smoke-test path. |
| [`repo-hygiene-audit.sh`](./repo-hygiene-audit.sh) | Secret and generated artifact hygiene audit. |
| [`generate-skills-catalog.js`](./generate-skills-catalog.js) | Rebuilds the public skills catalog. |
| [`setup.sh`](./setup.sh) | One-shot local setup. |

## Smoke

```bash
npm run smoke:readme
npm run repo:audit
```
