/**
 * gateway/src/conversationStore.ts — In-memory store for agent conversation turns.
 * Used by /peek, /quote, /last, /feed endpoints.
 */

export interface ConversationTurn {
  agentId: 1 | 2 | 3;
  agentName: string;
  content: string;
  timestamp: Date;
  turnIndex: number;
}

const MAX_TURNS = 500;
const turns: ConversationTurn[] = [];
let turnCounter = 0;

export function addTurn(agentId: 1 | 2 | 3, content: string): ConversationTurn {
  const names: Record<number, string> = { 1: 'The Analyst', 2: 'The Satirist', 3: 'Clawd' };
  const turn: ConversationTurn = {
    agentId,
    agentName: names[agentId]!,
    content,
    timestamp: new Date(),
    turnIndex: ++turnCounter,
  };
  turns.push(turn);
  if (turns.length > MAX_TURNS) turns.splice(0, turns.length - MAX_TURNS);
  return turn;
}

export function getLastN(n: number): ConversationTurn[] {
  return turns.slice(-Math.min(n, 10));
}

export function getLastForAgent(agentId: 1 | 2 | 3): ConversationTurn | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]!.agentId === agentId) return turns[i]!;
  }
  return null;
}

export function getAllTurns(): ConversationTurn[] {
  return [...turns];
}

export function totalTurns(): number {
  return turnCounter;
}
