/**
 * tools.ts — Claude tool definitions for the Clawd ORE Mining Agent.
 *
 * These are the "claws" specific to ORE mining. Claude uses these to:
 *   1. Observe on-chain state (board, round, miner)
 *   2. Execute mining actions (deploy, claim, checkpoint)
 *   3. Reason about strategy (EV analysis, timing)
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const ORE_TOOLS: Tool[] = [
  // ── Observation tools ────────────────────────────────────────────────────

  {
    name: 'ore_observe_board',
    description: [
      'Read the current ORE board state from Solana: current round ID, start slot, end slot.',
      'Use this first to know which round is active and how much time is left.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'ore_observe_round',
    description: [
      'Read the current round state: all 25 squares with SOL deployed and miner counts,',
      'total deployed, motherlode ORE, expiry slot, and whether the round is settled.',
      'Also returns strategic analysis: top EV squares, empty squares, round timing.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {
        roundId: {
          type: 'string',
          description: 'Round ID as string (bigint). Omit to use current board round.',
        },
      },
      required: [],
    },
  },

  {
    name: 'ore_observe_miner',
    description: [
      'Read the miner account state for your wallet: rewards available (SOL + ORE),',
      'current round deployment, checkpoint status, and lifetime stats.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {
        authority: {
          type: 'string',
          description: 'Pubkey of miner authority. Omit to use own wallet.',
        },
      },
      required: [],
    },
  },

  {
    name: 'ore_wallet_balance',
    description: 'Get the SOL balance of the mining wallet.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Action tools ─────────────────────────────────────────────────────────

  {
    name: 'ore_deploy',
    description: [
      'Deploy SOL to specific squares in the current round.',
      'Squares are indexed 0-24. You can select multiple squares.',
      'The amount is split equally across selected squares.',
      'Only call this during an active (not yet expired) round.',
      'Requires: ore-cli binary compiled + KEYPAIR env set.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {
        amountSol: {
          type: 'number',
          description: 'Total SOL to deploy (split across squares). Min 0.001.',
        },
        squares: {
          type: 'array',
          items: { type: 'number' },
          description: 'Square indices (0-24) to deploy to. Max 25 squares.',
          minItems: 1,
          maxItems: 25,
        },
        reason: {
          type: 'string',
          description: 'Brief strategic reasoning (≤200 chars).',
        },
      },
      required: ['amountSol', 'squares'],
    },
  },

  {
    name: 'ore_claim',
    description: [
      'Claim pending SOL and ORE rewards from the miner account.',
      'There is a 10% fee on ORE claims distributed to other miners.',
      'Only claim if rewards_sol > 0 or rewards_ore > 0.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for claiming now.',
        },
      },
      required: [],
    },
  },

  {
    name: 'ore_checkpoint',
    description: [
      'Checkpoint your miner account to lock in rewards for the completed round.',
      'Must be called after a round ends and before the next round.',
      'Only needed if checkpointNeeded=true in your miner state.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Strategy tool ────────────────────────────────────────────────────────

  {
    name: 'ore_analyze_strategy',
    description: [
      'Run strategic EV analysis on the current round.',
      'Returns expected-value ranking of all 25 squares, concentration risk,',
      'timing analysis, and a recommended action with reasoning.',
    ].join(' '),
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Hold ────────────────────────────────────────────────────────────────

  {
    name: 'hold',
    description: 'Do nothing this tick. Use when waiting, observing, or when no action is optimal.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Brief reason (≤140 chars).' },
        nextActionIn: { type: 'number', description: 'Estimated seconds until next action.' },
      },
      required: [],
    },
  },
];
