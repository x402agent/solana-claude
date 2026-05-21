# Clawd CLI

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=9945FF&center=true&vCenter=true&width=900&lines=register+%E2%86%92+connect+%E2%86%92+operate;thin+CLI+wrappers+for+Solana+Clawd+entrypoints" alt="Clawd CLI animated header" />
</p>

`clawdcli/` contains lightweight shell and TypeScript launchers for registration, OpenClawd configuration, and local CLI connection flows.

## Commands

```bash
bash clawdcli/clawd-cli.sh --help
bash clawdcli/clawd-connect.sh --help
node --import tsx/esm clawdcli/clawd-register.ts
```

The JSON files in this folder are public registration/config templates. Keep live credentials in ignored `.env` files or local secret stores.
