import type { InstructionPair } from '../types.js'

interface ToolDef {
  name: string
  description: string
  params: string[]
  group: string
}

const MCP_TOOLS: ToolDef[] = [
  // Solana data
  { name: 'solana_price', description: 'Get live price and 24h change for a Solana token by mint or symbol (SOL, BONK, JUP, WIF, PENGU, POPCAT)', params: ['token'], group: 'solana_data' },
  { name: 'solana_trending', description: 'Get trending Solana tokens sorted by volume and momentum', params: ['limit'], group: 'solana_data' },
  { name: 'solana_token_info', description: 'Get token metadata, security analysis, and on-chain info for a mint address', params: ['mint'], group: 'solana_data' },
  { name: 'solana_wallet_pnl', description: 'Get PnL, trade history, and performance for any public Solana wallet', params: ['wallet'], group: 'solana_data' },
  { name: 'solana_search', description: 'Search for Solana tokens by name or symbol', params: ['query'], group: 'solana_data' },
  { name: 'solana_top_traders', description: 'Get top traders for a specific token mint', params: ['mint'], group: 'solana_data' },
  { name: 'solana_wallet_tokens', description: 'Get all token balances for a wallet address', params: ['wallet'], group: 'solana_data' },

  // Helius
  { name: 'helius_account_info', description: 'Get detailed account info for any Solana address via Helius RPC', params: ['address'], group: 'helius' },
  { name: 'helius_balance', description: 'Get SOL balance in SOL (not lamports) for a wallet', params: ['address'], group: 'helius' },
  { name: 'helius_transactions', description: 'Get enhanced human-readable transaction history with parsed descriptions, token transfers, and NFT events', params: ['address', 'limit'], group: 'helius' },
  { name: 'helius_priority_fee', description: 'Get real-time priority fee estimates (min/low/medium/high/veryHigh/recommended in microLamports)', params: [], group: 'helius' },
  { name: 'helius_das_asset', description: 'Get Digital Asset Standard metadata for an NFT or token mint including creators, royalties, and collection info', params: ['mint'], group: 'helius' },
  { name: 'helius_webhook_create', description: 'Create a Helius webhook for real-time on-chain notifications', params: ['addresses', 'webhookURL', 'webhookType'], group: 'helius' },
  { name: 'helius_webhook_list', description: 'List all active Helius webhooks', params: [], group: 'helius' },
  { name: 'helius_listener_setup', description: 'Generate TypeScript code for Solana event listeners (account, transaction, logs, slot, program subscriptions)', params: ['subscriptionType', 'address'], group: 'helius' },

  // Pump.fun
  { name: 'pump_token_scan', description: 'Comprehensive Pump.fun token scan with bonding curve state, graduation progress, signal score, and risk flags', params: ['mint'], group: 'pumpfun' },
  { name: 'pump_buy_quote', description: 'Simulate a buy on a Pump.fun bonding curve showing fee breakdown and net token amount', params: ['mint', 'solAmount'], group: 'pumpfun' },
  { name: 'pump_sell_quote', description: 'Simulate a sell on a Pump.fun bonding curve showing SOL output and fee breakdown', params: ['mint', 'tokenAmount'], group: 'pumpfun' },
  { name: 'pump_graduation', description: 'Get graduation progress showing percent bonded, SOL accumulated, milestones, and PumpSwap migration status', params: ['mint'], group: 'pumpfun' },
  { name: 'pump_market_cap', description: 'Calculate market cap in SOL and USD from bonding curve spot price', params: ['mint'], group: 'pumpfun' },
  { name: 'pump_top_tokens', description: 'Get top Pump.fun tokens sorted by volume, market cap, or graduation status', params: ['sortBy', 'limit'], group: 'pumpfun' },
  { name: 'pump_new_tokens', description: 'Get most recently launched Pump.fun tokens for OODA observe phase', params: ['limit'], group: 'pumpfun' },
  { name: 'pump_cashback_info', description: 'Explain Pump.fun cashback mechanics including UserVolumeAccumulator PDAs and claiming instructions', params: ['mint'], group: 'pumpfun' },

  // Agent fleet
  { name: 'agent_spawn', description: 'Spawn a background research or analysis agent (types: research, analysis, ooda, scanner, dream)', params: ['type', 'description'], group: 'agent' },
  { name: 'agent_list', description: 'List all active agent tasks', params: [], group: 'agent' },
  { name: 'agent_stop', description: 'Stop an agent task by ID', params: ['taskId'], group: 'agent' },

  // Memory
  { name: 'memory_recall', description: 'Recall facts from persistent memory filtered by tier (KNOWN, LEARNED, INFERRED, or all)', params: ['tier', 'query'], group: 'memory' },
  { name: 'memory_write', description: 'Write a fact to persistent memory at LEARNED or INFERRED tier', params: ['tier', 'content'], group: 'memory' },

  // System
  { name: 'skill_list', description: 'List available solana-clawd skills', params: [], group: 'system' },
  { name: 'skill_read', description: 'Read the contents of a specific skill file', params: ['name'], group: 'system' },
  { name: 'sol_price', description: 'Quick SOL price in USD via CoinGecko (no API key required)', params: [], group: 'solana_data' },
  { name: 'x402_status', description: 'Check x402 micropayment protocol status including Solana USDC wallet config and spend limits', params: [], group: 'system' },
  { name: 'x402_payment_history', description: 'Show persistent x402 payment history', params: [], group: 'system' },
  { name: 'dream_status', description: 'Show autoDream memory consolidation status including OODA cycle gates and config', params: [], group: 'memory' },
  { name: 'dream_run', description: 'Generate a manual Dream memory consolidation prompt that groups INFERRED signals and promotes to LEARNED', params: [], group: 'memory' },
  { name: 'session_summary', description: 'Show persistent session history', params: [], group: 'system' },
  { name: 'prompt_suggestions', description: 'Get context-aware suggested next prompts for research, monitoring, agent fleet, memory, and x402', params: [], group: 'system' },
]

export function extractToolPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const src = 'mcp-server/src/server.ts'

  for (const tool of MCP_TOOLS) {
    // Basic usage
    pairs.push({
      instruction: `What does the ${tool.name} tool do and when should I use it?`,
      output: `The \`${tool.name}\` tool ${tool.description.charAt(0).toLowerCase()}${tool.description.slice(1)}. ${tool.params.length > 0 ? `It accepts these parameters: ${tool.params.map(p => `\`${p}\``).join(', ')}.` : 'It takes no parameters.'} Use it when you need to ${describeUseCase(tool)}.`,
      source: src,
      category: 'tool_usage',
    })

    // Parameter guidance
    if (tool.params.length > 0) {
      pairs.push({
        instruction: `How do I call ${tool.name}? What parameters does it need?`,
        output: `Call \`${tool.name}\` with ${tool.params.map(p => `\`${p}\``).join(', ')}. ${describeParams(tool)}`,
        source: src,
        category: 'tool_usage',
      })
    }
  }

  // Multi-tool workflow pairs
  pairs.push(
    {
      instruction: 'How do I evaluate whether a trending token is worth buying?',
      output: 'Follow this multi-tool workflow:\n\n1. **Observe**: Call `solana_trending` to get tokens sorted by volume/momentum\n2. **Research**: For each candidate, call `solana_token_info` to check security flags, holder distribution, and liquidity\n3. **Score**: If it\'s a Pump.fun token, use `pump_token_scan` for bonding curve state, graduation progress, and signal score\n4. **Smart money**: Use `solana_top_traders` to see if known profitable wallets are accumulating\n5. **Quote**: Use `pump_buy_quote` or check Jupiter to estimate entry cost and slippage\n6. **Store**: Write your analysis to memory with `memory_write` at INFERRED tier\n\nOnly proceed with a trade if the signal score is STRONG (75+) and security flags are clean.',
      source: src,
      category: 'tool_usage',
    },
    {
      instruction: 'How do I monitor a wallet\'s trading activity?',
      output: 'Use these tools in sequence:\n\n1. `solana_wallet_tokens` — get current token holdings\n2. `solana_wallet_pnl` — see overall PnL, win rate, and trade history\n3. `helius_transactions` — get enhanced, human-readable transaction history showing swaps, transfers, and NFT events\n4. `helius_webhook_create` — set up real-time notifications for future activity\n\nFor continuous monitoring, use `agent_spawn` with type "scanner" to run a background watcher.',
      source: src,
      category: 'tool_usage',
    },
    {
      instruction: 'How do I find new Pump.fun launches and evaluate them quickly?',
      output: 'Use the Pump.fun tool chain:\n\n1. `pump_new_tokens` — get recently launched tokens (this is your OODA Observe phase)\n2. For each interesting token, run `pump_token_scan` to get:\n   - Bonding curve state (virtual/real reserves)\n   - Graduation progress percentage\n   - Signal score (0-100)\n   - Risk flags: creatorSold, liquidityLocked, whaleConcentration, mayhemMode\n3. `pump_graduation` — check how close to graduating (sweet spot is 60-90%)\n4. `pump_buy_quote` — simulate entry to see fees and slippage\n5. `pump_market_cap` — calculate current market cap in SOL and USD\n\nAvoid tokens where the creator has already sold or whale concentration exceeds 50%.',
      source: src,
      category: 'tool_usage',
    },
    {
      instruction: 'How do I set up real-time monitoring for Solana events?',
      output: 'Helius provides several monitoring options:\n\n1. **Webhooks** (recommended for production):\n   - `helius_webhook_create` — create a webhook for specific addresses\n   - Supports enhanced, raw, and Discord webhook formats\n   - `helius_webhook_list` — manage active webhooks\n\n2. **WebSocket listeners** (for development):\n   - `helius_listener_setup` — generates ready-to-use TypeScript code\n   - Subscription types: account, transaction, logs, slot, signature, program\n   - Each generates code you can run directly\n\n3. **Agent-based** (for autonomous monitoring):\n   - `agent_spawn` with type "scanner" — runs a background monitoring agent\n   - Emits signals to INFERRED memory tier when patterns are detected',
      source: src,
      category: 'tool_usage',
    },
    {
      instruction: 'How do I use the memory system effectively for trading?',
      output: 'The memory system has three tiers:\n\n**KNOWN** — Verified on-chain data (prices, balances, transaction results). Populated automatically by tools like `solana_price` and `helius_balance`. Ephemeral — expires as market data changes.\n\n**LEARNED** — Persistent trade patterns you\'ve validated. Write with `memory_write` at tier LEARNED. Example: "BONK tends to pump after major Solana ecosystem announcements."\n\n**INFERRED** — Tentative signals and hypotheses. Write with `memory_write` at tier INFERRED. Example: "This wallet may be a market maker based on their 50+ trades today."\n\nRecall with `memory_recall` filtered by tier or across all tiers. Use `dream_run` to consolidate INFERRED signals — it promotes validated patterns to LEARNED and discards stale signals.',
      source: src,
      category: 'tool_usage',
    },
    {
      instruction: 'When should I spawn an agent vs doing the work directly?',
      output: 'Spawn agents for work that is:\n\n- **Long-running**: Research across multiple tokens, deep wallet analysis\n- **Parallelizable**: Scanning multiple opportunities simultaneously\n- **Autonomous**: Continuous monitoring that shouldn\'t block the conversation\n\nUse `agent_spawn` with these types:\n- `research` — deep-dive into a token or protocol\n- `analysis` — quantitative analysis of wallet or market data\n- `ooda` — run a full OODA trading loop autonomously\n- `scanner` — continuous monitoring for new signals\n- `dream` — memory consolidation (promote INFERRED → LEARNED)\n\nDo the work directly when it\'s a single tool call or a quick lookup. Check active agents with `agent_list` and stop them with `agent_stop`.',
      source: src,
      category: 'tool_usage',
    },
  )

  return pairs
}

function describeUseCase(tool: ToolDef): string {
  const useCases: Record<string, string> = {
    solana_price: 'check current token prices and 24h price changes',
    solana_trending: 'discover tokens with high trading volume and momentum',
    solana_token_info: 'perform due diligence on a token before trading',
    solana_wallet_pnl: 'analyze a trader\'s performance and history',
    solana_search: 'find a token when you only know the name or ticker',
    solana_top_traders: 'identify smart money and profitable wallets for a token',
    solana_wallet_tokens: 'see what tokens a wallet is holding',
    helius_account_info: 'inspect any Solana account\'s data and owner program',
    helius_balance: 'quickly check a wallet\'s SOL balance',
    helius_transactions: 'review a wallet\'s recent activity with human-readable descriptions',
    helius_priority_fee: 'optimize transaction fees for faster confirmation',
    helius_das_asset: 'look up NFT metadata, creators, and collection info',
    helius_webhook_create: 'set up real-time alerts for on-chain activity',
    helius_webhook_list: 'manage your active webhook subscriptions',
    helius_listener_setup: 'generate code for real-time WebSocket event streaming',
    pump_token_scan: 'evaluate a Pump.fun token\'s safety and trading opportunity',
    pump_buy_quote: 'estimate how many tokens you\'ll receive for a given SOL amount',
    pump_sell_quote: 'estimate how much SOL you\'ll receive for selling tokens',
    pump_graduation: 'check if a token is approaching graduation from bonding curve to DEX',
    pump_market_cap: 'calculate a Pump.fun token\'s current market capitalization',
    pump_top_tokens: 'find the most active Pump.fun tokens by various metrics',
    pump_new_tokens: 'discover freshly launched tokens for early entry opportunities',
    pump_cashback_info: 'understand Pump.fun\'s cashback reward mechanics',
    agent_spawn: 'delegate complex or long-running research to a background worker',
    agent_list: 'check on the status of running agents',
    agent_stop: 'terminate a background agent that\'s no longer needed',
    memory_recall: 'retrieve previously stored knowledge and trade patterns',
    memory_write: 'persist an observation or trade pattern for future reference',
    skill_list: 'discover available automation workflows',
    skill_read: 'review the implementation of a specific skill',
    sol_price: 'get a quick SOL/USD price check',
    x402_status: 'check micropayment wallet configuration and spending limits',
    x402_payment_history: 'review past micropayment transactions',
    dream_status: 'check when the next memory consolidation is due',
    dream_run: 'manually trigger memory consolidation to promote signals',
    session_summary: 'review what happened in previous trading sessions',
    prompt_suggestions: 'get AI-suggested next actions based on current context',
  }
  return useCases[tool.name] ?? tool.description.toLowerCase()
}

function describeParams(tool: ToolDef): string {
  const paramDescs: Record<string, Record<string, string>> = {
    solana_price: { token: 'Token symbol (SOL, BONK, JUP) or mint address' },
    solana_trending: { limit: 'Number of results (1-50, default 10)' },
    solana_token_info: { mint: 'Token mint address (base58 public key)' },
    solana_wallet_pnl: { wallet: 'Wallet address to analyze' },
    solana_search: { query: 'Token name or symbol to search for' },
    pump_token_scan: { mint: 'Pump.fun token mint address' },
    pump_buy_quote: { mint: 'Token mint', solAmount: 'Amount of SOL to spend' },
    pump_sell_quote: { mint: 'Token mint', tokenAmount: 'Number of tokens to sell' },
    agent_spawn: { type: 'Agent type: research, analysis, ooda, scanner, or dream', description: 'What the agent should investigate' },
    memory_write: { tier: 'LEARNED or INFERRED', content: 'The fact or observation to store' },
    memory_recall: { tier: 'KNOWN, LEARNED, INFERRED, or all', query: 'Optional search query to filter results' },
  }
  const descs = paramDescs[tool.name]
  if (!descs) return ''
  return Object.entries(descs).map(([k, v]) => `\`${k}\`: ${v}`).join('. ') + '.'
}
