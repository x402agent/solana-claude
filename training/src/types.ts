export interface InstructionPair {
  instruction: string
  input?: string
  output: string
  source: string
  category: DatasetCategory
}

export type DatasetCategory =
  | 'tool_usage'
  | 'trading_strategy'
  | 'defi_math'
  | 'risk_assessment'
  | 'onchain_analysis'
  | 'agent_behavior'
  | 'memory_reasoning'
  | 'scenario'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatTrainingExample {
  messages: ChatMessage[]
}
