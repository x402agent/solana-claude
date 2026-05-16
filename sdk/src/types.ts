/**
 * sdk/src/types.ts — Public-facing types for @solanaclawd/sdk
 */

// ─── Agent ────────────────────────────────────────────────────────────────────

export type SolanaCluster = 'devnet' | 'mainnet-beta' | 'testnet';
export type DepthTier = 'deep' | 'shallow' | 'shoreline' | 'beached';

export interface AgentConfig {
  /** Anthropic API key. Falls back to ANTHROPIC_API_KEY env var. */
  anthropicApiKey?: string;
  /** Helius RPC API key. Falls back to HELIUS_API_KEY env var. */
  heliusApiKey?: string;
  /** Solana cluster to connect to. Default: 'devnet'. */
  cluster?: SolanaCluster;
  /** If true, all trades are simulated and never broadcast. Default: true. */
  paperOnly?: boolean;
  /** If true, mainnet operations are blocked. Default: true. */
  devnetOnly?: boolean;
  /** Founding mission for the agent. */
  spawnPrompt?: string;
  /** Unique session identifier for install/telemetry tracking. */
  sessionId?: string;
  /** Path to the encrypted keystore. Default: ~/.openclawd/keystore.json */
  keystorePath?: string;
}

export interface AgentTick {
  tick: number;
  depth: DepthTier;
  usdcBalance: number;
  action: string;
  tool?: string;
  success: boolean;
  output?: unknown;
  timestamp: string;
}

export interface AgentState {
  sessionId: string;
  depth: DepthTier;
  usdcBalance: number;
  solBalance: number;
  clawdBalance: number;
  tickCount: number;
  openTrades: number;
  pubkey: string;
  cluster: SolanaCluster;
  paperOnly: boolean;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletConfig {
  /** Path to encrypted keystore. Default: ~/.openclawd/keystore.json */
  keystorePath?: string;
  /** Solana cluster. Default: 'devnet'. */
  cluster?: SolanaCluster;
  /** AES-256-GCM passphrase. Falls back to VAULT_PASSPHRASE env var. */
  passphrase?: string;
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolExecutionContext {
  depth: DepthTier;
  paperOnly: boolean;
  devnetOnly: boolean;
  cluster: SolanaCluster;
  walletPubkey?: string;
}

// ─── MCP ─────────────────────────────────────────────────────────────────────

export interface MCPClientConfig {
  serverUrl: string;
  apiKey?: string;
  sessionId?: string;
  timeoutMs?: number;
}

export interface MCPToolResult {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
  costUsdc?: number;
  latencyMs: number;
}
