# Solana-Clawd Architecture

> **Version:** 1.4.0  
> **Adapted from:** Claude Code (Anthropic) — QueryEngine, AgentTool, bridge, coordinator, permission, and memory subsystems  
> **Codename:** $CLAWD / SolanaOS

---

## 1. System Overview

```
                         ┌─────────────────────────────────────────────────────┐
                         │                  ENTRY POINTS                       │
                         │                                                     │
                         │  clawd.ts CLI    MCP Server   TailClawd    Web App  │
                         │  (interactive/   (stdio MCP   (Telegram    (Ink/    │
                         │   one-shot)      transport)    bot proxy)   React)  │
                         └────────┬──────────┬───────────┬───────────┬─────────┘
                                  │          │           │           │
                                  ▼          ▼           ▼           ▼
                         ┌─────────────────────────────────────────────────────┐
                         │                  GATEWAY LAYER                      │
                         │                                                     │
                         │  SSE Transport ◄──► Gateway Event Router            │
                         │  (bidirectional)     │                               │
                         │  WebSocket Transport │  Device Auth                  │
                         │  Hybrid Transport    │  Token Refresh                │
                         └──────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
┌──────────────────┐   ┌─────────────────────────────────────────────────────┐
│   AGENT FLEET    │   │                  CORE ENGINE                        │
│                  │   │                                                     │
│  Explorer        │◄──┤  QueryEngine ──► LLM API ──► Tool Execution Loop   │
│  Scanner         │   │    │               │              │                 │
│  OODA Loop       │   │    │  Providers:   │   ┌──────────┤                 │
│  Dream           │   │    │  - OpenRouter │   │          │                 │
│  Analyst         │   │    │  - xAI/Grok   │   ▼          ▼                 │
│  Monitor         │   │    │  - Anthropic  │  ToolExecutor   Permission     │
│  MetaplexAgent   │   │    │  - Mistral    │  (Zod valid,    Engine         │
│                  │   │    │  - Local MLX  │   timeout,      (deny-first,   │
│  [7 built-in     │   │    │               │   retry,        glob patterns, │
│   agents with    │   │    ▼               │   concurrency)  trade gates)   │
│   turn budgets]  │   │  Coordinator ──────┘                                │
└──────────────────┘   │  (multi-agent orchestration,                        │
                       │   task notifications, fan-out)                      │
                       └──────────────────────┬──────────────────────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
               ▼                              ▼                              ▼
┌──────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐
│     SUPPORT LAYER    │  │      MEMORY SYSTEM       │  │   DATA SOURCES     │
│                      │  │                          │  │                    │
│  AppState (Zustand)  │  │  KNOWN   (ephemeral,     │  │  Helius RPC/DAS   │
│  - PermissionMode    │  │           ~60s TTL,      │  │  Helius WebSocket  │
│  - OODA phase        │  │           live API data) │  │  Helius Webhooks   │
│  - AgentTasks        │  │                          │  │                    │
│  - PumpSignals       │  │  LEARNED (Honcho peer,   │  │  Pump.fun Scanner  │
│  - OnchainSubs       │  │           cross-session, │  │  Pump.fun Client   │
│  - ToolCallRecords   │  │           durable)       │  │                    │
│                      │  │                          │  │  Jupiter/Raydium   │
│  Risk Engine         │  │  INFERRED (local vault,  │  │  Token APIs        │
│  (128-bit perp DEX   │  │            markdown,     │  │  Wallet PnL APIs   │
│   risk management)   │  │            searchable)   │  │                    │
└──────────────────────┘  └──────────────────────────┘  └────────────────────┘
               │                              │                              │
               └──────────────────────────────┼──────────────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────────────────┐
                         │                  OUTPUT LAYER                       │
                         │                                                     │
                         │  Telegram Gateway    SSE Transport    WebSocket     │
                         │  (bot commands,      (Chrome ext,     (real-time    │
                         │   pump sniper,        Android app,     terminal     │
                         │   inline alerts)      macOS bar,       PTY server)  │
                         │                       web Control)                  │
                         │                                                     │
                         │  Metaplex Chain       Animation System              │
                         │  (agent NFT mints,    ($CLAWD spinners,             │
                         │   identity PDAs,       birth ceremony,              │
                         │   delegation)          buddy sprites)               │
                         └─────────────────────────────────────────────────────┘
```

---

## 1.1 Connected Surface Map

The repo is not just a CLI runtime. The web surfaces are intended to be connected views over the same Solana blockchain and finance stack:

- `web/app/`
  - Main operator-facing surface for the landing page, docs browser, buddies terminal, voice UI, and API endpoints.
  - Connects conceptually to `src/server/`, `src/gateway/`, `src/voice/`, `src/buddy/`, and the runtime state/query pipeline.
- `web/wiki/`
  - Separate Next.js wiki focused on operational knowledge for `$CLAWD`, OODA memory, risk rails, agent roles, and codebase mapping.
  - Reads article JSON from `web/wiki/wiki-data/` and presents an internal map of the stack.
- `web/skills/`
  - Static browser for the repo skill catalog.
  - `scripts/generate-skills-catalog.js` builds `skills/catalog.json`, which is then copied into `web/skills/catalog.json` for lightweight browsing.
- `docs/`
  - Long-form source-of-truth specs such as this architecture document and the risk engine spec.

That means the user-facing story should consistently point back to the real runtime modules in `src/`: `src/agents/`, `src/engine/`, `src/memory/`, `src/skills/`, `src/gateway/`, `src/helius/`, `src/pump/`, `src/metaplex/`, `src/server/`, and `src/voice/`.

---

## 2. Directory Structure

```
src/
├── agents/                     # Agent fleet definitions and registry
│   └── built-in-agents.ts      # 7 built-in agents (Explorer, Scanner, OODA, Dream, Analyst, Monitor, Metaplex)
│
├── animations/                 # $CLAWD terminal animation system
│   ├── birth-ceremony.ts       # Buddy hatching sequence (heartbeat, wallet gen, stats, sprite)
│   ├── clawd-frames.ts         # Braille-grid unicode spinners (solanaPulse, clawdSpin, etc.)
│   ├── spinner.ts              # Spinner runtime and frame cycling
│   └── index.ts                # Animation re-exports
│
├── assistant/                  # Session history tracking
│   └── sessionHistory.ts       # Conversation history persistence
│
├── bootstrap/                  # Application initialization
│   └── state.ts                # State bootstrapping
│
├── bridge/                     # Remote bridge (Claude Code heritage)
│   ├── bridgeMain.ts           # Bridge lifecycle management
│   ├── bridgeMessaging.ts      # Bidirectional message transport
│   ├── remoteBridgeCore.ts     # Core remote bridge logic
│   ├── envLessBridgeConfig.ts  # v2 "env-less" bridge configuration
│   ├── replBridge.ts           # REPL bridge for interactive sessions
│   ├── jwtUtils.ts             # JWT token management
│   ├── trustedDevice.ts        # Device trust management
│   └── ...                     # ~20 more bridge modules
│
├── buddy/                      # Blockchain Buddy companion system
│   ├── blockchain-types.ts     # 18 species (soldog, bonk, wif, whale, etc.)
│   ├── blockchain-wallet.ts    # Per-buddy Solana wallet generation
│   ├── blockchain-sprites.ts   # Species-specific ASCII sprite art
│   ├── companion.ts            # Buddy lifecycle and trading personality
│   ├── CompanionSprite.tsx     # React sprite renderer
│   ├── types.ts                # Rarity, stats, hats, eyes
│   ├── prompt.ts               # Buddy personality prompt templates
│   └── index.ts                # Buddy re-exports
│
├── cli/                        # CLI runtime and I/O
│   ├── cli.ts                  # Main CLI entry and REPL loop
│   ├── handlers/               # Command handlers (agents, auth, autoMode, mcp, plugins)
│   ├── transports/             # Transport layer (Hybrid, SSE, WebSocket, ccrClient)
│   ├── print.ts                # Terminal output formatting
│   ├── remoteIO.ts             # Remote I/O bridge
│   └── structuredIO.ts         # JSON structured I/O mode
│
├── commands/                   # Slash-commands and UI commands (~60 commands)
│   ├── agents/                 # /agents — list and manage agent fleet
│   ├── memory/                 # /memory — inspect and manage memory tiers
│   ├── skills/                 # /skills — skill registry
│   ├── tasks/                  # /tasks — background task management
│   ├── plan/                   # /plan — planning mode
│   ├── compact/                # /compact — context window compression
│   ├── config/                 # /config — runtime configuration
│   ├── permissions/            # /permissions — permission rule management
│   ├── status/                 # /status — system status dashboard
│   ├── stickers/               # /stickers — buddy sticker packs
│   ├── advisor.ts              # Trading advisor command
│   ├── insights.ts             # Market insights command
│   ├── security-review.ts      # Token security review
│   └── ...                     # Many more commands
│
├── components/                 # Ink/React UI components
│   ├── App.tsx                 # Root application component
│   ├── LogoV2/                 # Animated $CLAWD logo, feed columns, welcome
│   ├── Spinner/                # Spinner animation components
│   ├── agents/                 # Agent UI (list, detail, editor, wizard)
│   ├── permissions/            # Permission request dialogs
│   ├── memory/                 # Memory visualization
│   ├── mcp/                    # MCP server management UI
│   ├── tasks/                  # Task list and progress UI
│   └── ...                     # ~80 more UI components
│
├── constants/                  # Global constants
│
├── context/                    # React context providers
│
├── coordinator/                # Multi-agent coordinator
│   ├── coordinator.ts          # Worker orchestration, fan-out, task notifications
│   └── coordinatorMode.ts      # Coordinator mode management
│
├── engine/                     # Core execution engine
│   ├── query-engine.ts         # Provider-agnostic multi-model LLM streaming engine
│   ├── tool-executor.ts        # Tool execution with permissions, retries, concurrency
│   ├── tool-base.ts            # Tool definition, Zod schemas, permission levels
│   ├── permission-engine.ts    # Glob-pattern deny-first permission resolution
│   └── risk-engine.ts          # 128-bit perpetual DEX risk engine
│
├── entrypoints/                # Application entry points
│   ├── clawd.ts                # CLI entry (interactive, birth, spinners, demo, wallet)
│   ├── mcp.ts                  # MCP server entry (stdio transport)
│   ├── init.ts                 # Initialization entry
│   └── sdk/                    # Agent SDK types
│
├── gateway/                    # Gateway transport layer
│   ├── sse-transport.ts        # Bidirectional SSE with BoundedUUIDSet dedup
│   ├── gateway-integration.ts  # Event router wiring SSE to QueryEngine
│   ├── device-auth.ts          # Device authentication payloads
│   ├── events.ts               # Gateway event type definitions
│   └── protocol/               # Client info, error codes
│
├── helius/                     # Helius RPC integration
│   ├── helius-client.ts        # Helius API client (RPC, DAS, webhooks)
│   ├── onchain-listener.ts     # WebSocket subscription manager
│   └── index.ts                # Re-exports
│
├── hooks/                      # Runtime hooks
│   ├── toolPermission/         # Tool permission hook handlers
│   └── notifs/                 # Notification hooks
│
├── memory/                     # Memory extraction and management
│   └── extract-memories.ts     # KNOWN/LEARNED/INFERRED auto-extraction from turns
│
├── memdir/                     # Local vault (INFERRED tier — markdown files)
│
├── metaplex/                   # Metaplex onchain agent minting
│   ├── agent-minter.ts         # MPL Core asset creation + Agent Identity PDA
│   ├── agent-registry.ts       # Agent registry read/write operations
│   ├── metaplex-types.ts       # Types, templates, network configs
│   └── index.ts                # Re-exports
│
├── pump/                       # Pump.fun integration
│   ├── client.ts               # Pump.fun API client
│   ├── scanner.ts              # Bonding curve scanner
│   ├── math.ts                 # Bonding curve math (progress BPS)
│   ├── types.ts                # Pump.fun data types
│   └── index.ts                # Re-exports
│
├── query/                      # Query processing helpers
│
├── server/                     # Web server and terminal
│   ├── web/                    # Express web server
│   │   ├── auth/               # Auth adapters (token, OAuth, API key)
│   │   ├── admin.ts            # Admin dashboard endpoints
│   │   ├── session-manager.ts  # Session lifecycle
│   │   ├── session-store.ts    # Persistent session storage
│   │   ├── pty-server.ts       # PTY terminal server
│   │   ├── terminal.ts         # Web terminal interface
│   │   └── scrollback-buffer.ts# Terminal scrollback
│   ├── directConnectManager.ts # Direct connection management
│   └── types.ts                # Server types
│
├── services/                   # Background services
│   ├── extractMemories/        # Memory extraction pipeline
│   ├── autoDream/              # Auto-dream memory consolidation
│   ├── SessionMemory/          # Session memory management
│   ├── compact/                # Context compression
│   ├── mcp/                    # MCP service layer
│   ├── plugins/                # Plugin management
│   ├── analytics/              # Usage analytics
│   ├── lsp/                    # Language Server Protocol integration
│   └── ...                     # Additional services
│
├── skills/                     # Skill definitions
│   ├── bundled/                # Built-in skills
│   └── solana-dev/             # Solana development skill
│
├── state/                      # Application state management
│   ├── app-state.ts            # AppState shape (Zustand store)
│   ├── AppStateStore.ts        # Store implementation
│   ├── store.ts                # Generic store factory (createStore)
│   ├── selectors.ts            # State selectors
│   └── onChangeAppState.ts     # State change listeners
│
├── tasks/                      # Background task system
│   ├── DreamTask/              # Memory consolidation task
│   ├── InProcessTeammateTask/  # In-process agent task
│   ├── LocalAgentTask/         # Local agent execution
│   ├── LocalShellTask/         # Shell command task
│   └── RemoteAgentTask/        # Remote agent execution
│
├── telegram/                   # Telegram bot integration
│   ├── bot.ts                  # Telegram bot setup and lifecycle
│   ├── commands.ts             # Bot command handlers
│   ├── pump-sniper.ts          # Pump.fun sniper alerts
│   ├── types.ts                # Telegram types
│   └── index.ts                # Re-exports
│
├── tools/                      # Tool implementations (~35 tool modules)
│   ├── AgentTool/              # Agent spawn/list/stop tools
│   │   └── built-in/           # Built-in agent tool definitions
│   ├── BashTool/               # Shell execution
│   ├── FileEditTool/           # File editing
│   ├── FileReadTool/           # File reading
│   ├── FileWriteTool/          # File writing
│   ├── GlobTool/               # File pattern search
│   ├── GrepTool/               # Content search
│   ├── MCPTool/                # MCP tool bridge
│   ├── SkillTool/              # Skill execution
│   ├── WebFetchTool/           # HTTP fetch
│   ├── WebSearchTool/          # Web search
│   ├── ScheduleCronTool/       # Cron scheduling
│   ├── RemoteTriggerTool/      # Remote trigger execution
│   ├── TaskCreateTool/         # Task creation
│   ├── TodoWriteTool/          # Todo management
│   └── ...                     # More tool modules
│
├── types/                      # TypeScript type definitions
│   └── generated/              # Protobuf-generated event types
│
├── utils/                      # Utility modules
│   ├── permissions/            # Permission helpers
│   ├── memory/                 # Memory utilities
│   ├── mcp/                    # MCP utilities
│   ├── sandbox/                # Sandbox execution
│   ├── git/                    # Git operations
│   ├── github/                 # GitHub API helpers
│   ├── bash/                   # Bash command specs
│   ├── skills/                 # Skill utilities
│   ├── swarm/                  # Multi-agent swarm backends
│   ├── task/                   # Task utilities
│   ├── model/                  # Model selection and configuration
│   └── ...                     # Many more utilities
│
├── vim/                        # Vim mode support
├── voice/                      # Voice input/output
├── QueryEngine.ts              # Legacy query engine (Claude Code heritage)
├── Task.ts                     # Legacy task type
└── Tool.ts                     # Legacy tool type
```

---

## 3. Data Flow Diagrams

### 3.1 CLI Session

```
User types command
        │
        ▼
   clawd.ts CLI ──► parse args (birth/spinners/demo/wallet/interactive)
        │
        ▼
   Bootstrap AppState (Zustand store)
   Load PermissionEngine rules
   Initialize ToolRegistry (31 MCP tools)
   Connect Helius client
        │
        ▼
   QueryEngine.runTurn(userMessage)
        │
        ├──► Format system prompt + agent identity
        ├──► Inject memory context (KNOWN + LEARNED recall)
        ├──► Stream to LLM provider (OpenRouter / xAI / Anthropic / Mistral / Local MLX)
        │
        ▼
   LLM Response Stream
        │
        ├── [text content] ──► render to terminal (Ink/React)
        │
        ├── [tool_use block] ──► ToolExecutor
        │       │
        │       ├── Zod input validation
        │       ├── PermissionEngine.resolve(toolName, args)
        │       │       │
        │       │       ├── deny  → ToolResult { error: "denied" }
        │       │       ├── ask   → prompt user → approve/reject
        │       │       └── allow → proceed
        │       │
        │       ├── Execute tool with timeout + AbortSignal
        │       ├── Retry on transient errors (max 2, exponential backoff)
        │       └── Inject ToolResult → continue LLM loop
        │
        └── [end_turn] ──► extractMemories(turn)
                                │
                                ├── KNOWN  → session cache (60s TTL)
                                ├── LEARNED → Honcho API (durable)
                                └── INFERRED → local vault (markdown)
```

### 3.2 MCP Request

```
MCP Client (Claude Desktop, Cursor, etc.)
        │
        │  stdio JSON-RPC
        ▼
   mcp.ts ──► @modelcontextprotocol/sdk Server
        │
        ├── ListToolsRequest ──► getTools() → zodToJsonSchema() → ListToolsResult
        │
        └── CallToolRequest ──► findToolByName(name)
                │
                ├── hasPermissionsToUseTool(tool, context)
                │       │
                │       └── PermissionEngine resolve (deny-first)
                │
                ├── tool.execute(input, context)
                │       │
                │       ├── Helius RPC calls (balance, txns, DAS)
                │       ├── Pump.fun API (scanner, bonding curve)
                │       ├── Memory read/write
                │       ├── Agent spawn/stop
                │       ├── Metaplex mint/register
                │       └── ... (31 tool implementations)
                │
                └── CallToolResult { content, isError }
```

### 3.3 OODA Trading Loop

```
                          ┌────────────────────┐
                          │   OBSERVE           │
                          │                     │
                          │   sol_price          │
                          │   solana_trending    │
                          │   memory_recall      │
                          │     tier=KNOWN       │
                          │     tier=INFERRED    │
                          └─────────┬────────────┘
                                    │
                                    ▼
                          ┌────────────────────┐
                          │   ORIENT            │
                          │                     │
                          │   solana_token_info  │
                          │   helius_transactions│
                          │                     │
                          │   Score each token:  │
                          │   Trend:     0-25    │
                          │   Momentum:  0-20    │
                          │   Liquidity: 0-20    │
                          │   Volume:    0-15    │
                          │   Risk:      -20     │
                          │   ─────────────────  │
                          │   Minimum:    60     │
                          └─────────┬────────────┘
                                    │
                          ┌─────────┴────────────┐
                          │                      │
                     score >= 60            score < 60
                          │                      │
                          ▼                      ▼
                ┌──────────────────┐   ┌──────────────────┐
                │   DECIDE         │   │   PASS            │
                │                  │   │                   │
                │   Size position: │   │   Write INFERRED  │
                │   60-69: half    │   │   conclusion      │
                │   70-79: base    │   │   to memory       │
                │   80-89: 1.25x   │   └───────────────────┘
                │   90+:   1.50x   │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   ACT            │
                │                  │
                │   *** REQUIRES   │
                │   HUMAN APPROVAL │
                │   ***            │
                │                  │
                │   Write trade    │
                │   plan as        │
                │   INFERRED       │
                │   memory         │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   LEARN          │
                │                  │
                │   Write LEARNED  │
                │   conclusion     │
                │   with outcome   │
                │   rationale      │
                │                  │
                │   Update         │
                │   INFERRED       │
                │   signals        │
                │                  │
                │   Increment      │
                │   cycle counter  │
                └──────────────────┘
                         │
                         │  (every 5 cycles)
                         ▼
                ┌──────────────────┐
                │   DREAM          │
                │   (Dream Agent)  │
                │                  │
                │   Consolidate    │
                │   INFERRED →     │
                │   LEARNED        │
                │                  │
                │   Expire stale   │
                │   signals        │
                │                  │
                │   Extract        │
                │   patterns       │
                └──────────────────┘
```

### 3.4 Buddy Birth Ceremony

```
User: `npx solana-clawd birth bonk`
        │
        ▼
   ┌──────────────────────────────────┐
   │  Phase 1: HEARTBEAT PULSE        │
   │                                   │
   │  solanaPulse spinner animation    │
   │  (braille heartbeat, 3 cycles)    │
   │                                   │
   │  ⠀⠀⠀⣀⠀⠀⠀ → ⣾⣿⣿⣿⣿⣿⣷ → ⠀⠀⠀⠁⠀⠀⠀  │
   └───────────────┬──────────────────┘
                   │
                   ▼
   ┌──────────────────────────────────┐
   │  Phase 2: WALLET GENERATION      │
   │                                   │
   │  Generate Ed25519 keypair         │
   │  Derive Solana wallet address     │
   │  Block-finality animation         │
   │  (clawdSpin spinner)             │
   │                                   │
   │  "Generating wallet... ⣰⣿⣿⡆"    │
   │  "Address: 7xKp...3nRt"          │
   └───────────────┬──────────────────┘
                   │
                   ▼
   ┌──────────────────────────────────┐
   │  Phase 3: STATS ROLL             │
   │                                   │
   │  Roll species-specific stats:     │
   │  - Luck       (trading luck)      │
   │  - Speed      (execution speed)   │
   │  - Wisdom     (analysis depth)    │
   │  - Charisma   (community pull)    │
   │  - Stealth    (MEV avoidance)     │
   │                                   │
   │  Rarity tier reveal:              │
   │  Common / Uncommon / Rare /       │
   │  Epic / Legendary                 │
   └───────────────┬──────────────────┘
                   │
                   ▼
   ┌──────────────────────────────────┐
   │  Phase 4: SPRITE REVEAL          │
   │                                   │
   │  Species-specific ASCII art       │
   │  Trading personality assignment   │
   │  (diamond_hands, degen, sniper,   │
   │   whale, bot, ape, etc.)          │
   │                                   │
   │  Catchphrase announcement:        │
   │  "BONK! Let's sniff out alpha!"   │
   └──────────────────────────────────┘
```

---

## 4. Major Subsystems

### 4.1 Query Engine

**Source:** `src/engine/query-engine.ts`  
**Adapted from:** Claude Code's `src/QueryEngine.ts`

The QueryEngine is the central LLM orchestration pipeline. It is provider-agnostic and supports five backends:

| Provider    | Models                                    | Use Case                       |
|-------------|-------------------------------------------|--------------------------------|
| OpenRouter  | minimax-m2.7, Kimi K2.5, Llama 4         | Primary multi-model routing    |
| xAI / Grok  | Grok vision, search, reasoning            | Vision analysis, web search    |
| Anthropic   | Claude Sonnet 4.6                         | High-quality reasoning         |
| Mistral     | Voxtral                                   | TTS/STT side-channel           |
| Local MLX   | Apple Silicon models via mlx-server.py    | Offline / low-latency          |

Key capabilities:
- **Tool call loops:** Detect tool_use blocks, execute via ToolExecutor, inject results, continue streaming
- **Thinking mode:** Budget-managed reasoning tokens (thinkingEnabled, thinkingBudget)
- **Context compression:** Session length management to stay within context window
- **Token/cost tracking:** Per-turn and per-session usage accounting (TurnUsage, SessionUsage)
- **Retry with backoff:** Exponential backoff for transient LLM API errors
- **AbortSignal:** User interrupt support via AbortController

### 4.2 Permission Engine

**Source:** `src/engine/permission-engine.ts`  
**Adapted from:** Claude Code's `src/hooks/toolPermission/` system

Deny-first permission resolution using wildcard glob patterns. Rules are evaluated in priority order: **deny > ask > allow > default**.

**Permission levels:**

| Level     | Description                                      | Examples                              |
|-----------|--------------------------------------------------|---------------------------------------|
| `safe`    | Read-only data retrieval                         | solana_price, helius_balance          |
| `write`   | State mutations                                  | memory_write, config updates          |
| `execute` | Shell/browser automation                         | bash commands, computer use           |
| `trade`   | Financial operations                             | spot buy/sell, swaps, perp open/close |

**Pattern syntax:** `trading.buy(*)`, `trading.buy(BONK)`, `bash(git *)`, `memory.write(*)`, `solana.*`

**SolanaOS extensions beyond Claude Code:**
- Trade-amount thresholds as first-class permission dimensions
- Sim-mode gates (simOnly rules that only apply in simulated mode)
- Per-agent permission modes: `ask` (default), `auto` (approve reads), `readOnly` (deny all writes), `bypassAll` (dev only)

### 4.3 Agent Fleet

**Source:** `src/agents/built-in-agents.ts`  
**Adapted from:** Claude Code's `AgentTool/builtInAgents.ts`

Seven built-in agents, each with distinct tool access, permission modes, and turn budgets:

| Agent           | Type            | Permission  | Max Turns | Effort | Async | Purpose                                     |
|-----------------|-----------------|-------------|-----------|--------|-------|---------------------------------------------|
| Explorer        | `Explore`       | readOnly    | 10        | low    | Yes   | Read-only research (price, tokens, wallets)  |
| Market Scanner  | `Scanner`       | auto        | 25        | base   | Yes   | Trend monitoring, signal surfacing           |
| OODA Loop       | `OODA`          | ask         | 40        | high   | No    | Full trading cycle (Observe-Orient-Decide-Act-Learn) |
| Memory Consolidation | `Dream`    | readOnly    | 20        | low    | Yes   | INFERRED to LEARNED promotion                |
| Deep Analyst    | `Analyst`       | auto        | 30        | high   | Yes   | Structured research reports                  |
| Onchain Monitor | `Monitor`       | auto        | 15        | low    | Yes   | Helius WebSocket event listeners             |
| Metaplex Minter | `MetaplexAgent` | ask         | 25        | base   | No    | Mint/register AI agents onchain              |

Agents can be disabled via `SOLANA_CLAUDE_DISABLE_AGENTS=Dream,Monitor` environment variable.

The Coordinator routes tasks to agents using tag-based matching (`findAgentByTag`).

### 4.4 Memory System

**Source:** `src/memory/extract-memories.ts`, `src/memdir/`, `src/services/extractMemories/`  
**Adapted from:** Claude Code's `src/services/extractMemories/` + `src/memdir/` hierarchy

Three-tier epistemological model from the SOUL.md specification:

| Tier       | Storage               | TTL       | Scope           | Use Case                                     |
|------------|-----------------------|-----------|-----------------|----------------------------------------------|
| **KNOWN**  | Ephemeral session cache | ~60 seconds | Session       | Live API data: prices, volumes, balances     |
| **LEARNED**| Honcho peer API       | Durable   | Cross-session   | Validated conclusions, trading patterns       |
| **INFERRED**| Local vault (markdown)| Until expired | Searchable  | Scanner signals, unvalidated hypotheses      |

**Extraction pipeline:**
1. After each LLM turn, `extractFromTurn()` is called
2. Rule-based regex patterns detect KNOWN facts (e.g., price mentions, holder counts, bonding curve percentages)
3. Higher-confidence facts are routed to the appropriate tier
4. Contradiction detection flags conflicts with existing LEARNED facts

**Memory consolidation (Dream Agent):**
- Runs after every 5 OODA cycles
- Promotes corroborated INFERRED signals to LEARNED
- Expires stale signals (>24h with no corroboration)
- Extracts recurring patterns across signals

### 4.5 Tool Registry

**Source:** `src/engine/tool-base.ts`, `src/tools/`

31 MCP-compatible tools organized by category:

**Read-Only (12 tools):**
`solana_price`, `solana_trending`, `solana_token_info`, `solana_wallet_pnl`, `solana_search`, `solana_top_traders`, `solana_wallet_tokens`, `sol_price`, `helius_account_info`, `helius_balance`, `helius_transactions`, `helius_priority_fee`

**Helius DAS + Webhooks (4 tools):**
`helius_das_asset`, `helius_listener_setup`, `helius_webhook_create`, `helius_webhook_list`

**Memory (2 tools):**
`memory_recall`, `memory_write`

**Skills (2 tools):**
`skill_list`, `skill_read`

**Agent Management (3 tools):**
`agent_spawn`, `agent_list`, `agent_stop`

**Metaplex (6 tools):**
`metaplex_mint_agent`, `metaplex_register_identity`, `metaplex_read_agent`, `metaplex_delegate_execution`, `metaplex_verify_mint`, `metaplex_agent_wallet`

**Trade Execution (gated):**
`trade_execute`, `wallet_send`, `wallet_sign` (denied by default on OODA agent, require explicit approval)

All tools use Zod schema validation, support AbortSignal cancellation, and have a permission level (`safe`, `write`, `execute`, `trade`).

### 4.6 SSE Transport

**Source:** `src/gateway/sse-transport.ts`, `src/gateway/gateway-integration.ts`  
**Adapted from:** Claude Code's `src/bridge/` SSETransport

Bidirectional SSE-based transport for the gateway-to-client communication channel:

- **Reads:** SSE stream via `GET /api/v1/stream`
- **Writes:** POST via `POST /api/v1/gateway/message`
- **Dedup:** `BoundedUUIDSet` (1000-entry bounded set) prevents message replay/echo
- **Message classification:** `user`, `control_request`, `control_response`
- **State machine:** `ready` -> `connected` -> `reconnecting` -> `failed`
- **Token refresh:** Scheduled device auth token rotation

**Used by:** Chrome Extension, Android app, macOS menu bar, web Control UI

### 4.7 Blockchain Buddy System

**Source:** `src/buddy/`

Each user gets a companion "Blockchain Buddy" -- a Solana-native virtual pet with trading personality:

**18 Species:** `soldog`, `bonk`, `wif`, `jupiter`, `raydium`, `whale`, `bull`, `bear`, `shark`, `octopus`, `degod`, `y00t`, `okaybear`, `pepe`, `pumpfun`, `sniper`, `validator`, `rpc`

**Trading Personalities:** `diamond_hands`, `paper_hands`, `degen`, `sniper`, `whale`, `bot`, `ape`

**Stats:** Luck, Speed, Wisdom, Charisma, Stealth -- affect trading behavior and signal weighting

**Each buddy has:**
- A unique Ed25519 keypair and Solana wallet address
- Species-specific ASCII sprite art
- Rarity tier (Common / Uncommon / Rare / Epic / Legendary)
- A catchphrase

### 4.8 Animation System

**Source:** `src/animations/`

Custom Braille-grid Unicode spinners themed around the Solana ecosystem:

| Spinner        | Description                                | Interval |
|----------------|--------------------------------------------|----------|
| `solanaPulse`  | Heartbeat-style pulse (Solana TPS counter)  | 100ms    |
| `clawdSpin`    | Braille-encoded "C" that rotates/morphs     | varies   |

Spinners conform to the `unicode-animations` `Spinner` interface (`{ frames: string[], interval: number }`) and are used throughout the CLI for loading states, birth ceremonies, and the OODA cycle progress display.

### 4.9 Metaplex Integration

**Source:** `src/metaplex/`

Onchain agent lifecycle management via the Metaplex protocol:

- **Minting:** Create MPL Core assets with Agent Identity PDAs using `@metaplex-foundation/mpl-agent-registry`
- **Registration:** Register agent identities on existing Core assets (ERC-8004 JSON documents)
- **Delegation:** Delegate execution authority from agent asset to off-chain executives
- **Verification:** Verify minting status and read agent data

**Built-in role templates:** explorer, scanner, trader, analyst, monitor, custom

**Safety defaults:** Solana devnet by default, mainnet requires explicit user request. Mints are verified after submission.

### 4.10 Multi-Agent Coordinator

**Source:** `src/coordinator/coordinator.ts`  
**Adapted from:** Claude Code's `src/coordinator/coordinatorMode.ts` + `AgentTool/runAgent.ts`

The coordinator orchestrates the agent fleet:

- **Fan-out:** Independent tasks are dispatched to workers concurrently
- **Task notifications:** Workers report back via `<task-notification>` XML protocol (taskId, status, summary, result, usage)
- **Worker statuses:** `running`, `completed`, `failed`, `killed`, `stopped`
- **OODA phase tracking:** Coordinator tracks current OODA phase across the fleet
- **Risk gate:** Trade workers require simMode check before executing KNOWN actions
- **Continue vs spawn:** Reuses worker context when task overlap is high

---

## 5. Design Principles

| Principle                  | Description                                                                                                  | Implementation                                                         |
|----------------------------|--------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **Deny-first permissions** | Every tool call is denied unless an explicit allow rule matches. Trade execution always requires human approval. | `PermissionEngine` with glob patterns, priority: deny > ask > allow    |
| **Observable execution**   | Every tool call is recorded with input, output, duration, and approval status. Full token/cost accounting.    | `ToolCallRecord` in AppState, `TurnUsage`/`SessionUsage` tracking      |
| **Platform-agnostic core** | QueryEngine and ToolExecutor know nothing about the surface. Rendering is handled by surface-specific adapters. | `ToolContext.surface` enum: telegram, web, android, macos, extension, cli, api |
| **3-tier memory**          | Epistemological model separating volatile facts, durable conclusions, and speculative inferences.             | KNOWN (60s cache), LEARNED (Honcho), INFERRED (local vault)            |
| **Autonomous OODA cycle**  | Continuous Observe-Orient-Decide-Act-Learn loop with human-in-the-loop for trade execution.                  | OODA agent (40 turns, ask-mode), Dream agent for consolidation         |
| **Provider diversity**     | No single LLM vendor lock-in. Five providers with fallback routing.                                          | OpenRouter, xAI, Anthropic, Mistral, Local MLX                        |
| **Agent specialization**   | Each agent has minimum-necessary tool access, enforced turn budgets, and scoped memory.                      | 7 agents with distinct `allowedTools`, `maxTurns`, `memoryScope`       |
| **Onchain identity**       | AI agents are first-class Solana citizens with verifiable onchain identities.                                | Metaplex MPL Core assets + Agent Identity PDAs                         |
| **Composable transport**   | Gateway layer abstracts SSE, WebSocket, and hybrid transports behind a unified event interface.               | `SSETransport`, `WebSocketTransport`, `HybridTransport`                |
| **Bounded resource use**   | Dedup sets are bounded, sessions have turn limits, tool execution has timeouts and concurrency caps.         | `BoundedUUIDSet(1000)`, `maxTurns`, `timeoutMs(60s)`, `maxConcurrency(4)` |

---

## 6. Key Source Files

| File                                    | Purpose                                                                  |
|-----------------------------------------|--------------------------------------------------------------------------|
| `src/entrypoints/clawd.ts`              | CLI entry point (interactive, birth, spinners, demo, wallet)             |
| `src/entrypoints/mcp.ts`               | MCP server entry point (stdio JSON-RPC transport)                        |
| `src/engine/query-engine.ts`            | Provider-agnostic multi-model streaming LLM engine                       |
| `src/engine/tool-executor.ts`           | Tool execution with permissions, retries, concurrency                    |
| `src/engine/tool-base.ts`              | Tool definition, Zod schemas, permission levels, ToolContext             |
| `src/engine/permission-engine.ts`       | Deny-first glob-pattern permission resolution                            |
| `src/engine/risk-engine.ts`            | 128-bit perpetual DEX risk engine                                        |
| `src/agents/built-in-agents.ts`         | 7 built-in agent definitions with tool sets and turn budgets             |
| `src/coordinator/coordinator.ts`        | Multi-agent coordinator (fan-out, task notifications, OODA tracking)     |
| `src/state/app-state.ts`               | AppState shape (permissions, OODA phase, tasks, signals, subscriptions)  |
| `src/state/AppStateStore.ts`            | Zustand store implementation                                             |
| `src/memory/extract-memories.ts`        | KNOWN/LEARNED/INFERRED auto-extraction from conversation turns           |
| `src/gateway/sse-transport.ts`          | Bidirectional SSE transport with BoundedUUIDSet dedup                    |
| `src/gateway/gateway-integration.ts`    | Event router wiring SSE transport to QueryEngine/Coordinator             |
| `src/helius/helius-client.ts`           | Helius RPC/DAS/webhook API client                                        |
| `src/helius/onchain-listener.ts`        | Helius WebSocket subscription manager                                    |
| `src/pump/scanner.ts`                   | Pump.fun bonding curve scanner                                           |
| `src/pump/client.ts`                    | Pump.fun API client                                                      |
| `src/metaplex/agent-minter.ts`          | MPL Core asset creation + Agent Identity PDA registration                |
| `src/metaplex/agent-registry.ts`        | Agent registry read/write operations                                     |
| `src/buddy/blockchain-types.ts`         | 18 blockchain species definitions and trading personalities              |
| `src/buddy/blockchain-wallet.ts`        | Per-buddy Solana wallet generation                                       |
| `src/buddy/blockchain-sprites.ts`       | Species-specific ASCII sprite art                                        |
| `src/animations/birth-ceremony.ts`      | Buddy hatching ceremony (heartbeat, wallet, stats, sprite)               |
| `src/animations/clawd-frames.ts`        | Braille-grid unicode spinner definitions                                 |
| `src/telegram/bot.ts`                   | Telegram bot setup and lifecycle                                         |
| `src/telegram/pump-sniper.ts`           | Pump.fun sniper alerts via Telegram                                      |
| `src/server/web/pty-server.ts`          | Web terminal PTY server                                                  |
| `src/cli/cli.ts`                        | Main CLI REPL loop                                                       |
| `src/cli/transports/HybridTransport.ts` | Hybrid SSE+WebSocket transport                                           |
| `src/services/autoDream/`               | Automatic memory consolidation service                                   |
| `src/tasks/DreamTask/`                  | Dream agent background task runner                                       |
