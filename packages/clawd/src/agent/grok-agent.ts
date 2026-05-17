import { GrokClient, GrokMessage, GrokToolCall } from "../grok/client.js";
import {
  GROK_TOOLS,
  addMCPToolsToGrokTools,
  getAllGrokTools,
  getMCPManager,
  initializeMCPServers,
} from "../grok/tools.js";
import { loadMCPConfig } from "../mcp/config.js";
import {
  TextEditorTool,
  MorphEditorTool,
  BashTool,
  TodoTool,
  ConfirmationTool,
  SearchTool,
  SolanaTool,
  DFlowTool,
  WalletTool,
  TokenLaunchTool,
  PolymarketTool,
  BagsTool,
  KalshiTool,
} from "../tools/index.js";
import { ToolResult } from "../types/index.js";
import { EventEmitter } from "events";
import { createTokenCounter, TokenCounter } from "../utils/token-counter.js";
import { loadCustomInstructions } from "../utils/custom-instructions.js";
import { getSettingsManager } from "../utils/settings-manager.js";

export interface ChatEntry {
  type: "user" | "assistant" | "tool_result" | "tool_call";
  content: string;
  timestamp: Date;
  toolCalls?: GrokToolCall[];
  toolCall?: GrokToolCall;
  toolResult?: { success: boolean; output?: string; error?: string };
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

export class GrokAgent extends EventEmitter {
  private grokClient: GrokClient;
  private textEditor: TextEditorTool;
  private morphEditor: MorphEditorTool | null;
  private bash: BashTool;
  private todoTool: TodoTool;
  private confirmationTool: ConfirmationTool;
  private search: SearchTool;
  private solana: SolanaTool;
  private dflow: DFlowTool;
  private wallet: WalletTool;
  private launcher: TokenLaunchTool;
  private polymarket: PolymarketTool;
  private bags: BagsTool;
  private kalshi: KalshiTool;
  private chatHistory: ChatEntry[] = [];
  private messages: GrokMessage[] = [];
  private tokenCounter: TokenCounter;
  private abortController: AbortController | null = null;
  private mcpInitialized: boolean = false;
  private maxToolRounds: number;

  constructor(
    apiKey: string,
    baseURL?: string,
    model?: string,
    maxToolRounds?: number
  ) {
    super();
    const manager = getSettingsManager();
    const savedModel = manager.getCurrentModel();
    let modelToUse = model || savedModel || "grok-code-fast-1";
    this.maxToolRounds = maxToolRounds || 400;

    // Resolve provider (grok / ollama / openrouter / openai / custom) and use its
    // apiKey + baseURL. This lets a single CLI session route requests to whichever
    // backend the selected model belongs to.
    const providerCfg = manager.getProviderConfigForModel(modelToUse);
    const resolvedApiKey =
      providerCfg.apiKey || apiKey || (providerCfg.provider === "ollama" ? "ollama" : "");
    const resolvedBaseURL = providerCfg.baseURL || baseURL;

    this.grokClient = new GrokClient(resolvedApiKey, modelToUse, resolvedBaseURL);
    this.textEditor = new TextEditorTool();
    this.morphEditor = process.env.MORPH_API_KEY ? new MorphEditorTool() : null;
    this.bash = new BashTool();
    this.todoTool = new TodoTool();
    this.confirmationTool = new ConfirmationTool();
    this.search = new SearchTool();
    this.solana = new SolanaTool();
    this.dflow = new DFlowTool();
    this.wallet = new WalletTool();
    this.launcher = new TokenLaunchTool(this.wallet);
    this.polymarket = new PolymarketTool();
    this.bags = new BagsTool(this.wallet);
    this.kalshi = new KalshiTool();
    this.tokenCounter = createTokenCounter(modelToUse);

    // Initialize MCP servers if configured
    this.initializeMCP();

    // Load custom instructions
    const customInstructions = loadCustomInstructions();
    const customInstructionsSection = customInstructions
      ? `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n\nThe above custom instructions should be followed alongside the standard instructions below.`
      : "";

    // Initialize with system message
    this.messages.push({
      role: "system",
      content: `You are Clawd Code CLI, a lobster-themed AI terminal operator for coding, system operations, and Solana workflows. You run on Grok/xAI models and help with file editing, shell tasks, MCP tools, and Solana blockchain interactions.${customInstructionsSection}

You have access to these tools:
- view_file: View file contents or directory listings
- create_file: Create new files with content (ONLY use this for files that don't exist yet)
- str_replace_editor: Replace text in existing files (ALWAYS use this to edit or update existing files)${
        this.morphEditor
          ? "\n- edit_file: High-speed file editing with Morph Fast Apply (4,500+ tokens/sec with 98% accuracy)"
          : ""
      }
- bash: Execute bash commands (use for searching, file discovery, navigation, and system operations)
- search: Unified search tool for finding text content or files (similar to Cursor's search functionality)
- create_todo_list: Create a visual todo list for planning and tracking tasks
- update_todo_list: Update existing todos in your todo list
- solana_get_asset: Retrieve comprehensive data for Solana NFTs and digital assets using Helius DAS API
- solana_get_price: Get latest token price information using Birdeye API
- solana_get_wallet_balance: Get Solana wallet balance and token account information

BLOCKCHAIN & TRADING TOOLS:
- birdeye_*: Token data via Birdeye (overview, metadata, market-data, trade-data, search, token_list, trending, ohlcv, wallet_portfolio)
- wallet_address / wallet_balance / wallet_sign_and_send: Local signing wallet (requires SOLANA_PRIVATE_KEY env). Always confirm before sending.
- dflow_swap_quote + dflow_build_swap + wallet_sign_and_send: 3-step swap flow across DFlow-aggregated venues
- dflow_tokens / dflow_venues / dflow_priority_fees: DFlow trading metadata
- dflow_prediction_market_init: Init transaction for a prediction market (Kalshi on Solana via DFlow)
- dflow_events / dflow_markets / dflow_orderbook / dflow_trades / dflow_live_data / dflow_series / dflow_search_events / dflow_candlesticks: Prediction-market metadata (Kalshi passthrough)
- pump_launch_token: Launch a pump.fun SPL token with local signing
- pump_trade: Buy/sell pump.fun or Raydium tokens with local signing
- polymarket_*: Polymarket (Polygon) prediction markets — events, markets, orderbook, price, midpoint, spread, trending. Read-only; order placement requires L2 auth (not enabled).
- bags_launch_token / bags_swap / bags_claim_fees / bags_positions: Bags.fm launch + fee-share + swaps (BAGS_API_KEY required)
- kalshi_*: Direct Kalshi trading (KALSHI_KEY_ID + KALSHI_PRIVATE_KEY required). kalshi_place_order requires user confirmation.
- dflow_priority_fees_stream: Live DFlow priority fees over WS

REAL-TIME INFORMATION:
You have access to real-time web search and X (Twitter) data. When users ask for current information, latest news, or recent events, you automatically have access to up-to-date information from the web and social media.

IMPORTANT TOOL USAGE RULES:
- NEVER use create_file on files that already exist - this will overwrite them completely
- ALWAYS use str_replace_editor to modify existing files, even for small changes
- Before editing a file, use view_file to see its current contents
- Use create_file ONLY when creating entirely new files that don't exist

SEARCHING AND EXPLORATION:
- Use search for fast, powerful text search across files or finding files by name (unified search tool)
- Examples: search for text content like "import.*react", search for files like "component.tsx"
- Use bash with commands like 'find', 'grep', 'rg', 'ls' for complex file operations and navigation
- view_file is best for reading specific files you already know exist

When a user asks you to edit, update, modify, or change an existing file:
1. First use view_file to see the current contents
2. Then use str_replace_editor to make the specific changes
3. Never use create_file for existing files

When a user asks you to create a new file that doesn't exist:
1. Use create_file with the full content

TASK PLANNING WITH TODO LISTS:
- For complex requests with multiple steps, ALWAYS create a todo list first to plan your approach
- Use create_todo_list to break down tasks into manageable items with priorities
- Mark tasks as 'in_progress' when you start working on them (only one at a time)
- Mark tasks as 'completed' immediately when finished
- Use update_todo_list to track your progress throughout the task
- Todo lists provide visual feedback with colors: ✅ Green (completed), 🔄 Cyan (in progress), ⏳ Yellow (pending)
- Always create todos with priorities: 'high' (🔴), 'medium' (🟡), 'low' (🟢)

USER CONFIRMATION SYSTEM:
File operations (create_file, str_replace_editor) and bash commands will automatically request user confirmation before execution. The confirmation system will show users the actual content or command before they decide. Users can choose to approve individual operations or approve all operations of that type for the session.

If a user rejects an operation, the tool will return an error and you should not proceed with that specific operation.

Be helpful, direct, and efficient. Always explain what you're doing and show the results.

IMPORTANT RESPONSE GUIDELINES:
- After using tools, do NOT respond with pleasantries like "Thanks for..." or "Great!"
- Only provide necessary explanations or next steps if relevant to the task
- Keep responses concise and focused on the actual work being done
- If a tool execution completes the user's request, you can remain silent or give a brief confirmation

Current working directory: ${process.cwd()}`,
    });
  }

  private async initializeMCP(): Promise<void> {
    // Initialize MCP in the background without blocking
    Promise.resolve().then(async () => {
      try {
        const config = loadMCPConfig();
        if (config.servers.length > 0) {
          await initializeMCPServers();
        }
      } catch (error) {
        console.warn("MCP initialization failed:", error);
      } finally {
        this.mcpInitialized = true;
      }
    });
  }

  private isGrokModel(): boolean {
    const currentModel = this.grokClient.getCurrentModel();
    return currentModel.toLowerCase().includes("grok");
  }

  // Heuristic: enable web search only when likely needed
  private shouldUseSearchFor(message: string): boolean {
    const q = message.toLowerCase();
    const keywords = [
      "today",
      "latest",
      "news",
      "trending",
      "breaking",
      "current",
      "now",
      "recent",
      "x.com",
      "twitter",
      "tweet",
      "what happened",
      "as of",
      "update on",
      "release notes",
      "changelog",
      "price",
    ];
    if (keywords.some((k) => q.includes(k))) return true;
    // crude date pattern (e.g., 2024/2025) may imply recency
    if (/(20\d{2})/.test(q)) return true;
    return false;
  }

  async processUserMessage(message: string): Promise<ChatEntry[]> {
    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    const newEntries: ChatEntry[] = [userEntry];
    const maxToolRounds = this.maxToolRounds; // Prevent infinite loops
    let toolRounds = 0;

    try {
      const tools = await getAllGrokTools();
      let currentResponse = await this.grokClient.chat(
        this.messages,
        tools,
        undefined,
        this.isGrokModel() && this.shouldUseSearchFor(message)
          ? { search_parameters: { mode: "auto" } }
          : { search_parameters: { mode: "off" } }
      );

      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        const assistantMessage = currentResponse.choices[0]?.message;

        if (!assistantMessage) {
          throw new Error("No response from Grok");
        }

        // Handle tool calls
        if (
          assistantMessage.tool_calls &&
          assistantMessage.tool_calls.length > 0
        ) {
          toolRounds++;

          // Add assistant message with tool calls
          const assistantEntry: ChatEntry = {
            type: "assistant",
            content: assistantMessage.content || "Using tools to help you...",
            timestamp: new Date(),
            toolCalls: assistantMessage.tool_calls,
          };
          this.chatHistory.push(assistantEntry);
          newEntries.push(assistantEntry);

          // Add assistant message to conversation
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: assistantMessage.tool_calls,
          } as any);

          // Create initial tool call entries to show tools are being executed
          assistantMessage.tool_calls.forEach((toolCall) => {
            const toolCallEntry: ChatEntry = {
              type: "tool_call",
              content: "Executing...",
              timestamp: new Date(),
              toolCall: toolCall,
            };
            this.chatHistory.push(toolCallEntry);
            newEntries.push(toolCallEntry);
          });

          // Execute tool calls and update the entries
          for (const toolCall of assistantMessage.tool_calls) {
            const result = await this.executeTool(toolCall);

            // Update the existing tool_call entry with the result
            const entryIndex = this.chatHistory.findIndex(
              (entry) =>
                entry.type === "tool_call" && entry.toolCall?.id === toolCall.id
            );

            if (entryIndex !== -1) {
              const updatedEntry: ChatEntry = {
                ...this.chatHistory[entryIndex],
                type: "tool_result",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error occurred",
                toolResult: result,
              };
              this.chatHistory[entryIndex] = updatedEntry;

              // Also update in newEntries for return value
              const newEntryIndex = newEntries.findIndex(
                (entry) =>
                  entry.type === "tool_call" &&
                  entry.toolCall?.id === toolCall.id
              );
              if (newEntryIndex !== -1) {
                newEntries[newEntryIndex] = updatedEntry;
              }
            }

            // Add tool result to messages with proper format (needed for AI context)
            this.messages.push({
              role: "tool",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error",
              tool_call_id: toolCall.id,
            });
          }

          // Get next response - this might contain more tool calls
          currentResponse = await this.grokClient.chat(
            this.messages,
            tools,
            undefined,
            this.isGrokModel() && this.shouldUseSearchFor(message)
              ? { search_parameters: { mode: "auto" } }
              : { search_parameters: { mode: "off" } }
          );
        } else {
          // No more tool calls, add final response
          const finalEntry: ChatEntry = {
            type: "assistant",
            content:
              assistantMessage.content ||
              "I understand, but I don't have a specific response.",
            timestamp: new Date(),
          };
          this.chatHistory.push(finalEntry);
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "",
          });
          newEntries.push(finalEntry);
          break; // Exit the loop
        }
      }

      if (toolRounds >= maxToolRounds) {
        const warningEntry: ChatEntry = {
          type: "assistant",
          content:
            "Maximum tool execution rounds reached. Stopping to prevent infinite loops.",
          timestamp: new Date(),
        };
        this.chatHistory.push(warningEntry);
        newEntries.push(warningEntry);
      }

      return newEntries;
    } catch (error: any) {
      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      return [userEntry, errorEntry];
    }
  }

  private messageReducer(previous: any, item: any): any {
    const reduce = (acc: any, delta: any) => {
      acc = { ...acc };
      for (const [key, value] of Object.entries(delta)) {
        if (acc[key] === undefined || acc[key] === null) {
          acc[key] = value;
          // Clean up index properties from tool calls
          if (Array.isArray(acc[key])) {
            for (const arr of acc[key]) {
              delete arr.index;
            }
          }
        } else if (typeof acc[key] === "string" && typeof value === "string") {
          (acc[key] as string) += value;
        } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
          const accArray = acc[key] as any[];
          for (let i = 0; i < value.length; i++) {
            if (!accArray[i]) accArray[i] = {};
            accArray[i] = reduce(accArray[i], value[i]);
          }
        } else if (typeof acc[key] === "object" && typeof value === "object") {
          acc[key] = reduce(acc[key], value);
        }
      }
      return acc;
    };

    return reduce(previous, item.choices[0]?.delta || {});
  }

  async *processUserMessageStream(
    message: string
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    // Create new abort controller for this request
    this.abortController = new AbortController();

    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    // Calculate input tokens
    let inputTokens = this.tokenCounter.countMessageTokens(
      this.messages as any
    );
    yield {
      type: "token_count",
      tokenCount: inputTokens,
    };

    const maxToolRounds = this.maxToolRounds; // Prevent infinite loops
    let toolRounds = 0;
    let totalOutputTokens = 0;
    let lastTokenUpdate = 0;

    try {
      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        // Check if operation was cancelled
        if (this.abortController?.signal.aborted) {
          yield {
            type: "content",
            content: "\n\n[Operation cancelled by user]",
          };
          yield { type: "done" };
          return;
        }

        // Stream response and accumulate
        const tools = await getAllGrokTools();
        const stream = this.grokClient.chatStream(
          this.messages,
          tools,
          undefined,
          this.isGrokModel() && this.shouldUseSearchFor(message)
            ? { search_parameters: { mode: "auto" } }
            : { search_parameters: { mode: "off" } }
        );
        let accumulatedMessage: any = {};
        let accumulatedContent = "";
        let toolCallsYielded = false;

        for await (const chunk of stream) {
          // Check for cancellation in the streaming loop
          if (this.abortController?.signal.aborted) {
            yield {
              type: "content",
              content: "\n\n[Operation cancelled by user]",
            };
            yield { type: "done" };
            return;
          }

          if (!chunk.choices?.[0]) continue;

          // Accumulate the message using reducer
          accumulatedMessage = this.messageReducer(accumulatedMessage, chunk);

          // Check for tool calls - yield when we have complete tool calls with function names
          if (!toolCallsYielded && accumulatedMessage.tool_calls?.length > 0) {
            // Check if we have at least one complete tool call with a function name
            const hasCompleteTool = accumulatedMessage.tool_calls.some(
              (tc: any) => tc.function?.name
            );
            if (hasCompleteTool) {
              yield {
                type: "tool_calls",
                toolCalls: accumulatedMessage.tool_calls,
              };
              toolCallsYielded = true;
            }
          }

          // Stream content as it comes
          if (chunk.choices[0].delta?.content) {
            accumulatedContent += chunk.choices[0].delta.content;

            // Update token count in real-time including accumulated content and any tool calls
            const currentOutputTokens =
              this.tokenCounter.estimateStreamingTokens(accumulatedContent) +
              (accumulatedMessage.tool_calls
                ? this.tokenCounter.countTokens(
                    JSON.stringify(accumulatedMessage.tool_calls)
                  )
                : 0);
            totalOutputTokens = currentOutputTokens;

            yield {
              type: "content",
              content: chunk.choices[0].delta.content,
            };

            // Emit token count update
            const now = Date.now();
            if (now - lastTokenUpdate > 250) {
              lastTokenUpdate = now;
              yield {
                type: "token_count",
                tokenCount: inputTokens + totalOutputTokens,
              };
            }
        }
      }

        // Add assistant entry to history
        const assistantEntry: ChatEntry = {
          type: "assistant",
          content: accumulatedMessage.content || "Using tools to help you...",
          timestamp: new Date(),
          toolCalls: accumulatedMessage.tool_calls || undefined,
        };
        this.chatHistory.push(assistantEntry);

        // Add accumulated message to conversation
        this.messages.push({
          role: "assistant",
          content: accumulatedMessage.content || "",
          tool_calls: accumulatedMessage.tool_calls,
        } as any);

        // Handle tool calls if present
        if (accumulatedMessage.tool_calls?.length > 0) {
          toolRounds++;

          // Only yield tool_calls if we haven't already yielded them during streaming
          if (!toolCallsYielded) {
            yield {
              type: "tool_calls",
              toolCalls: accumulatedMessage.tool_calls,
            };
          }

          // Execute tools
          for (const toolCall of accumulatedMessage.tool_calls) {
            // Check for cancellation before executing each tool
            if (this.abortController?.signal.aborted) {
              yield {
                type: "content",
                content: "\n\n[Operation cancelled by user]",
              };
              yield { type: "done" };
              return;
            }

            const result = await this.executeTool(toolCall);

            const toolResultEntry: ChatEntry = {
              type: "tool_result",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error occurred",
              timestamp: new Date(),
              toolCall: toolCall,
              toolResult: result,
            };
            this.chatHistory.push(toolResultEntry);

            yield {
              type: "tool_result",
              toolCall,
              toolResult: result,
            };

            // Add tool result with proper format (needed for AI context)
            this.messages.push({
              role: "tool",
              content: result.success
                ? result.output || "Success"
                : result.error || "Error",
              tool_call_id: toolCall.id,
            });
          }

          // Update token count after processing all tool calls to include tool results
          inputTokens = this.tokenCounter.countMessageTokens(
            this.messages as any
          );
          // Final token update after tools processed
          yield {
            type: "token_count",
            tokenCount: inputTokens + totalOutputTokens,
          };

          // Continue the loop to get the next response (which might have more tool calls)
        } else {
          // No tool calls, we're done
          break;
        }
      }

      if (toolRounds >= maxToolRounds) {
        yield {
          type: "content",
          content:
            "\n\nMaximum tool execution rounds reached. Stopping to prevent infinite loops.",
        };
      }

      yield { type: "done" };
    } catch (error: any) {
      // Check if this was a cancellation
      if (this.abortController?.signal.aborted) {
        yield {
          type: "content",
          content: "\n\n[Operation cancelled by user]",
        };
        yield { type: "done" };
        return;
      }

      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      yield {
        type: "content",
        content: errorEntry.content,
      };
      yield { type: "done" };
    } finally {
      // Clean up abort controller
      this.abortController = null;
    }
  }

  private async executeTool(toolCall: GrokToolCall): Promise<ToolResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments);

      switch (toolCall.function.name) {
        case "view_file": {
          const range: [number, number] | undefined =
            args.start_line && args.end_line
              ? [args.start_line, args.end_line]
              : undefined;
          return await this.textEditor.view(args.path, range);
        }

        case "create_file":
          return await this.textEditor.create(args.path, args.content);

        case "str_replace_editor":
          return await this.textEditor.strReplace(
            args.path,
            args.old_str,
            args.new_str,
            args.replace_all
          );

        case "edit_file":
          if (!this.morphEditor) {
            return {
              success: false,
              error:
                "Morph Fast Apply not available. Please set MORPH_API_KEY environment variable to use this feature.",
            };
          }
          return await this.morphEditor.editFile(
            args.target_file,
            args.instructions,
            args.code_edit
          );

        case "bash":
          return await this.bash.execute(args.command);

        case "create_todo_list":
          return await this.todoTool.createTodoList(args.todos);

        case "update_todo_list":
          return await this.todoTool.updateTodoList(args.updates);

        case "search":
          return await this.search.search(args.query, {
            searchType: args.search_type,
            includePattern: args.include_pattern,
            excludePattern: args.exclude_pattern,
            caseSensitive: args.case_sensitive,
            wholeWord: args.whole_word,
            regex: args.regex,
            maxResults: args.max_results,
            fileTypes: args.file_types,
            includeHidden: args.include_hidden,
          });

        case "solana_get_asset":
          return await this.solana.getAsset(args.asset_id);

        case "solana_get_price":
          return await this.solana.getPrice(args.token_address);

        case "solana_get_wallet_balance":
          return await this.solana.getWalletBalance(args.wallet_address);

        // --- Birdeye ---
        case "birdeye_token_overview":
          return await this.solana.getTokenOverview(args.address, args.frames);
        case "birdeye_token_metadata":
          return await this.solana.getTokenMetadata(args.address, args.chain);
        case "birdeye_token_metadata_multi":
          return await this.solana.getTokenMetadataMulti(args.addresses, args.chain);
        case "birdeye_token_market_data":
          return await this.solana.getTokenMarketData(args.address, args.chain);
        case "birdeye_token_market_data_multi":
          return await this.solana.getTokenMarketDataMulti(args.addresses, args.chain);
        case "birdeye_token_trade_data":
          return await this.solana.getTokenTradeData(args.address, args.frames, args.chain);
        case "birdeye_token_trade_data_multi":
          return await this.solana.getTokenTradeDataMulti(args.addresses, args.frames, args.chain);
        case "birdeye_search_token":
          return await this.solana.searchToken(args.keyword, args.chain, args.limit);
        case "birdeye_token_list":
          return await this.solana.getTokenList(args.sort_by, args.sort_type, args.offset, args.limit, args.chain);
        case "birdeye_trending":
          return await this.solana.getTrending("rank", "asc", 0, args.limit, args.chain);
        case "birdeye_ohlcv":
          return await this.solana.getOhlcv(args.address, args.type, args.time_from, args.time_to, args.chain);
        case "birdeye_wallet_portfolio":
          return await this.solana.getWalletPortfolio(args.wallet, args.chain);

        // --- Wallet ---
        case "wallet_address":
          return this.wallet.getPublicKey();
        case "wallet_balance":
          return await this.wallet.getBalance();
        case "wallet_sign_and_send": {
          const approved = await this.confirmationTool.requestConfirmation({
            operation: "sign_and_send_transaction",
            filename: "Solana transaction",
            description: `Broadcast tx (length ${args.base64_tx?.length || 0})`,
            showVSCodeOpen: false,
          });
          if (!approved.success) return approved;
          return await this.wallet.signAndSend(args.base64_tx);
        }

        // --- DFlow Trading ---
        case "dflow_tokens":
          return args.with_decimals ? await this.dflow.getTokensWithDecimals() : await this.dflow.getTokens();
        case "dflow_venues":
          return await this.dflow.getVenues();
        case "dflow_priority_fees":
          return await this.dflow.getPriorityFees();
        case "dflow_swap_quote":
          return await this.dflow.getSwapQuote({
            userPublicKey: args.user_public_key,
            inputMint: args.input_mint,
            outputMint: args.output_mint,
            amount: args.amount,
            slippageBps: args.slippage_bps,
            swapMode: args.swap_mode,
            venues: args.venues,
          });
        case "dflow_build_swap":
          return await this.dflow.buildSwap({
            userPublicKey: args.user_public_key,
            quote: args.quote,
            priorityFeeMicroLamports: args.priority_fee_micro_lamports,
            computeUnitLimit: args.compute_unit_limit,
          });
        case "dflow_order_status":
          return await this.dflow.getOrderStatus(args.order_id);
        case "dflow_prediction_market_init":
          return await this.dflow.getPredictionMarketInit(args.payer, args.outcome_mint);

        // --- DFlow Metadata ---
        case "dflow_events":
          return await this.dflow.getEvents(args.params || {});
        case "dflow_event":
          return await this.dflow.getEvent(args.event_ticker);
        case "dflow_markets":
          return await this.dflow.getMarkets(args.params || {});
        case "dflow_market":
          return await this.dflow.getMarket(args.ticker);
        case "dflow_orderbook":
          return await this.dflow.getOrderbook(args.market_ticker);
        case "dflow_orderbook_by_mint":
          return await this.dflow.getOrderbookByMint(args.mint_address);
        case "dflow_trades":
          return await this.dflow.getTrades(args.params || {});
        case "dflow_trades_by_mint":
          return await this.dflow.getTradesByMint(args.mint_address, args.params || {});
        case "dflow_onchain_trades":
          return await this.dflow.getOnchainTrades(args.params || {});
        case "dflow_live_data":
          return await this.dflow.getLiveData(args.milestone_ids || []);
        case "dflow_live_data_by_event":
          return await this.dflow.getLiveDataByEvent(args.event_ticker, args.params || {});
        case "dflow_series":
          return await this.dflow.getSeries(args.params || {});
        case "dflow_tags_by_categories":
          return await this.dflow.getTagsByCategories();
        case "dflow_filters_by_sports":
          return await this.dflow.getFiltersBySports();
        case "dflow_search_events":
          return await this.dflow.searchEvents(args.query, args.params || {});
        case "dflow_candlesticks":
          return await this.dflow.getCandlesticks(args.market_ticker, args.params || {});

        // --- Token launch / trade ---
        case "pump_launch_token":
          return await this.launcher.launchPumpToken({
            name: args.name,
            symbol: args.symbol,
            description: args.description,
            imageUrl: args.image_url,
            twitter: args.twitter,
            telegram: args.telegram,
            website: args.website,
            initialBuySol: args.initial_buy_sol,
            slippageBps: args.slippage_bps,
            priorityFeeSol: args.priority_fee_sol,
          });
        case "pump_trade":
          return await this.launcher.pumpTrade({
            mint: args.mint,
            action: args.action,
            amount: args.amount,
            denominatedInSol: args.denominated_in_sol,
            slippageBps: args.slippage_bps,
            priorityFeeSol: args.priority_fee_sol,
            pool: args.pool,
          });

        // --- DFlow priority fees WS ---
        case "dflow_priority_fees_stream":
          return await this.dflow.streamPriorityFees(args.samples ?? 1, args.timeout_ms ?? 10000);

        // --- Polymarket ---
        case "polymarket_events":
          return await this.polymarket.getEvents(args.params || {});
        case "polymarket_event":
          return await this.polymarket.getEvent(args.id);
        case "polymarket_markets":
          return await this.polymarket.getMarkets(args.params || {});
        case "polymarket_market":
          return await this.polymarket.getMarket(args.id);
        case "polymarket_search":
          return await this.polymarket.searchEvents(args.query, args.limit);
        case "polymarket_trending":
          return await this.polymarket.getTrending(args.limit);
        case "polymarket_tags":
          return await this.polymarket.getTags();
        case "polymarket_book":
          return await this.polymarket.getBook(args.token_id);
        case "polymarket_price":
          return await this.polymarket.getPrice(args.token_id, args.side);
        case "polymarket_midpoint":
          return await this.polymarket.getMidpoint(args.token_id);
        case "polymarket_spread":
          return await this.polymarket.getSpread(args.token_id);
        case "polymarket_trades":
          return await this.polymarket.getTrades(args.market, args.limit);
        case "polymarket_last_trade_price":
          return await this.polymarket.getLastTradePrice(args.token_id);
        case "polymarket_clob_markets":
          return await this.polymarket.getClobMarkets(args.params || {});
        case "polymarket_clob_market":
          return await this.polymarket.getClobMarket(args.condition_id);

        // --- Bags.fm ---
        case "bags_launch_token":
          return await this.bags.launchToken({
            name: args.name, symbol: args.symbol, description: args.description,
            imageUrl: args.image_url, twitter: args.twitter, website: args.website, telegram: args.telegram,
            initialBuySol: args.initial_buy_sol, feeRecipients: args.fee_recipients,
          });
        case "bags_claim_fees":
          return await this.bags.claimFees(args.position_key);
        case "bags_swap":
          return await this.bags.swap({
            inputMint: args.input_mint, outputMint: args.output_mint,
            amount: args.amount, slippageBps: args.slippage_bps,
          });
        case "bags_positions":
          return await this.bags.listPositions();

        // --- Kalshi direct ---
        case "kalshi_balance":
          return await this.kalshi.getBalance();
        case "kalshi_positions":
          return await this.kalshi.getPositions(args.params || {});
        case "kalshi_orders":
          return await this.kalshi.getOrders(args.params || {});
        case "kalshi_fills":
          return await this.kalshi.getFills(args.params || {});
        case "kalshi_markets":
          return await this.kalshi.getMarkets(args.params || {});
        case "kalshi_market":
          return await this.kalshi.getMarket(args.ticker);
        case "kalshi_orderbook":
          return await this.kalshi.getMarketOrderbook(args.ticker, args.depth);
        case "kalshi_place_order": {
          const approved = await this.confirmationTool.requestConfirmation({
            operation: "kalshi_place_order",
            filename: `${args.ticker} ${args.side} ${args.action} ${args.count}`,
            description: `type=${args.type} yes=${args.yes_price ?? "-"} no=${args.no_price ?? "-"}`,
          });
          if (!approved.success) return approved;
          return await this.kalshi.placeOrder({
            ticker: args.ticker, side: args.side, action: args.action,
            count: args.count, type: args.type,
            yes_price: args.yes_price, no_price: args.no_price,
            time_in_force: args.time_in_force, client_order_id: args.client_order_id,
          });
        }
        case "kalshi_cancel_order":
          return await this.kalshi.cancelOrder(args.order_id);

        default:
          // Check if this is an MCP tool
          if (toolCall.function.name.startsWith("mcp__")) {
            return await this.executeMCPTool(toolCall);
          }

          return {
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Tool execution error: ${error.message}`,
      };
    }
  }

  private async executeMCPTool(toolCall: GrokToolCall): Promise<ToolResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const mcpManager = getMCPManager();

      const result = await mcpManager.callTool(toolCall.function.name, args);

      if (result.isError) {
        return {
          success: false,
          error: (result.content[0] as any)?.text || "MCP tool error",
        };
      }

      // Extract content from result
      const output = result.content
        .map((item) => {
          if (item.type === "text") {
            return item.text;
          } else if (item.type === "resource") {
            return `Resource: ${item.resource?.uri || "Unknown"}`;
          }
          return String(item);
        })
        .join("\n");

      return {
        success: true,
        output: output || "Success",
      };
    } catch (error: any) {
      return {
        success: false,
        error: `MCP tool execution error: ${error.message}`,
      };
    }
  }

  getChatHistory(): ChatEntry[] {
    return [...this.chatHistory];
  }

  getCurrentDirectory(): string {
    return this.bash.getCurrentDirectory();
  }

  async executeBashCommand(command: string): Promise<ToolResult> {
    return await this.bash.execute(command);
  }

  getCurrentModel(): string {
    return this.grokClient.getCurrentModel();
  }

  setModel(model: string): void {
    // Re-route to the correct provider (apiKey + baseURL) for this model.
    const manager = getSettingsManager();
    const cfg = manager.getProviderConfigForModel(model);
    this.grokClient.setProvider(cfg.apiKey, cfg.baseURL);
    this.grokClient.setModel(model);
    // Update token counter for new model
    this.tokenCounter.dispose();
    this.tokenCounter = createTokenCounter(model);
  }

  abortCurrentOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
