# Apps

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=4285F4&center=true&vCenter=true&width=900&lines=desktop+surfaces+%E2%86%92+operator+tools+%E2%86%92+Solana+Clawd;macOS+app+entrypoints+for+local+control" alt="Apps animated header" />
</p>

`apps/` contains user-facing application shells that sit on top of the Clawd runtime.

## Contents

| Path | Purpose |
| --- | --- |
| [`macos/`](./macos/) | Swift/macOS menu bar app and local setup notes. |

## Smoke

```bash
npm run macos:swift:build
npm run macos:menubar:build
```

Use the Swift build first when validating a clean machine. The menu bar build expects the local macOS toolchain.
