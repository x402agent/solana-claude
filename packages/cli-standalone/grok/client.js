import OpenAI from "openai";
export class GrokClient {
    client;
    currentModel = "grok-code-fast-1";
    defaultMaxTokens;
    isOllama = false;
    constructor(apiKey, model, baseURL) {
        // Check if using Ollama
        const resolvedBaseURL = baseURL || process.env.GROK_BASE_URL || "https://api.x.ai/v1";
        this.isOllama = resolvedBaseURL.includes("localhost:11434") ||
            resolvedBaseURL.includes("ollama");
        // Ollama doesn't require API key, use a placeholder
        this.client = new OpenAI({
            apiKey: this.isOllama ? "ollama" : apiKey,
            baseURL: resolvedBaseURL,
            timeout: 360000,
        });
        const envMax = Number(process.env.GROK_MAX_TOKENS);
        this.defaultMaxTokens = Number.isFinite(envMax) && envMax > 0 ? envMax : 1536;
        if (model) {
            this.currentModel = model;
        }
    }
    /**
     * Set Ollama base URL and update client
     */
    setOllamaURL(url) {
        this.isOllama = true;
        this.client = new OpenAI({
            apiKey: "ollama",
            baseURL: url,
            timeout: 360000,
        });
    }
    /**
     * Set Grok API and update client
     */
    setGrokAPI(apiKey, baseURL) {
        this.isOllama = false;
        this.client = new OpenAI({
            apiKey,
            baseURL: baseURL || "https://api.x.ai/v1",
            timeout: 360000,
        });
    }
    /**
     * Reconfigure client with new provider credentials.
     * Used when switching between Grok / OpenRouter / OpenAI / Ollama / custom.
     */
    setProvider(apiKey, baseURL) {
        this.isOllama =
            baseURL.includes("localhost:11434") || baseURL.includes("ollama");
        this.client = new OpenAI({
            apiKey: this.isOllama ? apiKey || "ollama" : apiKey,
            baseURL,
            timeout: 360000,
        });
    }
    /**
     * Check if currently using Ollama
     */
    isUsingOllama() {
        return this.isOllama;
    }
    setModel(model) {
        this.currentModel = model;
    }
    /**
     * Strip a provider prefix ("ollama/", "openrouter/", "openai/", "custom/")
     * from a model id before sending to the underlying API.
     */
    resolveApiModel(model) {
        const prefixes = ["ollama/", "openrouter/", "openai/", "custom/"];
        for (const p of prefixes) {
            if (model.startsWith(p))
                return model.substring(p.length);
        }
        return model;
    }
    getCurrentModel() {
        return this.currentModel;
    }
    async chat(messages, tools, model, searchOptions) {
        try {
            const requestPayload = {
                model: this.resolveApiModel(model || this.currentModel),
                messages,
                tools: tools || [],
                tool_choice: tools && tools.length > 0 ? "auto" : undefined,
                temperature: 0.7,
                max_tokens: this.defaultMaxTokens,
            };
            // Add search parameters if specified
            if (searchOptions?.search_parameters) {
                requestPayload.search_parameters = searchOptions.search_parameters;
            }
            const response = await this.client.chat.completions.create(requestPayload);
            return response;
        }
        catch (error) {
            throw new Error(`API error: ${error.message}`);
        }
    }
    async *chatStream(messages, tools, model, searchOptions) {
        try {
            const requestPayload = {
                model: this.resolveApiModel(model || this.currentModel),
                messages,
                tools: tools || [],
                tool_choice: tools && tools.length > 0 ? "auto" : undefined,
                temperature: 0.7,
                max_tokens: this.defaultMaxTokens,
                stream: true,
            };
            // Add search parameters if specified
            if (searchOptions?.search_parameters) {
                requestPayload.search_parameters = searchOptions.search_parameters;
            }
            const stream = (await this.client.chat.completions.create(requestPayload));
            for await (const chunk of stream) {
                yield chunk;
            }
        }
        catch (error) {
            throw new Error(`API error: ${error.message}`);
        }
    }
    async search(query, searchParameters) {
        const searchMessage = {
            role: "user",
            content: query,
        };
        const searchOptions = {
            search_parameters: searchParameters || { mode: "on" },
        };
        return this.chat([searchMessage], [], undefined, searchOptions);
    }
}
//# sourceMappingURL=client.js.map