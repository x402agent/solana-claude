/**
 * src/services/prompt-suggestion.ts
 *
 * Solana-aware prompt suggestions — adapted from Claude Code's PromptSuggestion service.
 *
 * Generates contextually relevant follow-up prompts based on:
 *   - Current OODA phase
 *   - Recent tool calls
 *   - Agent memory state
 *   - Active onchain subscriptions
 *   - x402 payment activity
 *
 * These appear in the MCP server as "suggested_prompts" resource
 * and can be populated into Claude Desktop's suggested questions UI.
 */

import { getAppState, getActiveSubscriptions, getMemoriesByTier } from "../state/app-state.js";
import type { OODAPhase } from "../state/app-state.js";

export type PromptSuggestion = {
  id: string;
  prompt: string;
  category: "ooda" | "research" | "monitor" | "memory" | "x402" | "agent";
  /** Relative priority (higher = show first) */
  priority: number;
};

// ─── Phase-based suggestions (adapted from Claude Code PromptSuggestion) ─────

const OODA_PHASE_PROMPTS: Record<OODAPhase, string[]> = {
  observe: [
    "What are the top 5 trending tokens with >50% 24h change?",
    "What is the current SOL price and 24h context?",
    "Check network priority fees and congestion",
  ],
  orient: [
    "Research the top trending token for security score and smart money activity",
    "Compare the trending tokens against my INFERRED memory signals",
    "Which wallets are the top traders for this token?",
  ],
  decide: [
    "Score this opportunity using the full OODA confidence model",
    "What is the position size recommendation based on the confidence score?",
    "Are there any LEARNED patterns that match current market structure?",
  ],
  act: [
    "Summarize the trade recommendation and write it to INFERRED memory",
    "Set up a Helius webhook to monitor this token for the next 24h",
    "Generate listener code to watch for large transactions on this token",
  ],
  learn: [
    "Consolidate today's INFERRED signals to LEARNED conclusions",
    "What patterns have appeared in the last 5 OODA cycles?",
    "Run the Dream agent to promote memory tiers",
  ],
  idle: [
    "Run a full market scan on trending Solana tokens",
    "What does my agent memory tell me about the current market?",
    "Spawn the Scanner agent to monitor trending tokens",
    "Show me the status of active onchain subscriptions",
  ],
};

// ─── Context-based dynamic suggestions ───────────────────────────────────────

export function generatePromptSuggestions(): PromptSuggestion[] {
  const state = getAppState();
  const suggestions: PromptSuggestion[] = [];
  let idCounter = 0;
  const id = () => `sug-${++idCounter}`;

  // Phase-based suggestions
  const phaseSuggestions = OODA_PHASE_PROMPTS[state.oodaPhase] ?? OODA_PHASE_PROMPTS.idle;
  for (let i = 0; i < phaseSuggestions.length; i++) {
    suggestions.push({
      id: id(),
      prompt: phaseSuggestions[i],
      category: "ooda",
      priority: 100 - i * 10,
    });
  }

  // Memory-based suggestions
  const inferred = getMemoriesByTier(state, "INFERRED");
  if (inferred.length >= 3) {
    suggestions.push({
      id: id(),
      prompt: `Run Dream consolidation — ${inferred.length} INFERRED signals ready for promotion`,
      category: "memory",
      priority: 85,
    });
  }

  if (inferred.length > 0) {
    const topSignal = inferred[0].content.slice(0, 60);
    suggestions.push({
      id: id(),
      prompt: `Research details on: ${topSignal}`,
      category: "research",
      priority: 75,
    });
  }

  // Active subscription suggestions
  const subs = getActiveSubscriptions(state);
  if (subs.length > 0) {
    suggestions.push({
      id: id(),
      prompt: `Show status of ${subs.length} active onchain subscription${subs.length === 1 ? "" : "s"}`,
      category: "monitor",
      priority: 70,
    });
  } else {
    suggestions.push({
      id: id(),
      prompt: "Set up a real-time wallet monitor for smart money wallets",
      category: "monitor",
      priority: 60,
    });
  }

  // Agent fleet suggestions
  const runningTasks = Object.values(state.tasks).filter(t => t.status === "running");
  if (runningTasks.length > 0) {
    suggestions.push({
      id: id(),
      prompt: `Check status of ${runningTasks.length} running agent task${runningTasks.length === 1 ? "" : "s"}`,
      category: "agent",
      priority: 90,
    });
  } else {
    suggestions.push({
      id: id(),
      prompt: "Spawn the OODA agent for a full trading cycle analysis",
      category: "agent",
      priority: 55,
    });
  }

  // x402 suggestion (if not enabled)
  if (!process.env.X402_SVM_PRIVATE_KEY) {
    suggestions.push({
      id: id(),
      prompt: "How do I enable x402 micropayments for paid Solana API access?",
      category: "x402",
      priority: 30,
    });
  }

  // Sort by priority descending, take top 6
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

/** Format suggestions as MCP resource content */
export function formatSuggestionsForMCP(): string {
  const suggestions = generatePromptSuggestions();
  const state = getAppState();

  const lines = [
    `# Suggested Prompts`,
    `_Phase: ${state.oodaPhase} | Cycle: ${state.oodaCycleCount}_`,
    "",
    ...suggestions.map((s, i) => `${i + 1}. **[${s.category.toUpperCase()}]** ${s.prompt}`),
    "",
    "---",
    `_${suggestions.length} suggestions based on current agent state_`,
  ];

  return lines.join("\n");
}
