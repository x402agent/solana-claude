---
name: dflow-spot-trading
description: Swap any pair of Solana tokens via DFlow. Use when the user wants to trade, swap, or convert tokens on Solana, get a price quote, build a swap UI, tune priority fees so a swap lands under congestion, or build a gasless / sponsored swap where the app pays fees. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use for Kalshi prediction-market YES/NO trades or builder-side platform fees.
---

# DFlow Spot Trading

Swap any pair of Solana tokens via DFlow. Imperative trades (the default) settle synchronously in one transaction; declarative trades are opt-in for users who explicitly want better execution.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Look up endpoint shapes, parameter details, error codes, and anything else field-level via `search_d_flow` / `query_docs_filesystem_d_flow` — don't guess.
- **`dflow` CLI** (optional, for command-line/agent use) — install per the [repo README](../../README.md#recommended-install-the-dflow-cli).

## Choose your surface

- **CLI** — command line, scripts, local agents. Manages keys, signs, broadcasts.
- **API** — web/mobile apps, backends, automations with their own wallet/signer. Browser apps must proxy HTTP through their backend (the Trading API serves no CORS).

If unclear, ask once: *"From the command line, or wired into an app?"*

## Workflows

### Quote (read-only)

- CLI: `dflow quote <atomic-amount> <FROM> <TO>`
- API: `GET /order` doubles as a quote — *including without a `userPublicKey`*, in which case it returns all price fields with no transaction attached. Use this for live-quote UIs before the user has connected a wallet. Don't reach for `/quote` separately; it's the older surface and the docs redirect back to `/order`.

### Trade — imperative `/order` (the default)

Single round-trip: get a quote and a signed-ready `VersionedTransaction` together; sign, submit, confirm. Fully synchronous. Works with **all** SPL + Token-2022 mints.

- CLI: `dflow trade <atomic-amount> <FROM> <TO>` (add `--confirm` for agents/scripts that need to block until confirmed).
- API: `GET /order?userPublicKey=&inputMint=&outputMint=&amount=`, deserialize `transaction` (base64) → `VersionedTransaction`, sign + broadcast, confirm against the blockhash DFlow signed with. **Two broadcast idioms — pick the one that matches your context:**
  - **Browser wallet-adapter app (the default for UIs).** `const sig = await wallet.sendTransaction(tx, connection)`. The wallet signs *and* broadcasts through its own RPC — your `connection` only needs to serve reads (`confirmTransaction`).
  - **Node script / server-side signing with a `Keypair`.** Two-step: `tx.sign([keypair])` → `connection.sendRawTransaction(tx.serialize())`. Your RPC is what broadcasts; a public endpoint will 403.

  **The full browser-adapter happy path, end to end:**

```ts
const { transaction, lastValidBlockHeight } = await fetch("/api/order?...").then(r => r.json());
const tx = VersionedTransaction.deserialize(Buffer.from(transaction, "base64"));
const sig = await sendTransaction(tx, connection);          // wallet's RPC
await connection.confirmTransaction(                         // app's RPC (reads only)
  { signature: sig, blockhash: tx.message.recentBlockhash, lastValidBlockHeight },
  "confirmed",
);
```

  **Where each `/order` response field goes** (don't re-derive these locally — DFlow owns the authoritative value):

  - `transaction` (base64) → `VersionedTransaction.deserialize` → `wallet.sendTransaction` (browser) or `connection.sendRawTransaction` (Node).
  - `lastValidBlockHeight` → `connection.confirmTransaction`, paired with `tx.message.recentBlockhash` from the deserialized tx. **Never** a fresh `getLatestBlockhash` (see Gotchas).
  - `inAmount` / `outAmount` / `otherAmountThreshold` / `priceImpactPct` / `slippageBps` → display.
  - `prioritizationFeeLamports` / `prioritizationType` → echo / logging. The server-resolved priority-fee choice after `"auto"` resolution.
  - `contextSlot` → logging / staleness checks.
  - `routePlan` → optional display / debugging.

  Fields marked *"Specified if and only if the request included the user's public key"* in the OpenAPI (`transaction`, `lastValidBlockHeight`, `computeUnitLimit`, `prioritizationFeeLamports`, `addressLookupTables`) are absent on quote-only calls — check before using.

  Full runnable example (server-side `Keypair` variant): [`/build/recipes/trading/imperative-trade`](https://pond.dflow.net/build/recipes/trading/imperative-trade) (links to the DFlow Cookbook Repo). Field-level schema details via the docs MCP.

### Trade — declarative `/intent` + `/submit-intent` (opt-in)

User signs an intent (asset pair, slippage, min-out); DFlow picks the route at execution time and fills via Jito bundles. Sells on: less slippage, better pricing, sandwich protection.

**Hard restriction:** `/intent` does **not** support Token-2022 mints. Verify both mints are SPL before suggesting; otherwise stay on `/order`.

Only suggest declarative when the user explicitly asks for sandwich protection or "best execution." Recipe details (intent shape, polling) via the docs MCP.

## What to ASK the user (and what NOT to ask)

**Trade shape — infer if unambiguous, confirm if not:**

1. **Input + output token** — base58 mint addresses. The CLI resolves a small symbol set (SOL, USDC, USDT, JUP, BONK, etc.); **the API has no symbol resolver** — base58 mints only.
2. **Amount in atomic units of the input token** — `500_000` = $0.50 USDC, `1_000_000_000` = 1 SOL. Convert before calling.

**Infra — always ask, never infer:**

3. **API only — wallet pubkey** (base58). Required for every `/order` call.
4. **API only — DFlow API key** (only when the script is making direct HTTP calls to `/order` or `/quote`; pure CLI scripts don't need one — see the "two auth paths" gotcha). **Ask with a clean, neutral question: *"Do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Surface the choice; don't silently fall back to env or to dev. It's **one key for everything DFlow** — same `x-api-key` unlocks the Trade API *and* the Metadata API, REST *and* WebSocket. If yes → prod host `https://quote-api.dflow.net` with `x-api-key` on every request. If no → dev host `https://dev-quote-api.dflow.net` (same features, rate-limited). Point them at `https://pond.dflow.net/build/api-key` for a prod key. **When you generate a script that does its own HTTP, log the resolved host + key-presence at startup** so the user can see which rails they're on.
5. **Priority fee (both surfaces)** — "Any priority-fee preference, or just use DFlow's default?" Default on both surfaces = DFlow-auto, capped at 0.005 SOL (documented default on `/order`). Surface this explicitly so the user knows the lever exists for congestion / cost-sensitive trades. Don't editorialize about what percentage of trades this covers — DFlow doesn't publish one and you don't know.
   - **API** — pass `prioritizationFeeLamports` on `/order`: `auto` | `medium` | `high` | `veryHigh` | `disabled` | integer lamports. On `/intent` (declarative), roll the priority fee into `feeBudget = priority + 10_000` (the 10,000-lamport base processing fee). Live estimates for tuning: `GET /priority-fees` (snapshot), `/priority-fees/stream` (WebSocket).
   - **CLI** — no tuning flag; `dflow trade` always uses the server-side default. If the user needs finer control (an exact lamport value, or `disabled`), they'll have to drop to the API.
6. **Sponsored / gasless (API only — skip for CLI)** — "Does the user need to hold SOL for this trade, or is your app covering fees?" Default = user pays. To sponsor, pass `sponsor=<sponsor-wallet-base58>` on `/order` and co-sign the returned transaction with the sponsor keypair (both user and sponsor sign). Optional `sponsorExec=true|false` picks sponsor-executes (default) vs. user-executes. The CLI doesn't support sponsorship at all.

**Do NOT ask about:**

- **RPC** — CLI users set it during `dflow setup`. Browser wallet-adapter apps using `wallet.sendTransaction(tx, connection)` don't need their own RPC for the broadcast — the wallet handles it (see the broadcast-path Gotcha). Only ask when signing server-side (Node + `Keypair`), polling declarative trades, or when the app is explicitly going low-level with `connection.sendRawTransaction` in the browser. When one is needed, suggest [Helius](https://helius.dev).
- **Slippage** — both surfaces default to `"auto"`. Override only on explicit user request (`--slippage` CLI; `slippageBps` API).
- **Platform fee, DEX inclusion/exclusion, route length, Jito bundles, direct-only routes** — defaults are right for typical swaps; only surface these knobs on explicit user need. For platform fees specifically, defer to `dflow-platform-fees` if the user pivots there.

## Gotchas (the docs MCP won't volunteer these)

- **Atomic units always.** API rejects human-readable amounts. Confirm decimals each time — token metadata or RPC `getParsedAccountInfo`.
- **API has no symbol resolver.** The CLI has a small allow-list; the API only accepts base58 mints. Don't assume `"USDC"` works on `/order`.
- **Browser apps must proxy.** Trading API serves no CORS — call it from a backend (Next.js API route or equivalent), never directly from the browser.
- **Two broadcast paths in browser apps; pick the right one.** In `@solana/wallet-adapter-react`, `wallet.sendTransaction(tx, connection)` delegates to the wallet's `signAndSendTransaction` — Phantom and most major wallets route the broadcast through their own RPC, so the app's `Connection` only needs to work for reads (`confirmTransaction`). A public `mainnet-beta` endpoint is fine for that. The low-level two-step (`signTransaction(tx)` + `connection.sendRawTransaction(signed.serialize())`) sends through *the app's* RPC — and public endpoints reliably 403 on `sendTransaction`. **Default to `wallet.sendTransaction` in browser apps**; drop to the two-step only when you need to inspect or modify the signed bytes before broadcast. Server-side signing (Node + `Keypair`) is always two-step, because there's no wallet adapter to delegate to — and there you do need a real RPC.
- **Wire wallets via Wallet Standard auto-discovery, not per-wallet adapters.** Pass `wallets={[]}` to `<WalletProvider>`. Modern Phantom / Solflare / Backpack / Glow / etc. implement the Wallet Standard protocol and are auto-detected at runtime — no explicit adapter instances needed. **Do not** instantiate `new PhantomWalletAdapter()` / `new SolflareWalletAdapter()` from `@solana/wallet-adapter-wallets`; those are pre-Wallet-Standard shims, and the kicker is the `useWallet()` React surface looks identical either way — same `sendTransaction`, same `publicKey`. But underneath, the legacy adapter's `sendTransaction` silently downgrades to `signTransaction` + `connection.sendRawTransaction` through *your* app's RPC, re-introducing the public-RPC 403 the previous gotcha just fixed. Empty-array auto-discovery also lets you drop the `@solana/wallet-adapter-wallets` dep (and its `@walletconnect/*` / `pino-pretty` tail).
- **Confirm against the blockhash DFlow signed with — never a fresh one.** The blockhash is on the deserialized transaction: `tx.message.recentBlockhash`. Pair it with `lastValidBlockHeight` from the `/order` response. **Never call `connection.getLatestBlockhash()` for confirmation.** It's wrong two ways: (1) semantically — a freshly-fetched blockhash can be past the `lastValidBlockHeight` DFlow returned, so `confirmTransaction` times out on a transaction that actually landed; (2) operationally — public `mainnet-beta` now 403s `getLatestBlockhash`, and `@solana/web3.js` surfaces that as `"failed to get recent blockhash: ..."`, which falsely looks like you're using the deprecated `getRecentBlockhash`. The right pattern is in the code sketch under the `/order` workflow above.
- **Declarative ≠ Token-2022.** `/intent` rejects Token-2022 mints. Stay on `/order` for those (which is the default for everyone anyway).
- **`route_not_found` is often a units or mint mistake before it's a liquidity issue.** Before assuming no route exists, double-check you're passing atomic units (not human-readable amounts) and the mint addresses are correct.
- **`price_impact_too_high` is real.** Trade size exceeds available liquidity; reduce `amount`, or pass `priceImpactTolerancePct` only with the user's explicit consent.
- **Onchain failure with slippage logs.** Don't silently bump `slippageBps` on retry — surface to the user.
- **CLI shell-outs authenticate themselves; direct HTTP calls don't.** If your script or backend shells out to `dflow trade`, that leg uses the CLI's stored config from `dflow setup` (key, wallet, RPC) — **you plumb nothing** for CLI invocations. If the same script *also* hits the Trade API or Metadata API directly over HTTP (e.g. scanner-style discovery, your own `/order` call, `/quote`), that HTTP client needs the key handed in explicitly (env var, `.env`, `--api-key` flag, header). The CLI's stored key is not reusable by a sibling HTTP client, and an env-var key is not injected into the CLI either — they're independent plumbing sites for the same DFlow key. **Only ask about an API key for the HTTP portion; pure CLI scripts don't need one.**

## When something doesn't fit

For anything not covered above — full parameter lists, full error tables, declarative intent shape, legacy `/quote` + `/swap` flow, sponsorship fields, new features — query the docs MCP (`search_d_flow`, `query_docs_filesystem_d_flow`). Don't guess.

For runnable code, point the user at the **DFlow docs recipes** (each links to the DFlow Cookbook Repo for clone-and-go): [`/build/recipes/trading/imperative-trade`](https://pond.dflow.net/build/recipes/trading/imperative-trade), [`/build/recipes/trading/declarative-trade`](https://pond.dflow.net/build/recipes/trading/declarative-trade).

## Sibling skills

Defer if the user pivots to:

- `dflow-kalshi-trading` — Kalshi prediction-market YES/NO trades
- `dflow-platform-fees` — charge a builder cut on swaps
