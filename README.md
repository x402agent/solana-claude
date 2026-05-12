# solana-clawd

Solana-native agent terminal and MCP server for hackathon demos, operator workflows, and viral onboarding.

## Install

One command:

```bash
curl -fsSL https://install.solanaclawd.com | bash
```

Or from npm:

```bash
npm install -g solana-clawd
clawd
```

## What ships

- `clawd` starts the HERMES terminal.
- `clawd mcp` starts the local MCP stdio server.
- `clawd mcp:http` starts the MCP HTTP server.
- `clawd doctor` verifies the install.

## Why it plays in a hackathon

- Terminal-first UX that looks demoable immediately.
- Solana-native positioning instead of a generic agent wrapper.
- MCP server included, so the same install works for local agent tooling.
- Simple adoption story: `curl`, `npm`, run.

## Local development

```bash
npm run setup
npm run hermes
```

## Publish flow

```bash
export NPM_TOKEN=...
npm run publish:npm
```

`install.solanaclawd.com` should serve [scripts/install.sh](/Users/8bit/bots/Cladwbot-solana/solana-clawd/scripts/install.sh:1) as its root response.
