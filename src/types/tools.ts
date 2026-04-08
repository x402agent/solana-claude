/**
 * Centralized tool progress types.
 * Stub — provides the shapes that various tools and utilities import.
 */

export interface ShellProgress {
  type: 'shell'
  command?: string
  output?: string
  exitCode?: number | null
  [key: string]: unknown
}

export interface BashProgress extends ShellProgress {
  type: 'shell'
}

export interface PowerShellProgress extends ShellProgress {
  type: 'shell'
}

export interface AgentToolProgress {
  type: 'agent'
  status?: string
  agentName?: string
  [key: string]: unknown
}

export interface MCPProgress {
  type: 'mcp'
  serverName?: string
  [key: string]: unknown
}

export interface WebSearchProgress {
  type: 'web_search'
  query?: string
  [key: string]: unknown
}

export interface SkillToolProgress {
  type: 'skill'
  skillName?: string
  [key: string]: unknown
}

export interface TaskOutputProgress {
  type: 'task_output'
  taskId?: string
  [key: string]: unknown
}

export interface REPLToolProgress {
  type: 'repl'
  [key: string]: unknown
}

export interface SdkWorkflowProgress {
  type: 'sdk_workflow'
  [key: string]: unknown
}

export type ToolProgressData =
  | ShellProgress
  | AgentToolProgress
  | MCPProgress
  | WebSearchProgress
  | SkillToolProgress
  | TaskOutputProgress
  | REPLToolProgress
  | SdkWorkflowProgress
