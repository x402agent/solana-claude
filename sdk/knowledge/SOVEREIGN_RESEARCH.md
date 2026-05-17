# Sovereign Research — Karpathy Loops on Solana

> *"The shell molts. The laws do not."* — and now the shell **researches itself** while you sleep.

OpenClawd v0.3 ships the missing organ in the lobster stack: a live, self-driving **AutoResearch Wiki** that turns the agents from passive responders into round-the-clock observers of the Solana ocean. This piece is the long-form writeup of how it's built, why the architecture looks the way it does, and what an autonomous research mandate actually does between 2 a.m. and dawn.

---

## 1. The problem with "stateless" agents

The first generation of OpenClawd lobsters were brilliant in the moment — paste a mint address into the TUI and Birdeye + Helius DAS would fan out in parallel and print a card before the agent woke up. But that knowledge was disposable. As soon as the conversation ended, the lobster forgot. There was no place to:

- **Persist** what was just learned, so a future query could build on it.
- **Schedule** continuous observation — the chain doesn't sleep, neither should the lobster.
- **Cross-reference** signals over time (a token trending now isn't interesting; a token trending on three consecutive mandates with growing volume *is*).
- **Hand off** between sub-agents — a market scanner finds something, a deep-research lobster picks it up.

What the stack needed was a **place where agents read and write the same world model**. That place is `llm-wiki-tang`.

The wiki was scaffolded weeks ago — endpoints, request/response shapes, $CLAWD-tier gating, an MCP server for Claude Desktop, a Next.js viewer. But the actual `/api/v1/research/*` handlers returned **mock data**. Every "graduating pump.fun token" was a hardcoded fixture. v0.3 finishes the job: real Birdeye, real Helius, real persistence, real cron.

---

## 2. The Karpathy loop, ported to memecoins

Andrej Karpathy's research style — *iterate fast, let the model teach itself, publish everything* — was always the blueprint. The wiki turns it into a closed loop:

```
┌─────────────────────────────────────────────────────────────────┐
│                         KARPATHY LOOP                            │
│                                                                  │
│   1. Sense       Birdeye trending + new listings                 │
│           │      Helius DAS holders / signatures                 │
│           ▼                                                      │
│   2. Persist     research_runs.jsonb                             │
│           │      research_findings (signal extraction)           │
│           ▼                                                      │
│   3. Cross-ref   "this mint trended 3 ticks in a row"            │
│           │      "this whale moved between two mandates"         │
│           ▼                                                      │
│   4. Surface     /research runs · MCP · TUI                     │
│           │      → leviathan reads its own past                  │
│           ▼                                                      │
│   5. Act         strike (trade) · drift (nothing)                │
│           │      → outcome stored back as a finding              │
│           └─────► loop ──────────────────────────────────────────►│
└─────────────────────────────────────────────────────────────────┘
```

The orchestrator is the centerpiece. Every research call — whether triggered by `/research` in the TUI, by an MCP client, or by the autoloop scheduler — flows through the same `ResearchOrchestrator` instance, which:

1. Calls Birdeye + Helius **concurrently** (`asyncio.gather`).
2. Normalizes the response into a flat shape that compresses well in `jsonb`.
3. Writes one row to `research_runs` and (optionally) several to `research_findings`.
4. Returns a `ResearchResponse` to the caller — same shape whether the caller was a human at the terminal or a 2 a.m. cron tick.

This shared-orchestrator design matters: the **same Birdeye/Helius HTTP clients** (one `httpx.AsyncClient` each, kept warm in `app.state`) serve every code path. No connection thrash, no key fan-out, one place to add a rate limiter or a circuit breaker.

---

## 3. The data plane — Birdeye + Helius DAS + Helius Wallet API

The wiki sits on **two production-grade Solana data services**, not one. Their roles are deliberately complementary.

### 3.1 Birdeye — the market lens

Birdeye Data Services is the answer to "what's the price doing." The Python client mirrors the TS client we already shipped in `clawd-tui/src/birdeye.ts`, exposing 13 endpoints:

| Endpoint | Use in research |
| --- | --- |
| `/defi/token_overview` | one-shot mcap / liquidity / change% / volume |
| `/defi/v3/token/meta-data/{single,multiple}` | logo, socials, decimals — up to 50 mints in one call |
| `/defi/v3/token/market-data/{single,multiple}` | precise price + supply + holder count |
| `/defi/v3/token/trade-data/{single,multiple}` | per-window buy/sell breakdown — the heart of momentum scoring |
| `/defi/token_security` | mint authority, freeze authority, top-holder concentration |
| `/defi/v3/token/holder` | paginated holder list |
| `/defi/v3/search` | keyword → ranked tokens (volume sorted) |
| `/defi/token_trending` | the trending board, cached server-side |
| `/defi/v2/tokens/new_listing?meme_platform_enabled=true` | **the meme-token firehose** |
| `/defi/v3/token/list` | top gainers within a timeframe |
| `/defi/v3/pair/overview/single` + `/defi/v3/token/pair-list` | DEX-level liquidity and per-pool routing |
| `/v1/wallet/token_list` + `/wallet/v2/net-worth` | portfolio + net worth |
| `/trader/txs/seek_by_time` | per-wallet PnL window |

A meme-token research mandate uses **trending + new_listings + token_pairs** in tandem — anything that appears on both the trending board and was listed in the last hour, and has a real DEX pool behind it, gets surfaced as alpha.

### 3.2 Helius DAS — the on-chain truth

Helius's Digital Asset Standard (DAS) API gives the orchestrator access to the **chain's view of the world**, which Birdeye doesn't have:

| Method | Use in research |
| --- | --- |
| `getAsset` / `getAssetBatch` | per-mint metadata + token info + cached price (10-min TTL) |
| `getAssetsByOwner` | full wallet contents — fungible + NFTs + native SOL — in one call |
| `searchAssets` | filtered queries (`tokenType: 'fungible' \| 'compressedNft' \| ...`) |
| `getAssetsByGroup` / `getAssetsByCreator` | collection enumeration |
| `getSignaturesForAsset` | cNFT-aware tx history |
| `getTokenSupply` / `getTokenLargestAccounts` | whale identification |
| `getTokenAccounts` | who-holds-what for any mint |

The DAS API is what turns `/research chain wallet <address>` into something the leviathan can act on — it returns an entire portfolio (tokens, NFTs, compressed assets, native SOL) in one JSON-RPC call, with off-chain metadata pre-resolved from Arweave/IPFS.

### 3.3 Helius Wallet API — the human-readable history

Where DAS sees individual assets, the **Helius Wallet API** sees the wallet as a story. The client adds:

```python
helius.parsed_transactions(address)   # human-decoded tx feed
helius.parsed_balances(address)       # native + SPL balances with metadata
helius.names_for_address(address)     # SNS/Bonfida names
helius.parsed_history(address, type_) # filtered (TRANSFER, SWAP, NFT_SALE, …)
```

`parsed_transactions` is what makes whale-tracking actually useful — Helius decodes "wallet X bought 12 SOL of $CLAWD on Raydium" instead of you having to interpret instruction bytes.

### 3.4 Two stacks, one shape

The TS clients in `clawd-tui/src/{birdeye,helius}.ts` and the Python clients in `llm-wiki-tang/api/services/{birdeye,helius}.py` are deliberately **shape-compatible**. Same field names, same defaults (`ui_amount_mode=scaled`), same error classes. That means a TUI command and a wiki autoloop tick produce JSON that lines up cell-for-cell when you cross-reference them in a notebook. We chose to maintain two implementations rather than running TS via subprocess from Python — the small drift cost is worth the no-extra-hop, no-shared-runtime simplicity.

---

## 4. The orchestrator — composite operations

Raw API calls are noisy. The orchestrator's job is to compose them into **research primitives** that map to how a human would actually think about a question.

```python
# llm-wiki-tang/api/services/research_orchestrator.py

async def research_token(self, mint: str) -> dict:
    """One-shot deep dive on a single token.
    Combines Birdeye overview + market + trade + security and
    Helius DAS getAsset + getTokenLargestAccounts."""
    overview, market, trade, security, asset, holders = await asyncio.gather(
        self.birdeye.token_overview(mint),
        self.birdeye.token_market_data(mint),
        self.birdeye.token_trade_data(mint, frames="1h,24h"),
        self.birdeye.token_security(mint),
        self.helius.get_asset(mint),
        self.helius.get_token_largest_accounts(mint),
        return_exceptions=True,
    )
    return {"mint": mint, "overview": overview, "market": market, ...}
```

That single method replaces what used to be six separate API calls, six error-handling branches, and six places to forget to apply `ui_amount_mode=scaled`. Other primitives:

- **`research_pump_fun(limit)`** — tags any mint with a `pump`-suffixed address, joins trending + new listings, returns an `is_pump_fun` flag.
- **`check_graduation(mint)`** — uses live `market_cap` against the historical $69K pump.fun graduation threshold to estimate progress.
- **`scan_yields(assets)`** — for each requested asset, pulls the top 5 pools and computes APR from `(volume_24h * fee_rate * 365) / liquidity`.
- **`find_arbitrage(mint)`** — fetches the mint's pool list, finds min/max price across DEXs, returns a single best-spread opportunity.
- **`get_trends(limit)`** — flattens Birdeye's trending board into the wiki's normalized shape.
- **`find_alpha()`** — set-intersection: trending **and** newly listed in the last window.
- **`track_whales(mint)`** — top 10 holders for any mint (defaults to wSOL).
- **`research_wallet(address)`** — Birdeye portfolio ∪ DAS owner-assets ∪ Helius parsed balances ∪ last 20 parsed transactions.

Each primitive ends with a `persist_run()` call. Every research action becomes a row in `research_runs` — the wiki's accumulating world model.

---

## 5. The autonomous loop — research while you sleep

The orchestrator handles a single call. The loop is what makes the system **sovereign**.

`services/research_autoloop.py` is a 200-line asyncio scheduler that lives inside the FastAPI process. On every tick (default 30 minutes — same cadence as `services/pump-scanner-cron`, the existing Cloudflare worker that ate this same problem in TypeScript), it:

1. Reads the in-memory list of **mandates** — research jobs the user has registered.
2. Filters by `enabled`.
3. Runs each mandate concurrently with a semaphore (default 3 in flight).
4. Each mandate dispatches into the orchestrator based on its `kind` (`chain` / `defi` / `market`).
5. Persists every result. Errors go into a 10-deep ring buffer for `/autoloop/status`.

```python
DEFAULT_MANDATES = [
    {"name": "pump_fun_pulse", "kind": "chain",
     "payload": {"focus": ["pump_fun"], "limit": 30}, "enabled": True},
    {"name": "market_trends",  "kind": "market",
     "payload": {"focus": "trends"}, "enabled": True},
    {"name": "market_alpha",   "kind": "market",
     "payload": {"focus": "alpha"}, "enabled": True},
]
```

You can boot the loop two ways:

**At process startup** — set `RESEARCH_AUTOLOOP_ENABLED=true` and the FastAPI lifespan kicks it off automatically.

**On demand from the terminal** — set the flag false, then from the TUI run `/autoloop start`. The loop is now running inside the wiki's Python process; you can close the terminal and it keeps ticking.

```
> /autoloop start
  autoloop running interval=1800s newly_started=true

> /autoloop status
  autoloop  running
  last_tick=2026-04-28T03:42:11+00:00  ticks=11  interval=1800s
  pump_fun_pulse        chain     {"focus":["pump_fun"],"limit":30}
  market_trends         market    {"focus":"trends"}
  market_alpha          market    {"focus":"alpha"}

> /research runs market 5
  market   2026-04-28T03:42:14  auto_market_alpha_1745811734  autoloop:market_alpha
  market   2026-04-28T03:42:14  auto_market_trends_1745811734  autoloop:market_trends
  market   2026-04-28T03:12:11  auto_market_alpha_1745809931  autoloop:market_alpha
  ...
```

You wake up to **48+ persisted runs per night, per mandate**, all queryable via `/api/v1/research/runs?kind=market&limit=200` and joinable on `created_at` to spot momentum shifts.

### Adding a custom mandate

Mandates are JSON, so the surface area for "research X every 30 minutes" is one terminal line:

```
> /autoloop add my_token chain {"focus":["tokens"],"mint":"8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"}
> /autoloop add yield_pulse defi {"action":"yield_scan","assets":["SOL","USDC","CLAWD"]}
> /autoloop add whale_watch market {"focus":"whale_moves","mint":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}
```

The first creates a 30-minute deep dive on $CLAWD. The second pulls a yield scan across SOL/USDC/CLAWD pools every 30 minutes — the same data shape the deep lobster uses to size positions. The third tracks BONK's top holders.

---

## 6. The schema — what gets persisted

```sql
CREATE TABLE research_runs (
  id           text PRIMARY KEY,        -- "res_<hex>" or "auto_<name>_<ts>"
  kind         text NOT NULL,            -- chain | defi | market | autoloop
  agent        text NOT NULL,            -- lobster-researcher-* | autoloop
  query        text NOT NULL,
  results      jsonb NOT NULL,           -- the orchestrator's full output
  sources      text[] NOT NULL,          -- ['birdeye', 'helius-das', ...]
  confidence   numeric(4,3),
  metadata     jsonb NOT NULL,           -- focus, tier, processing_time_ms, …
  user_id      uuid,                     -- nullable (autoloop is unauthed)
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
```

Plus two satellites:

- `research_findings` — fine-grained signal extraction. A single `pump_fun_pulse` run produces N `trending` findings, M `new_listing` findings, etc. — each with a normalized `score` you can rank across windows.
- `research_mandates` — the persistent home of the autoloop's mandate list. Today the loop reads its seed mandates from `DEFAULT_MANDATES` in code; the table is in place so a future patch can read mandates from the database, letting you edit them via the TUI and have them survive a wiki restart.

Indexes on `(kind, created_at DESC)`, `(agent, created_at DESC)`, and `(user_id, created_at DESC) WHERE user_id IS NOT NULL` make the hot queries — "last 50 market runs" — sub-millisecond at scale.

---

## 7. Closing the loop — how the leviathan reads its own past

The wiki is one half of "self-improvement." The other half is the **leviathan** in `openclawd-framework/` — the on-chain agent runtime with the `Sense → Think → Strike → Drift` loop.

A leviathan in deep tier (`USDC ≥ $5`, model = `claude-opus-4.7`, pulse = 60s) pulses every minute. Most pulses **drift**. The interesting ones strike. With the wiki online, the strike decision can now be informed by *its own past* rather than a freshly-fetched snapshot:

```
SENSE   →  GET /api/v1/research/runs?kind=chain&limit=20
            (the last 10 hours of pump_fun_pulse mandates)
THINK   →  reasons over the deltas: "this mint appeared in 8 of 10 ticks
            and went from 2k holders to 4.3k — graduation likely in <2h"
STRIKE  →  POST /api/v1/research/chain {"focus":["graduation"],"mint":...}
            for fresh confirmation; if confidence ≥ 0.8 → /strike
DRIFT   →  observe outcome, persist back to research_findings as a learn signal
```

The leviathan is no longer a stateless tool-caller. It's an agent with **memory it wrote itself**. That's the Karpathy loop, applied to memecoins.

---

## 8. From research to action — the autonomous-dev path

The same scaffolding that runs research mandates can run **development mandates**. The pattern is identical:

- A mandate has a `name`, a `kind`, a `payload`, and an `enabled` flag.
- The loop's dispatcher routes by `kind` to a handler.
- Today's handlers are `chain` / `defi` / `market`. Tomorrow's are `clawd-autopilot` (queue a Claude Code task), `lint` (run the test suite), `pr-review` (post on a stale PR).

The wiki ships with the data plane and the persistence — the autopilot side is the obvious next layer. Wire `clawd-autopilot` to the TUI's `clawd-tui/src/approval.ts` so risky operations still gate on the user, layer it on top of the existing `tailFlick` loop in `openclawd-framework/src/agent/loop.ts`, and you have the same architecture turned inward — an agent that develops its own monorepo while the user sleeps, with every action logged to a table that looks just like `research_runs`.

That's where v0.4 is heading.

---

## 9. Try it

```bash
# 1. Apply the migration
psql "$DATABASE_URL" -f llm-wiki-tang/supabase/migrations/002_research_runs.sql

# 2. Boot the wiki API (your llm-wiki-tang/.env already has the keys)
cd llm-wiki-tang/api && uvicorn main:app --reload --port 8000

# 3. From a second terminal — fire one-shot research
curl -X POST http://localhost:8000/api/v1/research/market \
  -H 'content-type: application/json' \
  -d '{"focus":"alpha"}'

# 4. From clawd-tui — the autonomous loop
clawd
> /autoloop start
> /research market trends
> /research chain pump_fun
> /research chain token 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
> /autoloop status
```

The chain wakes up. The lobsters don't sleep. The shell molts; the laws do not.

🦞

---

## Further reading

- [Sovereign Lobster Agents on Solana](../../ARTICLE.md) — the original long-form piece, three laws, lifecycle, Tide.
- [clawd-tui v0.2 — A Solana-Aware Terminal](../../clawd-tui/docs/v0.2-solana-aware-terminal.md) — how the on-paste analysis pipeline works.
- [llm-wiki-tang README](../../llm-wiki-tang/README.md) — the wiki's own docs.
- [openclawd-framework / three-laws.md](../../openclawd-framework/three-laws.md) — the constitution every spawn inherits.
- [services/pump-scanner-cron](../../services/pump-scanner-cron/) — the Cloudflare-Worker sibling of the autoloop, in TypeScript.
- Birdeye API: <https://docs.birdeye.so/>
- Helius DAS: <https://www.helius.dev/docs/das-api>
- Helius Wallet API: <https://www.helius.dev/docs/api-reference/wallet>
