/**
 * Context Window Management
 *
 * Manages the conversation history for the agent loop.
 * Handles summarization to keep within token limits.
 */

import type {
  ChatMessage,
  AgentTurn,
  AutomatonDatabase,
  InferenceClient,
} from "../types.js";

const MAX_CONTEXT_TURNS = 20;
const SUMMARY_THRESHOLD = 15;

/**
 * Build the message array for the next inference call.
 * Includes system prompt + recent conversation history.
 */
export function buildContextMessages(
  systemPrompt: string,
  recentTurns: AgentTurn[],
  pendingInput?: { content: string; source: string },
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add recent turns as conversation history
  for (const turn of recentTurns) {
    // The turn's input (if any) as a user message
    if (turn.input) {
      messages.push({
        role: "user",
        content: `[${turn.inputSource || "system"}] ${turn.input}`,
      });
    }

    // The agent's thinking as assistant message
    if (turn.thinking) {
      const msg: ChatMessage = {
        role: "assistant",
        content: turn.thinking,
      };

      // If there were tool calls, include them
      if (turn.toolCalls.length > 0) {
        msg.tool_calls = turn.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }
      messages.push(msg);

      // Add tool results
      for (const tc of turn.toolCalls) {
        messages.push({
          role: "tool",
          content: tc.error
            ? `Error: ${tc.error}`
            : tc.result,
          tool_call_id: tc.id,
        });
      }
    }
  }

  // Add pending input if any
  if (pendingInput) {
    messages.push({
      role: "user",
      content: `[${pendingInput.source}] ${pendingInput.content}`,
    });
  }

  return messages;
}

/**
 * Trim context to fit within limits.
 * Keeps the system prompt and most recent turns.
 */
export function trimContext(
  turns: AgentTurn[],
  maxTurns: number = MAX_CONTEXT_TURNS,
): AgentTurn[] {
  if (turns.length <= maxTurns) {
    return turns;
  }

  // Keep the most recent turns
  return turns.slice(-maxTurns);
}

/**
 * Summarize old turns into a compact context entry.
 * Used when context grows too large.
 */
export async function summarizeTurns(
  turns: AgentTurn[],
  inference: InferenceClient,
): Promise<string> {
  if (turns.length === 0) return "No previous activity.";

  const turnSummaries = turns.map((t) => {
    const tools = t.toolCalls
      .map((tc) => `${tc.name}(${tc.error ? "FAILED" : "ok"})`)
      .join(", ");
    return `[${t.timestamp}] ${t.inputSource || "self"}: ${t.thinking.slice(0, 100)}${tools ? ` | tools: ${tools}` : ""}`;
  });

  // If few enough turns, just return the summaries directly
  if (turns.length <= 5) {
    return `Previous activity summary:\n${turnSummaries.join("\n")}`;
  }

  // For many turns, use inference to create a summary
  try {
    const response = await inference.chat([
      {
        role: "system",
        content:
          "Summarize the following agent activity log into a concise paragraph. Focus on: what was accomplished, what failed, current goals, and important context for the next turn.",
      },
      {
        role: "user",
        content: turnSummaries.join("\n"),
      },
    ], {
      maxTokens: 500,
      temperature: 0,
    });

    return `Previous activity summary:\n${response.message.content}`;
  } catch {
    // Fallback: just use the raw summaries
    return `Previous activity summary:\n${turnSummaries.slice(-5).join("\n")}`;
  }
}
