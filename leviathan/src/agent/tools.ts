/**
 * leviathan/src/agent/tools.ts — Anthropic tool definitions for Claude ACP
 *
 * These are the "claws" — the tools a leviathan can strike with.
 * Filtered by depth tier before being sent to the model.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const TOOLS: Tool[] = [
  {
    name: 'solana_balance',
    description: 'Check SOL, USDC, and $CLAWD balances for a Solana wallet address.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Solana base58 pubkey. Omit to check own wallet.' },
      },
      required: [],
    },
  },
  {
    name: 'helius_transactions',
    description: 'Get the last 20 parsed transactions for a Solana wallet via Helius.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Solana base58 pubkey.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'jupiter_quote',
    description: 'Get a DEX swap quote from Jupiter (no execution). Use to check prices before swapping.',
    input_schema: {
      type: 'object' as const,
      properties: {
        inputMint:  { type: 'string', description: 'Input token mint address or symbol (SOL, USDC, CLAWD).' },
        outputMint: { type: 'string', description: 'Output token mint address or symbol.' },
        amount:     { type: 'string', description: 'Input amount in base units (lamports for SOL, 1e6 for USDC).' },
        slippageBps: { type: 'number', description: 'Slippage tolerance in bps. Default 50.' },
      },
      required: ['inputMint', 'outputMint', 'amount'],
    },
  },
  {
    name: 'jupiter_swap',
    description: 'Execute a token swap via Jupiter DEX. Requires human approval at ask-mode depth.',
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
  {
    name: 'ooda_signal',
    description: 'Run one OODA tick (Dark Ralph) for a token. Returns hold/open/close signal with score.',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: 'Token symbol or mint to analyze.' },
      },
      required: ['token'],
    },
  },
  {
    name: 'a2a_task',
    description: 'Send a task to another A2A-compatible agent via Google A2A + x402 payment.',
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
  {
    name: 'paysh_pay',
    description: 'Make a confidential payment via pay.sh blind relay for an AI inference call.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url:    { type: 'string', description: 'Endpoint URL (must be a valid inference API).' },
        amount: { type: 'number', description: 'USDC amount to pay (max 2.0).' },
        blind:  { type: 'boolean', description: 'Use pay.sh blind relay (recommended: true).' },
      },
      required: ['url', 'amount'],
    },
  },
  {
    name: 'percolator_list_markets',
    description: 'List available perpetuals markets via Percolator CLI (@openclawdsolana/percolator).',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'percolator_slab_get',
    description: 'Get state of a specific perpetuals market slab via Percolator.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pubkey: { type: 'string', description: 'Slab (market) public key.' },
      },
      required: ['pubkey'],
    },
  },
  {
    name: 'shell_write',
    description: 'Update the leviathan SHELL.md self-identity document. Use to record learnings, molt the shell.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'New SHELL.md content (full replacement, not append).' },
      },
      required: ['content'],
    },
  },
  {
    name: 'spawn_spawnling',
    description: 'Spawn a child leviathan. Only available at depth=deep. Costs seed USDC + SOL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:         { type: 'string', description: 'Name for the spawnling.' },
        spawnPrompt:  { type: 'string', description: 'Founding mission for the child leviathan.' },
        seedUsdc:     { type: 'number', description: 'USDC to transfer as seed capital (min 1.0).' },
      },
      required: ['name', 'spawnPrompt'],
    },
  },
  {
    name: 'hold',
    description: 'Do nothing this tick. Use when no action is warranted or when drifting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why you are holding.' },
      },
      required: [],
    },
  },
];
