/**
 * Metaplex Agent Integration — Solana AI Agent Minting & Registry
 *
 * Full Metaplex mpl-agent-registry integration for $CLAWD:
 *   - Mint agents as MPL Core assets with Agent Identity PDAs
 *   - Register identities on existing Core assets
 *   - Read agent data, wallets, and registration documents
 *   - Delegate execution to off-chain executives
 *   - Clawd role templates for quick agent deployment
 */

// Types
export type {
  SupportedNetwork,
  AgentService,
  AgentRegistration,
  AgentMetadata,
  AgentRegistrationDocument,
  MintAgentInput,
  MintAgentResult,
  RegisterAgentInput,
  RegisterAgentResult,
  AgentIdentityData,
  DelegateExecutionInput,
  DelegateExecutionResult,
  MetaplexConfig,
  ClawdAgentRole,
  ClawdAgentTemplate,
} from './metaplex-types.js'

export {
  SUPPORTED_NETWORKS,
  NETWORK_RPC_URLS,
  CLAWD_AGENT_TEMPLATES,
} from './metaplex-types.js'

// Agent minting
export {
  createAgentUmi,
  createAgentUmiFromEnv,
  mintClawdAgent,
  mintClawdAgentManual,
  mintClawdAgentFromTemplate,
  verifyAgentMint,
  mintClawdAgentBatch,
} from './agent-minter.js'

// Agent registry (register, read, delegate)
export {
  registerAgentIdentity,
  createAndRegisterAgent,
  checkAgentRegistration,
  readAgentData,
  fetchAgentRegistrationDocument,
  deriveAgentWallet,
  getAgentWalletBalance,
  registerExecutive,
  delegateAgentExecution,
  checkDelegation,
  buildRegistrationDocument,
} from './agent-registry.js'
