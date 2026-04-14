/**
 * ClawdRouter — Shared types for the Solana-native LLM router
 * Part of the solana-clawd ecosystem
 */

// ── Request Classification ──────────────────────────────────────────

export type RequestTier = 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'REASONING';

export type RoutingProfile = 'eco' | 'auto' | 'premium';

export interface ScoredRequest {
  tier: RequestTier;
  scores: DimensionScores;
  totalScore: number;
  reasoning: string;
}

export interface DimensionScores {
  tokenCount: number;         // 1. Estimated token count
  complexity: number;         // 2. Linguistic complexity
  technicalDepth: number;     // 3. Technical/domain depth
  codeGeneration: number;     // 4. Code generation required
  reasoning: number;          // 5. Logical reasoning needed
  creativity: number;         // 6. Creative writing level
  multiStep: number;          // 7. Multi-step planning
  contextLength: number;      // 8. Context window needs
  toolUse: number;            // 9. Function/tool calling
  vision: number;             // 10. Image understanding
  mathScience: number;        // 11. Math/science computation
  solanaSpecific: number;     // 12. Solana/blockchain domain
  agentAutonomy: number;      // 13. Agent autonomous operation
  structuredOutput: number;   // 14. JSON/structured output
  latencySensitivity: number; // 15. Latency requirements
}

// ── Model Registry ──────────────────────────────────────────────────

export type ModelProvider =
  | 'anthropic'
  | 'clawdrouter'
  | 'openai'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'nvidia'
  | 'moonshot'
  | 'minimax'
  | 'zai';

export type ModelFeature =
  | 'reasoning'
  | 'vision'
  | 'agentic'
  | 'tools'
  | 'solana'
  | 'code';

export interface ModelEntry {
  id: string;                     // e.g. "anthropic/claude-sonnet-4.6"
  provider: ModelProvider;
  name: string;                   // Human-friendly name
  inputPricePerM: number;         // $/1M input tokens
  outputPricePerM: number;        // $/1M output tokens
  contextWindow: number;          // Max context tokens
  features: ModelFeature[];
  tier: 'budget' | 'mid' | 'premium';
  qualityScore: number;           // 0-100 internal quality rating
  speedMs: number;                // Avg first-token latency ms
  enabled: boolean;
  free: boolean;
}

export interface TierMapping {
  eco: string;      // Model ID for eco profile
  auto: string;     // Model ID for auto profile
  premium: string;  // Model ID for premium profile
}

// ── Proxy Server ────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: string };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: TokenUsage;
  x_clawdrouter?: RoutingMeta;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface RoutingMeta {
  requestedModel: string;
  routedModel: string;
  tier: RequestTier;
  profile: RoutingProfile;
  routingTimeMs: number;
  estimatedCost: number;
  savings: number;
}

// ── Wallet & Payments ───────────────────────────────────────────────

export interface ClawdWallet {
  publicKey: string;         // Base58 Solana public key
  secretKey: Uint8Array;     // Ed25519 secret key (64 bytes)
  mnemonic?: string;         // BIP-39 mnemonic if generated
}

export interface PaymentRecord {
  id: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSDC: number;
  txSignature?: string;
  network: 'solana-mainnet' | 'solana-devnet';
}

export interface WalletBalance {
  sol: number;
  usdc: number;
  address: string;
  network: string;
}

// ── x402 Protocol ───────────────────────────────────────────────────

export interface X402PaymentRequired {
  version: '1';
  amount: string;           // USDC amount in smallest unit (6 decimals)
  recipient: string;        // Solana address to pay
  token: string;            // USDC mint address
  network: 'solana-mainnet' | 'solana-devnet';
  description: string;
  nonce: string;
  expires: number;          // Unix timestamp
}

export interface X402PaymentHeader {
  version: '1';
  scheme: 'exact';
  network: 'solana-mainnet' | 'solana-devnet';
  payload: string;          // Base64 encoded signed transaction
  sender: string;           // Payer's Solana address
}

// ── Configuration ───────────────────────────────────────────────────

export interface ClawdRouterConfig {
  port: number;
  profile: RoutingProfile;
  solanaRpcUrl: string;
  network: 'solana-mainnet' | 'solana-devnet';
  maxPerRequest: number;    // Max USDC per request
  maxPerSession: number;    // Max USDC per session
  walletPath: string;       // Path to wallet file
  excludedModels: string[];
  debug: boolean;
  upstreamUrl: string;      // Legacy upstream endpoint

  // ── $CLAWD Token Integration ──────────────────────────────────
  clawdTokenMint: string;           // $CLAWD SPL token mint address
  heliusApiKey: string;             // Helius API key for DAS lookups
  holderThresholds: {
    whale: number;                  // Tokens for WHALE tier
    diamond: number;                // Tokens for DIAMOND tier
    holder: number;                 // Tokens for HOLDER tier
  };

  // ── OpenRouter Integration ────────────────────────────────────
  openRouterApiKey: string;         // OpenRouter API key
  openRouterSiteTitle: string;      // X-OpenRouter-Title / X-Title header
  openRouterSiteUrl: string;       // HTTP-Referer header (your app's URL)
  openRouterCategories: string[];   // X-OpenRouter-Categories header (max 2)
  openRouterEnabled: boolean;      // Route through OpenRouter

  // ── x402 Payment Config ───────────────────────────────────────
  x402PayTo: string;                // Solana address for x402 payments
  x402Price: string;                // Default price per request
  x402Description: string;          // Payment description
}

// ── Usage Stats ─────────────────────────────────────────────────────

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSDC: number;
  totalSavedUSDC: number;
  byModel: Record<string, ModelUsage>;
  byTier: Record<RequestTier, number>;
  sessionStart: number;
}

export interface ModelUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUSDC: number;
}

// ── Slash Commands ──────────────────────────────────────────────────

export interface SlashCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  handler: (args: string[], ctx: CommandContext) => Promise<string>;
}

export interface CommandContext {
  config: ClawdRouterConfig;
  wallet: ClawdWallet | null;
  stats: UsageStats;
  registry: ModelEntry[];
}
