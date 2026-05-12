/**
 * ClawdRouter — Tier Definitions
 * SIMPLE / MEDIUM / COMPLEX / REASONING tiers with cost analysis
 */

import type { RequestTier } from '../types.js';
import { TIER_MAPPING, getModel, estimateCostPerRequest } from '../models/registry.js';

export interface TierInfo {
  name: RequestTier;
  emoji: string;
  description: string;
  scoreRange: string;
  examples: string[];
}

export const TIER_DEFINITIONS: Record<RequestTier, TierInfo> = {
  SIMPLE: {
    name: 'SIMPLE',
    emoji: '🟢',
    description: 'Quick lookups, simple Q&A, greetings, basic formatting',
    scoreRange: '0.00 – 0.19',
    examples: [
      'What time is it in Tokyo?',
      'Convert 100 USD to EUR',
      'Hello, how are you?',
      'Format this JSON',
    ],
  },
  MEDIUM: {
    name: 'MEDIUM',
    emoji: '🟡',
    description: 'Code snippets, explanations, summaries, light analysis',
    scoreRange: '0.20 – 0.44',
    examples: [
      'Write a Rust function to sort a vector',
      'Explain how Solana accounts work',
      'Summarize this article',
      'Review this TypeScript code',
    ],
  },
  COMPLEX: {
    name: 'COMPLEX',
    emoji: '🟠',
    description: 'Multi-file refactoring, architecture, deep analysis, vision',
    scoreRange: '0.45 – 0.69',
    examples: [
      'Refactor this codebase to use a different ORM',
      'Design a Solana program for token staking',
      'Analyze this chart and explain the trend',
      'Build a full REST API with authentication',
    ],
  },
  REASONING: {
    name: 'REASONING',
    emoji: '🔴',
    description: 'Mathematical proofs, multi-step logic, complex problem-solving',
    scoreRange: '0.70 – 1.00',
    examples: [
      'Prove this algorithm is O(n log n)',
      'Debug this race condition in async Rust',
      'Derive the bonding curve formula',
      'Plan a multi-agent orchestration pipeline',
    ],
  },
};

export function getTierCostBreakdown(): string {
  const lines: string[] = [''];
  lines.push('  💰 Tier Cost Breakdown (per request, ~500 in/500 out tokens)');
  lines.push('  ═══════════════════════════════════════════════════════════════');
  lines.push('');

  const opusCost = estimateCostPerRequest(getModel('anthropic/claude-opus-4.6')!);

  for (const [tier, mapping] of Object.entries(TIER_MAPPING) as [RequestTier, typeof TIER_MAPPING[RequestTier]][]) {
    const info = TIER_DEFINITIONS[tier];
    lines.push(`  ${info.emoji} ${tier}`);
    lines.push(`     ${info.description}`);
    lines.push('');

    for (const [profile, modelId] of Object.entries(mapping)) {
      const model = getModel(modelId);
      if (!model) continue;

      const cost = estimateCostPerRequest(model);
      const savings = opusCost > 0 ? ((1 - cost / opusCost) * 100).toFixed(0) : '0';
      const costStr = model.free ? 'FREE' : `$${cost.toFixed(4)}`;

      lines.push(`     ${profile.toUpperCase().padEnd(8)} ${model.name.padEnd(30)} ${costStr.padEnd(10)} (${savings}% savings)`);
    }
    lines.push('');
  }

  // Calculate blended average
  const tiers: RequestTier[] = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING'];
  const tierWeights = [0.40, 0.30, 0.20, 0.10]; // Typical distribution
  let blendedCost = 0;
  for (let i = 0; i < tiers.length; i++) {
    const model = getModel(TIER_MAPPING[tiers[i]!].auto);
    if (model) {
      blendedCost += estimateCostPerRequest(model) * tierWeights[i]!;
    }
  }

  const blendedPerM = blendedCost * 1000;
  const opusPerM = opusCost * 1000;
  const totalSavings = opusPerM > 0 ? ((1 - blendedPerM / opusPerM) * 100).toFixed(0) : '0';

  lines.push(`  ⚡ Blended average (AUTO): $${blendedPerM.toFixed(2)}/M tokens`);
  lines.push(`  👑 Claude Opus baseline:   $${opusPerM.toFixed(2)}/M tokens`);
  lines.push(`  📉 Savings:                ${totalSavings}%`);

  return lines.join('\n');
}
