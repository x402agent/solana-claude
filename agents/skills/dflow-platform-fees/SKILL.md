---
name: dflow-platform-fees
description: Monetize a DFlow integration by collecting a builder-defined fee on trades your app routes through the Trade API — either a fixed percentage (spot + PM) via `platformFeeBps`, or a probability-weighted dynamic fee (PM outcome tokens only) via `platformFeeScale`. Use when the user asks "how do I take a cut of trades?", "add a builder fee", "monetize my swap UI", "charge a platform fee", "how does platformFeeBps / platformFeeScale work?", or "where do my fees get paid?". Do NOT use to run a trade itself (use `dflow-spot-trading` or `dflow-kalshi-trading` — both also cover priority fees and sponsored / gasless flows).
---

# DFlow Platform Fees

Collect a fee on trades your app routes through the DFlow Trade API, paid to a **builder-controlled token account** on successful execution. This is the builder→user fee — builders monetizing their distribution.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Exact parameter encoding, response shapes, and the full mode matrix live there — don't guess.

## Surface

**API only.** Platform fees are `/order` parameters on the Trade API. The `dflow` CLI is for direct self-trading, not for monetizing a distribution product, so it doesn't expose platform-fee flags — don't hunt for a `--platform-fee-bps` option.

Which host depends on API-key status, same as the other trading skills: prod `https://quote-api.dflow.net` with `x-api-key`, dev `https://dev-quote-api.dflow.net`.

## Two fee models

Pick based on what trades you're fee-ing.

### Fixed — `platformFeeBps`
Flat percentage of the trade in basis points (1 bps = 0.01%). `platformFeeBps: 50` → 0.5% fee. Works on **spot and PM** trades. The only option for spot.

### Dynamic — `platformFeeScale` (PM outcome tokens only)

Probability-weighted fee that scales with market uncertainty:

```
fee = k * p * (1 - p) * c
```

- `k` = `platformFeeScale`, 3-decimal precision (`platformFeeScale: 50` → k = 0.050).
- `p` = the all-in price (includes all fees + filled price), 0–1.
- `c` = contract size.
- Paid in the **settlement mint** (USDC or CASH).

`p * (1 - p)` peaks at `p = 0.5` and is zero at `p = 0` / `p = 1` — so you charge the most on coin-flip markets, scale down as markets approach certainty, and **charge nothing at redemption** (`p = 1`). If your revenue model assumes a take on redemption, rework it.

*Example.* `platformFeeScale = 50`, user buys 100 YES contracts at `p = 0.40`:
`fee = 0.050 * 0.40 * 0.60 * 100 = 1.20` → $1.20 on a $40 buy.

Dynamic fees are **not available on spot**.

## Core `/order` parameters

Full param details and encoding → docs MCP, or read the pages directly: [`/build/trading/platform-fees`](https://pond.dflow.net/build/trading/platform-fees), [`/build/recipes/trading/platform-fees`](https://pond.dflow.net/build/recipes/trading/platform-fees).

- `platformFeeBps` — fixed fee in bps. Works everywhere.
- `platformFeeScale` — dynamic fee coefficient. PM outcome tokens only.
- `platformFeeMode` — which side pays the fee: `outputMint` (default) or `inputMint`.
- `feeAccount` — the SPL token account that receives the fee. **Must already exist** before the trade; DFlow won't create it.

## Mode matrix — who can pay the fee in which token

| Trade type | Allowed `platformFeeMode` |
|---|---|
| Imperative spot | `inputMint` **or** `outputMint` |
| Declarative spot | `outputMint` only |
| PM outcome-token trades | Always settlement mint (USDC / CASH), regardless of what you pass |

Easy trap when porting from imperative to declarative: `inputMint` mode silently becomes invalid.

## Fee accounts (ATAs)

You need **one ATA per token you collect in**. A builder collecting in USDC and SOL needs a USDC ATA and a SOL ATA, both already created, both controlled by the builder's wallet. Pass the relevant one as `feeAccount` per request — DFlow reads it, validates it matches the mode's token, and transfers on success.

For PM: the fee ATA must be a settlement-mint ATA (USDC or CASH), since that's the only token PM fees can be paid in.

## What to ASK the user (and what NOT to ask)

**Ask if missing:**

1. **Which trade types do you want to collect fees on — spot, PM outcome tokens, or both?** Scopes which fee model(s) are relevant: spot-only → `platformFeeBps` only; PM → either; both → usually `platformFeeBps` on spot + `platformFeeScale` on PM (per-request choice).
2. **Rate** — bps value for fixed; `k` value for dynamic.
3. **Collection token(s)** — which token(s) do you want the fee paid in, and do you already have a matching ATA owned by the builder wallet?
4. **Imperative or declarative?** Only matters for spot and only matters for `platformFeeMode` — declarative can only fee in `outputMint`.
5. **DFlow API key.** Platform fees are an HTTP-only feature (params on the user's own `/order` call) — there's no CLI flag for them, so you're always plumbing the key into the script's HTTP client. **Ask with a clean, neutral question: *"Do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Surface the choice; don't silently fall back to env or to dev. It's **one DFlow key everywhere** — same `x-api-key` unlocks Trade API + Metadata API, REST + WebSocket. Yes → prod `https://quote-api.dflow.net` + `x-api-key`. No → dev `https://dev-quote-api.dflow.net`, rate-limited. Pointer: `https://pond.dflow.net/build/api-key`.

**Do NOT ask about:**
- RPC, signing, slippage — orthogonal to fees; the base trading skill handles them.
- Anything about who the *user* is — platform fees are a per-request parameter, not a wallet-level setting.

## Gotchas (the docs MCP won't volunteer these)

- **Don't set `platformFeeBps` if you're not collecting.** The API factors a declared fee into slippage tolerance; if the fee isn't actually taken onchain, the slippage budget gets "spent" on nothing and user pricing worsens. Only pass a nonzero value when there's a real `feeAccount` at the other end.
- **Redemption is fee-exempt under dynamic fees.** `platformFeeScale` returns 0 at `p = 1`. There's no "take a cut on redemption" knob.
- **Dynamic fees are outcome-token trades only.** `platformFeeScale` is not supported on spot. Use `platformFeeBps` there.
- **Declarative spot fees can only be in `outputMint`.** Imperative has both modes; declarative narrows. Easy regression.
- **PM fees are always in the settlement mint.** Passing `platformFeeMode: "inputMint"` on a PM buy doesn't mean "collect in USDC because USDC is the input" — it's silently invalid. The fee settles in USDC/CASH regardless because that's the settlement mint.
- **`feeAccount` must exist before the trade.** DFlow doesn't create it for you. If it's missing, the trade fails.
- **One ATA per collected token.** USDC fee account ≠ SOL fee account ≠ CASH fee account. Create what you need upfront.
- **Fees only apply on successful trades.** Failed / cancelled / reverted trades → no fee charged, no transfer. Don't count failures as fee-bearing volume.

## Platform fees vs DFlow's PM trading fees

Two different things that both use the word "fee":

- **Platform fees** (this skill) — builder→user. Defined by the builder via `/order` params, transferred to the builder's `feeAccount` on success. Applies to any trade type.
- **DFlow PM trading fees + rebates** — builder→DFlow, with a partial VIP rebate flow back from DFlow→builder. Charged on **prediction-market outcome-token trades only** (formula `roundup(0.07 × c × p × (1 − p)) + (0.01 × c × p × (1 − p))`), tiered by rolling 30-day PM volume (Frost / Glacier / Steel / Obsidian). Builders above $100k/30D volume may additionally qualify for the VIP rebate schedule. Details: [`/build/prediction-markets/prediction-market-fees`](https://pond.dflow.net/build/prediction-markets/prediction-market-fees).

Don't mix them up when calculating net economics. Platform fees on a spot trade are just a line item between user and builder — DFlow isn't in that loop.

## When something doesn't fit

Defer to the docs MCP for exact parameter encoding, the code recipe at [`/build/recipes/trading/platform-fees`](https://pond.dflow.net/build/recipes/trading/platform-fees) (runnable, covers both `platformFeeBps` and `platformFeeScale`), and the FAQ entries on slippage interaction.

## Sibling skills

- `dflow-spot-trading` — build the base spot `/order` call; layer these params on top. Also covers priority fees and sponsored / gasless flows.
- `dflow-kalshi-trading` — build the base PM `/order` call; layer these params on top. Also covers priority fees and sponsored / gasless flows (including `predictionMarketInitPayer`).
