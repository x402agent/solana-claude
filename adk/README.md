# OpenClawd Google ADK Agent

This is the private TypeScript ADK entrypoint for the OpenClawd registry and agent catalog.

## Run

```bash
cd adk
npm run check
npm run run
```

For the ADK dev UI:

```bash
cd adk
npm run web
```

## Private Wiring

The agent exports `rootAgent` from `agent.ts` and uses multiple ADK `FunctionTool`s for:

- agent catalog and registry coverage
- private destination discovery
- token search and price lookup
- unsigned Jupiter swap preparation for wallet review

Real secrets belong in `adk/.env` or the shell. Do not commit RPC URLs, API keys, wallet keys, or bot tokens.
