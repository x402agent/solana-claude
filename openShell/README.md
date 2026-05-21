# OpenShell

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=4285F4&center=true&vCenter=true&width=900&lines=policy+%E2%86%92+provider+%E2%86%92+vault+%E2%86%92+sandbox;OpenShell+adapter+surface+for+controlled+agent+execution" alt="OpenShell animated header" />
</p>

`openShell/` contains adapter code and policy stubs for controlled execution through OpenShell-style providers and vault surfaces.

## Contents

| File | Purpose |
| --- | --- |
| [`manifest.yaml`](./manifest.yaml) | Capability manifest. |
| [`provider.ts`](./provider.ts) | Provider adapter. |
| [`vault.ts`](./vault.ts) | Vault integration surface. |
| [`policy/`](./policy/) | Rego policies for filesystem and network access. |

## Smoke

```bash
npx tsc --noEmit --allowJs false openShell/provider.ts openShell/vault.ts openShell/nemo.ts
```
