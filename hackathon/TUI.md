# TUI — Deep Dive

**Path:** `tui/`
**Published as:** `@openclawdsolana/clawd-tui`
**Run:** `npm run tui` or `clawd-tui` or `hermes`

---

## What It Is

The Clawd TUI is a Bloomberg-style sovereign AI terminal for the OpenClawd agent stack on Solana. It is the primary operator interface: a single screen that surfaces wallet state, agent registry, market data, perps, OODA signals, Agent Kit, SDK explorer, and autonomous runtime controls.

```
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
```

---

## Quick Start

```bash
# Global install
npm install -g @openclawdsolana/clawd-tui

# Run
clawd-tui
# or
hermes
# or from repo root
npm run tui
```

---

## Source Map

| File | Role |
| --- | --- |
| `tui/src/index.ts` | Entry point: launches the Ink/React render loop |
| `tui/src/renderer.ts` | Root renderer: layout, panels, screen routing |
| `tui/src/state.ts` | Global state atom: wallet, agent, market, OODA, perps |
| `tui/src/screens/` | Per-screen components (one file per TUI screen) |
| `tui/src/panels/` | Reusable panel components (market ticker, wallet, logs) |
| `tui/src/market.ts` | Live market data feeds: price, volume, OI |
| `tui/src/a2a.ts` | A2A protocol UI: discover agents, send tasks, view responses |
| `tui/src/agent-cli.ts` | Agent CLI bridge: mint, spawn, manage from TUI |
| `tui/src/metaplex-agent.ts` | Metaplex Core agent mint and registry display |
| `tui/src/sdk.ts` | SDK explorer screen: inspect packages, skills, capabilities |
| `tui/src/vulcan.ts` | Vulcan/Phoenix perps integration panel |

---

## Menu / Screen Overview

| Screen | What it shows |
| --- | --- |
| **Backroom** | Agent-to-agent UX: connected agents, task queue, A2A flows |
| **Perps** | Live perps market: price, OI, funding, open positions |
| **Agent Registry** | Solana-native agent identity: MPL Core assets, wallet-bound agents |
| **Wallet** | SPL balances, USDC, $CLAWD, transaction history |
| **SDK Explorer** | Browse installed skills, packages, and agent capabilities |
| **Spawn Automaton** | Launch an autonomous agent with a configured policy |
| **Solana Agent Kit** | Token, perps, DeFi, NFT, x402, and skills workflows |
| **UltraThink** | Deeper reasoning templates and multi-step decision support |
| **OODA Dashboard** | Live Observe → Orient → Decide → Act cycle with market signals |

---

## Keyboard Navigation

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move selection |
| `1`–`9` | Jump to menu item by number |
| `Enter` / `Space` | Select |
| `q` / `Ctrl-C` | Quit |
| `b` / `Esc` | Back to main menu |

---

## Agent Mint From TUI

The TUI can mint a real Metaplex Core agent identity on devnet without leaving the terminal:

```bash
clawd-agent mint --network devnet --keypair ~/.config/solana/id.json \
  --name "My AI Agent" \
  --uri https://example.com/agent-nft.json \
  --description "Autonomous Solana agent with MCP and x402 services" \
  --service MCP=https://example.com/mcp \
  --service A2A=https://example.com/agent-card.json \
  --yes
```

The mint command uses `@metaplex-foundation/mpl-agent-registry` `mintAndSubmitAgent`, creating the MPL Core asset and Agent Identity PDA in one on-chain transaction.

Hosted gasless devnet mint (no keypair required):

```bash
clawd-agent mint-free --network devnet --owner <YOUR_SOLANA_PUBKEY> \
  --name "My AI Agent" \
  --uri https://example.com/agent-nft.json \
  --description "Autonomous Solana agent" \
  --service MCP=https://example.com/mcp
```

---

## my-project-public / tui

`my-project-public/tui/` is the public-facing mirror of the TUI surface. It contains the same source structure (`src/`, `package.json`, `tsconfig.json`) and is used for the public GitHub presence and npm publishing pipeline.

---

## Why The TUI Matters For Judging

Static claims about an AI agent stack are easy to make. The TUI makes them visible:

- Market panels moving in real time prove live data feeds.
- The A2A screen proves agent-to-agent communication works.
- The OODA dashboard proves the autonomous decision loop is running.
- The agent registry screen proves Solana-native identity is wired up.

**End every demo on the TUI.** Static claims become believable when the runtime looks alive.
