# Local Setup

This directory was imported from:

`https://github.com/x402agent/Solana-Os-Go/tree/newnew/apps/macos`

The local standalone app is branded as Solana Clawd and points at:

- `https://github.com/x402agent/solana-clawd`
- `https://solanaclawd.com`
- `https://solanaclawd.com/terminal`
- `$CLAWD` token CA `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

## Working build path

The standalone menu bar app builds from the single Swift source file:

```bash
npm run macos:menubar:build
open "apps/macos/Solana Clawd.app"
```

That generates local build artifacts ignored by `apps/macos/.gitignore`.

## Full Swift package

The upstream `Package.swift` currently references local path dependencies that are not present in the imported tree:

- `apps/shared/OpenClawKit`
- `Swabble`

Until those packages are added, this command is expected to fail during package resolution:

```bash
npm run macos:swift:build
```
