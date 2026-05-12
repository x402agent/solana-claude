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

## Goblin Mode

Paper-only OpenAI orchestration path:

```bash
export OPENAI_API_KEY=...
npm run goblin
```

Toggles:

- `--goblin` switches the DECIDE phase into aggressive scalp mode.
- `--openai` uses OpenAI Responses API with `previous_response_id` chaining.
- `--computer-use` asks the model to emit a short operator action plan per tick.
- `--background` uses background Responses mode for longer decision turns.

Session continuity is stored in `ooda/journal/openai-goblin-session.json`.

## Publish flow

```bash
export NPM_TOKEN=...
npm run publish:npm
```

`install.solanaclawd.com` should serve [scripts/install.sh](/Users/8bit/bots/Cladwbot-solana/solana-clawd/scripts/install.sh:1) as its root response.
