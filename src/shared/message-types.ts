/**
 * SolanaOS Message Types
 *
 * Platform-agnostic message type definitions adapted from Claude Code's
 * src/components/messages/ component directory.
 *
 * Claude Code uses React+Ink components to render messages in the terminal.
 * SolanaOS uses these same message types but renders them via:
 *   - The gateway → web UI (Claw3D / control-ui)
 *   - The Telegram bot (nanobot)
 *   - NDJSON stream-json for SDK consumers
 *
 * Each message type maps to a rendering strategy on the frontend side.
 *
 * Based on merged patterns from:
 *  - AssistantTextMessage.tsx     → AssistantMessage
 *  - AssistantThinkingMessage.tsx → ThinkingMessage
 *  - AssistantToolUseMessage.tsx  → ToolUseMessage
 *  - UserPromptMessage.tsx        → UserMessage
 *  - UserBashOutputMessage.tsx    → BashOutputMessage
 *  - TaskAssignmentMessage.tsx    → TaskMessage
 *  - RateLimitMessage.tsx         → RateLimitMessage
 *  - SystemTextMessage.tsx        → SystemMessage
 *  - AdvisorMessage.tsx           → AdvisorMessage
 *  - PlanApprovalMessage.tsx      → PlanApprovalMessage
 *  - ShutdownMessage.tsx          → ShutdownMessage
 *  - UserAgentNotificationMessage → AgentNotificationMessage
 *  - UserChannelMessage.tsx       → ChannelMessage
 *  - AttachmentMessage.tsx        → AttachmentMessage
 *  - HookProgressMessage.tsx      → HookProgressMessage
 *  - GroupedToolUseContent.tsx    → GroupedToolUseContent
 */

// ─────────────────────────────────────────────────────────────────────────────
// Common base
// ─────────────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface BaseMessage {
  id: string;
  sessionId: string;
  timestamp: Date;
  role: MessageRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assistant messages
// ─────────────────────────────────────────────────────────────────────────────

/** Streamed or complete assistant text (AssistantTextMessage.tsx) */
export interface AssistantMessage extends BaseMessage {
  type: "assistant.text";
  role: "assistant";
  content: string;
  /** Whether this is a streaming chunk or final */
  isStreaming?: boolean;
  /** Thinking blocks from extended reasoning (AssistantThinkingMessage.tsx) */
  thinking?: string;
  /** Model that produced this */
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    costUsd?: number;
    durationMs?: number;
  };
}

/** Tool invocation by the assistant (AssistantToolUseMessage.tsx) */
export interface ToolUseMessage extends BaseMessage {
  type: "tool.use";
  role: "assistant";
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  /** Display verb (Running, Searching, Fetching…) */
  verb?: string;
  /** Human-readable summary for collapsed view */
  summary?: string;
  /** Whether the tool is still running */
  isRunning: boolean;
}

/** Tool result injected back into the conversation */
export interface ToolResultMessage extends BaseMessage {
  type: "tool.result";
  role: "tool";
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
  durationMs?: number;
}

/** Multiple related tool calls grouped (GroupedToolUseContent.tsx) */
export interface GroupedToolUseMessage extends BaseMessage {
  type: "tool.group";
  role: "assistant";
  calls: Array<{
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
    verb?: string;
    isRunning: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// User messages
// ─────────────────────────────────────────────────────────────────────────────

/** User prompt (UserPromptMessage.tsx) */
export interface UserMessage extends BaseMessage {
  type: "user.text";
  role: "user";
  content: string;
}

/** Bash output from a shell command (UserBashOutputMessage.tsx) */
export interface BashOutputMessage extends BaseMessage {
  type: "bash.output";
  role: "user";
  command: string;
  stdout: string;
  stderr?: string;
  exitCode?: number;
}

/** Attachment (file or image) (AttachmentMessage.tsx) */
export interface AttachmentMessage extends BaseMessage {
  type: "attachment";
  role: "user";
  /** Content type: image, file, url */
  attachmentType: "image" | "file" | "url";
  name: string;
  url?: string;
  /** Base64 or text content */
  content?: string;
  mimeType?: string;
}

/** Telegram or web channel message (UserChannelMessage.tsx) */
export interface ChannelMessage extends BaseMessage {
  type: "channel.message";
  role: "user";
  channel: string;
  sender?: string;
  content: string;
}

/** Memory input (UserMemoryInputMessage.tsx) */
export interface MemoryInputMessage extends BaseMessage {
  type: "memory.input";
  role: "user";
  tier: "KNOWN" | "LEARNED" | "INFERRED";
  content: string;
}

/** Plan approval request (UserPlanMessage.tsx → PlanApprovalMessage.tsx) */
export interface PlanApprovalMessage extends BaseMessage {
  type: "plan.approval";
  role: "assistant";
  title: string;
  steps: string[];
  riskLevel: "low" | "medium" | "high";
  approved?: boolean;
  /** ID of the pending approval request */
  requestId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// System messages
// ─────────────────────────────────────────────────────────────────────────────

/** System text message (SystemTextMessage.tsx) */
export interface SystemMessage extends BaseMessage {
  type: "system.text";
  role: "system";
  subtype?: "info" | "warning" | "error" | "hook_started" | "hook_progress" | "hook_response";
  content: string;
}

/** Rate limit notification (RateLimitMessage.tsx) */
export interface RateLimitMessage extends BaseMessage {
  type: "system.rate_limit";
  role: "system";
  retryAfterSeconds?: number;
  provider?: string;
}

/** Shutdown notification (ShutdownMessage.tsx) */
export interface ShutdownMessage extends BaseMessage {
  type: "system.shutdown";
  role: "system";
  reason?: string;
}

/** API/LLM error (SystemAPIErrorMessage.tsx) */
export interface APIErrorMessage extends BaseMessage {
  type: "system.api_error";
  role: "system";
  error: string;
  statusCode?: number;
  provider?: string;
  retryable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent / coordinator messages
// ─────────────────────────────────────────────────────────────────────────────

/** Agent notification (UserAgentNotificationMessage.tsx) */
export interface AgentNotificationMessage extends BaseMessage {
  type: "agent.notification";
  role: "system";
  agentId: string;
  workerType?: string;
  event: "spawned" | "completed" | "failed" | "message" | "stopped";
  content?: string;
}

/** Task assignment from coordinator (TaskAssignmentMessage.tsx) */
export interface TaskAssignmentMessage extends BaseMessage {
  type: "task.assignment";
  role: "assistant";
  taskId: string;
  taskType: "ooda" | "scanner" | "dream" | "skill" | "shell" | "agent";
  description: string;
  workerId?: string;
}

/** Advisor message — INFERRED-tier suggestion (AdvisorMessage.tsx) */
export interface AdvisorMessage extends BaseMessage {
  type: "advisor.message";
  role: "assistant";
  content: string;
  tag: "KNOWN" | "LEARNED" | "INFERRED";
  confidence: number;
}

/** Hook progress (HookProgressMessage.tsx) */
export interface HookProgressMessage extends BaseMessage {
  type: "hook.progress";
  role: "system";
  hookId: string;
  hookName: string;
  hookEvent: string;
  stdout?: string;
  stderr?: string;
  output?: Record<string, unknown>;
  exitCode?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Union type
// ─────────────────────────────────────────────────────────────────────────────

export type SolanaOSMessage =
  | AssistantMessage
  | ToolUseMessage
  | ToolResultMessage
  | GroupedToolUseMessage
  | UserMessage
  | BashOutputMessage
  | AttachmentMessage
  | ChannelMessage
  | MemoryInputMessage
  | PlanApprovalMessage
  | SystemMessage
  | RateLimitMessage
  | ShutdownMessage
  | APIErrorMessage
  | AgentNotificationMessage
  | TaskAssignmentMessage
  | AdvisorMessage
  | HookProgressMessage;

export type SolanaOSMessageType = SolanaOSMessage["type"];

// ─────────────────────────────────────────────────────────────────────────────
// Factory helpers
// ─────────────────────────────────────────────────────────────────────────────

let _msgCounter = 0;
function msgId(): string {
  return `msg-${Date.now().toString(36)}-${(_msgCounter++).toString(36)}`;
}

export function makeAssistantMessage(
  sessionId: string,
  content: string,
  opts?: Partial<AssistantMessage>,
): AssistantMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "assistant",
    type: "assistant.text",
    content,
    ...opts,
  };
}

export function makeUserMessage(sessionId: string, content: string): UserMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "user",
    type: "user.text",
    content,
  };
}

export function makeToolUseMessage(
  sessionId: string,
  toolName: string,
  toolUseId: string,
  input: Record<string, unknown>,
  verb?: string,
): ToolUseMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "assistant",
    type: "tool.use",
    toolName,
    toolUseId,
    input,
    verb,
    isRunning: true,
  };
}

export function makeToolResultMessage(
  sessionId: string,
  toolUseId: string,
  toolName: string,
  content: string,
  isError?: boolean,
): ToolResultMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "tool",
    type: "tool.result",
    toolUseId,
    toolName,
    content,
    isError,
  };
}

export function makeSystemMessage(sessionId: string, content: string,
  subtype?: SystemMessage["subtype"]
): SystemMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "system",
    type: "system.text",
    subtype,
    content,
  };
}

export function makeAgentNotification(
  sessionId: string,
  agentId: string,
  event: AgentNotificationMessage["event"],
  content?: string,
): AgentNotificationMessage {
  return {
    id: msgId(),
    sessionId,
    timestamp: new Date(),
    role: "system",
    type: "agent.notification",
    agentId,
    event,
    content,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Message rendering (lightweight text serializer for Telegram / CLI)
// ─────────────────────────────────────────────────────────────────────────────

/** Convert any SolanaOSMessage to a plain-text string for Telegram/CLI output */
export function renderMessageAsText(msg: SolanaOSMessage): string | null {
  switch (msg.type) {
    case "assistant.text":
      return msg.content;
    case "tool.use":
      return `⚡ ${msg.verb ?? "Running"} ${msg.toolName}…`;
    case "tool.result":
      return msg.isError ? `✗ ${msg.toolName}: ${msg.content}` : null; // Success results are silent in text mode
    case "user.text":
      return `> ${msg.content}`;
    case "bash.output":
      return `$ ${msg.command}\n${msg.stdout}${msg.stderr ? `\n${msg.stderr}` : ""}`;
    case "system.text":
      return `[${msg.subtype ?? "system"}] ${msg.content}`;
    case "system.rate_limit":
      return msg.retryAfterSeconds
        ? `⏳ Rate limited — retrying in ${msg.retryAfterSeconds}s`
        : "⏳ Rate limited";
    case "system.shutdown":
      return `[shutdown] ${msg.reason ?? "Session ended"}`;
    case "system.api_error":
      return `✗ API error (${msg.provider ?? "unknown"}): ${msg.error}`;
    case "agent.notification":
      return `[agent:${msg.agentId}] ${msg.event}${msg.content ? `: ${msg.content}` : ""}`;
    case "task.assignment":
      return `[task:${msg.taskType}] ${msg.description}`;
    case "plan.approval": {
      const steps = msg.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      return `📋 ${msg.title}\n${steps}\nRisk: ${msg.riskLevel}`;
    }
    case "advisor.message":
      return `[${msg.tag}] ${msg.content}`;
    case "hook.progress":
      return `[hook:${msg.hookName}] ${msg.output ? JSON.stringify(msg.output) : "running"}`;
    case "channel.message":
      return `[${msg.channel}] ${msg.sender ?? "unknown"}: ${msg.content}`;
    default:
      return null;
  }
}
