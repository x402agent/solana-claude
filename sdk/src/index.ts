/**
 * @solanaclawd/sdk — Official Solana Clawd SDK
 *
 * Sovereign AI agents with wallets, memory, and payment rails on Solana.
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 *
 * Quick start:
 *   import { createClawd } from '@solanaclawd/sdk';
 *   const clawd = await createClawd({ paperOnly: true });
 *   const tick = await clawd.agent.tailFlick();
 */

export const SDK_VERSION = '1.0.0';
export const SDK_UPSTREAM = 'https://github.com/x402agent/Solana-Clawd-SDK';

// ─── Agent ────────────────────────────────────────────────────────────────────
export { createAgent, AgentHandle } from './agent.js';
export type { AgentConfig } from './agent.js';

// ─── Wallet ───────────────────────────────────────────────────────────────────
export { createWallet, AgentWallet } from './wallet.js';

// ─── Tools ───────────────────────────────────────────────────────────────────
export { ToolRegistry, getDefaultRegistry, getToolsForDepth } from './tools.js';
export type { ToolExecutor } from './tools.js';

// ─── Three Laws ───────────────────────────────────────────────────────────────
export {
  THREE_LAWS,
  LAW_SUMMARIES,
  ThreeLawsViolation,
  constitutionHash,
  assertConstitutionIntact,
  verifyConstitution,
  assertPaperOnly,
  assertDevnetOnly,
} from './three-laws.js';

// ─── MCP ─────────────────────────────────────────────────────────────────────
export { MCPClient, createMCPClient } from './mcp.js';

// ─── OpenShell ────────────────────────────────────────────────────────────────
export { createOpenShellRuntime } from './openShell.js';
export type { OpenShellRuntime, OpenShellRuntimeConfig } from './openShell.js';

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  SolanaCluster,
  DepthTier,
  AgentTick,
  AgentState,
  WalletConfig,
  TokenBalance,
  ToolDefinition,
  ToolExecutionContext,
  MCPClientConfig,
  MCPToolResult,
} from './types.js';

// ─── createClawd (top-level factory) ─────────────────────────────────────────

import { createAgent, type AgentConfig } from './agent.js';
import { createWallet } from './wallet.js';
import { getDefaultRegistry } from './tools.js';
import type { AgentHandle } from './agent.js';
import type { AgentWallet } from './wallet.js';
import type { ToolRegistry } from './tools.js';

export interface ClawdInstance {
  agent: AgentHandle;
  wallet: AgentWallet | null;
  tools: ToolRegistry;
}

/**
 * The main entry point for @solanaclawd/sdk.
 *
 * Creates a fully wired agent instance:
 *   - leviathan agent handle (OODA loop)
 *   - AgentWallet (if keystore is available)
 *   - Unified tool registry (all leviathan + vulcan tools)
 *
 * @example
 *   const clawd = await createClawd({ cluster: 'devnet', paperOnly: true });
 *   clawd.agent.onTick(t => console.log('tick', t.tick, t.action));
 *   await clawd.agent.tailFlick();
 */
export async function createClawd(config: AgentConfig = {}): Promise<ClawdInstance> {
  const agent = createAgent(config);

  let wallet: AgentWallet | null = null;
  try {
    wallet = await createWallet({
      cluster: config.cluster ?? 'devnet',
      keystorePath: config.keystorePath,
    });
  } catch {
    // No keystore available — wallet stays null
  }

  const tools = await getDefaultRegistry();

  return { agent, wallet, tools };
}
