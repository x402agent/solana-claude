/**
 * sdk/src/index.ts — Official Solana Clawd SDK entry point
 *
 * @solanaclawd/sdk — Canonical integration layer for the solana-clawd stack.
 *
 * Ties together:
 *   leviathan     — Autonomous Solana agent runtime (@openclawd/leviathan)
 *   agentwallet   — Encrypted keypair vault (agentwallet-vault)
 *   deep-clawd    — DeepSeek OODA trading loop
 *   MCP           — MCP orchestrator (31 tools)
 *   OpenShell     — NVIDIA OpenShell sandbox
 *   x402          — x402 payment rails
 *
 * Public exports are organised by submodule. All interfaces are exported
 * so consumers have full TypeScript visibility into the SDK API surface.
 *
 * Usage:
 *   import { createClawd, SDK_VERSION } from '@solanaclawd/sdk';
 *   const { agent, wallet, tools } = await createClawd({ cluster: 'devnet' });
 *
 * Submodule imports (for tree-shaking):
 *   import { createAgent }         from '@solanaclawd/sdk/agent';
 *   import { createWallet }        from '@solanaclawd/sdk/wallet';
 *   import { TOOLS, ToolRegistry } from '@solanaclawd/sdk/tools';
 *   import { THREE_LAWS }          from '@solanaclawd/sdk/three-laws';
 *   import { createMCPClient }     from '@solanaclawd/sdk/mcp';
 *   import { createOpenShellRuntime } from '@solanaclawd/sdk/openShell';
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

// ─── SDK version ──────────────────────────────────────────────────────────────

/** Canonical SDK version. Matches package.json "version". */
export const SDK_VERSION = '1.0.0' as const;

// ─── Agent ────────────────────────────────────────────────────────────────────

export {
  createAgent,
  ThreeLawsViolation,
} from './agent.js';

export type {
  AgentConfig,
  AgentHandle,
  TickEvent,
  TickHandler,
} from './agent.js';

// ─── Wallet ───────────────────────────────────────────────────────────────────

export {
  AgentWallet,
  createWallet,
} from './wallet.js';

export type {
  WalletConfig,
  TokenBalance,
  SolanaCluster,
} from './types.js';

// ─── Tools ────────────────────────────────────────────────────────────────────

export {
  TOOLS,
  getToolsForDepth,
  registerTool,
  ToolRegistry,
  ToolNotFoundError,
  ToolDepthError,
} from './tools.js';

export type {
  ToolDefinition,
  ToolExecutionContext,
  DepthTier,
} from './types.js';

export type { ToolExecutor } from './tools.js';

// ─── Three Laws ───────────────────────────────────────────────────────────────

export {
  THREE_LAWS,
  LAW_SUMMARIES,
  constitutionHash,
  assertConstitutionIntact,
  verifyConstitution,
  assertPaperOnly,
  assertDevnetOnly,
} from './three-laws.js';

export { ThreeLawsViolation as ThreeLawsViolationClass } from './three-laws.js';

// ─── MCP ──────────────────────────────────────────────────────────────────────

export {
  createMCPClient,
  MCPError,
} from './mcp.js';

export type {
  MCPClientConfig,
  MCPToolResult,
} from './types.js';

export type {
  MCPClient,
  MCPToolInfo,
} from './mcp.js';

// ─── OpenShell ────────────────────────────────────────────────────────────────

export {
  CredentialProvider,
  createOpenShellRuntime,
} from './openShell.js';

export type {
  CredentialName,
} from './openShell.js';

export type {
  OpenShellConfig,
  OpenShellRuntime,
  OpenShellVaultInterface,
  NemoClientInterface,
} from './openShell.js';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type {
  AgentState,
  AgentTick,
} from './types.js';

// ─── createClawd factory ──────────────────────────────────────────────────────

import { createAgent } from './agent.js';
import { createWallet } from './wallet.js';
import { ToolRegistry } from './tools.js';
import type { AgentHandle } from './agent.js';
import type { AgentWallet } from './wallet.js';
import type { AgentConfig, WalletConfig, SolanaCluster } from './types.js';

/** Combined config for the top-level createClawd() factory. */
export interface ClawdConfig extends AgentConfig {
  /**
   * Wallet-specific overrides. If omitted, wallet uses the same
   * cluster and keystorePath as the agent config.
   */
  wallet?: WalletConfig;
}

/** The three primary handles returned by createClawd(). */
export interface ClawdInstance {
  /** Live agent handle — call tailFlick() to run one OODA tick. */
  agent: AgentHandle;
  /**
   * Wallet adapter — call getBalance() or sign().
   * Resolves async; null until createClawd() promise resolves.
   */
  wallet: AgentWallet | null;
  /**
   * Tool registry for the resolved depth tier.
   * Use registry.execute(name, input) to dispatch tools.
   */
  tools: ToolRegistry;
  /** The SDK version this instance was created with. */
  readonly sdkVersion: typeof SDK_VERSION;
}

/**
 * Top-level factory — creates a fully wired Clawd instance.
 *
 * This is the recommended entrypoint for most SDK consumers.
 * It wires together the agent, wallet, and tool registry with
 * shared config and Three Laws enforcement.
 *
 * @example
 *   import { createClawd } from '@solanaclawd/sdk';
 *
 *   const { agent, wallet, tools } = await createClawd({
 *     anthropicApiKey: process.env.ANTHROPIC_API_KEY,
 *     cluster: 'devnet',
 *     paperOnly: true,
 *   });
 *
 *   const tick = await agent.tailFlick();
 *   console.log('Tick:', tick.depth, tick.action);
 *
 *   if (wallet) {
 *     const { sol, usdc } = await wallet.getBalance();
 *     console.log('Balance:', sol, 'SOL /', usdc, 'USDC');
 *   }
 */
export async function createClawd(config: ClawdConfig = {}): Promise<ClawdInstance> {
  // Create agent handle (Three Laws guards fire here).
  const agent = createAgent(config);

  // Create wallet adapter (async — may fail gracefully if no keystore).
  let wallet: AgentWallet | null = null;
  try {
    wallet = await createWallet({
      cluster: (config.cluster as SolanaCluster | undefined) ?? 'devnet',
      ...config.wallet,
    });
  } catch {
    // Wallet is optional — agent can function without one (e.g., read-only mode).
    wallet = null;
  }

  // Create tool registry scoped to current depth.
  const depth = agent.getDepth();
  const tools = new ToolRegistry({
    depth,
    paperOnly: config.paperOnly ?? true,
    devnetOnly: config.devnetOnly ?? true,
    cluster: (config.cluster as SolanaCluster | undefined) ?? 'devnet',
    walletPubkey: wallet?.pubkey,
  });

  return {
    agent,
    wallet,
    tools,
    sdkVersion: SDK_VERSION,
  };
}
