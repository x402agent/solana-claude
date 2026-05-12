import { GrokToolCall } from "../grok/client.js";
import { ToolResult } from "../types/index.js";
import { EventEmitter } from "events";
export interface ChatEntry {
    type: "user" | "assistant" | "tool_result" | "tool_call";
    content: string;
    timestamp: Date;
    toolCalls?: GrokToolCall[];
    toolCall?: GrokToolCall;
    toolResult?: {
        success: boolean;
        output?: string;
        error?: string;
    };
    isStreaming?: boolean;
}
export interface StreamingChunk {
    type: "content" | "tool_calls" | "tool_result" | "done" | "token_count";
    content?: string;
    toolCalls?: GrokToolCall[];
    toolCall?: GrokToolCall;
    toolResult?: ToolResult;
    tokenCount?: number;
}
export declare class GrokAgent extends EventEmitter {
    private grokClient;
    private textEditor;
    private morphEditor;
    private bash;
    private todoTool;
    private confirmationTool;
    private search;
    private solana;
    private dflow;
    private wallet;
    private launcher;
    private polymarket;
    private bags;
    private kalshi;
    private chatHistory;
    private messages;
    private tokenCounter;
    private abortController;
    private mcpInitialized;
    private maxToolRounds;
    constructor(apiKey: string, baseURL?: string, model?: string, maxToolRounds?: number);
    private initializeMCP;
    private isGrokModel;
    private shouldUseSearchFor;
    processUserMessage(message: string): Promise<ChatEntry[]>;
    private messageReducer;
    processUserMessageStream(message: string): AsyncGenerator<StreamingChunk, void, unknown>;
    private executeTool;
    private executeMCPTool;
    getChatHistory(): ChatEntry[];
    getCurrentDirectory(): string;
    executeBashCommand(command: string): Promise<ToolResult>;
    getCurrentModel(): string;
    setModel(model: string): void;
    abortCurrentOperation(): void;
}
