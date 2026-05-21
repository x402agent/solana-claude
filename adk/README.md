<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,20:174ea6,45:4285F4,70:34A853,100:05060d&height=230&section=header&text=OpenClawd%20Google%20ADK&fontSize=44&fontColor=ffffff&animation=twinkling&fontAlignY=38&desc=Private%20registry%20tools%20for%20governed%20agent%20routing&descAlignY=60&descSize=16" alt="OpenClawd Google ADK" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=18&duration=1700&pause=350&color=34A853&center=true&vCenter=true&width=900&lines=ADK+LlmAgent+%2B+FunctionTools;private+destinations+%2B+registry+coverage;135+installed+catalog+agents+discoverable;unsigned+swap+prep+only+%E2%80%94+wallet+signing+stays+outside+the+model" alt="ADK capabilities" />

</div>

---

# OpenClawd Google ADK Agent

This is the private TypeScript ADK entrypoint for the OpenClawd registry and agent catalog. It exports `rootAgent` from [`agent.ts`](./agent.ts), following the ADK TypeScript `LlmAgent` + `FunctionTool` pattern.

## What It Connects

| Surface | Status |
| --- | --- |
| Google ADK TypeScript | `@google/adk` `LlmAgent` entrypoint |
| Clawd agent catalog | Reads `agents/agents-catalog.json` |
| Installed agent registry | Reads all `agents/src/*.json` source-backed agents |
| Private destinations | Publishes the nine x402.wtf gateway/catalog destinations |
| Solana market data | Uses Jupiter read endpoints |
| Swaps | Prepares unsigned Jupiter swap payloads only |

The gateway-side manifest is available at:

```text
GET /adk/manifest.json
```

It reports private mode, destination URLs, catalog counts, and any source/catalog mismatches.

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

For a local Express API server:

```bash
cd adk
npm run api
```

## Private Wiring

The agent exports `rootAgent` from `agent.ts` and uses multiple ADK `FunctionTool`s for:

- agent catalog and registry coverage
- private destination discovery
- token search and price lookup
- unsigned Jupiter swap preparation for wallet review

Real secrets belong in `adk/.env` or the shell. Do not commit RPC URLs, API keys, wallet keys, or bot tokens.

Use [`adk/.env.example`](./.env.example) as the non-secret template.

## Gateway Contract

The ADK agent is designed to sit behind the private gateway documented in [`../gateway/README.md`](../gateway/README.md).

| ADK tool | Gateway policy intent |
| --- | --- |
| `get_agent_catalog_stats` | safe read-only registry coverage check |
| `search_agent_catalog` | safe read-only discovery over installed agents |
| `get_private_destinations` | controlled disclosure of governed destination labels and URLs |
| `get_token_price` | public market metadata lookup |
| `get_token_search` | public token metadata lookup |
| `prepare_jupiter_swap` | unsigned transaction preparation only; wallet signing stays outside the model |

Production deployments should restrict MCP `tools/call` to the exact tool names required for the workflow and should route sensitive traffic through IAP, Model Armor, or a custom authorization extension before it reaches private destinations.
