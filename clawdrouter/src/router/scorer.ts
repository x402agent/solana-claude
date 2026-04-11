/**
 * ClawdRouter — 15-Dimension Request Scorer
 * Analyzes each request locally in <1ms to determine the optimal tier
 * Zero external API calls — pure heuristic scoring
 */

import type {
  ChatMessage,
  DimensionScores,
  ScoredRequest,
  RequestTier,
} from '../types.js';

// ── Dimension Weights ───────────────────────────────────────────────
// Each weight determines how much a dimension contributes to the total score

const WEIGHTS: Record<keyof DimensionScores, number> = {
  tokenCount: 0.08,
  complexity: 0.10,
  technicalDepth: 0.10,
  codeGeneration: 0.12,
  reasoning: 0.12,
  creativity: 0.05,
  multiStep: 0.08,
  contextLength: 0.05,
  toolUse: 0.06,
  vision: 0.04,
  mathScience: 0.06,
  solanaSpecific: 0.04,
  agentAutonomy: 0.04,
  structuredOutput: 0.03,
  latencySensitivity: 0.03,
};

// ── Pattern Matchers ────────────────────────────────────────────────

const CODE_PATTERNS = [
  /```[\s\S]*?```/g,
  /\b(function|const|let|var|class|interface|type|import|export|async|await|return)\b/gi,
  /\b(def|class|import|from|return|yield|async|lambda)\b/gi,
  /[{}\[\]();=><]+/g,
  /\b(rust|solidity|typescript|javascript|python|go|java|cpp|sql)\b/gi,
];

const REASONING_PATTERNS = [
  /\b(explain|why|how|analyze|compare|evaluate|critique|debate|reason|prove|derive)\b/gi,
  /\b(step.by.step|think.through|break.down|walk.me.through)\b/gi,
  /\b(therefore|because|consequently|implies|follows.that|given.that)\b/gi,
  /\b(pros?.and.cons?|trade.?offs?|advantages?|disadvantages?)\b/gi,
];

const MATH_PATTERNS = [
  /\b(calculate|compute|solve|equation|integral|derivative|matrix|vector|probability)\b/gi,
  /\b(algorithm|O\(n\)|complexity|optimize|fibonacci|recursive|dynamic.programming)\b/gi,
  /[+\-*/^=<>≤≥∑∏∫√]+/g,
  /\d+\.?\d*\s*[+\-*/^]\s*\d+\.?\d*/g,
];

const SOLANA_PATTERNS = [
  /\b(solana|sol|spl|token|nft|metaplex|anchor|program|instruction|account)\b/gi,
  /\b(keypair|pubkey|pda|seed|bump|rent|lamport|airdrop|transaction)\b/gi,
  /\b(raydium|jupiter|orca|marinade|serum|openbook|pump\.fun|bonding.curve)\b/gi,
  /\b(wallet|phantom|solflare|backpack|glow|ledger)\b/gi,
  /\b(defi|dex|amm|liquidity|yield|staking|validator|epoch|slot|block)\b/gi,
  /\b(usdc|usdt|wsol|jito|pyth|switchboard|helius|birdeye)\b/gi,
];

const AGENT_PATTERNS = [
  /\b(agent|autonomous|pipeline|workflow|orchestrat|multi.?step|chain.of)\b/gi,
  /\b(tool.use|function.call|api.call|execute|run|deploy|schedule)\b/gi,
  /\b(mcp|protocol|server|client|transport|stdio)\b/gi,
];

const STRUCTURED_PATTERNS = [
  /\b(json|yaml|xml|csv|markdown|table|schema|struct|format)\b/gi,
  /\b(parse|serialize|validate|transform|extract|generate.*json)\b/gi,
];

const CREATIVE_PATTERNS = [
  /\b(write|compose|draft|brainstorm|creative|story|poem|essay|blog|article)\b/gi,
  /\b(imagine|invent|design|concept|idea|pitch|narrative)\b/gi,
];

const VISION_PATTERNS = [
  /\b(image|photo|picture|screenshot|diagram|chart|graph|visual|ui|layout)\b/gi,
  /\b(look|see|analyze.*image|describe.*image|ocr|recognize)\b/gi,
  /image_url/gi,
];

// ── Scoring Functions ───────────────────────────────────────────────

function extractText(messages: ChatMessage[]): string {
  return messages
    .map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter(p => p.type === 'text')
          .map(p => p.text ?? '')
          .join(' ');
      }
      return '';
    })
    .join('\n');
}

function hasImages(messages: ChatMessage[]): boolean {
  return messages.some(m => {
    if (Array.isArray(m.content)) {
      return m.content.some(p => p.type === 'image_url');
    }
    return false;
  });
}

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(new RegExp(pattern.source, pattern.flags));
    count += matches?.length ?? 0;
  }
  return count;
}

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1.0);
}

// ── Main Scorer ─────────────────────────────────────────────────────

export function scoreRequest(messages: ChatMessage[]): ScoredRequest {
  const startTime = performance.now();

  const text = extractText(messages);
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  // Estimate token count (~0.75 words per token for English)
  const estimatedTokens = Math.ceil(wordCount * 1.33);

  const scores: DimensionScores = {
    // 1. Token count — longer inputs need more capable models
    tokenCount: normalize(estimatedTokens, 4000),

    // 2. Linguistic complexity — sentence length, vocabulary diversity
    complexity: normalize(
      (charCount / Math.max(wordCount, 1)) * 0.05 + // avg word length (reduced weight)
      (new Set(text.toLowerCase().split(/\s+/)).size / Math.max(wordCount, 1)) * 0.3, // vocabulary diversity
      0.6
    ),

    // 3. Technical depth — domain-specific terminology density
    technicalDepth: normalize(
      countMatches(text, [...SOLANA_PATTERNS, ...MATH_PATTERNS, ...CODE_PATTERNS]) * 0.15,
      1.0
    ),

    // 4. Code generation requirements
    codeGeneration: normalize(countMatches(text, CODE_PATTERNS), 8),

    // 5. Reasoning requirements
    reasoning: normalize(countMatches(text, REASONING_PATTERNS), 5),

    // 6. Creativity level
    creativity: normalize(countMatches(text, CREATIVE_PATTERNS), 8),

    // 7. Multi-step planning
    multiStep: normalize(
      countMatches(text, AGENT_PATTERNS) +
      (text.match(/\b(step|first|then|next|finally|after|before)\b/gi)?.length ?? 0) * 0.5,
      10
    ),

    // 8. Context length requirements
    contextLength: normalize(estimatedTokens, 50_000),

    // 9. Tool/function calling
    toolUse: normalize(
      countMatches(text, AGENT_PATTERNS) +
      (messages.some(m => m.tool_calls || m.tool_call_id) ? 5 : 0),
      10
    ),

    // 10. Vision/image understanding
    vision: hasImages(messages) ? 1.0 : normalize(countMatches(text, VISION_PATTERNS), 5),

    // 11. Math/science computation
    mathScience: normalize(countMatches(text, MATH_PATTERNS), 10),

    // 12. Solana/blockchain domain
    solanaSpecific: normalize(countMatches(text, SOLANA_PATTERNS), 15),

    // 13. Agent autonomy level
    agentAutonomy: normalize(countMatches(text, AGENT_PATTERNS), 8),

    // 14. Structured output requirements
    structuredOutput: normalize(countMatches(text, STRUCTURED_PATTERNS), 5),

    // 15. Latency sensitivity (short messages = more latency-sensitive)
    latencySensitivity: wordCount < 20 ? 0.9 : wordCount < 50 ? 0.5 : 0.2,
  };

  // Calculate weighted total score
  let totalScore = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    totalScore += scores[key as keyof DimensionScores] * weight;
  }

  // Determine tier from total score
  const tier = determineTier(totalScore, scores);

  const elapsed = performance.now() - startTime;

  return {
    tier,
    scores,
    totalScore,
    reasoning: generateReasoning(tier, scores, elapsed),
  };
}

// ── Tier Determination ──────────────────────────────────────────────

function determineTier(totalScore: number, scores: DimensionScores): RequestTier {
  // Reasoning override: if reasoning score is high, always use REASONING tier
  if (scores.reasoning > 0.5 || scores.mathScience > 0.5) {
    return 'REASONING';
  }

  // Vision override: images require capable models
  if (scores.vision > 0.8) {
    return 'COMPLEX';
  }

  // Code/Solana override: even short technical requests should be MEDIUM+
  if (scores.codeGeneration > 0.3 || scores.solanaSpecific > 0.2 || scores.technicalDepth > 0.4) {
    if (totalScore < 0.20) return 'MEDIUM';
  }

  // Score-based tiers
  if (totalScore < 0.15) return 'SIMPLE';
  if (totalScore < 0.40) return 'MEDIUM';
  if (totalScore < 0.65) return 'COMPLEX';
  return 'REASONING';
}

// ── Human-Readable Reasoning ────────────────────────────────────────

function generateReasoning(tier: RequestTier, scores: DimensionScores, elapsedMs: number): string {
  const topDimensions = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  return `Tier: ${tier} | Top signals: ${topDimensions.join(', ')} | Scored in ${elapsedMs.toFixed(2)}ms`;
}

// ── Exports for testing ─────────────────────────────────────────────

export { extractText, countMatches, normalize, determineTier, WEIGHTS };
