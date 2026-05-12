/**
 * ClawdRouter — OpenRouter Upstream Integration
 * Proxies LLM requests through OpenRouter (https://openrouter.ai)
 * Combined with local 15-dimension scoring for intelligent model selection
 *
 * Flow: Client → ClawdRouter (score + route) → OpenRouter → Provider → Response
 */

// ── Constants ───────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// ── Types ───────────────────────────────────────────────────────────

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;    // $/token
    completion: string; // $/token
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type: string;
  };
  top_provider?: {
    is_moderated: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export interface OpenRouterChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  [key: string]: unknown;
}

export interface OpenRouterConfig {
  apiKey: string;
  siteTitle?: string;
  siteUrl?: string;
  categories?: string[];
}

// ── Live Model Fetching ─────────────────────────────────────────────

/**
 * Fetch all available models from OpenRouter API
 */
export async function fetchOpenRouterModels(
  apiKey: string,
): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as OpenRouterModelsResponse;
  return data.data ?? [];
}

/**
 * Fetch models with caching (refreshes every 15 minutes)
 */
let modelCache: { models: OpenRouterModel[]; fetchedAt: number } | null = null;
const MODEL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function fetchOpenRouterModelsCached(
  apiKey: string,
): Promise<OpenRouterModel[]> {
  if (modelCache && (Date.now() - modelCache.fetchedAt) < MODEL_CACHE_TTL) {
    return modelCache.models;
  }

  const models = await fetchOpenRouterModels(apiKey);
  modelCache = { models, fetchedAt: Date.now() };
  return models;
}

export function clearModelCache(): void {
  modelCache = null;
}

// ── Chat Completion Proxy ───────────────────────────────────────────

/**
 * Forward a chat completion request to OpenRouter
 * Returns the raw Response for streaming support
 *
 * Attribution headers for OpenRouter App Rankings & Analytics:
 * - HTTP-Referer: Primary identifier (URL of your app)
 * - X-OpenRouter-Title: Display name in rankings (X-Title also supported)
 * - X-OpenRouter-Categories: Comma-separated marketplace categories (max 2 per request)
 *
 * See: https://openrouter.ai/docs/features/app-attribution
 */
export async function proxyToOpenRouter(
  request: OpenRouterChatRequest,
  config: OpenRouterConfig,
): Promise<Response> {
  const { apiKey, siteTitle, siteUrl, categories } = config;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    // OpenRouter attribution headers for app rankings & analytics
    'HTTP-Referer': siteUrl ?? 'https://github.com/x402agent/solana-clawd',
    'X-OpenRouter-Title': siteTitle ?? 'ClawdRouter — Solana Agent LLM Router',
    // X-Title is also supported for backwards compatibility
    'X-Title': siteTitle ?? 'ClawdRouter — Solana Agent LLM Router',
  };

  // Add categories header if provided (max 2 categories per request, merged up to 10 total)
  if (categories && categories.length > 0) {
    headers['X-OpenRouter-Categories'] = categories.slice(0, 2).join(',');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  return response;
}

// ── Model ID Translation ────────────────────────────────────────────

/**
 * Map ClawdRouter model IDs to OpenRouter model IDs
 * Our registry uses provider/model format which mostly matches OpenRouter
 * Some NVIDIA free models need special handling
 */
export function toOpenRouterModelId(clawdModelId: string): string {
  // Most model IDs are already in OpenRouter format (provider/model)
  // Handle special cases for NVIDIA free tier
  const NVIDIA_FREE_MAP: Record<string, string> = {
    'nvidia/gpt-oss-120b': 'nvidia/gpt-oss-120b:free',
    'nvidia/gpt-oss-20b': 'nvidia/gpt-oss-20b:free',
    'nvidia/nemotron-ultra-253b': 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
    'nvidia/nemotron-3-super-120b': 'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-super-49b': 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
    'nvidia/deepseek-v3.2': 'nvidia/deepseek-v3-2:free',
    'nvidia/mistral-large-3-675b': 'nvidia/mistral-large-3-675b:free',
    'nvidia/qwen3-coder-480b': 'nvidia/qwen3-coder-480b:free',
    'nvidia/devstral-2-123b': 'nvidia/devstral-2-123b:free',
    'nvidia/glm-4.7': 'nvidia/glm-4.7:free',
    'nvidia/llama-4-maverick': 'nvidia/llama-4-maverick:free',
    'nvidia/kimi-k2.5': 'moonshotai/kimi-k2.5-instruct',
  };

  // Anthropic models — map to latest OpenRouter IDs
  const ANTHROPIC_MAP: Record<string, string> = {
    'anthropic/claude-sonnet-4.6': 'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4.6': 'anthropic/claude-opus-4',
    'anthropic/claude-haiku-4.5': 'anthropic/claude-haiku-4',
  };

  // xAI/Grok models
  const XAI_MAP: Record<string, string> = {
    'xai/grok-4-fast': 'x-ai/grok-4-fast',
    'xai/grok-4-fast-reasoning': 'x-ai/grok-4-fast',
    'xai/grok-4-1-fast': 'x-ai/grok-4.1-fast',
    'xai/grok-4-1-fast-reasoning': 'x-ai/grok-4.1-fast',
    'xai/grok-4-0709': 'x-ai/grok-4-0709',
    'xai/grok-3-mini': 'x-ai/grok-3-mini',
    'xai/grok-3': 'x-ai/grok-3',
    'xai/grok-2-vision': 'x-ai/grok-2-vision-1212',
  };

  // ZAI / GLM models
  const ZAI_MAP: Record<string, string> = {
    'zai/glm-5': 'z-ai/glm-5',
    'zai/glm-5-turbo': 'z-ai/glm-5-turbo',
  };

  // MiniMax models
  const MINIMAX_MAP: Record<string, string> = {
    'minimax/minimax-m2.7': 'minimax/minimax-m2.7',
    'minimax/minimax-m2.5': 'minimax/minimax-m2.5',
  };

  // Moonshot models
  const MOONSHOT_MAP: Record<string, string> = {
    'moonshot/kimi-k2.5': 'moonshotai/kimi-k2.5-instruct',
  };

  return (
    NVIDIA_FREE_MAP[clawdModelId] ??
    ANTHROPIC_MAP[clawdModelId] ??
    XAI_MAP[clawdModelId] ??
    ZAI_MAP[clawdModelId] ??
    MINIMAX_MAP[clawdModelId] ??
    MOONSHOT_MAP[clawdModelId] ??
    clawdModelId // Pass through as-is for OpenAI, Google, DeepSeek
  );
}

// ── Merge Live Models with Registry ─────────────────────────────────

/**
 * Get enriched model list: local registry + live OpenRouter availability
 */
export async function getEnrichedModelList(
  apiKey: string,
): Promise<{ local: number; live: number; matched: number }> {
  try {
    const liveModels = await fetchOpenRouterModelsCached(apiKey);
    const liveIds = new Set(liveModels.map(m => m.id));

    // Count how many of our registry models are available on OpenRouter
    // Import inline to avoid circular deps
    const { MODEL_REGISTRY } = await import('../models/registry.js');
    let matched = 0;
    for (const model of MODEL_REGISTRY) {
      const orId = toOpenRouterModelId(model.id);
      if (liveIds.has(orId)) matched++;
    }

    return {
      local: MODEL_REGISTRY.length,
      live: liveModels.length,
      matched,
    };
  } catch {
    return { local: 0, live: 0, matched: 0 };
  }
}

// ── Format Model Comparison ─────────────────────────────────────────

export function formatOpenRouterStatus(
  stats: { local: number; live: number; matched: number },
  apiKeySet: boolean,
): string {
  const lines: string[] = [''];
  lines.push('  🔗 OpenRouter Integration');
  lines.push('  ═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  API Key:        ${apiKeySet ? '✓ Configured' : '✗ Not set (set OPENROUTER_API_KEY)'}`);
  lines.push(`  Local registry: ${stats.local} models`);
  lines.push(`  Live models:    ${stats.live} on OpenRouter`);
  lines.push(`  Matched:        ${stats.matched} models available`);
  lines.push('');
  return lines.join('\n');
}
