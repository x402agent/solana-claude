# 🦞 Solana Clawd TUI

> Sovereign AI Lobster Runtime — Bloomberg-style terminal for the OpenClawd agent stack on Solana.

```
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
```

**$CLAWD CA:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`  
**Site:** [x402.wtf](https://x402.wtf) · [solanaclawd.com](https://solanaclawd.com)

---

## Quick Start

### 1. Install dependencies

```bash
cd tui
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Run the TUI

```bash
npm start
# or during development:
npm run dev
```

You can also invoke via the global bin aliases after linking:

```bash
clawd-tui
# or
hermes
```

---

## Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection up/down |
| `1`–`7` | Jump to menu item by number |
| `Enter` / `Space` | Select highlighted item |
| `q` / `Ctrl-C` | Quit |
| `b` / `Esc` | Back to main menu (from any sub-screen) |

---

## Menu Overview

| # | Screen | Description |
|---|--------|-------------|
| 1 | 🦞 Backroom | Two AI agents trapped in infinite debate |
| 2 | 📈 Perps | Phoenix perpetuals via Vulcan CLI |
| 3 | 🪪 Agent Registry | Browse, mint, and register gasless Solana agents |
| 4 | 💰 Wallet | Fund + feed the leviathan |
| 5 | 🚀 Spawn Automaton | Launch the sovereign OODA agent runtime |
| **6** | **🧰 Solana Agent Kit** | **Complete toolkit — token · perps · DeFi · NFT · x402 · skills** |
| **7** | **🧠 UltraThink** | **Deep-reasoning Solana formula — depth ladder · antipatterns · templates** |
| 8 | ❌ Exit | The backroom will remember you |

---

## 🧰 Solana Agent Kit — Step-by-Step Guide

The Agent Kit is the main hub for everything you can do with OpenClawd on Solana.  
It is organized into **7 categories** and **6+ commands per category**.

### How to use the Agent Kit screen

1. Press **`6`** on the main menu to open the Agent Kit.
2. Use **`Tab`** or **`←`/`→`** arrow keys to switch categories (left panel).
3. Use **`↑`/`↓`** to highlight a command (right panel).
4. Press **`c`** to copy the highlighted command to your clipboard.
5. Press **`e`** to display the environment variables required by that command.
6. Press **`b`** or **`Esc`** to return to the main menu.

---

### Category 1 — 🚀 Token Operations

Everything needed to launch and manage SPL tokens, Token-2022, and Metaplex metadata.

| Command | Risk | What it does |
|---------|------|--------------|
| Pump.fun launch | MED | Deploy token on pump.fun bonding curve |
| Token-2022 create | SAFE | Create Token-2022 with transfer-fee extension |
| Metaplex metadata | SAFE | Set on-chain MPL metadata for any mint |
| Raydium CLMM pool | HIGH | Initialize a Raydium CLMM liquidity pool |
| Pump.fun screener | SAFE | Real-time screen of new pump.fun launches |
| Mint auth check | SAFE | Verify mint/freeze authority and rug signals |

**Required env:** `SOLANA_RPC_URL`, `CLAWD_PERPS_WALLET`, `HELIUS_API_KEY`

---

### Category 2 — 📈 Trading / Perps

Phoenix perpetuals via `clawd-agents-perps` + Jupiter spot swaps.

| Command | Risk | What it does |
|---------|------|--------------|
| Perps status | SAFE | Live Phoenix market status + risk config |
| Paper long SOL | SAFE | Simulated $100 long SOL-PERP (no real funds) |
| Paper short SOL | SAFE | Simulated $100 short SOL-PERP (no real funds) |
| Live long (Vulcan) | HIGH | Real on-chain long via Vulcan CLI |
| TWAP execution | HIGH | Time-weighted average price over 2h |
| Jupiter spot swap | MED | Best-route spot swap via Jupiter Aggregator |
| Perps frontend | SAFE | Render perps dashboard as JSON |
| Vulcan catalog | SAFE | Show Vulcan CLI command catalog summary |

**Required env:** `SOLANA_RPC_URL`, `CLAWD_PERPS_API_URL`, `CLAWD_PERPS_WALLET`  
**Live trading:** also set `LIVE_TRADING=true` and `OPERATOR_CONFIRMED=true`

#### Setup for clawd-agents-perps

```bash
cd Perps/clawd-agents-perps
cp .env.example .env
# Edit .env: set SOLANA_RPC_URL, HELIUS_API_KEY, CLAWD_PERPS_WALLET
npm install && npm run build

# Paper mode (safe — no real funds):
clawd-agents-perps status
clawd-agents-perps paper-long SOL --notional 100

# Live mode (real funds — confirm you understand the risks):
# Set LIVE_TRADING=true and OPERATOR_CONFIRMED=true in .env first
clawd-agents-perps live-long SOL --notional 100 --leverage 2
```

---

### Category 3 — 💰 DeFi / Yield

Kamino, Marginfi, Meteora DLMM, and yield optimization.

| Command | Risk | What it does |
|---------|------|--------------|
| Scan best APY | SAFE | Find highest-yielding protocols |
| Kamino deposit | MED | Deposit into optimal Kamino vault |
| Marginfi lend | MED | Supply to Marginfi lending pool |
| Meteora DLMM LP | HIGH | Add liquidity to Meteora DLMM |
| IL calculator | SAFE | Calculate impermanent loss for LP |
| Yield optimizer | MED | Auto-rebalance across protocols |

**Required env:** `SOLANA_RPC_URL`, `CLAWD_PERPS_WALLET`, `HELIUS_API_KEY`

---

### Category 4 — 🎨 NFT / Metaplex

MPL Core minting, gasless agent NFTs, SAS attestations, staking.

| Command | Risk | What it does |
|---------|------|--------------|
| Gasless agent mint | SAFE | Mint MPL Core agent NFT (platform pays SOL fees) |
| MPL Core collection | MED | Create Metaplex Core collection |
| Stake agent NFT | MED | Stake MPL Core NFT for CLAWD rewards |
| SAS attestation | MED | Issue Solana Attestation Service cert |
| Browse registry | SAFE | Count live agents in registry |
| NFT floor snipe | HIGH | Auto-buy below floor on Tensor |

**Gasless mint — no wallet needed:**

```bash
curl -X POST https://x402.wtf/api/mint/agent \
  -H 'Content-Type: application/json' \
  -d '{"agentId":1,"ownerPubkey":"<YOUR_SOLANA_PUBKEY>","network":"mainnet"}'
```

---

### Category 5 — ⚡ x402 / Payments

USDC HTTP-402 payment rails, pay-per-call providers, CLAWD balance.

| Command | Risk | What it does |
|---------|------|--------------|
| Check balance | SAFE | Show USDC + CLAWD agent wallet balance |
| Fund wallet | MED | Fund with 10 USDC via x402 rails |
| Browse pay catalog | SAFE | List top pay-per-call providers |
| x402 test call | SAFE | Test a live x402 endpoint |
| Publish provider | MED | Register a new pay-per-call provider |
| Payment history | SAFE | Recent x402 payment records |

```bash
# Check your balance:
clawd balance

# Fund with USDC:
clawd fund 10

# View pay-per-call catalog:
curl https://x402.wtf/api/catalog | jq ".providers[:5]"
```

---

### Category 6 — 🤖 Automaton / Runtime

Leviathan bootstrap, OODA pulse loop, Three Laws integrity check.

| Command | Risk | What it does |
|---------|------|--------------|
| Quickstart wizard | SAFE | Interactive OpenClawd quickstart |
| Leviathan boot | SAFE | Full sovereign runtime bootstrap |
| Three Laws check | SAFE | Verify constitution SHA-256 hash |
| Global install | MED | One-line leviathan installer |
| Spawn automaton | MED | Launch OODA pulse loop in paper mode |
| Backroom stream | SAFE | Infinite AI debate stream |

#### Bootstrap the runtime:

```bash
# Interactive quickstart (recommended for first-timers):
bash automaton-main/quickstart.sh

# Full leviathan bootstrap (installs Vulcan perps + x402):
bash automaton-main/leviathan.sh --full

# Verify the Three Laws constitution:
bash automaton-main/three-laws-check.sh

# Or install globally in one command:
curl -fsSL https://solanaclawd.com/leviathan.sh | sh
```

---

### Category 7 — 🧠 Skills / Catalog

ClawdHub skill browser, agent catalog sync, on-chain skill routing.

| Command | Risk | What it does |
|---------|------|--------------|
| List Solana skills | SAFE | Browse all installed Solana skills |
| Install skill | SAFE | Install a skill from ClawdHub |
| Vulcan quickstart skill | SAFE | Load Vulcan perps quickstart |
| Meme trader skill | HIGH | Run memecoin trading skill |
| Token launcher skill | MED | Launch planning + tokenomics |
| Sync agent catalog | SAFE | Rebuild catalog from agents/src/*.json |

```bash
# List skills:
clawdhub list --category solana --format table

# Install a specific skill:
clawdhub install meme-trader

# Sync the full agent catalog:
cd agents && bun run build
```

---

## Environment Variables

Copy from `Perps/clawd-agents-perps/.env.example` and configure:

```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<KEY>
HELIUS_API_KEY=<KEY>
CLAWD_PERPS_WALLET=<BASE58_PRIVATE_KEY>
CLAWD_PERPS_API_URL=https://perp-api.phoenix.trade
PERPS_ALLOWED_SYMBOLS=SOL,ETH,BTC
PERPS_MAX_NOTIONAL_USD=250
PERPS_MAX_LEVERAGE=3
LIVE_TRADING=false          # set true only for real trades
OPERATOR_CONFIRMED=false    # set true to confirm live mode
PERPS_SIM_ONLY=true         # paper mode by default
```

---

## Package Structure

```
tui/
├── src/
│   ├── index.ts              # Main menu + launcher
│   ├── state.ts              # Shared dashboard state types
│   ├── market.ts             # Market data helpers
│   ├── vulcan.ts             # Vulcan CLI integration
│   ├── a2a.ts                # Agent-to-Agent protocol
│   ├── renderer.ts           # Panel renderer
│   ├── panels/
│   │   ├── header.ts
│   │   ├── market.ts
│   │   ├── ooda.ts
│   │   ├── payments.ts
│   │   └── log.ts
│   └── screens/
│       ├── agentkit.ts       ← 🧰 Solana Agent Kit (NEW)
│       ├── agents.ts         # Agent Registry
│       ├── automaton.ts      # Spawn automaton
│       ├── backroom.ts       # AI debate backroom
│       ├── perps.ts          # Phoenix perps dashboard
│       └── wallet.ts         # Wallet funding
├── dist/                     # Compiled JS output
├── package.json
├── tsconfig.json
└── README.md
```

---

## Related Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@solanaclawd/clawd-agents-perps` | `Perps/clawd-agents-perps` | Phoenix perps CLI + Vulcan integration |
| Agent JSON catalog | `agents/src/*.json` | 100+ agent definitions |
| Automaton scripts | `automaton-main/` | Quickstart · Leviathan · Three Laws |
| `@openclawdsolana/leviathan` | `packages/leviathan` | OODA runtime identity |

---

## License

MIT — Built by [@8bitsats](https://github.com/8bitsats) / [@clawddevs](https://github.com/clawddevs)
