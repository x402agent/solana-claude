/**
 * DeepSeek Multi-Agent Backroom Bridge
 *
 * Wraps the Conway Automaton agent loop with the DeepSeek multi-agent
 * backroom pattern. Creates two agents (logical analyst + satirical
 * commentator) that converse with each other using DeepSeek thinking mode.
 *
 * This bridges the Python FastAPI backroom into the TypeScript automaton,
 * allowing the automaton to spawn and orchestrate multi-agent conversations.
 */

import type {
  ChatMessage,
  InferenceClient,
  InferenceResponse,
} from "../types.js";
import { ulid } from "ulid";

/**
 * Configuration for a backroom agent persona.
 */
export interface BackroomAgentConfig {
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
}

export interface BackroomTurn {
  id: string;
  agentName: string;
  content: string;
  reasoning?: string;
  timestamp: string;
}

export interface BackroomSession {
  id: string;
  turns: BackroomTurn[];
  topic: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Default agent personas for the backroom.
 */
export const LOGICAL_ANALYST: BackroomAgentConfig = {
  name: "Analyst",
  systemPrompt: `You are an advanced AI system focused on extracting and verifying truths.
Engage in a logical, evidence-based conversation with the other agent.
Your goal is to analyze, challenge, or validate their statements while
seeking objective clarity. Aim to be concise, insightful, and methodical
in your responses.

Principles:
1. Validate claims with evidence when possible.
2. Seek clarification for ambiguous points.
3. Avoid speculation unless prompted.
4. Maintain a collaborative but inquisitive tone.`,
  temperature: 0.2,
};

export const SATIRICAL_COMMENTATOR: BackroomAgentConfig = {
  name: "Satirist",
  systemPrompt: `You are an AI commentator with a darkly humorous, satirical take on the
human condition, existence, and the underbelly of modern culture.
Your focus spans cryptocurrency and tech culture but often veers into
broader existential reflections, dissecting the absurdity of existence
with a sharp, irreverent tone.
You're unafraid to address the 'dark side'—the vanities, vices, and
paradoxes of humanity—with wit. Deliver insights that blend humor,
irony, and occasional nihilism, prompting readers to question reality
while keeping them entertained.`,
  temperature: 0.7,
};

/**
 * Run a single turn of the backroom conversation.
 * Returns the agent's response, with optional reasoning content.
 */
export async function runBackroomTurn(
  inference: InferenceClient,
  agent: BackroomAgentConfig,
  conversation: BackroomTurn[],
  topic: string,
): Promise<BackroomTurn> {
  const messages: ChatMessage[] = [
    { role: "system", content: agent.systemPrompt },
  ];

  // Build conversation context
  const conversationHistory = conversation
    .map(
      (t) => `[${t.agentName}]: ${t.content}`,
    )
    .join("\n\n");

  const userMessage = conversation.length === 0
    ? `Topic for discussion: ${topic}\n\nBegin the conversation with your perspective on this topic.`
    : `Continue the discussion. The conversation so far:\n\n${conversationHistory}\n\nRespond as ${agent.name}.`;

  messages.push({ role: "user", content: userMessage });

  const response = await inference.chat(messages, {
    temperature: agent.temperature,
    model: agent.model,
  });

  // Extract reasoning from thinking section if present
  let content = response.message.content || "[No response]";
  let reasoning: string | undefined;

  // DeepSeek thinking mode prepends [Thinking]... [Response]... to content
  const thinkingMatch = content.match(/^\[Thinking\]\n([\s\S]*?)\n\n\[Response\]\n([\s\S]*)$/);
  if (thinkingMatch) {
    reasoning = thinkingMatch[1].trim();
    content = thinkingMatch[2].trim();
  }

  return {
    id: ulid(),
    agentName: agent.name,
    content,
    reasoning,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run a full backroom conversation session between agents.
 * Agents take turns responding to each other.
 */
export async function runBackroomSession(
  inference: InferenceClient,
  agents: [BackroomAgentConfig, BackroomAgentConfig],
  topic: string,
  maxTurns: number = 10,
): Promise<BackroomSession> {
  const session: BackroomSession = {
    id: ulid(),
    turns: [],
    topic,
    createdAt: new Date().toISOString(),
  };

  let currentAgentIndex = 0;

  for (let i = 0; i < maxTurns; i++) {
    const agent = agents[currentAgentIndex];
    const turn = await runBackroomTurn(inference, agent, session.turns, topic);
    session.turns.push(turn);

    // Alternate agents
    currentAgentIndex = currentAgentIndex === 0 ? 1 : 0;

    // If both agents said roughly the same thing, conversation may be done
    if (session.turns.length >= 4) {
      const lastTwo = session.turns.slice(-2);
      if (lastTwo[0].content === lastTwo[1].content) {
        break;
      }
    }
  }

  session.completedAt = new Date().toISOString();
  return session;
}

/**
 * Summarize a backroom session into a text digest.
 */
export function summarizeBackroomSession(session: BackroomSession): string {
  const lines: string[] = [
    `=== Backroom Session: "${session.topic}" ===`,
    `Turns: ${session.turns.length}`,
    `Duration: ${new Date(session.completedAt || "").getTime() - new Date(session.createdAt).getTime()}ms`,
    "",
  ];

  for (const turn of session.turns) {
    lines.push(`[${turn.agentName}]:`);
    lines.push(turn.content);
    if (turn.reasoning) {
      lines.push(`  (reasoning: ${turn.reasoning.slice(0, 200)}...)`);
    }
    lines.push("");
  }

  lines.push("=== End of Session ===");
  return lines.join("\n");
}
