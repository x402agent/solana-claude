# Skills

This directory contains 94 active skills. Each listed entry has a top-level `SKILL.md` under `skills/<slug>/`.

## Quick Index

- **Dev Tools / Agents**: `clawdhub`, `github`, `mcporter`, `openclaw-claude-code-skill-main`, `session-logs`, `tmux`
- **Local / Web Services**: `food-order`, `goplaces`, `local-places`, `ordercli`, `weather`
- **Media / Devices**: `blucli`, `camsnap`, `canvas`, `gifgrep`, `nano-banana-pro`, `nano-pdf`, `openai-whisper`, `openai-whisper-api`, `openhue`, `sag`, `songsee`, `sonoscli`, `spotify-player`, `summarize`, `video-frames`, `voice-call`
- **Productivity / Messaging**: `apple-notes`, `apple-reminders`, `bear-notes`, `bluebubbles`, `discord`, `gog`, `himalaya`, `imsg`, `notion`, `obsidian`, `slack`, `things-mac`, `trello`, `wacli`
- **Solana / Blockchain**: `clawdex`, `coding-agent`, `dex-screener-scanner`, `dflow-docs`, `dflow-kalshi-market-data`, `dflow-kalshi-market-scanner`, `dflow-kalshi-portfolio`, `dflow-kalshi-trading`, `dflow-phantom-connect`, `dflow-platform-fees`, `dflow-proof-kyc`, `dflow-spot-trading`, `gateway-node-ops`, `model-usage`, `openai-image-gen`, `phantom-wallet-mcp`, `pumpfun`, `pumpfun-analytics`, `pumpfun-fees`, `pumpfun-launcher`, `pumpfun-trading`, `solana-clawd`, `solana-clawd-agentic-commerce`, `solana-formal-verification`, `swarm-orchestrator`, `swarm-orchestrator copy`, `ultrathink-blockchain`, `vulcan`, `vulcan copy`, `vulcan-error-recovery`, `vulcan-execution-modes`, `vulcan-grid-trading`, `vulcan-lot-size-calculator`, `vulcan-margin-operations`, `vulcan-market-intel`, `vulcan-onboarding`, `vulcan-portfolio-intel`, `vulcan-position-management`, `vulcan-quickstart`, `vulcan-risk-management`, `vulcan-skills-index`, `vulcan-ta-strategy`, `vulcan-technical-analysis`, `vulcan-tpsl-management`, `vulcan-trade-execution`, `vulcan-twap-execution`
- **Utilities**: `1password`, `bird`, `bird copy`, `blogwatcher`, `eightctl`, `gemini`, `peekaboo`

## Full Catalog

### Dev Tools / Agents

| Skill | Name | Description |
|---|---|---|
| [`clawdhub`](clawdhub/SKILL.md) | clawdhub | Use the ClawdHub CLI to search, install, update, and publish agent skills from clawdhub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed clawdhub CLI. |
| [`github`](github/SKILL.md) | github | Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries. |
| [`mcporter`](mcporter/SKILL.md) | mcporter | Use the mcporter CLI to list, configure, auth, and call MCP servers/tools directly (HTTP or stdio), including ad-hoc servers, config edits, and CLI/type generation. |
| [`openclaw-claude-code-skill-main`](openclaw-claude-code-skill-main/SKILL.md) | claude-code-skill | Control Claude Code via MCP protocol. Trigger with "plan" to write a precise execution plan then feed it to Claude Code. Also supports direct commands, persistent sessions, agent teams, and advanced tool control. |
| [`session-logs`](session-logs/SKILL.md) | session-logs | Search and analyze your own session logs (older/parent conversations) using jq. |
| [`tmux`](tmux/SKILL.md) | tmux | Remote-control tmux sessions for interactive CLIs by sending keystrokes and scraping pane output. |

### Local / Web Services

| Skill | Name | Description |
|---|---|---|
| [`food-order`](food-order/SKILL.md) | food-order | Reorder Foodora orders + track ETA/status with ordercli. Never confirm without explicit user approval. Triggers: order food, reorder, track ETA. |
| [`goplaces`](goplaces/SKILL.md) | goplaces | Query Google Places API (New) via the goplaces CLI for text search, place details, resolve, and reviews. Use for human-friendly place lookup or JSON output for scripts. |
| [`local-places`](local-places/SKILL.md) | local-places | Search for places (restaurants, cafes, etc.) via Google Places API proxy on localhost. |
| [`ordercli`](ordercli/SKILL.md) | ordercli | Foodora-only CLI for checking past orders and active order status (Deliveroo WIP). |
| [`weather`](weather/SKILL.md) | weather | Get current weather and forecasts (no API key required). |

### Media / Devices

| Skill | Name | Description |
|---|---|---|
| [`blucli`](blucli/SKILL.md) | blucli | BluOS CLI (blu) for discovery, playback, grouping, and volume. |
| [`camsnap`](camsnap/SKILL.md) | camsnap | Capture frames or clips from RTSP/ONVIF cameras. |
| [`canvas`](canvas/SKILL.md) | Canvas | Canvas skill. |
| [`gifgrep`](gifgrep/SKILL.md) | gifgrep | Search GIF providers with CLI/TUI, download results, and extract stills/sheets. |
| [`nano-banana-pro`](nano-banana-pro/SKILL.md) | nano-banana-pro | Generate or edit images via Gemini 3 Pro Image (Nano Banana Pro). |
| [`nano-pdf`](nano-pdf/SKILL.md) | nano-pdf | Edit PDFs with natural-language instructions using the nano-pdf CLI. |
| [`openai-whisper`](openai-whisper/SKILL.md) | openai-whisper | Local speech-to-text with the Whisper CLI (no API key). |
| [`openai-whisper-api`](openai-whisper-api/SKILL.md) | openai-whisper-api | Transcribe audio via OpenAI Audio Transcriptions API (Whisper). |
| [`openhue`](openhue/SKILL.md) | openhue | Control Philips Hue lights/scenes via the OpenHue CLI. |
| [`sag`](sag/SKILL.md) | sag | ElevenLabs text-to-speech with mac-style say UX. |
| [`songsee`](songsee/SKILL.md) | songsee | Generate spectrograms and feature-panel visualizations from audio with the songsee CLI. |
| [`sonoscli`](sonoscli/SKILL.md) | sonoscli | Control Sonos speakers (discover/status/play/volume/group). |
| [`spotify-player`](spotify-player/SKILL.md) | spotify-player | Terminal Spotify playback/search via spogo (preferred) or spotify_player. |
| [`summarize`](summarize/SKILL.md) | summarize | Summarize or extract text/transcripts from URLs, podcasts, and local files (great fallback for “transcribe this YouTube/video”). |
| [`video-frames`](video-frames/SKILL.md) | video-frames | Extract frames or short clips from videos using ffmpeg. |
| [`voice-call`](voice-call/SKILL.md) | voice-call | Start voice calls via the Clawdbot voice-call plugin. |

### Productivity / Messaging

| Skill | Name | Description |
|---|---|---|
| [`apple-notes`](apple-notes/SKILL.md) | apple-notes | Manage Apple Notes via the `memo` CLI on macOS (create, view, edit, delete, search, move, and export notes). Use when a user asks Clawdbot to add a note, list notes, search notes, or manage note folders. |
| [`apple-reminders`](apple-reminders/SKILL.md) | apple-reminders | Manage Apple Reminders via the `remindctl` CLI on macOS (list, add, edit, complete, delete). Supports lists, date filters, and JSON/plain output. |
| [`bear-notes`](bear-notes/SKILL.md) | bear-notes | Create, search, and manage Bear notes via grizzly CLI. |
| [`bluebubbles`](bluebubbles/SKILL.md) | bluebubbles | Build or update the BlueBubbles external channel plugin for Clawdbot (extension package, REST send/probe, webhook inbound). |
| [`discord`](discord/SKILL.md) | discord | Use when you need to control Discord from Clawdbot via the discord tool: send messages, react, post or upload stickers, upload emojis, run polls, manage threads/pins/search, create/edit/delete channels and categories, fetch permissions or member/role/channel info, or handle moderation actions in Discord DMs or channels. |
| [`gog`](gog/SKILL.md) | gog | Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs. |
| [`himalaya`](himalaya/SKILL.md) | himalaya | CLI to manage emails via IMAP/SMTP. Use `himalaya` to list, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and message composition with MML (MIME Meta Language). |
| [`imsg`](imsg/SKILL.md) | imsg | iMessage/SMS CLI for listing chats, history, watch, and sending. |
| [`notion`](notion/SKILL.md) | notion | Notion API for creating and managing pages, databases, and blocks. |
| [`obsidian`](obsidian/SKILL.md) | obsidian | Work with Obsidian vaults (plain Markdown notes) and automate via obsidian-cli. |
| [`slack`](slack/SKILL.md) | slack | Use when you need to control Slack from Clawdbot via the slack tool, including reacting to messages or pinning/unpinning items in Slack channels or DMs. |
| [`things-mac`](things-mac/SKILL.md) | things-mac | Manage Things 3 via the `things` CLI on macOS (add/update projects+todos via URL scheme; read/search/list from the local Things database). Use when a user asks Clawdbot to add a task to Things, list inbox/today/upcoming, search tasks, or inspect projects/areas/tags. |
| [`trello`](trello/SKILL.md) | trello | Manage Trello boards, lists, and cards via the Trello REST API. |
| [`wacli`](wacli/SKILL.md) | wacli | Send WhatsApp messages to other people or search/sync WhatsApp history via the wacli CLI (not for normal user chats). |

### Solana / Blockchain

| Skill | Name | Description |
|---|---|---|
| [`clawdex`](clawdex/SKILL.md) | clawdex | Clawdex — dual-engine coding agent. Claude Code (reasoning + planning) + OpenAI Codex (fast execution) + Browser Use boxes (web research) + Upstash compute boxes (isolated sandboxes). |
| [`coding-agent`](coding-agent/SKILL.md) | coding-agent | Run Codex CLI, Claude Code, OpenCode, or Pi Coding Agent via background process for programmatic control. |
| [`dex-screener-scanner`](dex-screener-scanner/SKILL.md) | dex-screener-scanner | Automate DexScreener Solana token discovery and screening via browser automation. Navigate dexscreener.com/solana, scrape real-time token listings, filter by volume/liquidity/age/holders, and identify the best opportunities. Triggers: scan dexscreener, find new tokens, find trending tokens, screen Solana tokens, best tokens on Solana, dexscreener scanner. |
| [`dflow-docs`](dflow-docs/SKILL.md) | dflow-docs | Discover and use DFlow documentation, Agent CLI, Trading API, Metadata API, Proof KYC, prediction markets, and the hosted DFlow docs MCP. Use before implementing DFlow features or when field-level endpoint details are needed. |
| [`dflow-kalshi-market-data`](dflow-kalshi-market-data/SKILL.md) | dflow-kalshi-market-data | Read market data for a known Kalshi prediction market on DFlow — orderbook, trades, top-of-book prices, candlesticks, forecast-percentile history, and Kalshi in-game live data — via one-shot REST snapshots, historical ranges, or live WebSocket streams. Use when the user asks "show me the orderbook for X", "get last hour of trades", "build a live price ticker", "stream orderbook depth", "pull 1-minute candles for the last day", "watch in-game scores for this sports market", or "alert me when the orderbook moves". Do NOT use to discover markets matching a criterion (use `dflow-kalshi-market-scanner`), to place orders (use `dflow-kalshi-trading`), or to read a user's own positions/P&L (use `dflow-kalshi-portfolio`). |
| [`dflow-kalshi-market-scanner`](dflow-kalshi-market-scanner/SKILL.md) | dflow-kalshi-market-scanner | Find Kalshi prediction markets on DFlow that match a criterion — arbitrage (YES+NO<$1), cheap long-shots, near-certain short-dated plays, biggest movers, widest spreads, highest volume, closing soonest, and series/event-level scans. Use when the user asks "where's the free money?", "any mispriced markets?", "cheap YES with volume", "what moved today?", "markets closing soon", "cheapest YES in this event", "top markets by volume", or "alert me when X happens" (streaming). Do NOT use to place orders (use `dflow-kalshi-trading`), to view a user's own positions (use `dflow-kalshi-portfolio`), or for general live-data plumbing unrelated to a scan (use `dflow-kalshi-market-data`). |
| [`dflow-kalshi-portfolio`](dflow-kalshi-portfolio/SKILL.md) | dflow-kalshi-portfolio | View what a wallet holds on DFlow's Kalshi prediction markets — current positions, unrealized mark-to-market, realized P&L, activity history, and redeemable winners. Use when the user asks "what are my positions?", "what do I own?", "am I up or down?", "what's my fill history?", "what can I redeem?", "mark my portfolio to market", or "show me this wallet's DFlow activity". Read-only. Do NOT use to place sells or redemptions (use `dflow-kalshi-trading`), for market-wide data unrelated to a wallet (use `dflow-kalshi-market-data`), or to discover new markets (use `dflow-kalshi-market-scanner`). |
| [`dflow-kalshi-trading`](dflow-kalshi-trading/SKILL.md) | dflow-kalshi-trading | Buy, sell, or redeem YES/NO outcome tokens on Kalshi prediction markets via DFlow. Use when the user wants to bet on an event, place a Kalshi order, take a YES or NO position, exit a Kalshi position, redeem winning outcome tokens after a market resolves, tune priority fees on a PM trade, or build a gasless / sponsored PM flow where the app pays tx / ATA / market-init costs. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use to discover markets, view positions, stream prices, complete Proof KYC, or for non-Kalshi spot swaps. |
| [`dflow-phantom-connect`](dflow-phantom-connect/SKILL.md) | dflow-phantom-connect | Build Solana wallet-connected apps with Phantom Connect SDKs and DFlow trading. Use when user asks to connect a Phantom wallet, integrate Phantom in React, React Native, or vanilla JS, sign messages or transactions, build token-gated pages, mint NFTs, accept crypto payments, swap tokens with DFlow, trade prediction markets, or integrate Proof KYC verification. Covers @phantom/react-sdk, @phantom/react-native-sdk, @phantom/browser-sdk, DFlow spot trading, DFlow prediction markets, and DFlow Proof identity verification. Do NOT use for Ethereum or EVM wallet integrations, or non-DFlow DEX routing. |
| [`dflow-platform-fees`](dflow-platform-fees/SKILL.md) | dflow-platform-fees | Monetize a DFlow integration by collecting a builder-defined fee on trades your app routes through the Trade API — either a fixed percentage (spot + PM) via `platformFeeBps`, or a probability-weighted dynamic fee (PM outcome tokens only) via `platformFeeScale`. Use when the user asks "how do I take a cut of trades?", "add a builder fee", "monetize my swap UI", "charge a platform fee", "how does platformFeeBps / platformFeeScale work?", or "where do my fees get paid?". Do NOT use to run a trade itself (use `dflow-spot-trading` or `dflow-kalshi-trading` — both also cover priority fees and sponsored / gasless flows). |
| [`dflow-proof-kyc`](dflow-proof-kyc/SKILL.md) | dflow-proof-kyc | Integrate DFlow Proof — a Solana wallet identity-verification primitive (Stripe Identity under the hood) — for either (a) gating your own app's features behind KYC, or (b) completing the mandatory verification step for Kalshi prediction-market buys on DFlow. Use when the user asks "how do I KYC a wallet?", "check if a wallet is verified", "add KYC to my DeFi app", "handle unverified_wallet_not_allowed / PROOF_NOT_VERIFIED", "redirect to dflow.net/proof", or "gate a feature by jurisdiction or identity". Do NOT use to actually place trades (use `dflow-kalshi-trading`), for geoblocking (separate concern, handled inline in the trading skill), for age gating (Proof doesn't currently verify age), or for spot swaps (no KYC required). |
| [`dflow-spot-trading`](dflow-spot-trading/SKILL.md) | dflow-spot-trading | Swap any pair of Solana tokens via DFlow. Use when the user wants to trade, swap, or convert tokens on Solana, get a price quote, build a swap UI, tune priority fees so a swap lands under congestion, or build a gasless / sponsored swap where the app pays fees. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use for Kalshi prediction-market YES/NO trades or builder-side platform fees. |
| [`gateway-node-ops`](gateway-node-ops/SKILL.md) | Gateway Node Ops | How to spawn a SolanaOS Gateway and connect headless nodes |
| [`model-usage`](model-usage/SKILL.md) | model-usage | Use CodexBar CLI local cost usage to summarize per-model usage for Codex or Claude, including the current (most recent) model or a full model breakdown. Trigger when asked for model-level usage/cost data from codexbar, or when you need a scriptable per-model summary from codexbar cost JSON. |
| [`openai-image-gen`](openai-image-gen/SKILL.md) | openai-image-gen | Batch-generate images via OpenAI Images API. Random prompt sampler + `index.html` gallery. |
| [`phantom-wallet-mcp`](phantom-wallet-mcp/SKILL.md) | phantom-wallet-mcp | > |
| [`pumpfun`](pumpfun/SKILL.md) | pumpfun | Launch and trade tokens on Pump.fun bonding curves. Create memecoins, buy/sell tokens, check prices, and collect creator fees on Solana. |
| [`pumpfun-analytics`](pumpfun-analytics/SKILL.md) | Pumpfun Analytics | Monitor bonding curves, graduation progress, and trade analytics on Pump.fun |
| [`pumpfun-fees`](pumpfun-fees/SKILL.md) | Pumpfun Fees | Configure and claim creator fee sharing on Pump.fun tokens |
| [`pumpfun-launcher`](pumpfun-launcher/SKILL.md) | Pumpfun Launcher | Launch new tokens on Pump.fun directly via the Pump SDK |
| [`pumpfun-trading`](pumpfun-trading/SKILL.md) | Pumpfun Trading | Buy and sell tokens on Pump.fun bonding curves and AMM pools |
| [`solana-clawd`](solana-clawd/SKILL.md) | solana-clawd | One-shot setup and operation guide for the solana-clawd agentic engine. Use when: cloning the repo, setting up MCP tools, starting the Telegram bot, deploying to Fly.io/Netlify, hatching blockchain buddies, running OODA loops, configuring voice mode (ElevenLabs + Grok), minting Metaplex agents, managing the vault, running the worker swarm, or contributing to the project. Covers all 31 MCP tools, 18 buddy species, 9 spinners, 60+ Telegram commands, 95 skills, and the full repo structure. |
| [`solana-clawd-agentic-commerce`](solana-clawd-agentic-commerce/SKILL.md) | solana-clawd-agentic-commerce | Build and operate Solana CLAWD agents that spend through Pay CLI, expose paid stores, mint Metaplex-readable identities, and launch Genesis agent tokens. |
| [`solana-formal-verification`](solana-formal-verification/SKILL.md) | qedgen | Formally verify programs by writing Lean 4 proofs. Trigger this skill whenever the user wants to formally verify code, generate Lean 4 proofs, prove properties about algorithms or smart contracts, verify invariants, convert program logic into formal specifications, or anything involving Lean 4 and formal verification. Also trigger when the user mentions "qedgen", "lean proof", "formal proof", "verify my code", "prove correctness", "formal verification", or wants mathematical guarantees about their implementation. |
| [`swarm-orchestrator`](swarm-orchestrator/SKILL.md) | Swarm Orchestrator | Orchestrate multi-bot trading swarms on Pump.fun with persona-driven agents |
| [`swarm-orchestrator copy`](swarm-orchestrator%20copy/SKILL.md) | Swarm Orchestrator Copy | Orchestrate multi-bot trading swarms on Pump.fun with persona-driven agents |
| [`ultrathink-blockchain`](ultrathink-blockchain/SKILL.md) | ultrathink-blockchain | Deep-reasoning Solana and blockchain engineering skill. Use for production blockchain development, on-chain programs, Solana transaction flows, DeFi integrations, token bots, swaps, Anchor/Rust programs, RPC handling, Helius/Jito execution, MEV analysis, PDA/account validation, retry logic, simulations, monitoring, or security hardening. |
| [`vulcan`](vulcan/SKILL.md) | vulcan | Entry-point skill for Phoenix perpetuals through Vulcan/Rise SDK inside solana-clawd. Use before answering or acting on Vulcan, Phoenix DEX, Solana perps, paper trading, live trading, margin, TP/SL, TWAP, grid, TA strategies, or perps agent setup. |
| [`vulcan copy`](vulcan%20copy/SKILL.md) | vulcan | Entry-point skill for Phoenix perpetuals through Vulcan/Rise SDK inside solana-clawd. Use before answering or acting on Vulcan, Phoenix DEX, Solana perps, paper trading, live trading, margin, TP/SL, TWAP, grid, TA strategies, or perps agent setup. |
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

### Utilities

| Skill | Name | Description |
|---|---|---|
| [`1password`](1password/SKILL.md) | 1password | Set up and use 1Password CLI (op). Use when installing the CLI, enabling desktop app integration, signing in (single or multi-account), or reading/injecting/running secrets via op. |
| [`bird`](bird/SKILL.md) | bird | X/Twitter CLI for reading, searching, posting, and engagement via cookies. |
| [`bird copy`](bird%20copy/SKILL.md) | bird | X/Twitter CLI for reading, searching, posting, and engagement via cookies. |
| [`blogwatcher`](blogwatcher/SKILL.md) | blogwatcher | Monitor blogs and RSS/Atom feeds for updates using the blogwatcher CLI. |
| [`eightctl`](eightctl/SKILL.md) | eightctl | Control Eight Sleep pods (status, temperature, alarms, schedules). |
| [`gemini`](gemini/SKILL.md) | gemini | Gemini CLI for one-shot Q&A, summaries, and generation. |
| [`peekaboo`](peekaboo/SKILL.md) | peekaboo | Capture and automate macOS UI with the Peekaboo CLI. |

## Other Entries

These entries are present under `skills/` but are not counted as active top-level skills.

### Support Folders

- [`dflow-phantom-connect-skill`](dflow-phantom-connect-skill/)
- [`dflow-skills`](dflow-skills/)
- [`solana-dev-skill-main`](solana-dev-skill-main/)
- [`UltraThink-SKill`](UltraThink-SKill/)

### Support Files

- [`catalog.json`](catalog.json)
- [`solanaos.md`](solanaos.md)

## Notes

- `catalog.json` is the machine-readable index generated from the top-level skill folders.
- `skills-lock.json` at the repo root records content hashes for installed skills.
- Folders without a top-level `SKILL.md` are support material or upstream checkouts and are listed separately above.
