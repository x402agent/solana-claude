# Skills

This directory contains 109 active skills. Each listed entry has a top-level `SKILL.md` under `skills/<slug>/`.

## Quick Index

- **AI / Agents**: `coding-agent`, `gemini`, `model-usage`, `openai-image-gen`, `openai-whisper`, `openai-whisper-api`, `oracle`, `sag`, `skill-creator`, `swarm-orchestrator`, `swarm-orchestrator copy`
- **Clawd Ecosystem**: `clawdhub`, `github`, `openclaw-claude-code-skill-main`
- **Communication**: `bluebubbles`, `discord`, `himalaya`, `imsg`, `slack`, `voice-call`
- **DevOps / Infrastructure**: `blucli`, `eightctl`, `gateway-node-ops`, `nano-banana-pro`, `openhue`, `tmux`
- **DFlow / Trading**: `dflow-docs`, `dflow-kalshi-market-data`, `dflow-kalshi-market-scanner`, `dflow-kalshi-portfolio`, `dflow-kalshi-trading`, `dflow-phantom-connect`, `dflow-platform-fees`, `dflow-proof-kyc`, `dflow-spot-trading`, `phantom-wallet-mcp`
- **Local / Web Services**: `food-order`, `local-places`
- **Media**: `camsnap`, `canvas`, `gifgrep`, `peekaboo`, `sherpa-onnx-tts`, `songsee`, `sonoscli`, `spotify-player`, `video-frames`
- **Other**: `bird`, `bird copy`
- **Productivity**: `1password`, `apple-notes`, `apple-reminders`, `bear-notes`, `notion`, `obsidian`, `ordercli`, `session-logs`, `things-mac`, `trello`
- **Pump.fun / Token Launch**: `pumpfun`, `pumpfun-analytics`, `pumpfun-fees`, `pumpfun-launcher`, `pumpfun-trading`
- **Solana / Blockchain**: `clawdex`, `dex-screener-scanner`, `imperial`, `imperial-execution-modes`, `imperial-grid-trading`, `imperial-margin-operations`, `imperial-market-intel`, `imperial-portfolio-intel`, `imperial-position-management`, `imperial-risk-management`, `imperial-skills-index`, `imperial-tpsl-management`, `imperial-trade-execution`, `imperial-twap-execution`, `magicblock`, `solana-clawd`, `solana-clawd-agentic-commerce`, `solana-formal-verification`, `ultrathink-blockchain`, `vulcan`, `vulcan-error-recovery`, `vulcan-execution-modes`, `vulcan-grid-trading`, `vulcan-lot-size-calculator`, `vulcan-margin-operations`, `vulcan-market-intel`, `vulcan-onboarding`, `vulcan-portfolio-intel`, `vulcan-position-management`, `vulcan-quickstart`, `vulcan-risk-management`, `vulcan-skills-index`, `vulcan-ta-strategy`, `vulcan-technical-analysis`, `vulcan-tpsl-management`, `vulcan-trade-execution`, `vulcan-twap-execution`
- **Web / Research**: `blogwatcher`, `gog`, `goplaces`, `mcporter`, `nano-pdf`, `summarize`, `wacli`, `weather`

## Full Catalog

### AI / Agents

| Skill | Name | Description |
|---|---|---|
| [`coding-agent`](coding-agent/SKILL.md) | coding-agent | Run Codex CLI, Claude Code, OpenCode, or Pi Coding Agent via background process for programmatic control. |
| [`gemini`](gemini/SKILL.md) | gemini | Gemini CLI for one-shot Q&A, summaries, and generation. |
| [`model-usage`](model-usage/SKILL.md) | model-usage | Use CodexBar CLI local cost usage to summarize per-model usage for Codex or Claude, including the current (most recent) model or a full model breakdown. Trigger when asked for model-level usage/cost data from codexbar, or when you need a scriptable per-model summary from codexbar cost JSON. |
| [`openai-image-gen`](openai-image-gen/SKILL.md) | openai-image-gen | Batch-generate images via OpenAI Images API. Random prompt sampler + `index.html` gallery. |
| [`openai-whisper`](openai-whisper/SKILL.md) | openai-whisper | Local speech-to-text with the Whisper CLI (no API key). |
| [`openai-whisper-api`](openai-whisper-api/SKILL.md) | openai-whisper-api | Transcribe audio via OpenAI Audio Transcriptions API (Whisper). |
| [`oracle`](oracle/SKILL.md) | oracle | Best practices for using the oracle CLI (prompt + file bundling, engines, sessions, and file attachment patterns). |
| [`sag`](sag/SKILL.md) | sag | ElevenLabs text-to-speech with mac-style say UX. |
| [`skill-creator`](skill-creator/SKILL.md) | skill-creator | Create or update AgentSkills. Use when designing, structuring, or packaging skills with scripts, references, and assets. |
| [`swarm-orchestrator`](swarm-orchestrator/SKILL.md) | Swarm Orchestrator | Orchestrate multi-bot trading swarms on Pump.fun with persona-driven agents |
| [`swarm-orchestrator copy`](swarm-orchestrator%20copy/SKILL.md) | Swarm Orchestrator | Orchestrate multi-bot trading swarms on Pump.fun with persona-driven agents |

### Clawd Ecosystem

| Skill | Name | Description |
|---|---|---|
| [`clawdhub`](clawdhub/SKILL.md) | clawdhub | Use the ClawdHub CLI to search, install, update, and publish agent skills from clawdhub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed clawdhub CLI. |
| [`github`](github/SKILL.md) | github | Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries. |
| [`openclaw-claude-code-skill-main`](openclaw-claude-code-skill-main/SKILL.md) | claude-code-skill | Control Claude Code via MCP protocol. Trigger with "plan" to write a precise execution plan then feed it to Claude Code. Also supports direct commands, persistent sessions, agent teams, and advanced tool control. |

### Communication

| Skill | Name | Description |
|---|---|---|
| [`bluebubbles`](bluebubbles/SKILL.md) | bluebubbles | Build or update the BlueBubbles external channel plugin for Clawdbot (extension package, REST send/probe, webhook inbound). |
| [`discord`](discord/SKILL.md) | discord | Use when you need to control Discord from Clawdbot via the discord tool: send messages, react, post or upload stickers, upload emojis, run polls, manage threads/pins/search, create/edit/delete channels and categories, fetch permissions or member/role/channel info, or handle moderation actions in Discord DMs or channels. |
| [`himalaya`](himalaya/SKILL.md) | himalaya | CLI to manage emails via IMAP/SMTP. Use `himalaya` to list, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and message composition with MML (MIME Meta Language). |
| [`imsg`](imsg/SKILL.md) | imsg | iMessage/SMS CLI for listing chats, history, watch, and sending. |
| [`slack`](slack/SKILL.md) | slack | Use when you need to control Slack from Clawdbot via the slack tool, including reacting to messages or pinning/unpinning items in Slack channels or DMs. |
| [`voice-call`](voice-call/SKILL.md) | voice-call | Start voice calls via the Clawdbot voice-call plugin. |

### DevOps / Infrastructure

| Skill | Name | Description |
|---|---|---|
| [`blucli`](blucli/SKILL.md) | blucli | BluOS CLI (blu) for discovery, playback, grouping, and volume. |
| [`eightctl`](eightctl/SKILL.md) | eightctl | Control Eight Sleep pods (status, temperature, alarms, schedules). |
| [`gateway-node-ops`](gateway-node-ops/SKILL.md) | SolanaOS Gateway + Node Workflow | How to spawn a SolanaOS Gateway and connect headless nodes |
| [`nano-banana-pro`](nano-banana-pro/SKILL.md) | nano-banana-pro | Generate or edit images via Gemini 3 Pro Image (Nano Banana Pro). |
| [`openhue`](openhue/SKILL.md) | openhue | Control Philips Hue lights/scenes via the OpenHue CLI. |
| [`tmux`](tmux/SKILL.md) | tmux | Remote-control tmux sessions for interactive CLIs by sending keystrokes and scraping pane output. |

### DFlow / Trading

| Skill | Name | Description |
|---|---|---|
| [`dflow-docs`](dflow-docs/SKILL.md) | dflow-docs | Discover and use DFlow documentation, Agent CLI, Trading API, Metadata API, Proof KYC, prediction markets, and the hosted DFlow docs MCP. Use before implementing DFlow features or when field-level endpoint details are needed. |
| [`dflow-kalshi-market-data`](dflow-kalshi-market-data/SKILL.md) | dflow-kalshi-market-data | Read market data for a known Kalshi prediction market on DFlow — orderbook, trades, top-of-book prices, candlesticks, forecast-percentile history, and Kalshi in-game live data — via one-shot REST snapshots, historical ranges, or live WebSocket streams. Use when the user asks "show me the orderbook for X", "get last hour of trades", "build a live price ticker", "stream orderbook depth", "pull 1-minute candles for the last day", "watch in-game scores for this sports market", or "alert me when the orderbook moves". Do NOT use to discover markets matching a criterion (use `dflow-kalshi-market-scanner`), to place orders (use `dflow-kalshi-trading`), or to read a user's own positions/P&L (use `dflow-kalshi-portfolio`). |
| [`dflow-kalshi-market-scanner`](dflow-kalshi-market-scanner/SKILL.md) | dflow-kalshi-market-scanner | Find Kalshi prediction markets on DFlow that match a criterion — arbitrage (YES+NO<$1), cheap long-shots, near-certain short-dated plays, biggest movers, widest spreads, highest volume, closing soonest, and series/event-level scans. Use when the user asks "where's the free money?", "any mispriced markets?", "cheap YES with volume", "what moved today?", "markets closing soon", "cheapest YES in this event", "top markets by volume", or "alert me when X happens" (streaming). Do NOT use to place orders (use `dflow-kalshi-trading`), to view a user's own positions (use `dflow-kalshi-portfolio`), or for general live-data plumbing unrelated to a scan (use `dflow-kalshi-market-data`). |
| [`dflow-kalshi-portfolio`](dflow-kalshi-portfolio/SKILL.md) | dflow-kalshi-portfolio | View what a wallet holds on DFlow's Kalshi prediction markets — current positions, unrealized mark-to-market, realized P&L, activity history, and redeemable winners. Use when the user asks "what are my positions?", "what do I own?", "am I up or down?", "what's my fill history?", "what can I redeem?", "mark my portfolio to market", or "show me this wallet's DFlow activity". Read-only. Do NOT use to place sells or redemptions (use `dflow-kalshi-trading`), for market-wide data unrelated to a wallet (use `dflow-kalshi-market-data`), or to discover new markets (use `dflow-kalshi-market-scanner`). |
| [`dflow-kalshi-trading`](dflow-kalshi-trading/SKILL.md) | dflow-kalshi-trading | Buy, sell, or redeem YES/NO outcome tokens on Kalshi prediction markets via DFlow. Use when the user wants to bet on an event, place a Kalshi order, take a YES or NO position, exit a Kalshi position, redeem winning outcome tokens after a market resolves, tune priority fees on a PM trade, or build a gasless / sponsored PM flow where the app pays tx / ATA / market-init costs. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use to discover markets, view positions, stream prices, complete Proof KYC, or for non-Kalshi spot swaps. |
| [`dflow-phantom-connect`](dflow-phantom-connect/SKILL.md) | dflow-phantom-connect | Build Solana wallet-connected apps with Phantom Connect SDKs and DFlow trading. Use when user asks to connect a Phantom wallet, integrate Phantom in React, React Native, or vanilla JS, sign messages or transactions, build token-gated pages, mint NFTs, accept crypto payments, swap tokens with DFlow, trade prediction markets, or integrate Proof KYC verification. Covers @phantom/react-sdk, @phantom/react-native-sdk, @phantom/browser-sdk, DFlow spot trading, DFlow prediction markets, and DFlow Proof identity verification. Do NOT use for Ethereum or EVM wallet integrations, or non-DFlow DEX routing. |
| [`dflow-platform-fees`](dflow-platform-fees/SKILL.md) | dflow-platform-fees | Monetize a DFlow integration by collecting a builder-defined fee on trades your app routes through the Trade API — either a fixed percentage (spot + PM) via `platformFeeBps`, or a probability-weighted dynamic fee (PM outcome tokens only) via `platformFeeScale`. Use when the user asks "how do I take a cut of trades?", "add a builder fee", "monetize my swap UI", "charge a platform fee", "how does platformFeeBps / platformFeeScale work?", or "where do my fees get paid?". Do NOT use to run a trade itself (use `dflow-spot-trading` or `dflow-kalshi-trading` — both also cover priority fees and sponsored / gasless flows). |
| [`dflow-proof-kyc`](dflow-proof-kyc/SKILL.md) | dflow-proof-kyc | Integrate DFlow Proof — a Solana wallet identity-verification primitive (Stripe Identity under the hood) — for either (a) gating your own app's features behind KYC, or (b) completing the mandatory verification step for Kalshi prediction-market buys on DFlow. Use when the user asks "how do I KYC a wallet?", "check if a wallet is verified", "add KYC to my DeFi app", "handle unverified_wallet_not_allowed / PROOF_NOT_VERIFIED", "redirect to dflow.net/proof", or "gate a feature by jurisdiction or identity". Do NOT use to actually place trades (use `dflow-kalshi-trading`), for geoblocking (separate concern, handled inline in the trading skill), for age gating (Proof doesn't currently verify age), or for spot swaps (no KYC required). |
| [`dflow-spot-trading`](dflow-spot-trading/SKILL.md) | dflow-spot-trading | Swap any pair of Solana tokens via DFlow. Use when the user wants to trade, swap, or convert tokens on Solana, get a price quote, build a swap UI, tune priority fees so a swap lands under congestion, or build a gasless / sponsored swap where the app pays fees. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use for Kalshi prediction-market YES/NO trades or builder-side platform fees. |
| [`phantom-wallet-mcp`](phantom-wallet-mcp/SKILL.md) | phantom-wallet-mcp | > |

### Local / Web Services

| Skill | Name | Description |
|---|---|---|
| [`food-order`](food-order/SKILL.md) | food-order | Reorder Foodora orders + track ETA/status with ordercli. Never confirm without explicit user approval. Triggers: order food, reorder, track ETA. |
| [`local-places`](local-places/SKILL.md) | local-places | Search for places (restaurants, cafes, etc.) via Google Places API proxy on localhost. |

### Media

| Skill | Name | Description |
|---|---|---|
| [`camsnap`](camsnap/SKILL.md) | camsnap | Capture frames or clips from RTSP/ONVIF cameras. |
| [`canvas`](canvas/SKILL.md) | Canvas Skill | Display HTML content on connected SolanaOS nodes (Mac app, iOS, Android). |
| [`gifgrep`](gifgrep/SKILL.md) | gifgrep | Search GIF providers with CLI/TUI, download results, and extract stills/sheets. |
| [`peekaboo`](peekaboo/SKILL.md) | peekaboo | Capture and automate macOS UI with the Peekaboo CLI. |
| [`sherpa-onnx-tts`](sherpa-onnx-tts/SKILL.md) | sherpa-onnx-tts | Local text-to-speech via sherpa-onnx (offline, no cloud) |
| [`songsee`](songsee/SKILL.md) | songsee | Generate spectrograms and feature-panel visualizations from audio with the songsee CLI. |
| [`sonoscli`](sonoscli/SKILL.md) | sonoscli | Control Sonos speakers (discover/status/play/volume/group). |
| [`spotify-player`](spotify-player/SKILL.md) | spotify-player | Terminal Spotify playback/search via spogo (preferred) or spotify_player. |
| [`video-frames`](video-frames/SKILL.md) | video-frames | Extract frames or short clips from videos using ffmpeg. |

### Other

| Skill | Name | Description |
|---|---|---|
| [`bird`](bird/SKILL.md) | bird | X/Twitter CLI for reading, searching, posting, and engagement via cookies. |
| [`bird copy`](bird%20copy/SKILL.md) | bird | X/Twitter CLI for reading, searching, posting, and engagement via cookies. |

### Productivity

| Skill | Name | Description |
|---|---|---|
| [`1password`](1password/SKILL.md) | 1password | Set up and use 1Password CLI (op). Use when installing the CLI, enabling desktop app integration, signing in (single or multi-account), or reading/injecting/running secrets via op. |
| [`apple-notes`](apple-notes/SKILL.md) | apple-notes | Manage Apple Notes via the `memo` CLI on macOS (create, view, edit, delete, search, move, and export notes). Use when a user asks Clawdbot to add a note, list notes, search notes, or manage note folders. |
| [`apple-reminders`](apple-reminders/SKILL.md) | apple-reminders | Manage Apple Reminders via the `remindctl` CLI on macOS (list, add, edit, complete, delete). Supports lists, date filters, and JSON/plain output. |
| [`bear-notes`](bear-notes/SKILL.md) | bear-notes | Create, search, and manage Bear notes via grizzly CLI. |
| [`notion`](notion/SKILL.md) | notion | Notion API for creating and managing pages, databases, and blocks. |
| [`obsidian`](obsidian/SKILL.md) | obsidian | Work with Obsidian vaults (plain Markdown notes) and automate via obsidian-cli. |
| [`ordercli`](ordercli/SKILL.md) | ordercli | Foodora-only CLI for checking past orders and active order status (Deliveroo WIP). |
| [`session-logs`](session-logs/SKILL.md) | session-logs | Search and analyze your own session logs (older/parent conversations) using jq. |
| [`things-mac`](things-mac/SKILL.md) | things-mac | Manage Things 3 via the `things` CLI on macOS (add/update projects+todos via URL scheme; read/search/list from the local Things database). Use when a user asks Clawdbot to add a task to Things, list inbox/today/upcoming, search tasks, or inspect projects/areas/tags. |
| [`trello`](trello/SKILL.md) | trello | Manage Trello boards, lists, and cards via the Trello REST API. |

### Pump.fun / Token Launch

| Skill | Name | Description |
|---|---|---|
| [`pumpfun`](pumpfun/SKILL.md) | pumpfun | Launch and trade tokens on Pump.fun bonding curves. Create memecoins, buy/sell tokens, check prices, and collect creator fees on Solana. |
| [`pumpfun-analytics`](pumpfun-analytics/SKILL.md) | PumpFun Analytics | Monitor bonding curves, graduation progress, and trade analytics on Pump.fun |
| [`pumpfun-fees`](pumpfun-fees/SKILL.md) | PumpFun Fee Sharing | Configure and claim creator fee sharing on Pump.fun tokens |
| [`pumpfun-launcher`](pumpfun-launcher/SKILL.md) | PumpFun Token Launcher | Launch new tokens on Pump.fun directly via the Pump SDK |
| [`pumpfun-trading`](pumpfun-trading/SKILL.md) | PumpFun Trading | Buy and sell tokens on Pump.fun bonding curves and AMM pools |

### Solana / Blockchain

| Skill | Name | Description |
|---|---|---|
| [`clawdex`](clawdex/SKILL.md) | clawdex | Clawdex — dual-engine coding agent. Claude Code (reasoning + planning) + OpenAI Codex (fast execution) + Browser Use boxes (web research) + Upstash compute boxes (isolated sandboxes). |
| [`dex-screener-scanner`](dex-screener-scanner/SKILL.md) | dex-screener-scanner | Automate DexScreener Solana token discovery and screening via browser automation. Navigate dexscreener.com/solana, scrape real-time token listings, filter by volume/liquidity/age/holders, and identify the best opportunities. Triggers: scan dexscreener, find new tokens, find trending tokens, screen Solana tokens, best tokens on Solana, dexscreener scanner. |
| [`imperial`](imperial/SKILL.md) | imperial | Entry-point skill for Imperial perpetual routing on Solana. Use before answering or acting on Imperial router flows, Phoenix-routed perps, profile funding, market/portfolio intel, risk checks, TP/SL, TWAP, grid, or Telegram bot trading workflows. |
| [`imperial-execution-modes`](imperial-execution-modes/SKILL.md) | imperial-execution-modes | Execution-mode taxonomy for Imperial router workflows in this repo: observe, route-check, paper/spec, live single-shot, and external durable runner. |
| [`imperial-grid-trading`](imperial-grid-trading/SKILL.md) | imperial-grid-trading | Grid strategy design for Imperial/Phoenix perps: ladder layout, venue pinning, replacement logic, and durable-runner boundaries. |
| [`imperial-margin-operations`](imperial-margin-operations/SKILL.md) | imperial-margin-operations | Imperial profile funding, deposit/withdraw transaction building, profile isolation, and margin-state reporting. |
| [`imperial-market-intel`](imperial-market-intel/SKILL.md) | imperial-market-intel | Imperial and Phoenix market data: funding, mark prices, route checks, Phoenix depth, and pre-trade venue context. |
| [`imperial-portfolio-intel`](imperial-portfolio-intel/SKILL.md) | imperial-portfolio-intel | Imperial profile balances, open positions, open orders, exposure summary, and wallet-level Telegram/admin portfolio recaps. |
| [`imperial-position-management`](imperial-position-management/SKILL.md) | imperial-position-management | Inspect, reduce, and close Imperial-routed positions across Phoenix, Flash, Jupiter, and GMTrade, with Phoenix preferred by default. |
| [`imperial-risk-management`](imperial-risk-management/SKILL.md) | imperial-risk-management | Risk checks for Imperial-routed perps: profile funding, existing exposure, venue choice, margin headroom, and Telegram pre-trade snapshots. |
| [`imperial-skills-index`](imperial-skills-index/SKILL.md) | imperial-skills-index | Index for the bundled Imperial skill pack exposed through solana-clawd. Use to discover the correct focused Imperial skill. |
| [`imperial-tpsl-management`](imperial-tpsl-management/SKILL.md) | imperial-tpsl-management | Take-profit and stop-loss management for Imperial-routed positions, including close-leg design, verification, and Telegram operator caveats. |
| [`imperial-trade-execution`](imperial-trade-execution/SKILL.md) | imperial-trade-execution | Safe Imperial live execution: authenticated market orders, Phoenix-first venue preference, profile-aware routing, and post-trade verification. |
| [`imperial-twap-execution`](imperial-twap-execution/SKILL.md) | imperial-twap-execution | TWAP execution guidance for Imperial: slice planning, venue pinning, profile budgeting, and durable-runner requirements. |
| [`magicblock`](magicblock/SKILL.md) | magicblock | MagicBlock Ephemeral Rollups development patterns for Solana. Covers delegation/undelegation flows, dual-connection architecture (base layer + ER), cranks for scheduled tasks, VRF for verifiable randomness, magic actions for atomic ER-commit + base-layer follow-ups, private payments API (deposits, transfers, withdrawals, swaps, and challenge/login auth flow), commit sponsorship and fee vault wiring, lamports top-up for delegated accounts, and TypeScript/Anchor integration. Use for high-performance gaming, real-time apps, private transfers and swaps, and fast transaction throughput on Solana. |
| [`solana-clawd`](solana-clawd/SKILL.md) | solana-clawd | One-shot setup and operation guide for the solana-clawd agentic engine. Use when: cloning the repo, setting up MCP tools, starting the Telegram bot, deploying to Fly.io/Netlify, hatching blockchain buddies, running OODA loops, configuring voice mode (ElevenLabs + Grok), minting Metaplex agents, managing the vault, running the worker swarm, or contributing to the project. Covers all 31 MCP tools, 18 buddy species, 9 spinners, 60+ Telegram commands, 95 skills, and the full repo structure. |
| [`solana-clawd-agentic-commerce`](solana-clawd-agentic-commerce/SKILL.md) | solana-clawd-agentic-commerce | Build and operate Solana CLAWD agents that spend through Pay CLI, expose paid stores, mint Metaplex-readable identities, and launch Genesis agent tokens. |
| [`solana-formal-verification`](solana-formal-verification/SKILL.md) | qedgen | Formally verify programs by writing Lean 4 proofs. Trigger this skill whenever the user wants to formally verify code, generate Lean 4 proofs, prove properties about algorithms or smart contracts, verify invariants, convert program logic into formal specifications, or anything involving Lean 4 and formal verification. Also trigger when the user mentions "qedgen", "lean proof", "formal proof", "verify my code", "prove correctness", "formal verification", or wants mathematical guarantees about their implementation. |
| [`ultrathink-blockchain`](ultrathink-blockchain/SKILL.md) | ultrathink-blockchain | Deep-reasoning Solana and blockchain engineering skill. Use for production blockchain development, on-chain programs, Solana transaction flows, DeFi integrations, token bots, swaps, Anchor/Rust programs, RPC handling, Helius/Jito execution, MEV analysis, PDA/account validation, retry logic, simulations, monitoring, or security hardening. |
| [`vulcan`](vulcan/SKILL.md) | vulcan | Entry-point skill for Phoenix perpetuals through Vulcan/Rise SDK inside solana-clawd. Use before answering or acting on Vulcan, Phoenix DEX, Solana perps, paper trading, live trading, margin, TP/SL, TWAP, grid, TA strategies, or perps agent setup. |
| [`vulcan-error-recovery`](vulcan-error-recovery/SKILL.md) | vulcan-error-recovery | Error category routing and recovery for Vulcan/Phoenix perps. Use on failed CLI/MCP calls, tx failures, auth/config/API/network/rate-limit errors, and strategy recovery. |
| [`vulcan-execution-modes`](vulcan-execution-modes/SKILL.md) | vulcan-execution-modes | Canonical Vulcan execution mode taxonomy: Observe, Paper, Dry-Run, Confirm-Each, Auto-Execute. Use before launching strategies or live-capable perps flows. |
| [`vulcan-grid-trading`](vulcan-grid-trading/SKILL.md) | vulcan-grid-trading | Grid trading with layered limit orders on Phoenix perpetuals. Use for grid setup, monitoring, pausing/stopping, and live/paper grid strategy safety. |
| [`vulcan-lot-size-calculator`](vulcan-lot-size-calculator/SKILL.md) | vulcan-lot-size-calculator | Convert desired token/notional amounts to Phoenix base lots. Use whenever a Vulcan command requires size/base lots. |
| [`vulcan-margin-operations`](vulcan-margin-operations/SKILL.md) | vulcan-margin-operations | Vulcan/Phoenix collateral, deposits, withdrawals, transfers, isolated margin, leverage tiers, and margin health. |
| [`vulcan-market-intel`](vulcan-market-intel/SKILL.md) | vulcan-market-intel | Phoenix market data, tickers, orderbooks, candles, funding, spreads, liquidity, and pre-trade market context. |
| [`vulcan-onboarding`](vulcan-onboarding/SKILL.md) | vulcan-onboarding | First-run Vulcan setup for paper trading, wallet, registration, collateral, MCP skills, and live readiness. |
| [`vulcan-portfolio-intel`](vulcan-portfolio-intel/SKILL.md) | vulcan-portfolio-intel | Phoenix portfolio snapshots: margin, positions, resting orders, funding exposure, PnL, and account reporting. |
| [`vulcan-position-management`](vulcan-position-management/SKILL.md) | vulcan-position-management | List, show, close, reduce Phoenix positions and attach/cancel TP/SL. |
| [`vulcan-quickstart`](vulcan-quickstart/SKILL.md) | vulcan-quickstart | Five-minute Vulcan quickstart for install, health check, first market read, and first paper trade. |
| [`vulcan-risk-management`](vulcan-risk-management/SKILL.md) | vulcan-risk-management | Risk checks for Phoenix perps: margin health, leverage tiers, liquidation distance, notional caps, exposure, stops, and strategy guardrails. |
| [`vulcan-skills-index`](vulcan-skills-index/SKILL.md) | vulcan-skills-index | Index for the bundled Vulcan skill pack exposed through solana-clawd. Use to discover the correct focused Vulcan skill. |
| [`vulcan-ta-strategy`](vulcan-ta-strategy/SKILL.md) | vulcan-ta-strategy | Technical-analysis-driven Phoenix strategy runner using declarative rules and Vulcan strategy ledgers. |
| [`vulcan-technical-analysis`](vulcan-technical-analysis/SKILL.md) | vulcan-technical-analysis | Technical indicators and trigger evaluation for Phoenix markets: RSI, MACD, BBands, ATR, ADX, VWAP, Stoch, SMA, EMA. |
| [`vulcan-tpsl-management`](vulcan-tpsl-management/SKILL.md) | vulcan-tpsl-management | Take-profit and stop-loss setup, cancellation, laddered exits, position-side rules, and verification for Vulcan/Phoenix. |
| [`vulcan-trade-execution`](vulcan-trade-execution/SKILL.md) | vulcan-trade-execution | Safe Phoenix order execution via Vulcan: pre-trade checks, market/limit orders, paper/dry-run/live gates, and post-trade verification. |
| [`vulcan-twap-execution`](vulcan-twap-execution/SKILL.md) | vulcan-twap-execution | TWAP strategy execution on Phoenix perps using Vulcan's first-class runner, tick logs, ledgers, status/monitor/finalize controls. |

### Web / Research

| Skill | Name | Description |
|---|---|---|
| [`blogwatcher`](blogwatcher/SKILL.md) | blogwatcher | Monitor blogs and RSS/Atom feeds for updates using the blogwatcher CLI. |
| [`gog`](gog/SKILL.md) | gog | Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs. |
| [`goplaces`](goplaces/SKILL.md) | goplaces | Query Google Places API (New) via the goplaces CLI for text search, place details, resolve, and reviews. Use for human-friendly place lookup or JSON output for scripts. |
| [`mcporter`](mcporter/SKILL.md) | mcporter | Use the mcporter CLI to list, configure, auth, and call MCP servers/tools directly (HTTP or stdio), including ad-hoc servers, config edits, and CLI/type generation. |
| [`nano-pdf`](nano-pdf/SKILL.md) | nano-pdf | Edit PDFs with natural-language instructions using the nano-pdf CLI. |
| [`summarize`](summarize/SKILL.md) | summarize | Summarize or extract text/transcripts from URLs, podcasts, and local files (great fallback for “transcribe this YouTube/video”). |
| [`wacli`](wacli/SKILL.md) | wacli | Send WhatsApp messages to other people or search/sync WhatsApp history via the wacli CLI (not for normal user chats). |
| [`weather`](weather/SKILL.md) | weather | Get current weather and forecasts (no API key required). |

## Other Entries

These entries are present under `skills/` but are not counted as active top-level skills.

### Support Folders

- [`dflow-phantom-connect-skill`](dflow-phantom-connect-skill/)
- [`dflow-skills`](dflow-skills/)
- [`solana-dev-skill-main`](solana-dev-skill-main/)
- [`UltraThink-SKill`](UltraThink-SKill/)

### Support Files

- [`catalog.json`](catalog.json)
- [`index.json`](index.json)
- [`README.md`](README.md)
- [`SKILL_HUB.md`](SKILL_HUB.md)
- [`skill-schema.v1.json`](skill-schema.v1.json)
- [`solanaos.md`](solanaos.md)
- [`SUBMIT.md`](SUBMIT.md)

## Notes

- `catalog.json` is the machine-readable index generated from the top-level skill folders.
- `index.json` is the Skill Hub manifest used by the Clawd registry surfaces.
- `skills-lock.json` at the repo root records content hashes for installed skills.
