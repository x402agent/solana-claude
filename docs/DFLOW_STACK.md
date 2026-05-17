# DFlow Stack Integration

This repo vendors DFlow agent skills and docs entrypoints for Solana spot trading, Kalshi prediction markets, Proof KYC, Phantom wallet apps, platform fees, and the DFlow Agent CLI.

## Local Assets

- Documentation index: `docs/dflow/llms.txt`
- Agent CLI docs: `docs/dflow/agent-cli.md`
- Agent Skills docs: `docs/dflow/agent-skills.md`
- Trading API OpenAPI spec: `docs/dflow/trading-api.openapi.json`
- DFlow docs routing skill: `skills/dflow-docs/SKILL.md`
- Official DFlow skill pack:
  - `skills/dflow-spot-trading/SKILL.md`
  - `skills/dflow-kalshi-trading/SKILL.md`
  - `skills/dflow-kalshi-market-scanner/SKILL.md`
  - `skills/dflow-kalshi-market-data/SKILL.md`
  - `skills/dflow-kalshi-portfolio/SKILL.md`
  - `skills/dflow-proof-kyc/SKILL.md`
  - `skills/dflow-platform-fees/SKILL.md`
- Phantom Connect app skill: `skills/dflow-phantom-connect/SKILL.md`
- Phantom wallet MCP skill: `skills/phantom-wallet-mcp/SKILL.md`

## Docs Discovery Rule

Always start with the complete docs index:

```bash
sed -n '1,220p' docs/dflow/llms.txt
```

Canonical remote:

```text
https://pond.dflow.net/llms.txt
```

Hosted DFlow docs MCP:

```text
https://pond.dflow.net/mcp
```

## Agent CLI

Install:

```bash
curl -fsS https://cli.dflow.net | sh
```

Configure:

```bash
dflow setup
```

Useful read-only checks:

```bash
dflow whoami
dflow positions
dflow guardrails show
```

Live execution commands such as `dflow trade` and `dflow send` move funds. Check guardrails first and require explicit operator intent.

## Refresh

```bash
curl -fsSL https://pond.dflow.net/llms.txt -o docs/dflow/llms.txt
curl -fsSL https://pond.dflow.net/ai/agent-cli.md -o docs/dflow/agent-cli.md
curl -fsSL https://pond.dflow.net/ai/agent-skills.md -o docs/dflow/agent-skills.md
curl -fsSL https://pond.dflow.net/build/trading-api/openapi.json -o docs/dflow/trading-api.openapi.json
npm run skills:catalog
```
