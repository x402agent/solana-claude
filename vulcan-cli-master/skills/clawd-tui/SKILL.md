---
name: clawd-tui
version: 1.0.0
description: "Clawd TUI perps screen integration. Use when the user asks about the Clawd terminal UI, the Phoenix perps screen inside the TUI, paper trading from the TUI, or how the TUI drives Vulcan."
metadata:
  openclaw:
    category: "integration"
  requires:
    bins: ["vulcan"]
    npm: ["@openclawdsolana/clawd-tui"]
---

# Clawd TUI — Vulcan Perps Integration

The **Clawd TUI** (`@openclawdsolana/clawd-tui`, binary `hermes` / `clawd-tui`) embeds a live Phoenix perpetuals screen that drives the real `vulcan` binary. All trades from the TUI are **paper-only** by default.

## Architecture

```
clawd-tui (Node.js ESM)
  └─ src/screens/perps.ts        ← perps screen entry
  └─ src/vulcan.ts               ← Vulcan CLI bridge (spawns vulcan binary)
       └─ vulcan market list      → markets table (12 markets, tickers batch-fetched)
       └─ vulcan market ticker    → mark price, funding, OI, 24h change
       └─ vulcan paper buy/sell   → paper fills (no real funds)
       └─ vulcan paper status     → account equity, PnL, fills
       └─ vulcan paper positions  → open paper positions
```

## Running the TUI

```bash
cd /path/to/solana-clawd/tui
npm run dev          # dev mode (tsx, loads .env automatically)
npm start            # built dist (loads .env automatically)
```

Press **[2]** from the main menu to open the perps screen.

## Perps Screen Keys

| Key | Action |
|-----|--------|
| `q` | Quote — show mark price + funding for top market |
| `1`–`9` | Select market by row index for detailed quote |
| `p` | Paper long — $100 USDC notional on top market |
| `s` | Paper short — $100 USDC notional on top market |
| `a` | Account view — balance, equity, PnL, fees, exposure |
| `x` | Positions view — open paper positions with entry vs mark |
| `t` | Trader snapshot — full refresh of markets + paper state |
| `r` | Refresh markets + paper state |
| `b` | Back to main menu |

## Environment Variables (tui/.env)

| Variable | Purpose |
|----------|---------|
| `SOLANA_RPC_URL` | Helius or other RPC endpoint |
| `HELIUS_API_KEY` | Helius API key for enhanced RPC |
| `VAULT_PASSPHRASE` | Agentwallet vault passphrase |
| `ANTHROPIC_API_KEY` | Anthropic Claude inference |
| `OPENROUTER_API_KEY` | OpenRouter inference gateway |
| `OPENROUTER_MODEL` | Model slug, e.g. `x-ai/grok-build-0.1` |
| `LIVE_TRADING` | Must remain `false` — TUI is paper-only |
| `OPERATOR_CONFIRMED` | Must remain `false` — TUI is paper-only |

> **Safety**: `LIVE_TRADING` and `OPERATOR_CONFIRMED` are hardcoded to paper-only in `screens/perps.ts`. Changing them in `.env` has no effect on the TUI perps screen.

## Vulcan Bridge (`src/vulcan.ts`)

The bridge resolves the `vulcan` binary from `PATH` or `~/.local/bin/vulcan`, then spawns it with `-o json` and parses the `{ ok, data }` envelope.

### Market loading

```
vulcan market list -o json        → { ok, data: { markets: RawMarketEntry[] } }
vulcan market ticker SOL -o json  → { ok, data: { mark_price, funding_rate, ... } }
```

Markets are sorted: `SOL BTC ETH SUI DOGE XRP BNB HYPE` first, then alphabetical. The top 12 are shown; tickers are batch-fetched in parallel.

### Paper orders

```bash
vulcan paper buy  SOL --notional-usdc 100 -o json
vulcan paper sell SOL --notional-usdc 100 -o json
vulcan paper status    -o json
vulcan paper positions -o json
```

## Building the TUI

```bash
cd tui
npm install
npm run build   # tsc → dist/
```

## Adding Markets or Changing Defaults

Edit `tui/src/vulcan.ts`:
- `PRIORITY_SYMBOLS` — controls display order
- `toFetch = sorted.slice(0, 12)` — controls how many markets load tickers

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `vulcan binary not found` | Run `vulcan --version`; if missing, install from vulcan-cli-master: `cargo install --path vulcan` |
| Markets show `---` prices | Ticker fetch timed out — check network or increase `timeoutMs` in `runVulcanJson` |
| Paper fills fail | Run `vulcan paper init` to initialize the local paper state file |
| `.env` not loading | Ensure Node ≥ 20.6 (TUI uses `--env-file-if-exists`); check `tui/.env` exists |
