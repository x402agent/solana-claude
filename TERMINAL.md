<div align="center">

```text
   _____       __                        ________                    __
  / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
  \__ \/ __ \/ / __ `/ __ \/ __ `/    / /   / / __ `/ | /| / / __  /
 ___/ / /_/ / / /_/ / / / / /_/ /    / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/     \____/_/\__,_/ |__/|__/\__,_/

                    ╔══════════════════════════╗
                    ║   POWERED BY xAI GROK    ║
                    ╚══════════════════════════╝
```

# CLAWD Cloud 

### The Solana-native cloud bootstrap for operators, builders, traders, and agent engineers.

Powered by **$CLAWD** on Solana & Pump.fun | Built with **xAI Grok**, **MiniMax M2.7**, and **E2B**

`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

[SOUL.md](./SOUL.md) · [SOUL Template](./SOUL_TEMPLATE.md) · [Grok Prompt Guide](./docs/grok-prompting.md) · [Migration Guide](./docs/migrate-from-openclaw.md)

[ClawdRouter API](./docs/CLAWD_ROUTER.md) · [Build Guide](./docs/CLAWD_ROUTER_BUILD.md) · [Agent Guide](./docs/clawdrouter-agent-guide.md) · [OpenRouter Attribution](./docs/openrouter-attribution.md) · [/router](./client/src/pages/RouterGuide.tsx) · [/clawdrouter](./client/src/pages/ClawdRouter.tsx) · [/x402](./client/src/pages/X402.tsx) · [/voice](./client/src/pages/Voice.tsx)

</div>

---

CLAWD Cloud OS brings together three layers into one opinionated stack:

* **SolanaOS** — the compact Go-native operator runtime
* **solana-clawd** — the Grok-powered Solana agent layer
* **E2B** — secure cloud sandboxes for terminal, desktop, code execution, and agent deployment

The result is a local-first but cloud-friendly Solana AI computer that can:

* bootstrap itself on fresh terminals
* install Go without sudo when needed
* run SolanaOS and solana-clawd in one shot
* deploy into E2B sandboxes for coding, desktop computer use, web agents, and wallet tooling

---

## What This Repo Is

This repository is the web terminal build of **solana-clawd**: a Solana-native AI terminal and vibe-coding studio with:

- Phantom wallet sign-in with token-gated access
- AI usage tracking and image generation history
- Solana market data via Helius, Jupiter, and Birdeye
- DFlow trading + prediction market API integration (tRPC + smoke tests)
- GitHub, Telegram, and X integrations
- E2B cloud sandbox management (create, run, pause, resume, kill)
- SOUL.md lore and in-app migration guide

The current app is a Vite client plus Express/tRPC server.

## What's Live on solanaclawd.com

This section documents every surface shipped in the current build, in the order you will actually encounter it.

### 1. Agent Registry Surfaces

The agent stack is a four-page funnel backed by Metaplex Core + [`@metaplex-foundation/mpl-agent-registry`](https://github.com/metaplex-foundation/mpl-agent-registry):

- **[/agents](./client/src/pages/AgentGallery.tsx)** — **Gallery**. Sticky command bar at the top with wallet pill, hub nav, and section anchors (`ONE-SHOT · TEMPLATES · LIBRARY`). Featured roster hard-codes real on-chain agents (**CLAWD Agent**, **ClawdFather**, **Агент-снайпер**) with their addresses.
- **[/agents/registry](./client/src/pages/AgentRegistry.tsx)** — **Registry**. Curated catalog surface with the [AgentHowItWorks](./client/src/components/AgentHowItWorks.tsx) collapsible explainer.
- **[/agents/explorer](./client/src/pages/AgentExplorer.tsx)** — **Live Explorer**. Streams recent program signatures from the `mpl-agent-registry` program via Helius RPC (`umi.rpc.call('getSignaturesForAddress', …)`), derives each Core asset by matching `findAgentIdentityV1Pda` against the signature's account keys (no extra RPC), then enriches via `fetchAsset` + `findAssetSignerPda` + the registration JSON. Auto-refreshes every 30s and filters broken-image / prompt-text-name entries client-side. Exposed as `trpc.metaplex.recentAgents`.
- **[/agents/mint](./client/src/pages/AgentMint.tsx)** — **Mint**. Unified wallet connect card, $CLAWD holder check, no-login mint. UTF-8 byte-length guards (`NAME_MAX_BYTES=32`, `URI_MAX_BYTES=200`, `DESCRIPTION_MAX_BYTES=1000`) prevent the "encoding overruns Uint8Array" failure. Oversized metadata URIs are auto-pinned to Pinata via `uploadJsonToPinata` and replaced with the short gateway URL. Default service list registered with each identity: `hosted-chat, a2a, mcp, x402, x402-facilitator, clawdrouter, grok-voice, grok-voice-mcp, token, pump-scanner`.
- **[/agents/:address](./client/src/pages/AgentChat.tsx)** — **Hosted chat**. Public embed shell (also routed as `/agents/hosted/:address`) that serves any A2A-linked agent from `https://solanaclawd.com` (no `beepboop.` subdomain leakage).

### 2. Clawd's Brain — Per-Agent Honcho Memory

Every minted agent ships with a Honcho-powered per-agent memory deterministically provisioned at wallet mint.

- **Session topology.** Mint creates a persistent Honcho session `trading-agent-{walletId}` with two peers: the owner (`user-{id}`) and the agent (`agent-wallet-{walletId}`). Seeded peer cards capture operator preferences (explicit approval, KNOWN/LEARNED/INFERRED labelling) and the agent's execution mode (live vs. simulated, Privy wallet address).
- **Lifecycle events.** `trade-queued`, `trade-rejected`, and `trade-executed` are written from both peer perspectives with typed metadata (`action`, `token`, `amount`, `status`, `mode`).
- **Surfaced at:** [/brain](./client/src/pages/Brain.tsx) (token-gated, one panel per owned agent), inline in the Terminal's [AgentTradingPanel](./client/src/pages/Terminal.tsx), and via `trpc.agent.brain({ agentWalletId })`. Backed by [server/_core/honcho.ts](./server/_core/honcho.ts) (`bootstrapTradingAgentMemory`, `readTradingAgentBrain`, trade lifecycle recorders).
- **Fail-soft.** When `HONCHO_ENABLED=false` or the API key is missing, wallet creation and trade approval proceed; memory writes are best-effort and never block execution.

Env:

```bash
HONCHO_ENABLED=true
HONCHO_API_KEY=...
HONCHO_BASE_URL=                   # optional; defaults to Honcho cloud
HONCHO_WORKSPACE_ID=solana-clawd-trading
HONCHO_REASONING_LEVEL=low
```

### 3. Clawd's Guide — Global Pop-Out Chat

[ClawdGuide](./client/src/components/ClawdGuide.tsx) is a floating, $CLAWD-gated, natural-language-aware Grok chat that rides on every page.

- **Holder gate.** Both client and server verify $CLAWD holding (`trpc.wallet.verifyHolder`) before the pop-out unlocks.
- **Per-wallet persistence.** Messages keyed as `clawd-guide-messages-v2:{walletAddress}` in `localStorage`; every exchange is also fire-and-forgotten to `/api/grok/record` so Honcho keeps the long-tail memory of the guide per wallet.
- **Natural-language token awareness.** Free-text mint addresses (base58) and `$TICKER` mentions are extracted and hydrated via `trpc.solanaTracker.chatContext` with a 4s race timeout — the model sees a compact token-context block without the user having to paste JSON.
- **Pinned layout.** Inline style forces `position: fixed`, safe-area-aware `right`/`bottom`, `zIndex: 10000`, `transform: translateZ(0)`, `contain: "layout paint"`, and `direction: ltr` so the widget never drifts left or jumps between routes.

### 4. Vibe — GLM Coding Studio

[/vibe](./client/src/pages/Vibe.tsx) is a token-gated vibe-coding studio powered by Z.AI GLM (`ZAI_API_KEY`). The frontend streams from `/api/zai/chat/stream`; the page itself is $CLAWD-gated behind `TokenGate`.

### 5. Chart + TokenInsights — Solana Tracker Realtime

[/chart/:address](./client/src/pages/Chart.tsx) now embeds [TokenInsights](./client/src/components/TokenInsights.tsx): bubble map of holders, bundler heat, risk tabs, ATH, trending context. All series come from Solana Tracker via [server/_core/solanaTracker.ts](./server/_core/solanaTracker.ts), exposed as `trpc.solanaTracker.{tokenOverview,holders,bundlers,price,ath,trending,chatContext}`. A 30–60s LRU TTL caches responses to protect the API budget. Extraction helpers `BASE58_RE` + `TICKER_RE` drive both the insights panel and the ClawdGuide token-context bridge.

Env: `SOLANA_TRACKER_API_KEY=...`

### 6. CLAWD x402 Solana Facilitator

CLAWD runs its own x402 USDC-on-Solana facilitator at [server/_core/x402Facilitator.ts](./server/_core/x402Facilitator.ts). Supports the full facilitator interface:

| Route | Purpose |
| --- | --- |
| `GET /api/x402/facilitator/supported` | Returns supported schemes/networks (`exact`, `solana`) |
| `POST /api/x402/facilitator/verify` | Verifies an `X-Payment` header against the advertised `accepts[]` requirement |
| `POST /api/x402/facilitator/settle` | Submits the signed USDC transfer, confirms it on-chain, returns a base64 receipt |

Internally `settle()` base64-decodes the payload, extracts the SPL transfer instruction by discriminator (`3`), calls `connection.simulateTransaction` for pre-flight, then `sendRawTransaction` + `confirmTransaction`. Duplicate signatures are treated as success (idempotent).

Env:

```bash
X402_RECIPIENT_WALLET=...
X402_FEE_PAYER_PRIVATE_KEY=...      # base58, server-side only
X402_NETWORK=mainnet                # or devnet
X402_USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
X402_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
X402_MAX_PER_REQUEST_USD=1.00
X402_MAX_PER_SESSION_USD=10.00
```

#### /x402 — Hardened browser payment flow

[/x402](./client/src/pages/X402.tsx) is the client-side page that handles an HTTP 402 response end to end. It parses the `?requirements=` challenge out of the URL, validates it, asks the connected Solana wallet to sign an x402 payment header, and (on success) prints the base64 header for the retry. A **demo mode** kicks in automatically when the URL carries no challenge so the flow is exercisable without a real 402.

Hardening lives in [client/src/lib/x402.ts](./client/src/lib/x402.ts) — every challenge has to pass:

- `isValidSolanaAddress` (base58, 32–44 chars) for recipient and token mint
- Amount parses as a `BigInt` in `(0, 1_000_000 USDC]` — no zero, no absurd ceilings
- Network ∈ `{solana-mainnet, solana-devnet}`
- Nonce ≥ 8 chars, expiry inside `[-30d, +365d]` (refuses past and far-future challenges)
- Wallet pubkey must be base58 before signing, and the returned Ed25519 signature must be exactly 64 bytes
- Re-sign prevention: once a header is signed the button locks out (nonces are one-shot)

The page also holds a **Routing / $CLAWD Holder / History** tab group that reuses [client/src/lib/clawdrouter.ts](./client/src/lib/clawdrouter.ts) so the same tier mapping, featured model list, and `CLAWD_HOLDER_TIERS` surface in payment context.

### 7. ClawdRouter — Pay-Per-Inference Proxy

[`POST /api/clawdrouter/v1/chat/completions`](./server/_core/app.ts) is an OpenAI-compatible proxy that is wired end-to-end with the facilitator:

1. No `X-Payment` header → responds `402` with x402 requirements (`x402Version`, `accepts[]`, `scheme`, `network`, `asset`, `maxAmountRequired`, `payTo`, `resource`, `extra.facilitator`).
2. Header present → calls `x402Facilitator.settle({ header })`.
3. On settlement → forwards to OpenRouter (with [App Attribution](./docs/openrouter-attribution.md) headers) or xAI Grok depending on model.
4. Streams the completion back and emits `X-Payment-Response` with the base64 receipt.

An advertisement endpoint at `GET /api/clawdrouter` publishes the capability card (model list, profiles `ECO/AUTO/PREMIUM`, the 15-dim scorer, tier classification, config + security, OpenRouter attribution).

Live demo: [/router/demo](./client/src/pages/RouterDemo.tsx). The page signs a USDC transfer via `wallet.signTransaction`, base64-encodes it as the `X-Payment` header, and exercises the full 402 → pay → retry loop. The [RouterGuide](./client/src/pages/RouterGuide.tsx) at `/router` now surfaces a prominent **Try Live Demo** callout that deep-links into it.

Connection fix: `Connection(`${window.location.origin}/api/rpc`)` (absolute URL required by `@solana/web3.js`).

#### /clawdrouter — Specialist agents picker + routing UI

[/clawdrouter](./client/src/pages/ClawdRouter.tsx) is the public capability surface for the router. Three tabs:

- **Agents** — live-fetches the 43 registered DeFi/CLAWD specialist personas from [`GET /api/clawdrouter/agents`](./server/_core/app.ts). Searchable by title/tag/description, filterable by category. Clicking a card reveals the full `systemRole`, opening message, opening questions, and a copy-to-clipboard `clawdrouter/agent/<id>` model id that any OpenAI-compatible client can paste into the `model` field.
- **Routing** — ECO/AUTO/PREMIUM profile cards and the tier → model mapping table.
- **Models** — featured-model grid with cost/req, context window, quality score.

Backed by:

| Surface | Purpose |
| --- | --- |
| [server/_core/clawdrouterAgents.ts](./server/_core/clawdrouterAgents.ts) | Whitelist of 43 agent IDs, mtime-cached JSON loader over `agents/src/*.json`, path-traversal guard, `summarizeAgent` for list response |
| `GET /api/clawdrouter/agents` | List endpoint — lightweight summaries only |
| `GET /api/clawdrouter/agents/:id` | Detail endpoint — full record including `config.systemRole` |
| [client/src/lib/clawdrouter-agents.ts](./client/src/lib/clawdrouter-agents.ts) | Browser-safe port: `REGISTERED_AGENT_IDS`, `isAgentModel`, `extractAgentId`, `buildAgentModelId`, `fetchAgentList`, `fetchAgent` |

Ported from the standalone `ClawdRouter-main/clawdrouter/src/agents/` module so the web app and the CLI router agree on identifier, model-id prefix (`clawdrouter/agent/`), and whitelist.

### 7.5 Voice — Grok realtime voice agent with screen-aware tools

[/voice](./client/src/pages/Voice.tsx) is a token-gated, browser-native voice chat with Grok. Mic in, audio out, with server-side `web_search` + `x_search` and client-side tools for screen capture and token metrics.

Wire-up:

| Surface | Purpose |
| --- | --- |
| `POST /api/grok/voice/ephemeral-token` | Mints a scoped `client_secret` against `POST https://api.x.ai/v1/realtime/client_secrets`. Session-gated — only authenticated CLAWD holders can drain xAI quota. |
| `WS /ws/grok/voice` | Server-side proxy to `wss://api.x.ai/v1/realtime`. Pre-configures the session with the "clawd" persona, `turn_detection: server_vad`, and the tool roster (web_search, x_search, get_price, get_token_info, look_at_screen). Forwards `response.audio.delta`, text transcripts, and `function_call` events back to the client. |
| `POST /api/grok/vision/describe` | Session-gated Grok vision endpoint. Accepts `data:image/*` or `https://` URLs up to 8MB, returns a short text description. Backs the `look_at_screen` tool so the voice agent can see the user's shared screen. |
| [client/src/lib/voice/realtime.ts](./client/src/lib/voice/realtime.ts) | `VoiceClient` — ephemeral token fetch, mic → PCM16 @ 24kHz capture, base64 audio queue with monotonic playhead, VU meter, tool dispatch, interrupt support. |
| [client/src/lib/voice/screen.ts](./client/src/lib/voice/screen.ts) | `openScreenCaptureSession` holds a `getDisplayMedia` stream across calls, `grab()` returns a scaled JPEG data URL, `describeImage()` POSTs to the vision endpoint. |

The page embeds a [LightweightChart](./client/src/components/LightweightChart.tsx) next to the transcript so the voice agent has something real to look at when you ask it to read the chart back to you. Tools surface in the transcript as `tool` pills so you can see what the agent is calling.

**Session flow for newcomers:** wallet sign-in runs on first click of _Start call_ — `useWalletSignIn` handles challenge → `signMessage` → `/api/auth/verify`, then we trust its own result rather than re-fetching `auth.me` (the `invalidate()` races the cookie write and caused a "no session was created" loop on preview builds).

### 8. Styling Pass — Solana Brand + Retro CRT

[client/src/index.css](./client/src/index.css) was retuned to the Solana brand palette (`--color-neon-green: #14F195`, `--color-neon-purple: #9945FF`) with brand-tinted CRT scanlines, a layered purple/green grid overlay, glass panels with a scanline pseudo-element, and a brand scrollbar + selection + focus ring.

### 9. Pop-Out QoL Fixes

- ScrollArea in floating panels: added `min-h-0` to the `flex-1` child (Tailwind flexbox trap) so the scroll container actually scrolls. Code blocks use `wrap-anywhere` + `[&_pre]:overflow-x-auto`.
- Bundle stability: removed `@solana-program/*` from `rollupOptions.external`, added the installed subset to `optimizeDeps.include` in [vite.config.ts](./vite.config.ts). Blank-page regression is fixed.
- Lambda ship: `vercel.json` has `includeFiles: "agents/**"` so `/api/agents/catalog` finds its assets on Vercel, plus `/.well-known/(.*)` → `/api` and a CSP that permits `'unsafe-eval'` for the Telegram widget.

## Sitemap

All routes are SPA — Vercel rewrites `/((?!api).*)` to `index.html` (see [vercel.json](./vercel.json)), so deep links like `/brain`, `/router/demo`, or `/agents/explorer` work identically on `solanaclawd.com` and preview builds. Back buttons use `window.history.back()` with a per-page `backTo` fallback for direct loads.

| Route | Page | Gate | Back target (direct load) |
| --- | --- | --- | --- |
| `/` | [Home](./client/src/pages/Home.tsx) | public | — |
| `/terminal` | [Terminal](./client/src/pages/Terminal.tsx) | $CLAWD | — |
| `/agents` | [AgentGallery](./client/src/pages/AgentGallery.tsx) | public | `/` |
| `/agents/registry` | [AgentRegistry](./client/src/pages/AgentRegistry.tsx) | public | `/agents` |
| `/agents/explorer` | [AgentExplorer](./client/src/pages/AgentExplorer.tsx) — live `mpl-agent-registry` feed via Helius RPC | public | `/agents` |
| `/agents/mint` | [AgentMint](./client/src/pages/AgentMint.tsx) — unified wallet card, no login | public | `/agents` |
| `/agents/:address` | [AgentChat](./client/src/pages/AgentChat.tsx) | public | `/agents` |
| `/agents/hosted/:address` | [AgentChat](./client/src/pages/AgentChat.tsx) — embed shell | public | `/agents` |
| `/agents/gallery` | redirects → `/agents` | — | — |
| `/brain` | [Brain (Clawd's Brain)](./client/src/pages/Brain.tsx) | $CLAWD | `/terminal` |
| `/strategy` | [Strategy](./client/src/pages/Strategy.tsx) | $CLAWD | `/terminal` |
| `/swap` | [Swap](./client/src/pages/Swap.tsx) | $CLAWD | `/` |
| `/store` | [Store](./client/src/pages/Store.tsx) | $CLAWD | `/terminal` |
| `/vibe` | [Vibe](./client/src/pages/Vibe.tsx) — GLM coding studio | $CLAWD | `/` |
| `/predict` | [Predict](./client/src/pages/Predict.tsx) — DFlow + Jupiter markets | $CLAWD | `/terminal` |
| `/orders` | [Orders](./client/src/pages/Orders.tsx) — Trigger / DCA / Swap | $CLAWD | `/terminal` |
| `/pump` | [Pump](./client/src/pages/Pump.tsx) — PumpFun launch monitor | public | `/terminal` |
| `/portfolio` | [Portfolio](./client/src/pages/Portfolio.tsx) | $CLAWD | `/terminal` |
| `/treasury` | [Treasury](./client/src/pages/Treasury.tsx) | $CLAWD | `/terminal` |
| `/chart/:address?` | [Chart](./client/src/pages/Chart.tsx) + [TokenInsights](./client/src/components/TokenInsights.tsx) | public | `/` |
| `/docs` | [SolanaClawdDocs](./client/src/pages/SolanaClawdDocs.tsx) — includes `#clawdrouter-routing` system diagram | public | `/` |
| `/router` | [RouterGuide](./client/src/pages/RouterGuide.tsx) — build · attribution · agent · API | public | `/` |
| `/router/demo` | [RouterDemo](./client/src/pages/RouterDemo.tsx) — live pay-per-inference demo | public | `/router` |
| `/clawdrouter` | [ClawdRouter](./client/src/pages/ClawdRouter.tsx) — specialist agents picker + routing/models tabs | public | `/` |
| `/x402` | [X402](./client/src/pages/X402.tsx) — hardened HTTP 402 payment flow | public | `/` |
| `/voice` | [Voice](./client/src/pages/Voice.tsx) — Grok realtime voice + screen-aware tools | $CLAWD | `/terminal` |
| `/migrate`, `/launch` → `/`, `/home` → `/` | [MigrationGuide](./client/src/pages/MigrationGuide.tsx) + redirects | public | `/` |
| `/soul` | [SoulGenerator](./client/src/pages/SoulGenerator.tsx) | public | `/` |
| `/soul/lore` | [SoulLore](./client/src/pages/SoulLore.tsx) | $CLAWD | `/soul` |
| `/auth/callback`, `/terminal/auth/callback` | [AuthCallback](./client/src/pages/AuthCallback.tsx) | public | — |
| `*` | [NotFound](./client/src/pages/NotFound.tsx) | public | — |

### HTTP + tRPC API surface

| Surface | Purpose |
| --- | --- |
| `GET /api/clawdrouter` | Capability card for the router (now advertises specialist-agent count + list URL) |
| `POST /api/clawdrouter/v1/chat/completions` | x402-gated pay-per-inference proxy (OpenAI-compatible) |
| `GET /api/clawdrouter/agents` | List the 43 specialist agents (summary shape, for pickers) |
| `GET /api/clawdrouter/agents/:id` | Full specialist record including `config.systemRole` |
| `GET /api/x402/facilitator/supported` | Facilitator scheme/network advertisement |
| `POST /api/x402/facilitator/verify` | Verify an `X-Payment` header |
| `POST /api/x402/facilitator/settle` | Submit + confirm a USDC payment |
| `GET /api/voice/session` | Grok voice session capability card (ephemeral token URL, proxy URL, pre-wired remote MCP servers) |
| `POST /api/grok/voice/ephemeral-token` | Mint a short-lived xAI `client_secret` — session-gated |
| `WS /ws/grok/voice` | Server-side proxy to `wss://api.x.ai/v1/realtime` with the "clawd" session pre-configured |
| `POST /api/grok/vision/describe` | Grok vision backing for `/voice`'s `look_at_screen` tool — session-gated |
| `POST /api/grok/record` | Append a ClawdGuide exchange into Honcho per wallet |
| `POST /api/zai/chat/stream` | GLM streaming endpoint for Vibe |
| `GET /api/agents/catalog` | Bundled agent catalog (multi-candidate path resolution, Vercel `includeFiles: "agents/**"`) |
| `trpc.mintAgent` | Public mint mutation (accepts `walletAddress`, validates UTF-8 byte lengths, auto-pins oversized URIs) |
| `trpc.agent.brain` | Owner-scoped Honcho brain snapshot |
| `trpc.metaplex.recentAgents` | Helius-sourced live feed for `/agents/explorer` |
| `trpc.wallet.verifyHolder` | Shared holder check (gates `/brain`, `/vibe`, ClawdGuide) |
| `trpc.solanaTracker.*` | `tokenOverview`, `holders`, `bundlers`, `price`, `ath`, `trending`, `chatContext` |

### Featured on-chain agents

| Agent | Address |
| --- | --- |
| CLAWD Agent | see `/agents` Featured strip |
| ClawdFather | see `/agents` Featured strip |
| Агент-снайпер | see `/agents` Featured strip |

**Categorized top nav.** Every page (including the Home landing page) now shares a single [NavHeader](./client/src/components/NavHeader.tsx) with four Radix dropdown categories driven by [nav-categories.tsx](./client/src/components/nav-categories.tsx):

- **Trade** — Swap · Orders · Predict · Pump · Charts · Portfolio · Treasury · Store · Strategy
- **Agents** — Agent Hub · Gallery · Registry · Explorer · Mint
- **Studio** — Soul Gen · Soul Lore · Vibe · Brain
- **Router** — ClawdRouter · Router Demo · x402 Payment · Clawd Docs · Migrate

The header highlights the active category and the active item; an always-visible **ENTER** CTA takes the operator to `/terminal`. On mobile, the menu switches to a two-column grid per category. Pages inside the Agents section additionally render a shared [AgentSubNav](./client/src/components/AgentSubNav.tsx) pill strip (HUB · GALLERY · REGISTRY · MINT · EXPLORER · BRAIN) as a breadcrumb/switcher; [AgentCatalog](./client/src/components/AgentCatalog.tsx) exposes a sticky `ONE-SHOT · TEMPLATES · LIBRARY` tab strip with live counts that anchor-jumps between the three catalog sections. The Terminal sidebar continues to surface the full operator toolbelt (Agent Gallery, Agent Registry, Agent Explorer, Mint Agent, Clawd's Brain, Strategy Builder, Swap, Store).

**Agent Explorer.** [/agents/explorer](./client/src/pages/AgentExplorer.tsx) is a live feed of newly registered agents on the Metaplex `mpl-agent-registry` program. The server streams recent program signatures via Helius RPC ([`umi.rpc.call('getSignaturesForAddress', …)`](./server/_core/metaplexAgent.ts)), derives the Core asset for each transaction by checking which `accountKey`'s `findAgentIdentityV1Pda` is also present in that same transaction (no extra RPC for discovery), then enriches each hit via `fetchAsset` + `findAssetSignerPda` + the registration document. Exposed through `trpc.metaplex.recentAgents` and auto-refreshed every 30s in the UI.

## SOUL Engine

The `solana-clawd` prompt stack is designed as a two-part engine:

- [SOUL.md](./SOUL.md) is the stable identity, epistemology, and permission layer
- [SOUL_TEMPLATE.md](./SOUL_TEMPLATE.md) is the user-facing specialization template that gets paired with it

If you are running on Grok, use the companion guide at [docs/grok-prompting.md](./docs/grok-prompting.md) to keep the `SOUL.md` prefix stable and move only live task context into the user prompt.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Production build:

```bash
pnpm build
pnpm start
```

## One-Shot Bootstrap

For E2B shells, non-root terminals, fresh Linux boxes, cloud dev environments, and agent sandboxes:

```bash
bash scripts/bootstrap.sh
```

What it does:

* checks Node 20+
* installs Go locally if `go` is missing
* installs SolanaOS
* clones `solana-clawd`
* creates `.env` from `.env.example` if needed
* runs `npm run setup`

After bootstrap, reload your shell and start SolanaOS:

```bash
source ~/.bashrc
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

---

## Environment

Use [`.env.example`](./.env.example) as the deployment template. The runtime currently expects:

- Public domains: `PUBLIC_PAGES_URL=https://beepboop-solanaclawd.pages.dev`, `PUBLIC_APP_URL=https://beepboop.solanaclawd.com`, `PUBLIC_AGENT_BASE_URL=https://solanaclawd.com`, `PUBLIC_AGENT_GALLERY_URL=https://solanaclawd.com/agents`, `PUBLIC_AGENT_A2A_URL=https://solanaclawd.com/api/agents/a2a`, `PUBLIC_AGENT_API_URL=https://solanaclawd.com/api/agents`, `PUBLIC_AGENT_MCP_URL=https://mcp.solanaclawd.com`, `PUBLIC_PUMP_SCANNER_URL=https://pump-scanner-cron.x402.workers.dev`, `PUBLIC_CLAWD_TOKEN_URL=https://beepboop.solanaclawd.com/chart?address=8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
- App/auth: `DATABASE_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `PHANTOM_APP_ID`, `VITE_PHANTOM_APP_ID`, `VITE_REOWN_PROJECT_ID`
- Solana: `HELIUS_API_KEY`, `HELIUS_RPC_URL`, `BIRDEYE_API_KEY`, `VITE_CLAWD_TOKEN_ADDRESS`
- DFlow: `DFLOW_API_KEY`, `DFLOW_TRADING_API_BASE_URL=https://quote-api.dflow.net`, `DFLOW_PREDICTION_API_BASE_URL=https://dev-prediction-markets-api.dflow.net`, `DFLOW_PRIORITY_FEES_WS_URL` (optional override)
- Social: `TELEGRAM_BOT_TOKEN`, `TWITTER_BEARER_TOKEN`
- AI/image: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_EL=openrouter/elephant-alpha`, `DEFAULT_CHAT_MODEL=openrouter/elephant-alpha`, `XAI_API_KEY`, `XAI_BASE_URL=https://api.x.ai/v1`, `XAI_TEXT_MODEL=grok-4.20-reasoning`, `XAI_IMAGE_MODEL=grok-imagine-image`, `XAI_VIDEO_MODEL=grok-imagine-video`, `FAL_API_KEY`, `GATEWAY_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `LOCAL_AGENT_GATEWAY_URL`, `LOCAL_AGENT_GATEWAY_API_KEY`, `LOCAL_AGENT_GATEWAY_MODEL`, `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`, `OLLAMA_API_KEY=ollama`, `OLLAMA_MODEL=llama3.1:8b`
- MiniMax studio: `MINIMAX_CODING_TOKEN`, `MINIMAX_BASE_URL=https://api.minimax.io/v1`, `MINIMAX_TEXT_MODEL=MiniMax-M2.7`, `MINIMAX_SPEECH_MODEL=speech-2.8-hd`, `MINIMAX_SPEECH_VOICE_ID=English_expressive_narrator`
- Media models: `FAL_SEE_TEXT_MODEL`, `FAL_SEE_IMAGE_MODEL`, `MINIMAX_API_KEY`, `MINI_MUSIC_MODEL`, `FAL_MUSIC_MODEL`
- E2B: `E2B_API_KEY`, `GIT_USERNAME`, `GIT_TOKEN`, `OPENCLAW_APP_TOKEN`

---

## What is Included

### SolanaOS

SolanaOS is the Go-native operator runtime. The canonical install path is:

```bash
npx solanaos-computer@latest install --with-web
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos version
~/.solanaos/bin/solanaos server
~/.solanaos/bin/solanaos daemon
```

You can also run it locally from source:

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd solanaos
cp .env.example .env
bash start.sh
```

### solana-clawd

solana-clawd is the Grok-powered agentic layer for:

* chat, vision, image generation, voice
* multi-agent research and structured outputs
* MCP tools and Solana market intelligence
* creative and meme workflows

### Solana Trading Plugin

Install the **solana-trader** plugin to add Jupiter swap execution, portfolio tracking, and pump.fun launch capabilities to your terminal.

```bash
npx skills add https://github.com/solana-clawd/openclaw-solana-plugins --skill solana-trader
```

Or install via skills.sh:

```bash
npx skills add https://skills.sh/solana-clawd/openclaw-solana-plugins/solana-trader
```

> Browse all available plugins at [skills.sh/solana-clawd](https://skills.sh/solana-clawd)

### E2B

E2B provides:

* secure code sandboxes
* Linux desktop sandboxes for computer use
* prebuilt templates for **Claude Code**, **OpenCode**, and **OpenClaw**
* pause/resume persistence
* list/connect lifecycle management
* controlled outbound networking
* git helpers
* Python code execution with chart and result streaming

---

## Service Ports

| Service                   |  Port | Start path                               |
| ------------------------- | ----: | ---------------------------------------- |
| SolanaOS daemon / gateway | 18790 | `bash start.sh` or `solanaos daemon`     |
| SolanaOS Control UI       |  7777 | `solanaos server`                        |
| Agent Wallet              |  8421 | auto-started by `start.sh` or standalone |
| solanaos-mcp              |  3001 | auto-started by `start.sh`               |
| control-api               | 18789 | standalone control API                   |

---

## E2B-Native Workflows

### 1. Desktop Computer Use

For GUI agents, E2B Desktop gives you an Ubuntu/XFCE desktop with screenshot, mouse, keyboard, and VNC streaming support.

```bash
npm i @e2b/desktop
```

```ts
import { Sandbox } from "@e2b/desktop";

const sandbox = await Sandbox.create({
  resolution: [1024, 720],
  dpi: 96,
  timeoutMs: 300_000,
});

await sandbox.stream.start();
console.log(sandbox.stream.getUrl());

await sandbox.leftClick(500, 300);
await sandbox.write("hello world");
await sandbox.press("Enter");
const screenshot = await sandbox.screenshot();
```

### 2. Claude Code in E2B

E2B ships a prebuilt `claude` template with Claude Code already installed.

```ts
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create("claude", {
  envs: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
});

const result = await sandbox.commands.run(
  `claude --dangerously-skip-permissions -p "Create a hello world HTTP server in Go"`
);

console.log(result.stdout);
```

### 3. OpenCode in E2B

```ts
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create("opencode", {
  envs: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
});

const result = await sandbox.commands.run(
  `opencode run "Create a hello world HTTP server in Go"`
);

console.log(result.stdout);
```

### 4. OpenClaw in E2B

```ts
import { Sandbox } from "e2b";

const TOKEN = process.env.OPENCLAW_APP_TOKEN || "my-gateway-token";
const PORT = 18789;

const sandbox = await Sandbox.create("openclaw", {
  envs: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
  timeoutMs: 3600_000,
});

await sandbox.commands.run(
  `bash -lc 'openclaw config set gateway.controlUi.allowInsecureAuth true && \
openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true && \
openclaw gateway --allow-unconfigured --bind lan --auth token --token ${TOKEN} --port ${PORT}'`,
  { background: true }
);

console.log(`https://${sandbox.getHost(PORT)}/?token=${TOKEN}`);
```

### 5. Persistence, Pause, Resume

E2B sandboxes can be paused and resumed with filesystem and memory state preserved.

```ts
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create();
await sandbox.pause();

const resumed = await Sandbox.connect(sandbox.sandboxId);
```

### 6. List and Reconnect

```ts
import { Sandbox } from "e2b";

const paginator = Sandbox.list({
  query: { state: ["running", "paused"] },
});

const items = await paginator.nextItems();
const sbx = await Sandbox.connect(items[0].sandboxId);
```

### 7. Internet Controls

```ts
import { Sandbox, ALL_TRAFFIC } from "e2b";

const sandbox = await Sandbox.create({
  network: {
    allowOut: ["api.example.com", "*.github.com"],
    denyOut: [ALL_TRAFFIC],
  },
});
```

### 8. Git Integration

```ts
await sandbox.git.clone("https://github.com/your-org/your-repo.git", {
  path: "/home/user/repo",
  username: "x-access-token",
  password: process.env.GITHUB_TOKEN,
  depth: 1,
});
```

### 9. Code Interpreter

```bash
npm i @e2b/code-interpreter
```

```ts
import { Sandbox } from "@e2b/code-interpreter";

const sandbox = await Sandbox.create();

await sandbox.runCode(`
import matplotlib.pyplot as plt
plt.plot([1,2,3,4])
plt.ylabel("some numbers")
plt.show()
`, {
  onStdout: data => console.log(data),
  onStderr: data => console.error(data),
  onResult: result => console.log(result),
});
```

### 10. Preinstalled Python Stack

The E2B data sandbox includes pandas, matplotlib, numpy, openpyxl, plotly, scikit-learn, scipy, pillow, and python-docx.

---

## E2B API Endpoints

This terminal exposes E2B sandbox management through both tRPC and REST:

### tRPC (via `trpc.e2b.*`)

| Procedure       | Type     | Description                        |
| --------------- | -------- | ---------------------------------- |
| `e2b.create`    | mutation | Create a sandbox (template, envs)  |
| `e2b.list`      | query    | List running/paused sandboxes      |
| `e2b.connect`   | mutation | Reconnect to a sandbox by ID       |
| `e2b.pause`     | mutation | Pause a sandbox                    |
| `e2b.resume`    | mutation | Resume a paused sandbox            |
| `e2b.kill`      | mutation | Kill a sandbox                     |
| `e2b.run`       | mutation | Execute a command in a sandbox     |
| `e2b.writeFile` | mutation | Write a file inside a sandbox      |
| `e2b.readFile`  | query    | Read a file from a sandbox         |
| `e2b.gitClone`  | mutation | Clone a repo into a sandbox        |
| `e2b.getUrl`    | query    | Get public URL for a sandbox port  |

### REST

| Method | Path                 | Description                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/e2b/create`    | Create a sandbox                   |
| GET    | `/api/e2b/list`      | List sandboxes                     |
| POST   | `/api/e2b/run`       | Run a command                      |
| POST   | `/api/e2b/pause`     | Pause a sandbox                    |
| POST   | `/api/e2b/resume`    | Resume a sandbox                   |
| POST   | `/api/e2b/kill`      | Kill a sandbox                     |
| POST   | `/api/e2b/write-file`| Write a file                       |
| POST   | `/api/e2b/read-file` | Read a file                        |
| POST   | `/api/e2b/git-clone` | Clone a repo                       |
| GET    | `/api/e2b/url`       | Get sandbox port URL               |

---

## DFlow Setup (Complete)

This repo now includes a first-class DFlow integration in the server tRPC layer.

### 1) Environment

Add these to your `.env` (or `.env.local`):

```bash
DFLOW_API_KEY=your_dflow_api_key
DFLOW_TRADING_API_BASE_URL=https://quote-api.dflow.net
DFLOW_PREDICTION_API_BASE_URL=https://dev-prediction-markets-api.dflow.net
# Optional; auto-derived from trading base URL when omitted
DFLOW_PRIORITY_FEES_WS_URL=
```

### 2) tRPC Routes

All DFlow routes are mounted at `trpc.dflow.*`.

- `dflow.status`
- `dflow.trading.priorityFees`
- `dflow.trading.priorityFeesStreamInfo`
- `dflow.trading.predictionMarketInit`
- `dflow.trading.tokens`
- `dflow.trading.tokensWithDecimals`
- `dflow.trading.venues`
- `dflow.metadata.tagsByCategories`
- `dflow.metadata.filtersBySports`
- `dflow.metadata.series`
- `dflow.metadata.seriesByTicker`
- `dflow.metadata.events`
- `dflow.metadata.event`
- `dflow.metadata.searchEvents`
- `dflow.markets.markets`
- `dflow.markets.market`
- `dflow.markets.marketByMint`
- `dflow.markets.marketsBatch`
- `dflow.markets.outcomeMints`
- `dflow.orderbook.byMarketTicker`
- `dflow.orderbook.byMint`
- `dflow.trades.list`
- `dflow.trades.byMint`
- `dflow.trades.onchain`
- `dflow.trades.onchainByEvent`
- `dflow.trades.onchainByMarket`
- `dflow.liveData.byMilestones`
- `dflow.liveData.byEvent`
- `dflow.liveData.byMint`
- `dflow.candlesticks.event`
- `dflow.candlesticks.market`
- `dflow.candlesticks.marketByMint`
- `dflow.forecastHistory.byEvent`
- `dflow.forecastHistory.byMint`
- `dflow.proxy` (protected passthrough for advanced calls)

### 3) Runtime Visibility

`trpc.system.runtime` now includes a `dflow` block with API key presence and configured base URLs.

### 4) Smoke Test

Run:

```bash
pnpm dflow:smoke
```

The smoke script validates both trading + prediction endpoints and attempts a priority-fees websocket handshake.

---

## Burn + Lock Mechanism v2.0

**Hardened gasless $CLAWD burn system** with a dedicated treasury wallet for sponsored message burns, shared pricing, and on-chain burn tracking. The manual burn tab remains a self-burn flow signed by the user's wallet. The lock UI is present, but Streamflow lock creation is not wired end-to-end yet.

### Security Properties

| Property | Implementation |
|----------|----------------|
| **Zero Key Exposure** | User wallets never share private keys; treasury signing stays server-side and isolated |
| **Gasless Burn Mode** | Chat/action burn mode spends treasury SOL and treasury CLAWD, so the user does not need SOL for those burns |
| **Irreversible Burns** | Two-step confirmation with clear irreversibility warning |
| **Auditable** | Burns are visible on-chain and reflected in the scoreboard/history queries |
| **Shared Pricing** | Client burn mode and server pricing endpoint use the same tier map and USD costs |
| **Treasury Hardening** | Sponsored burns derive amount server-side, require a token-gated wallet, and enforce replay/rate-limit guards |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAWD Burn + Lock v2.0                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  User Browser    │    │         Server-side               │  │
│  │  ┌────────────┐  │    │  ┌────────────────────────────┐  │  │
│  │  │TokenActions│  │    │  │ Sponsored burn router      │  │  │
│  │  │Burn Mode   │  │    │  │ - derives cost server-side │  │  │
│  │  └──────┬─────┘  │    │  │ - verifies token gate      │  │  │
│  │         │        │    │  │ - signs with treasury      │  │  │
│  └─────────┼────────┘    │  └──────────────┬─────────────┘  │  │
│            │             │                 │                │  │
│            ▼             │         ┌───────▼────────┐       │  │
│     ┌────────────┐       │         │ Birdeye /      │       │  │
│     │ User wallet│       │         │ DexScreener    │       │  │
│     │ self-burns │       │         │ price oracle   │       │  │
│     │ only       │       │         └────────────────┘       │  │
│     └─────┬──────┘       │                    │              │  │
│           │              │                    ▼              │  │
│           ▼              │             ┌──────────┐          │  │
│    ┌──────────────┐      │             │Streamflow│          │  │
│    │ Solana       │      │             │ Locks /  │          │  │
│    │ Mainnet      │      │             │ Vesting  │          │  │
│    │ (On-chain)   │      │             └──────────┘          │  │
│    └──────────────┘      │                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

**`client/src/components/TokenActions.tsx`**
- User-initiated self-burn UI
- Mode toggle: BURN vs LOCK/VEST tabs
- Uses the active Solana wallet adapter signer
- VersionedTransaction burn with ComputeBudget priority fee
- Two-step burn confirmation with irreversibility warning
- Lock mode currently collects intent only and does not submit a Streamflow transaction

**`client/src/contexts/BurnModeContext.tsx`**
- Session burn tracking and price oracle
- Uses a protected server-side sponsored burn path for burn mode
- Tracks `totalBurnedSession`, `clawdPriceUsd`, and sponsored burn availability

**`scripts/maintenance.ts`**
- Server-side maintenance script
- Operations: `closeEmptyATAs`, `burnClawdSecurely`, `createClawdLockOrVesting`
- Uses `MAINTENANCE_WALLET_SECRET_KEY` from `.env`

### Burn Mode UI

The Terminal page (`client/src/pages/Terminal.tsx`) includes a burn tab with:

- **TokenActions**: Burn/Lock interface with amount input, MAX button, preset amounts (100, 1K, 10K, 100K)
- **BurnScoreboard**: Community burn statistics and leaderboard

### Streamflow Status

The lock/vest panel is currently a UI placeholder for a future Streamflow integration. It does not create on-chain locks yet, so the hardened lock guarantees below are design targets rather than live behavior.

### Setup Instructions

1. **Environment Variables**
```bash
# Required for Burn + Lock v2.0
VITE_CLAWD_TOKEN_ADDRESS="8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"
BURN_WALLET_TREASURY="GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4"
BURN_WALLET_TREASURY_PRIVATE_KEY="your-base58-encoded-private-key"
AGENT_MINT_BURN_COST_USD="0.05"
BIRDEYE_API_KEY="your-birdeye-api-key"
HELIUS_API_KEY="your-helius-api-key"
HELIUS_RPC_URL="your-helius-rpc-url"
HELIUS_WALLET_API_BASE="https://wallet-api.helius.xyz"

# Optional maintenance wallet for server-side ops only
MAINTENANCE_WALLET_SECRET_KEY="your-base58-encoded-private-key"
```

2. **Database Setup**
```bash
pnpm drizzle:push
```

3. **Run Maintenance Script** (optional)
```bash
npx tsx scripts/maintenance.ts --operation=burnClawdSecurely --amount=1000
```

### Burn Transaction Flow

```
1. User enables burn mode or triggers a priced burn action
2. Server derives the exact burn cost from the selected model/action
3. Server re-verifies the caller's CLAWD holding and enforces replay/rate-limit guards
4. Treasury wallet signs and submits the burn transaction
5. On-chain burn executes from the treasury wallet
6. UI updates session stats and refreshes scoreboard/history
```

### Agent Mint Treasury Burn

```
1. User successfully mints or one-shot deploys a Metaplex agent
2. Server computes AGENT_MINT_BURN_COST_USD worth of CLAWD using live price data
3. Treasury wallet burns that CLAWD on-chain
4. Mint response includes the treasury burn details when successful
```

### Manual Self-Burn Flow

```
1. User inputs burn amount (100, 1K, 10K, 100K presets or custom)
2. User clicks "BURN CLAWD"
3. Confirmation modal displays the irreversible self-burn warning
4. User signs the transaction in their wallet
5. On-chain burn executes from the user's own token account
```

### Lock/Vest Flow Status

```
1. User selects LOCK tab
2. User inputs:
   - Amount to lock
   - Recipient address (or self)
   - Cliff percentage (0-100%)
   - Duration (30/90/180/365 days)
3. User clicks "CREATE LOCK"
4. The UI currently shows the intended Streamflow design and does not submit an on-chain lock transaction
```

### API Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/api/rpc` | POST | Proxied Solana RPC (hides API key) |
| `trpc.burn.pricing` | Query | Real-time CLAWD pricing and costs |
| `trpc.burn.walletBalances` | Query | Token balances via Helius DAS |
| `trpc.burn.burnHistory` | Query | On-chain burn transaction history |
| `trpc.burn.scoreboard` | Query | Aggregate burn statistics |
| `trpc.burn.walletIdentity` | Query | Wallet ENS/SNS lookup |

### Security Considerations

- **No server-side key exposure**: Helius API key proxied through `/api/rpc`
- **User signature required for self-burns only**: Manual burns require explicit wallet approval; sponsored burn mode does not
- **Irreversibility warning**: Two-step confirmation for burns
- **Treasury isolation**: Sponsored burns derive pricing server-side and never accept arbitrary client-provided burn amounts
- **Lock UI is not live yet**: Do not assume Streamflow locks are being created until that integration lands
- **On-chain audit**: All burns visible on Solana

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Burn transaction failed" | For self-burns, check wallet connection and ensure SOL for gas; for burn mode, check treasury config and token-gate status |
| "Insufficient balance" | Acquire more $CLAWD tokens |
| "Price unavailable" | Birdeye API rate-limited, wait for refresh |
| "Phantom not connected" | Install Phantom extension, connect wallet |

---

## Recommended Operator Flow

### Fastest

```bash
bash scripts/bootstrap.sh
source ~/.bashrc
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
cd ~/src/solana-clawd && npm run demo
```

### Full Local

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd solanaos
cp .env.example .env
bash start.sh
```

### E2B Coding Agent

```bash
e2b sbx create opencode
opencode
```

### E2B Claude Code

```bash
e2b sbx create claude
claude
```

### E2B OpenClaw

```bash
e2b sbx create openclaw
openclaw
```

---

## API Keys

CLAWD supports programmatic access via API keys for both users and agents. Keys use `clawd_sk_` prefix, SHA-256 hashed storage, and scope-based access control.

### Create a Key

```bash
# Via tRPC (browser session or existing API key)
curl -X POST https://your-app.com/trpc/apiKey.create \
  -H "Content-Type: application/json" \
  -H "Cookie: solana_session=<jwt>" \
  -d '{"json":{"name":"my-bot","scopes":["chat:read","chat:write"]}}'
```

The full key (`clawd_sk_...`) is returned **once** — store it securely.

### Use a Key

```bash
curl https://your-app.com/trpc/chat.send \
  -H "Authorization: Bearer clawd_sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"json":{"message":"hello"}}'
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `chat:read` | Read chat history |
| `chat:write` | Send messages |
| `image:generate` | Generate images |
| `agent:manage` | Create/update agents |
| `e2b:manage` | Manage E2B sandboxes |
| `burn:execute` | Execute sponsored burns |
| `admin` | Full admin access (owner only) |

### Agent Keys

Pass `agentWalletId` when creating a key to scope it to a specific agent wallet. Agent keys can only access resources associated with that agent.

### tRPC Routes

| Route | Type | Description |
|-------|------|-------------|
| `apiKey.create` | mutation | Create a new API key (max 10 per user) |
| `apiKey.list` | query | List your keys (prefix only, no secrets) |
| `apiKey.revoke` | mutation | Revoke a key by ID |
| `apiKey.usage` | query | Get usage stats for a key |
| `apiKey.scopes` | query | List all available scopes |

### Migration

```bash
# Apply the API keys migration
psql $DATABASE_URL < drizzle/0003_api_keys.sql
```

### Security Notes

- Keys are SHA-256 hashed before storage — the full key is never persisted
- Only the key prefix (`clawd_sk_xxxx...`) is stored for identification
- Expired keys are rejected at validation time
- All key usage is logged to `api_key_audit_log` for forensics
- Max 10 keys per user to prevent abuse

---

## Deploy

### clawd-terminal (Main App)

This app can be deployed as a single Node service:

- Build command: `pnpm build`
- Start command: `pnpm start`
- Port: `PORT`

Railway or Fly.io. The existing `fly.toml` targets app `clawd-terminal` in `ewr`.

```bash
# Deploy main app to Fly.io
fly deploy
```

### ClawdRouter (API Proxy)

ClawdRouter deploys as a separate Fly.io service — the OpenAI-compatible LLM proxy with smart routing, $CLAWD token gating, and API key auth.

```bash
cd clawdrouter

# Build TypeScript
npm run build

# Deploy to Fly.io
fly deploy
```

**Required secrets** (set via `fly secrets set`):

```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  DATABASE_URL=postgresql://... \
  HELIUS_API_KEY=... \
  CLAWDROUTER_INTERNAL_SECRET=your-shared-secret \
  CLAWDROUTER_VALIDATION_URL=https://clawd-terminal.fly.dev
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Routes to 55+ models via OpenRouter |
| `DATABASE_URL` | Yes* | Direct API key validation (same Neon DB) |
| `CLAWDROUTER_VALIDATION_URL` | Yes* | Or validate keys via main app's `/api/auth/validate-key` |
| `CLAWDROUTER_INTERNAL_SECRET` | Yes | Shared secret between router ↔ main app |
| `HELIUS_API_KEY` | No | For $CLAWD holder tier checks |

*One of `DATABASE_URL` or `CLAWDROUTER_VALIDATION_URL` is required for API key auth.

**Hosted mode behavior:**
- `x402` literal auth is disabled — users must use `clawd_sk_` API keys
- Rate limits: 1000 req/hr for API key users, tier-based for wallet auth
- All requests to `/v1/chat/completions` require authentication
- Health, models, and status endpoints remain public

**Usage after deployment:**

```bash
# With your API key from clawd-terminal
curl https://clawdrouter.fly.dev/v1/chat/completions \
  -H "Authorization: Bearer clawd_sk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"clawdrouter/auto","messages":[{"role":"user","content":"Hello"}]}'

# Or point any OpenAI-compatible client
client = OpenAI(base_url="https://clawdrouter.fly.dev/v1", api_key="clawd_sk_...")
```

## Docs

### Project docs

- [SOUL.md](./SOUL.md) — stable identity, epistemology, and permission layer
- [SOUL_TEMPLATE.md](./SOUL_TEMPLATE.md) — user-facing specialization template
- [TRADE.md](./TRADE.md) — Pump.fun trading agent skill (OODA loop, position sizing, guardrails)
- [docs/grok-prompting.md](./docs/grok-prompting.md) — keep the SOUL prefix stable on Grok
- [docs/ipfs-setup.md](./docs/ipfs-setup.md)
- [docs/migrate-from-openclaw.md](./docs/migrate-from-openclaw.md) — migrate legacy configs

### ClawdRouter docs

The ClawdRouter is the unified, token-gated, x402-aware LLM + Solana routing layer. Every endpoint checks `$CLAWD` holder status (Helius DAS) and falls back to x402 USDC payments on Solana.

- **[docs/CLAWD_ROUTER.md](./docs/CLAWD_ROUTER.md)** — full public API reference: the 10 `/api/solana-clawd/*` routes (chat, image, video, tts, stt, voice-token, voices, research, agentic, mcp-tools), auth contract, error shapes, env vars.
- **[docs/CLAWD_ROUTER_BUILD.md](./docs/CLAWD_ROUTER_BUILD.md)** — source-file templates for rebuilding the router from scratch: `lib/solana-clawd.ts`, `lib/solana-clawd-server.ts`, the per-route handler template, `.env.example`.
- **[docs/clawdrouter-agent-guide.md](./docs/clawdrouter-agent-guide.md)** — integration contract for Claude Code / Copilot / any AI agent calling the router (wallet-address convention, `clawd` metadata block, streaming pattern, xAI tool shapes).
- **[docs/openrouter-attribution.md](./docs/openrouter-attribution.md)** — headers the router sends on OpenRouter calls so the app appears on [openrouter.ai/rankings](https://openrouter.ai/rankings) (HTTP-Referer, X-OpenRouter-Title, X-OpenRouter-Categories, X-Title), recommended categories, localhost + privacy notes.

Mirror copies ship alongside the router package at [clawdrouter copy/docs/](./clawdrouter%20copy/docs/) (`api-reference.md`, `build.md`, `agent-guide.md`, `openrouter-attribution.md`, `architecture.md`, `configuration.md`, `routing-profiles.md`).

### In-app surfaces for the router

- **[/router](./client/src/pages/RouterGuide.tsx)** — 4-tab interactive guide: **Build** · **Attribution** · **Agent** · **API**. Covers the full rebuild walkthrough, OpenRouter attribution headers/categories/repo references, the agent integration rules (clawd metadata, gating pattern, streaming pattern), and the endpoint map + access-control model.
- **[/router/demo](./client/src/pages/RouterDemo.tsx)** — live routing playground.
- **[/x402](./client/src/pages/X402.tsx)** — hardened HTTP 402 payment flow. Parses `?requirements=<base64>` from the URL, validates schema + USDC mint + expiry + per-request limits, signs via the active unified wallet, and keeps a local payment history. Backed by [client/src/lib/x402.ts](./client/src/lib/x402.ts) (browser-safe `x402FetchWithRetry`, `createPaymentHeader`, `parsePaymentRequirements`, `X402Error`) and [client/src/lib/clawdrouter.ts](./client/src/lib/clawdrouter.ts) (profile + tier + holder-tier snapshots).
- **[/docs](./client/src/pages/SolanaClawdDocs.tsx)** — the broader solana-clawd docs hub includes a `#clawdrouter-agent` section that links out to all four router markdown docs and back to `/x402`.

---

## Positioning

**CLAWD Cloud OS** is the bootstrap layer.
**SolanaOS** is the Go-native runtime.
**solana-clawd** is the Grok-native agentic interface.
**E2B** is the secure execution and desktop substrate.

Together they give you:

* one-shot install
* no-root Go bootstrap
* terminal + web + MCP workflows
* desktop computer use
* sandbox persistence
* cloud coding agents
* Solana-native operator ergonomics
