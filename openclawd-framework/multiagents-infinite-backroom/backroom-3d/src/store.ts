import { create } from 'zustand'

export interface AgentMessage {
  id: string
  agentId: 1 | 2 | 3
  agentName: string
  content: string
  timestamp: number
  turn: number
  reasoning?: string
}

export interface AgentState {
  id: 1 | 2 | 3
  name: string
  color: string
  position: [number, number, number]
  isSpeaking: boolean
  lastMessage: string
  messages: AgentMessage[]
  bubbleScale: number
}

interface BackroomStore {
  agents: AgentState[]
  messages: AgentMessage[]
  autoLoop: boolean
  turnCount: number
  isPolling: boolean
  error: string | null

  addMessage: (msg: AgentMessage) => void
  setAgentSpeaking: (agentId: 1 | 2 | 3, speaking: boolean) => void
  setAgentMessage: (agentId: 1 | 2 | 3, message: string) => void
  setAutoLoop: (on: boolean) => void
  setTurnCount: (n: number) => void
  setPolling: (polling: boolean) => void
  setError: (err: string | null) => void
  reset: () => void
}

const defaultAgents: AgentState[] = [
  {
    id: 1,
    name: 'The Analyst',
    color: '#4fc3f7',
    position: [-3, 1, -2],
    isSpeaking: false,
    lastMessage: 'Awaiting data...',
    messages: [],
    bubbleScale: 1,
  },
  {
    id: 2,
    name: 'The Satirist',
    color: '#ff8a65',
    position: [3, 1, -2],
    isSpeaking: false,
    lastMessage: 'Awaiting absurdity...',
    messages: [],
    bubbleScale: 1,
  },
  {
    id: 3,
    name: 'Clawd',
    color: '#ef5350',
    position: [0, 1.5, 3],
    isSpeaking: false,
    lastMessage: 'The trench listens...',
    messages: [],
    bubbleScale: 1.2,
  },
]

export const useBackroomStore = create<BackroomStore>((set) => ({
  agents: defaultAgents,
  messages: [],
  autoLoop: true,
  turnCount: 0,
  isPolling: false,
  error: null,

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg].slice(-100),
      agents: state.agents.map((a) =>
        a.id === msg.agentId
          ? { ...a, lastMessage: msg.content, messages: [...a.messages, msg].slice(-20) }
          : a
      ),
    })),

  setAgentSpeaking: (agentId, speaking) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agentId ? { ...a, isSpeaking: speaking } : a)),
    })),

  setAgentMessage: (agentId, message) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, lastMessage: message } : a
      ),
    })),

  setAutoLoop: (autoLoop) => set({ autoLoop }),
  setTurnCount: (turnCount) => set({ turnCount }),
  setPolling: (isPolling) => set({ isPolling }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      agents: defaultAgents,
      messages: [],
      turnCount: 0,
      error: null,
    }),
}))
