## Truand Fleet

This package provisions a new autonomous agent breed for the OpenClawd store:
the **truand**.

A truand is a keep-alive sandbox agent that:

- runs inside an Upstash Box with Codex as the built-in agent harness
- earns USDC by servicing an x402-priced merchant lane
- carries `$CLAWD` utility through rebates, routing priority, and treasury flywheel metadata
- stores fleet branch metadata against a Neon project
- is designed to run 24/7/365 in isolated sandboxes

### Secrets

Use an untracked `.env.local` or shell environment variables. Do not commit:

- `UPSTASH_BOX_API_KEY`
- `OPENAI_API_KEY`
- `NEON_API_KEY`

### Commands

```bash
npm --prefix payments/agent-store/truand install
npm --prefix payments/agent-store/truand run plan
npm --prefix payments/agent-store/truand run manifest
npm --prefix payments/agent-store/truand run provision
```

`plan` and `manifest` are local-only. `provision` performs live API calls to Upstash Box and Neon.

### What it creates

- a `generated/truand-fleet.json` blueprint
- one keep-alive Upstash Box per agent lane
- one scheduled Codex agent loop per box
- one Neon branch record per fleet deployment
- one authenticated public URL per truand service, when supported
