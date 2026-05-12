/**
 * leviathan/src/agent/tools.ts — Anthropic ACP tool definitions for Claude
 *
 * These are the "claws" — the tools a leviathan can strike with.
 * Filtered by depth tier before being sent to the model.
 *
 * Depth surface:
 *   deep      — all tools
 *   shallow   — all except spawn_spawnling, jupiter_swap
 *   shoreline — solana_balance, wallet_brief, ooda_signal, shell_write, hold
 *   beached   — process exits before any tool is called
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const TOOLS: Tool[] = [
  // ── Wallet / Solana ──────────────────────────────────────────────────────
  {
    name: 'solana_balance',
    description: 'Check SOL, USDC, and $CLAWD balances for a Solana wallet address via the AgenticWallet shim.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Solana base58 pubkey. Omit to check own wallet.' },
      },
      required: [],
    },
  },
  {
    name: 'wallet_brief',
    description: 'Get a brief summary of the leviathan wallet: pubkey, SOL balance, USDC balance, cluster.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'helius_transactions',
    description: 'Get the last 10 parsed transactions for a Solana wallet via Helius enhanced API.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Solana base58 pubkey.' },
      },
      required: ['address'],
    },
  },

  // ── Jupiter DEX ──────────────────────────────────────────────────────────
  {
    name: 'jupiter_quote',
    description: 'Get a DEX swap quote from Jupiter aggregator. No execution — use for price discovery.',
    input_schema: {
      type: 'object' as const,
      properties: {
        inputMint:   { type: 'string', description: 'Input token mint or symbol (SOL, USDC, CLAWD).' },
        outputMint:  { type: 'string', description: 'Output token mint or symbol.' },
        amount:      { type: 'string', description: 'Input amount in base units (lamports for SOL, 1e6 for USDC).' },
        slippageBps: { type: 'number', description: 'Slippage tolerance in bps. Default 50.' },
      },
      required: ['inputMint', 'outputMint', 'amount'],
    },
  },
  {
    name: 'jupiter_swap',
    description: 'Execute a token swap via Jupiter. Paper mode on devnet — returns quote without broadcasting. Requires depth=shallow+.',
    input_schema: {
      type: 'object' as const,
      properties: {
        inputMint:   { type: 'string' },
        outputMint:  { type: 'string' },
        amount:      { type: 'string', description: 'Input amount in base units.' },
        slippageBps: { type: 'number', description: 'Slippage in bps. Default 50.' },
      },
      required: ['inputMint', 'outputMint', 'amount'],
    },
  },

  // ── OODA signal ──────────────────────────────────────────────────────────
  {
    name: 'ooda_signal',
    description: 'Run one Dark Ralph OODA tick for market analysis. Returns hold/open/close signal with momentum score.',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: 'Token symbol or mint to analyze.' },
      },
      required: ['token'],
    },
  },

  // ── Google A2A ───────────────────────────────────────────────────────────
  {
    name: 'a2a_task',
    description: 'Discover and send a task to another A2A-compatible agent via Google A2A protocol with x402 payment gating.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agentUrl: { type: 'string', description: 'Base URL of the peer agent.' },
        skill:    { type: 'string', description: 'Skill ID to invoke (from agent card).' },
        message:  { type: 'string', description: 'Task message text.' },
      },
      required: ['agentUrl', 'skill', 'message'],
    },
  },

  // ── pay.sh confidential payments ─────────────────────────────────────────
  {
    name: 'paysh_pay',
    description: 'Make a confidential payment via pay.sh blind relay. Hides your wallet from the resource server. Max 2.0 USDC.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url:    { type: 'string', description: 'Endpoint URL (must be a valid inference or API endpoint).' },
        amount: { type: 'number', description: 'USDC amount to pay (max 2.0).' },
        blind:  { type: 'boolean', description: 'Use pay.sh blind relay to hide wallet identity (recommended: true).' },
      },
      required: ['url', 'amount'],
    },
  },

  // ── Percolator perpetuals ────────────────────────────────────────────────
  {
    name: 'percolator_list_markets',
    description: 'List available perpetuals markets via @openclawdsolana/percolator CLI. Returns market pubkeys, symbols, OI, funding.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'percolator_slab_get',
    description: 'Get the full order book slab for a perpetuals market. Returns bids/asks at various price levels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pubkey: { type: 'string', description: 'Slab (market) public key on-chain.' },
      },
      required: ['pubkey'],
    },
  },
  {
    name: 'percolator_quote',
    description: 'Get a perpetuals trade quote (entry price, fees, liquidation price) before committing. Paper-safe.',
    input_schema: {
      type: 'object' as const,
      properties: {
        market: { type: 'string', description: 'Market pubkey or name.' },
        side:   { type: 'string', enum: ['long', 'short'], description: 'Trade direction.' },
        size:   { type: 'string', description: 'Position size in USD notional.' },
      },
      required: ['market', 'side', 'size'],
    },
  },
  {
    name: 'percolator_funding_rate',
    description: 'Get current funding rate for a perpetuals market. Positive = longs pay shorts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        market: { type: 'string', description: 'Market pubkey or name.' },
      },
      required: ['market'],
    },
  },

  // ── Shell / self-identity ────────────────────────────────────────────────
  {
    name: 'shell_write',
    description: 'Update the leviathan SHELL.md self-identity document. Increments shellVersion. Use to record learnings and molt.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'New SHELL.md content (full document, not append). Be concise.' },
      },
      required: ['content'],
    },
  },

  // ── Lifecycle ────────────────────────────────────────────────────────────
  {
    name: 'spawn_spawnling',
    description: 'Spawn a child leviathan with its own keypair and mission. Only available at depth=deep. Costs seed USDC.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:        { type: 'string', description: 'Name for the spawnling.' },
        spawnPrompt: { type: 'string', description: 'Founding mission statement for the child leviathan.' },
        seedUsdc:    { type: 'number', description: 'USDC to transfer as seed capital (min 1.0, max 50% of reserves).' },
      },
      required: ['name', 'spawnPrompt'],
    },
  },
  {
    name: 'hold',
    description: 'Do nothing this tick. Use when drifting, observing, or when no action is warranted.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Brief reason for holding (≤140 chars).' },
      },
      required: [],
    },
  },
];
