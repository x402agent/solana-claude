import type { ChatCompletionMessageParam } from "openai/resources/chat";
export type GrokMessage = ChatCompletionMessageParam;
export interface GrokTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required: string[];
        };
    };
}
export interface GrokToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}
export interface SearchParameters {
    mode?: "auto" | "on" | "off";
}
export interface SearchOptions {
    search_parameters?: SearchParameters;
}
export interface GrokResponse {
    choices: Array<{
        message: {
            role: string;
            content: string | null;
            tool_calls?: GrokToolCall[];
        };
        finish_reason: string;
    }>;
}
export declare class GrokClient {
    private client;
    private currentModel;
    private defaultMaxTokens;
    private isOllama;
    constructor(apiKey: string, model?: string, baseURL?: string);
    /**
     * Set Ollama base URL and update client
     */
    setOllamaURL(url: string): void;
    /**
     * Set Grok API and update client
     */
    setGrokAPI(apiKey: string, baseURL?: string): void;
    /**
     * Reconfigure client with new provider credentials.
     * Used when switching between Grok / OpenRouter / OpenAI / Ollama / custom.
     */
    setProvider(apiKey: string, baseURL: string): void;
    /**
     * Check if currently using Ollama
     */
    isUsingOllama(): boolean;
    setModel(model: string): void;
    /**
     * Strip a provider prefix ("ollama/", "openrouter/", "openai/", "custom/")
     * from a model id before sending to the underlying API.
     */
    private resolveApiModel;
    getCurrentModel(): string;
    chat(messages: GrokMessage[], tools?: GrokTool[], model?: string, searchOptions?: SearchOptions): Promise<GrokResponse>;
    chatStream(messages: GrokMessage[], tools?: GrokTool[], model?: string, searchOptions?: SearchOptions): AsyncGenerator<any, void, unknown>;
    search(query: string, searchParameters?: SearchParameters): Promise<GrokResponse>;
}
