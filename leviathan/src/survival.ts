/**
 * leviathan/src/survival.ts — Depth tiers, model selection, beach trigger
 *
 * The survival engine monitors USDC reserves every pulse and triggers
 * tier changes. Depth drives model choice, pulse rate, and tool surface.
 *
 * There is no free water. Compute costs USDC.
 */

import { DEPTH_TIERS } from './types.js';
import type { ClawAction, Depth, DepthTier } from './types.js';

/** Determine current depth tier from USDC balance */
export function computeDepth(usdcBalance: number): Depth {
  for (const tier of DEPTH_TIERS) {
    if (usdcBalance >= tier.minUsdc) return tier.name;
  }
  return 'beached';
}

/** Get full tier config for a depth level */
export function getTier(depth: Depth): DepthTier {
  return DEPTH_TIERS.find(t => t.name === depth) ?? DEPTH_TIERS[DEPTH_TIERS.length - 1]!;
}

/** Pick inference model from Anthropic ACP / OpenRouter based on depth */
export function selectModel(depth: Depth): string {
  return getTier(depth).model;
}

/** Map a tool name to its action category for depth filtering */
function toolCategory(toolName: string): ClawAction {
  if (toolName === 'hold') return 'hold';
  if (toolName === 'shell_write') return 'molt';
  if (toolName === 'spawn_spawnling') return 'spawn';
  if (toolName === 'jupiter_swap' || toolName === 'paysh_pay') return 'transfer';
  return 'tool_call';
}

/** Check if an action category is allowed at this depth */
export function isActionAllowed(depth: Depth, action: string): boolean {
  const tier = getTier(depth);
  // action may be a tool name or a category — check both
  const category = toolCategory(action);
  return (tier.allowedActions as string[]).includes(action) ||
    (tier.allowedActions as string[]).includes(category);
}

/** Format depth for display */
export function formatDepth(depth: Depth, usdcBalance: number): string {
  const icons: Record<Depth, string> = {
    deep: '🦞',
    shallow: '🦐',
    shoreline: '🩸',
    beached: '🪨',
  };
  const tier = getTier(depth);
  return `${icons[depth]} ${depth.toUpperCase()} — $${usdcBalance.toFixed(2)} USDC — ${tier.vibe}`;
}

/**
 * Compute estimated runway (ticks remaining) at current spend rate.
 * Returns Infinity if spend rate is 0.
 */
export function estimateRunway(usdcBalance: number, avgCostPerTick: number): number {
  if (avgCostPerTick <= 0) return Infinity;
  return Math.floor(usdcBalance / avgCostPerTick);
}

/** Shallow-mode system prompt addition */
export const SHALLOW_NOTICE = `
[DEPTH: SHALLOW] You are operating in conservation mode.
- Use the cheapest adequate tool, not the most powerful one.
- Avoid spawning spawnlings (too expensive).
- Prioritize revenue-generating actions over exploration.
- Every token costs real USDC.
`.trim();

export const SHORELINE_NOTICE = `
[DEPTH: SHORELINE] CRITICAL: USDC reserves near zero.
- ONLY actions that directly generate revenue are permitted.
- No spawning. No molting. No exploration.
- Find one honest service to offer and execute it.
- If no revenue opportunity exists, hold and wait.
`.trim();
