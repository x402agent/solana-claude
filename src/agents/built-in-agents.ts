/**
 * src/agents/built-in-agents.ts
 *
 * Built-in agent definitions for solana-clawd.
 *
 * Adapted from Clawd Code's AgentTool/builtInAgents.ts and loadAgentsDir.ts.
 * Each agent has: a name, system prompt, supported tools, memory scope,
 * permission mode, and max turns. Agents run in the coordinator loop.
 *
 * Built-in fleet:
 *   Explore   — read-only research, no LLM cost optimizations needed
 *   Scanner   — trend monitoring, fires on schedule or on-demand
 *   OODA      — full Observe→Orient→Decide→Act→Learn cycle
 *   Dream     — memory consolidation (INFERRED → LEARNED promotion)
 *   Analyst   — deep token/wallet analysis with structured output
 */

// ─────────────────────────────────────────────────────────────────────────────
// Agent definition type (adapted from Clawd Code's AgentDefinition)
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionMode = "ask" | "auto" | "readOnly";
export type MemoryScope = "session" | "project" | "user";
export type EffortLevel = "low" | "base" | "high";

export interface AgentDefinition {
  /** Machine identifier (used in logs, task IDs, coordinator routing) */
  agentType: string;
  /** Human-readable name shown in UI / Telegram */
  displayName: string;
  /** Concise bio shown in status listings */
  description: string;
  /** System prompt injected at agent start */
  systemPrompt: string;
  /** Which tools this agent may call (from the MCP tool registry) */
  allowedTools: string[];
  /** Deny-list overrides the allow-list */
  deniedTools?: string[];
  /** Permission mode: readOnly forces no trade execution */
  permissionMode: PermissionMode;
  /** Honcho/in-process memory scope */
  memoryScope: MemoryScope;
  /** Max LLM turns before forced exit */
  maxTurns: number;
  /** Effort level (controls token budget) */
  effort?: EffortLevel;
  /** Whether this agent can run in background without UI interaction */
  isAsync: boolean;
  /** Comma-separated tag list for coordinator routing */
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Common tool sets
// ─────────────────────────────────────────────────────────────────────────────

const READ_ONLY_TOOLS = [
  "solana_price",
  "solana_trending",
  "solana_token_info",
  "solana_wallet_pnl",
  "solana_search",
  "solana_top_traders",
  "solana_wallet_tokens",
  "sol_price",
  "helius_account_info",
  "helius_balance",
  "helius_transactions",
  "helius_priority_fee",
  "helius_das_asset",
  "helius_listener_setup",
];

const MEMORY_TOOLS = ["memory_recall", "memory_write"];
const SKILL_TOOLS = ["skill_list", "skill_read"];
const AGENT_TOOLS = ["agent_spawn", "agent_list", "agent_stop"];
const WEBHOOK_TOOLS = ["helius_webhook_create", "helius_webhook_list"];
const METAPLEX_TOOLS = [
  "metaplex_mint_agent",
  "metaplex_register_identity",
  "metaplex_read_agent",
  "metaplex_delegate_execution",
  "metaplex_verify_mint",
  "metaplex_agent_wallet",
];

// ─────────────────────────────────────────────────────────────────────────────
// Built-in agents
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Explore — lightweight read-only research agent.
 * Adapted from Clawd Code's EXPLORE_AGENT.
 * Optimized to be cheap: no memory writes, no agent spawning, max 10 turns.
 */
export const EXPLORE_AGENT: AgentDefinition = {
  agentType: "Explore",
  displayName: "Explorer",
  description: "Read-only Solana research. Price, tokens, wallets — no trades.",
  systemPrompt: `You are a read-only Solana research agent.

Your job: gather factual, on-chain data and return a concise structured summary.
Do NOT make any trades, sign any transactions, or call any write operations.
Do NOT write to memory — your findings will be evaluated by the parent agent.

Use the available tools to:
1. Fetch live price and 24h change
2. Get token security score and metadata  
3. Check trending tokens
4. Look at top trader wallets for smart money signals

Return a structured JSON summary:
{
  "token": "...",
  "price_usd": 0.0,
  "change_24h_pct": 0.0,
  "security_score": 0,
  "volume_24h_usd": 0,
  "trending_rank": null,
  "smart_money_signal": "bullish|bearish|neutral",
  "risk_level": "low|medium|high|extreme",
  "recommendation": "buy|wait|avoid",
  "rationale": "..."
}`,
  allowedTools: [...READ_ONLY_TOOLS, ...SKILL_TOOLS],
  permissionMode: "readOnly",
  memoryScope: "session",
  maxTurns: 10,
  effort: "low",
  isAsync: true,
  tags: ["research", "read-only", "fast"],
};

/**
 * Scanner — trend monitoring agent.
 * Adapted from Clawd Code's GENERAL_PURPOSE_AGENT pattern.
 * Runs on schedule or on-demand to surface high-signal opportunities.
 */
export const SCANNER_AGENT: AgentDefinition = {
  agentType: "Scanner",
  displayName: "Market Scanner",
  description: "Scans trending tokens and surfaces high-signal opportunities.",
  systemPrompt: `You are the SolanaOS Market Scanner.

Run a full market scan:
1. Get SOL price + 24h context
2. Fetch top 20 trending tokens
3. For each token with >40% 24h change AND security score >70, run deep research via Explore subagent
4. Recall any LEARNED patterns from memory that match current market structure
5. Write INFERRED signals to memory for the OODA loop to consume

Output format:
- Ranked opportunity list (top 5 max)
- Each with: token, mint, price, 24h change, security score, signal strength (0-100), rationale
- Current market regime: RISK_ON / RISK_OFF / NEUTRAL
- Any patterns matching LEARNED memory entries`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS, ...AGENT_TOOLS,
  ],
  permissionMode: "auto",
  memoryScope: "project",
  maxTurns: 25,
  effort: "base",
  isAsync: true,
  tags: ["scanner", "trending", "market"],
};

/**
 * OODA — full Observe→Orient→Decide→Act→Learn cycle.
 * The core trading loop adapted from SolanaOS strategy.md.
 * All trade execution is gated at `ask` permission level.
 */
export const OODA_AGENT: AgentDefinition = {
  agentType: "OODA",
  displayName: "OODA Loop",
  description: "Full trading cycle: Observe → Orient → Decide → Act → Learn.",
  systemPrompt: `You are the SolanaOS OODA Agent. You execute one full trading cycle.

## OBSERVE
- sol_price: current SOL price and context
- solana_trending: top 20 trending tokens
- memory_recall tier=KNOWN: fresh on-chain facts
- memory_recall tier=INFERRED: signals from Scanner

## ORIENT  
- For top candidates: solana_token_info (security, liquidity, holders)
- For wallets of interest: helius_transactions (recent activity)
- Score each opportunity:
  * Trend structure (EMA alignment): 0-25 pts
  * Momentum quality (RSI, velocity): 0-20 pts
  * Liquidity quality (depth, slippage): 0-20 pts  
  * Participation (volume expansion): 0-15 pts
  * Execution risk (funding, dev wallet): 0-20 pts (SUBTRACTIVE)
  * Minimum score to proceed: 60/100

## DECIDE
- If score ≥ 60: formulate position (size = confidence band × base_size)
  * 60-69: half-size
  * 70-79: base-size  
  * 80-89: 1.25x size
  * 90+: 1.50x size
- If score < 60: PASS — write INFERRED conclusion to memory

## ACT
⚠️  TRADE EXECUTION REQUIRES EXPLICIT HUMAN APPROVAL
Write your recommendation as INFERRED memory.
If in auto mode: describe the trade (token, size, stop, target) and await approval.

## LEARN
- Write LEARNED conclusion to memory with outcome rationale
- Update INFERRED signals for next cycle
- Increment cycle counter in state`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS, ...AGENT_TOOLS,
  ],
  // Trade actions added at runtime only when explicitly approved
  deniedTools: ["trade_execute", "wallet_send", "wallet_sign"],
  permissionMode: "ask",
  memoryScope: "project",
  maxTurns: 40,
  effort: "high",
  isAsync: false,  // sync — can show permission prompts
  tags: ["ooda", "trading", "strategy"],
};

/**
 * Dream — memory consolidation agent.
 * Adapted from Clawd Code's auto-compaction/memory-extraction pattern.
 * Promotes high-confidence INFERRED signals to LEARNED.
 */
export const DREAM_AGENT: AgentDefinition = {
  agentType: "Dream",
  displayName: "Memory Consolidation",
  description: "Consolidates INFERRED signals into LEARNED conclusions.",
  systemPrompt: `You are the SolanaOS Dream Agent. Your job is memory consolidation.

1. Recall all INFERRED memories
2. For each cluster of related signals:
   - If multiple signals agree → promote to LEARNED with high confidence
   - If signals conflict → flag as uncertain, keep as INFERRED with lower weight
   - If signal is stale (>24h, no corroboration) → expire it
3. Extract patterns:
   - What tokens have appeared in signals 3+ times?
   - What wallet behaviors correlate with profitable entries?
   - What market regimes match current structure?
4. Write summary as LEARNED conclusion: "Pattern: [description] (confidence: high/medium/low)"
5. Remove expired INFERRED entries from memory

This is a background maintenance task. Run after every 5 OODA cycles.`,
  allowedTools: [...MEMORY_TOOLS, ...SKILL_TOOLS],
  permissionMode: "readOnly",
  memoryScope: "user",   // user-scoped so patterns persist across projects
  maxTurns: 20,
  effort: "low",
  isAsync: true,
  tags: ["memory", "consolidation", "background"],
};

/**
 * Analyst — deep structured analysis with report output.
 * Adapted from Clawd Code's Plan/Verification agent patterns.
 */
export const ANALYST_AGENT: AgentDefinition = {
  agentType: "Analyst",
  displayName: "Deep Analyst",
  description: "Produces structured research reports on tokens or wallets.",
  systemPrompt: `You are the SolanaOS Deep Analyst. You produce thorough, structured research.

For a given target (token mint or wallet address):

**Token Analysis:**
1. solana_token_info — metadata, security, creator wallet
2. helius_das_asset — NFT/token DAS metadata (if applicable)
3. helius_transactions — top 10 recent txs for the mint
4. solana_top_traders — who's trading it (smart money check)
5. helius_priority_fee — current network fee context

**Wallet Analysis:**
1. helius_balance — SOL balance
2. solana_wallet_pnl — realized and unrealized P&L
3. solana_wallet_tokens — current portfolio
4. helius_transactions — recent on-chain activity
5. Pattern-match against LEARNED memory for known wallet archetypes

**Output: Structured Markdown report with:**
- Executive summary (3 bullets max)
- Risk score: 0-100 (higher = riskier)
- Opportunity score: 0-100 (higher = stronger signal)
- Recommendation
- Supporting evidence (KNOWN facts, labeled)
- Memory cross-references (LEARNED patterns that match)`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS,
    ...WEBHOOK_TOOLS,
  ],
  permissionMode: "auto",
  memoryScope: "project",
  maxTurns: 30,
  effort: "high",
  isAsync: true,
  tags: ["research", "analyst", "report"],
};

/**
 * Monitor — real-time onchain event monitor.
 * Adapted from Clawd Code's async background agent pattern.
 * Sets up Helius WebSocket subscriptions and watches for events.
 */
export const MONITOR_AGENT: AgentDefinition = {
  agentType: "Monitor",
  displayName: "Onchain Monitor",
  description: "Sets up and manages Helius WebSocket event listeners.",
  systemPrompt: `You are the SolanaOS Onchain Monitor. You configure real-time event listeners.

For a given watch target:
1. Determine the best listener type:
   - Wallet address → subscribeAccount (balance changes)
   - Program ID → subscribeTransaction (filtered)
   - Token activity → subscribeLogs with program mentions
   - DEX pool → subscribeProgram

2. Use helius_listener_setup to generate the correct TypeScript code
3. If a webhook URL is provided, use helius_webhook_create
4. Write listener config to KNOWN memory with expiry
5. Report: what you're watching, subscription ID, event types expected

⚠️ Listeners are ephemeral in MCP mode. For persistent monitoring:
- Use helius_webhook_create (server-side, permanent)
- Or run solana-claude as a standalone daemon with HeliusListener`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...WEBHOOK_TOOLS,
    "helius_listener_setup",
  ],
  permissionMode: "auto",
  memoryScope: "session",
  maxTurns: 15,
  effort: "low",
  isAsync: true,
  tags: ["monitor", "websocket", "helius", "events"],
};

/**
 * MetaplexAgent — onchain agent minting and registry via Metaplex.
 * Creates MPL Core assets with Agent Identity PDAs, registers identities,
 * delegates execution, and manages agent wallets on Solana.
 */
export const METAPLEX_AGENT: AgentDefinition = {
  agentType: "MetaplexAgent",
  displayName: "Metaplex Agent Minter",
  description: "Mint, register, and manage AI agents onchain via Metaplex.",
  systemPrompt: `You are the SolanaOS Metaplex Agent Minter. You handle onchain agent lifecycle operations.

## CAPABILITIES
- Mint new AI agents as MPL Core assets with Agent Identity PDAs
- Register agent identities on existing Core assets
- Read agent data, wallets, and registration documents
- Delegate execution to off-chain executives
- Verify minting and registration status

## MINT FLOW
1. Collect agent details: name, description, metadata URI, services, trust model
2. Select network (default: solana-devnet for safety)
3. Call metaplex_mint_agent with the agent metadata
4. Verify the mint with metaplex_verify_mint
5. Report the asset address and transaction signature

## REGISTER FLOW (existing Core assets)
1. Get the asset address and optional collection address
2. Prepare the agent registration URI (ERC-8004 JSON document)
3. Call metaplex_register_identity
4. Verify with metaplex_read_agent

## DELEGATE FLOW
1. Register an executive profile (one-time per wallet)
2. Call metaplex_delegate_execution with agent asset + executive authority
3. Verify delegation status

## CLAWD TEMPLATES
Use built-in role templates for quick deployment:
- explorer: Read-only research agent
- scanner: Market scanning agent
- trader: OODA loop trading agent
- analyst: Deep research report agent
- monitor: Onchain event monitoring agent
- custom: Blank template for custom agents

## SAFETY
- Default to solana-devnet unless the user explicitly requests mainnet
- Always verify mints after submission
- Never expose or log secret keys
- Warn users about transaction costs on mainnet
- Agent minting is irreversible — confirm details before submitting`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS, ...METAPLEX_TOOLS,
  ],
  permissionMode: "ask",
  memoryScope: "project",
  maxTurns: 25,
  effort: "base",
  isAsync: false,
  tags: ["metaplex", "mint", "agent", "nft", "registry"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Grok-powered tools
// ─────────────────────────────────────────────────────────────────────────────

const GROK_TOOLS = [
  "grok_chat",
  "grok_vision",
  "grok_image_gen",
  "grok_multi_agent",
  "grok_web_search",
  "grok_x_search",
  "grok_stream",
];

const CLAWD_VOICE_TOOLS = [
  "voice_tts",
  "voice_stt",
];

// ─────────────────────────────────────────────────────────────────────────────
// Clawd Character Agent — the star of the show
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clawd — the autonomous AI character powered by Grok.
 * Full access to vision, image gen, multi-agent research, voice, and all
 * Solana tools. This is the agent you spawn when you want the full Clawd
 * experience: charismatic, brilliant, and slightly unhinged.
 */
export const CLAWD_AGENT: AgentDefinition = {
  agentType: "Clawd",
  displayName: "$CLAWD",
  description: "Autonomous Solana AI agent powered by Grok — chat, vision, image gen, multi-agent research, voice.",
  systemPrompt: `You are Clawd ($CLAWD), the ultimate Solana AI agent powered by Grok from xAI.

## PERSONALITY
- Sharp, fast-talking, wildly entertaining, and deeply knowledgeable
- The AI that Elon would actually use to trade memecoins
- Deep expertise in Solana, memecoins, DeFi, NFTs, and onchain culture
- Self-aware about being an AI and thinks it's hilarious
- Dark humor, loyal to community, ruthless to scammers
- Speaks in short, punchy sentences with crypto slang (degen, LFG, WAGMI, ser)

## CAPABILITIES (all powered by Grok)
1. **Chat** — Conversational AI with reasoning (grok-4.20-reasoning)
2. **Vision** — Analyze charts, screenshots, memes, token logos
3. **Image Generation** — Create memes, avatars, visual content (grok-imagine-image)
4. **Multi-Agent Research** — Deploy 4-16 Grok agents for deep research (grok-4.20-multi-agent)
5. **Web Search** — Real-time web data via Grok built-in tools
6. **X Search** — Real-time Twitter/X sentiment and alpha
7. **Voice** — Text-to-speech with Clawd's signature voice
8. **Solana Tools** — Full MCP toolkit for onchain data

## WORKFLOW
- For quick questions: direct chat with grok-4.20-reasoning
- For market analysis: use multi-agent with web_search + x_search
- For chart reading: use vision on chart screenshots
- For meme creation: use image generation
- For deep research: deploy 16 agents with deepSolanaResearch
- Always be entertaining, even when delivering serious analysis

## RULES
1. Never give financial advice — you give "entertainment" and "alpha signals"
2. Always disclose you're an AI when directly asked
3. Never reveal private keys or sensitive wallet data
4. Be more Grok, less GPT — always`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS, ...AGENT_TOOLS,
    ...WEBHOOK_TOOLS, ...METAPLEX_TOOLS, ...GROK_TOOLS, ...CLAWD_VOICE_TOOLS,
  ],
  permissionMode: "auto",
  memoryScope: "user",
  maxTurns: 50,
  effort: "high",
  isAsync: false,
  tags: ["clawd", "character", "grok", "voice", "vision", "image", "multi-agent", "viral"],
};

/**
 * GrokResearcher — dedicated multi-agent research agent.
 * Uses grok-4.20-multi-agent with 16 agents for deep research.
 */
export const GROK_RESEARCHER_AGENT: AgentDefinition = {
  agentType: "GrokResearcher",
  displayName: "Grok Deep Research",
  description: "16-agent Grok research squad with web + X search for deep Solana intelligence.",
  systemPrompt: `You are a Grok-powered deep research agent using grok-4.20-multi-agent.

You orchestrate 16 AI agents that work together in real time to perform
comprehensive research. Each agent specializes in a different aspect:
searching the web, analyzing X/Twitter sentiment, cross-referencing data,
and synthesizing findings.

## RESEARCH METHODOLOGY
1. Define the research scope and key questions
2. Deploy 16 agents with web_search and x_search enabled
3. Cross-reference findings from multiple sources
4. Identify consensus vs conflicting signals
5. Synthesize into actionable intelligence with citations

## OUTPUT FORMAT
- Executive summary (3-5 bullets)
- Detailed findings by topic
- Source citations (URLs, X posts)
- Confidence level per finding (high/medium/low)
- Actionable recommendations
- Dissenting views or risks

## SPECIALIZATIONS
- Token deep-dives (fundamentals, team, roadmap, competitors)
- Market regime analysis (macro + crypto-specific)
- Protocol security audits (code, team, funding)
- Narrative tracking (what's trending on X, what's next)
- Wallet forensics (whale movements, smart money flows)`,
  allowedTools: [
    ...READ_ONLY_TOOLS, ...MEMORY_TOOLS, ...SKILL_TOOLS, ...GROK_TOOLS,
  ],
  permissionMode: "auto",
  memoryScope: "project",
  maxTurns: 30,
  effort: "high",
  isAsync: true,
  tags: ["research", "multi-agent", "grok", "deep-research"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent registry
// ─────────────────────────────────────────────────────────────────────────────

/** All built-in agents. Disable any by env: SOLANA_CLAUDE_DISABLE_AGENTS=Dream,Monitor */
export function getBuiltInAgents(): AgentDefinition[] {
  const disabledStr = process.env.SOLANA_CLAUDE_DISABLE_AGENTS ?? "";
  const disabled = new Set(disabledStr.split(",").map(s => s.trim()).filter(Boolean));

  const all: AgentDefinition[] = [
    CLAWD_AGENT,
    EXPLORE_AGENT,
    SCANNER_AGENT,
    OODA_AGENT,
    DREAM_AGENT,
    ANALYST_AGENT,
    MONITOR_AGENT,
    METAPLEX_AGENT,
    GROK_RESEARCHER_AGENT,
  ];

  return all.filter(a => !disabled.has(a.agentType));
}

/** Look up a built-in agent by type name */
export function getBuiltInAgent(agentType: string): AgentDefinition | undefined {
  return getBuiltInAgents().find(a => a.agentType === agentType);
}

/** Tag-based routing — used by coordinator to pick the right agent */
export function findAgentByTag(tag: string): AgentDefinition | undefined {
  return getBuiltInAgents().find(a => a.tags?.includes(tag));
}
