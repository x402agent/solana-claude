// ═══════════════════════════════════════════════════════════════
// AGENT RUNTIME SERVICE
// Execute AI agents with tool calling, streaming, and on-chain actions
// Similar to Phala's Confidential AI but on Cloudflare Workers
// ═══════════════════════════════════════════════════════════════

import type { Env } from '../index';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' } | {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict?: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AgentExecutionContext {
  agentId: string;
  deploymentId: string;
  walletAddress?: string;
  chain: 'solana' | 'solana-devnet';
  configuration: {
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
  };
  capabilities: string[];
}

export interface ExecutionResult {
  success: boolean;
  response?: string;
  toolCalls?: ToolCall[];
  error?: string;
  tokensUsed?: number;
  executionTimeMs?: number;
}

// ─────────────────────────────────────────────────
// MODEL PROVIDERS
// ─────────────────────────────────────────────────

type ModelProvider = 'openai' | 'anthropic' | 'phala' | 'deepseek';

interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  baseUrl: string;
  maxContextTokens: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // OpenAI Models
  'gpt-4': {
    provider: 'openai',
    modelId: 'gpt-4',
    baseUrl: 'https://api.openai.com/v1',
    maxContextTokens: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  'gpt-4-turbo': {
    provider: 'openai',
    modelId: 'gpt-4-turbo-preview',
    baseUrl: 'https://api.openai.com/v1',
    maxContextTokens: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    maxContextTokens: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1',
    maxContextTokens: 16385,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  // Anthropic Models
  'claude-3-opus': {
    provider: 'anthropic',
    modelId: 'claude-3-opus-20240229',
    baseUrl: 'https://api.anthropic.com/v1',
    maxContextTokens: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-3-sonnet': {
    provider: 'anthropic',
    modelId: 'claude-3-sonnet-20240229',
    baseUrl: 'https://api.anthropic.com/v1',
    maxContextTokens: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-3.5-sonnet': {
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1',
    maxContextTokens: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  // Phala Confidential AI Models
  'phala-deepseek-v3': {
    provider: 'phala',
    modelId: 'phala/deepseek-chat-v3-0324',
    baseUrl: 'https://api.redpill.ai/v1',
    maxContextTokens: 163000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  'phala-qwen-72b': {
    provider: 'phala',
    modelId: 'qwen/qwen2.5-vl-72b-instruct',
    baseUrl: 'https://api.redpill.ai/v1',
    maxContextTokens: 65000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'phala-gemma-27b': {
    provider: 'phala',
    modelId: 'google/gemma-3-27b-it',
    baseUrl: 'https://api.redpill.ai/v1',
    maxContextTokens: 53000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  // DeepSeek Models
  'deepseek-chat': {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    maxContextTokens: 128000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  'deepseek-coder': {
    provider: 'deepseek',
    modelId: 'deepseek-coder',
    baseUrl: 'https://api.deepseek.com/v1',
    maxContextTokens: 128000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
};

// ─────────────────────────────────────────────────
// SOLANA TOOL DEFINITIONS
// ─────────────────────────────────────────────────

export const SOLANA_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_wallet_balance',
      description: 'Get the SOL balance of a wallet address',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The Solana wallet address to check',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_token_balance',
      description: 'Get the balance of a specific SPL token for a wallet',
      parameters: {
        type: 'object',
        properties: {
          walletAddress: {
            type: 'string',
            description: 'The wallet address to check',
          },
          tokenMint: {
            type: 'string',
            description: 'The token mint address',
          },
        },
        required: ['walletAddress', 'tokenMint'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_sol',
      description: 'Transfer SOL from the agent wallet to another address',
      parameters: {
        type: 'object',
        properties: {
          toAddress: {
            type: 'string',
            description: 'The recipient wallet address',
          },
          amount: {
            type: 'string',
            description: 'Amount of SOL to transfer',
          },
        },
        required: ['toAddress', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_token',
      description: 'Transfer SPL tokens from the agent wallet to another address',
      parameters: {
        type: 'object',
        properties: {
          toAddress: {
            type: 'string',
            description: 'The recipient wallet address',
          },
          tokenMint: {
            type: 'string',
            description: 'The token mint address',
          },
          amount: {
            type: 'string',
            description: 'Amount of tokens to transfer',
          },
        },
        required: ['toAddress', 'tokenMint', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'swap_tokens',
      description: 'Swap tokens using Jupiter aggregator',
      parameters: {
        type: 'object',
        properties: {
          inputMint: {
            type: 'string',
            description: 'The input token mint address (use "So11111111111111111111111111111111111111112" for SOL)',
          },
          outputMint: {
            type: 'string',
            description: 'The output token mint address',
          },
          amount: {
            type: 'string',
            description: 'Amount of input tokens to swap',
          },
          slippageBps: {
            type: 'string',
            description: 'Slippage tolerance in basis points (e.g., "50" for 0.5%)',
          },
        },
        required: ['inputMint', 'outputMint', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_token_price',
      description: 'Get the current price of a token in USD',
      parameters: {
        type: 'object',
        properties: {
          tokenMint: {
            type: 'string',
            description: 'The token mint address',
          },
        },
        required: ['tokenMint'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_swap_quote',
      description: 'Get a quote for swapping tokens without executing',
      parameters: {
        type: 'object',
        properties: {
          inputMint: {
            type: 'string',
            description: 'The input token mint address',
          },
          outputMint: {
            type: 'string',
            description: 'The output token mint address',
          },
          amount: {
            type: 'string',
            description: 'Amount of input tokens',
          },
        },
        required: ['inputMint', 'outputMint', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stake_sol',
      description: 'Stake SOL to a validator',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'string',
            description: 'Amount of SOL to stake',
          },
          validatorAddress: {
            type: 'string',
            description: 'The validator vote account address (optional, uses recommended if not provided)',
          },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction_history',
      description: 'Get recent transaction history for the wallet',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Maximum number of transactions to return (default: 10)',
          },
        },
      },
    },
  },
];

// ─────────────────────────────────────────────────
// RUNTIME SERVICE
// ─────────────────────────────────────────────────

export class AgentRuntimeService {
  private env: Env;
  private db: D1Database;

  constructor(env: Env, db: D1Database) {
    this.env = env;
    this.db = db;
  }

  // ─────────────────────────────────────────────────
  // CHAT COMPLETION
  // ─────────────────────────────────────────────────

  async chat(
    context: AgentExecutionContext,
    messages: ChatMessage[],
    options?: {
      tools?: boolean;
      stream?: boolean;
      responseFormat?: ChatCompletionRequest['response_format'];
    }
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const modelConfig = MODEL_CONFIGS[context.configuration.model];
      if (!modelConfig) {
        return {
          success: false,
          error: `Unknown model: ${context.configuration.model}`,
        };
      }

      // Build system message
      const systemMessage: ChatMessage = {
        role: 'system',
        content: this.buildSystemPrompt(context),
      };

      // Prepare messages with system prompt
      const fullMessages = [systemMessage, ...messages];

      // Get available tools based on capabilities
      const tools = options?.tools !== false
        ? this.getToolsForCapabilities(context.capabilities)
        : undefined;

      // Make API call based on provider
      const response = await this.callModelAPI(
        modelConfig,
        fullMessages,
        context.configuration,
        tools,
        options
      );

      const executionTimeMs = Date.now() - startTime;

      // Log execution
      await this.logExecution(context, 'chat', messages, response, executionTimeMs);

      return {
        success: true,
        response: response.choices[0]?.message?.content || undefined,
        toolCalls: response.choices[0]?.message?.tool_calls,
        tokensUsed: response.usage?.total_tokens,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logExecution(context, 'chat', messages, null, executionTimeMs, errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTimeMs,
      };
    }
  }

  // ─────────────────────────────────────────────────
  // TOOL EXECUTION
  // ─────────────────────────────────────────────────

  async executeTool(
    context: AgentExecutionContext,
    toolCall: ToolCall
  ): Promise<{ result: string; error?: string }> {
    const { name, arguments: argsString } = toolCall.function;

    try {
      const args = JSON.parse(argsString);

      switch (name) {
        case 'get_wallet_balance':
          return await this.toolGetWalletBalance(context, args);
        case 'get_token_balance':
          return await this.toolGetTokenBalance(context, args);
        case 'transfer_sol':
          return await this.toolTransferSol(context, args);
        case 'transfer_token':
          return await this.toolTransferToken(context, args);
        case 'swap_tokens':
          return await this.toolSwapTokens(context, args);
        case 'get_token_price':
          return await this.toolGetTokenPrice(args);
        case 'get_swap_quote':
          return await this.toolGetSwapQuote(args);
        case 'stake_sol':
          return await this.toolStakeSol(context, args);
        case 'get_transaction_history':
          return await this.toolGetTransactionHistory(context, args);
        default:
          return { result: '', error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      return {
        result: '',
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  // ─────────────────────────────────────────────────
  // TOOL IMPLEMENTATIONS
  // ─────────────────────────────────────────────────

  private async toolGetWalletBalance(
    context: AgentExecutionContext,
    args: { address: string }
  ): Promise<{ result: string }> {
    const rpcUrl = this.getRpcUrl(context.chain);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [args.address],
      }),
    });

    const data = await response.json() as { result?: { value: number }; error?: { message: string } };
    if (data.error) {
      return { result: `Error: ${data.error.message}` };
    }

    const lamports = data.result?.value || 0;
    const sol = lamports / 1e9;
    return { result: JSON.stringify({ address: args.address, balance: sol, unit: 'SOL' }) };
  }

  private async toolGetTokenBalance(
    context: AgentExecutionContext,
    args: { walletAddress: string; tokenMint: string }
  ): Promise<{ result: string }> {
    const rpcUrl = this.getRpcUrl(context.chain);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          args.walletAddress,
          { mint: args.tokenMint },
          { encoding: 'jsonParsed' },
        ],
      }),
    });

    const data = await response.json() as { result?: { value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }> } };
    const accounts = data.result?.value || [];

    if (accounts.length === 0) {
      return { result: JSON.stringify({ balance: 0, tokenMint: args.tokenMint }) };
    }

    const balance = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    return { result: JSON.stringify({ balance, tokenMint: args.tokenMint }) };
  }

  private async toolTransferSol(
    context: AgentExecutionContext,
    args: { toAddress: string; amount: string }
  ): Promise<{ result: string }> {
    if (!context.walletAddress) {
      return { result: 'Error: Agent wallet not configured' };
    }

    // This would call Crossmint to create and sign the transaction
    // For now, return a placeholder
    return {
      result: JSON.stringify({
        status: 'pending',
        action: 'transfer_sol',
        from: context.walletAddress,
        to: args.toAddress,
        amount: args.amount,
        message: 'Transaction requires delegated signer approval',
      }),
    };
  }

  private async toolTransferToken(
    context: AgentExecutionContext,
    args: { toAddress: string; tokenMint: string; amount: string }
  ): Promise<{ result: string }> {
    if (!context.walletAddress) {
      return { result: 'Error: Agent wallet not configured' };
    }

    return {
      result: JSON.stringify({
        status: 'pending',
        action: 'transfer_token',
        from: context.walletAddress,
        to: args.toAddress,
        tokenMint: args.tokenMint,
        amount: args.amount,
        message: 'Transaction requires delegated signer approval',
      }),
    };
  }

  private async toolSwapTokens(
    context: AgentExecutionContext,
    args: { inputMint: string; outputMint: string; amount: string; slippageBps?: string }
  ): Promise<{ result: string }> {
    if (!context.walletAddress) {
      return { result: 'Error: Agent wallet not configured' };
    }

    // Get quote from Jupiter
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${args.inputMint}&outputMint=${args.outputMint}&amount=${args.amount}&slippageBps=${args.slippageBps || '50'}`;

    try {
      const quoteResponse = await fetch(quoteUrl);
      const quote = await quoteResponse.json();

      return {
        result: JSON.stringify({
          status: 'quote_ready',
          action: 'swap_tokens',
          inputMint: args.inputMint,
          outputMint: args.outputMint,
          inputAmount: args.amount,
          quote,
          message: 'Swap requires delegated signer approval to execute',
        }),
      };
    } catch (error) {
      return { result: `Error getting swap quote: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async toolGetTokenPrice(
    args: { tokenMint: string }
  ): Promise<{ result: string }> {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${args.tokenMint}`);
      const data = await response.json() as { data?: Record<string, { price: number }> };
      const price = data.data?.[args.tokenMint]?.price;

      return {
        result: JSON.stringify({
          tokenMint: args.tokenMint,
          priceUsd: price || 'unknown',
        }),
      };
    } catch (error) {
      return { result: `Error getting price: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async toolGetSwapQuote(
    args: { inputMint: string; outputMint: string; amount: string }
  ): Promise<{ result: string }> {
    try {
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${args.inputMint}&outputMint=${args.outputMint}&amount=${args.amount}&slippageBps=50`;
      const response = await fetch(quoteUrl);
      const quote = await response.json();

      return { result: JSON.stringify(quote) };
    } catch (error) {
      return { result: `Error getting quote: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async toolStakeSol(
    context: AgentExecutionContext,
    args: { amount: string; validatorAddress?: string }
  ): Promise<{ result: string }> {
    if (!context.walletAddress) {
      return { result: 'Error: Agent wallet not configured' };
    }

    return {
      result: JSON.stringify({
        status: 'pending',
        action: 'stake_sol',
        from: context.walletAddress,
        amount: args.amount,
        validator: args.validatorAddress || 'recommended',
        message: 'Staking requires delegated signer approval',
      }),
    };
  }

  private async toolGetTransactionHistory(
    context: AgentExecutionContext,
    args: { limit?: string }
  ): Promise<{ result: string }> {
    if (!context.walletAddress) {
      return { result: 'Error: Agent wallet not configured' };
    }

    const rpcUrl = this.getRpcUrl(context.chain);
    const limit = parseInt(args.limit || '10', 10);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [context.walletAddress, { limit }],
        }),
      });

      const data = await response.json() as { result?: Array<{ signature: string; slot: number; blockTime: number }> };
      return { result: JSON.stringify(data.result || []) };
    } catch (error) {
      return { result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // ─────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────

  private buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = context.configuration.systemPrompt ||
      'You are an autonomous AI agent with a Solana wallet. You can perform on-chain actions when requested.';

    const capabilityDescriptions: Record<string, string> = {
      transfer: 'You can transfer SOL and tokens to other addresses.',
      swap: 'You can swap tokens using Jupiter aggregator.',
      chat: 'You can have conversations and answer questions.',
      stake: 'You can stake SOL to validators.',
      nft: 'You can interact with NFTs.',
      trade: 'You can analyze markets and execute trades.',
      analyze: 'You can analyze on-chain data and market conditions.',
    };

    const capabilities = context.capabilities
      .map(cap => capabilityDescriptions[cap])
      .filter(Boolean)
      .join(' ');

    return `${basePrompt}

Your wallet address: ${context.walletAddress || 'Not configured'}
Chain: ${context.chain}

Capabilities: ${capabilities}

When using tools, always confirm important actions with the user before executing. For financial transactions, double-check amounts and addresses.`;
  }

  private getToolsForCapabilities(capabilities: string[]): ToolDefinition[] {
    const capabilityToTools: Record<string, string[]> = {
      transfer: ['get_wallet_balance', 'get_token_balance', 'transfer_sol', 'transfer_token'],
      swap: ['swap_tokens', 'get_swap_quote', 'get_token_price'],
      stake: ['stake_sol', 'get_wallet_balance'],
      chat: [],
      analyze: ['get_wallet_balance', 'get_token_balance', 'get_token_price', 'get_transaction_history'],
      trade: ['swap_tokens', 'get_swap_quote', 'get_token_price', 'get_wallet_balance'],
    };

    const toolNames = new Set<string>();
    for (const cap of capabilities) {
      const tools = capabilityToTools[cap] || [];
      tools.forEach(t => toolNames.add(t));
    }

    return SOLANA_TOOLS.filter(t => toolNames.has(t.function.name));
  }

  private async callModelAPI(
    config: ModelConfig,
    messages: ChatMessage[],
    agentConfig: AgentExecutionContext['configuration'],
    tools?: ToolDefinition[],
    options?: {
      stream?: boolean;
      responseFormat?: ChatCompletionRequest['response_format'];
    }
  ): Promise<ChatCompletionResponse> {
    const apiKey = this.getApiKey(config.provider);
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${config.provider}`);
    }

    if (config.provider === 'anthropic') {
      return this.callAnthropicAPI(config, messages, agentConfig, tools, apiKey);
    }

    // OpenAI-compatible API (OpenAI, Phala, DeepSeek)
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
        temperature: agentConfig.temperature,
        max_tokens: agentConfig.maxTokens,
        stream: options?.stream || false,
        response_format: options?.responseFormat,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    return response.json();
  }

  private async callAnthropicAPI(
    config: ModelConfig,
    messages: ChatMessage[],
    agentConfig: AgentExecutionContext['configuration'],
    tools?: ToolDefinition[],
    apiKey?: string
  ): Promise<ChatCompletionResponse> {
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const anthropicTools = tools?.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.modelId,
        max_tokens: agentConfig.maxTokens,
        system: systemMessage?.content || '',
        messages: conversationMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        tools: anthropicTools,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const anthropicResponse = await response.json() as {
      id: string;
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    // Convert back to OpenAI format
    const toolCalls: ToolCall[] = [];
    let textContent = '';

    for (const block of anthropicResponse.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: block.name || '',
            arguments: JSON.stringify(block.input || {}),
          },
        });
      }
    }

    return {
      id: anthropicResponse.id,
      object: 'chat.completion',
      created: Date.now(),
      model: config.modelId,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      }],
      usage: {
        prompt_tokens: anthropicResponse.usage.input_tokens,
        completion_tokens: anthropicResponse.usage.output_tokens,
        total_tokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
      },
    };
  }

  private getApiKey(provider: ModelProvider): string | undefined {
    switch (provider) {
      case 'openai':
        return this.env.OPENAI_API_KEY;
      case 'anthropic':
        return (this.env as Env & { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
      case 'phala':
        return (this.env as Env & { PHALA_API_KEY?: string }).PHALA_API_KEY;
      case 'deepseek':
        return (this.env as Env & { DEEPSEEK_API_KEY?: string }).DEEPSEEK_API_KEY;
      default:
        return undefined;
    }
  }

  private getRpcUrl(chain: 'solana' | 'solana-devnet'): string {
    if (chain === 'solana') {
      return this.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    }
    return 'https://api.devnet.solana.com';
  }

  private async logExecution(
    context: AgentExecutionContext,
    action: string,
    input: unknown,
    output: unknown,
    executionTimeMs: number,
    error?: string
  ): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO agent_execution_logs (
          deployment_id, action, input, output, status, error, tokens_used, execution_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        context.deploymentId,
        action,
        JSON.stringify(input),
        output ? JSON.stringify(output) : null,
        error ? 'error' : 'success',
        error || null,
        (output as ChatCompletionResponse)?.usage?.total_tokens || 0,
        executionTimeMs
      ).run();
    } catch (e) {
      console.error('Failed to log execution:', e);
    }
  }

  // ─────────────────────────────────────────────────
  // AVAILABLE MODELS
  // ─────────────────────────────────────────────────

  getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: string;
    supportsTools: boolean;
    supportsVision: boolean;
    maxTokens: number;
  }> {
    return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      provider: config.provider,
      supportsTools: config.supportsTools,
      supportsVision: config.supportsVision,
      maxTokens: config.maxContextTokens,
    }));
  }
}
