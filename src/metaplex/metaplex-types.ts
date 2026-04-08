/**
 * Metaplex Agent Registry Types
 *
 * Type definitions for minting, registering, and managing
 * AI agents on Solana via the Metaplex mpl-agent-registry SDK.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Network configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_NETWORKS = [
  'solana-mainnet',
  'solana-devnet',
  'localnet',
  'eclipse-mainnet',
  'sonic-mainnet',
  'sonic-devnet',
  'fogo-mainnet',
  'fogo-testnet',
] as const

export type SupportedNetwork = typeof SUPPORTED_NETWORKS[number]

export const NETWORK_RPC_URLS: Record<SupportedNetwork, string> = {
  'solana-mainnet': 'https://api.mainnet-beta.solana.com',
  'solana-devnet': 'https://api.devnet.solana.com',
  'localnet': 'http://127.0.0.1:8899',
  'eclipse-mainnet': 'https://mainnetbeta-rpc.eclipse.xyz',
  'sonic-mainnet': 'https://api.mainnet.sonic.game',
  'sonic-devnet': 'https://api.devnet.sonic.game',
  'fogo-mainnet': 'https://rpc.fogo.xyz',
  'fogo-testnet': 'https://rpc.testnet.fogo.xyz',
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent service definition
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentService {
  /** Service type: 'trading', 'chat', 'MCP', 'A2A', 'web', etc. */
  name: string
  /** URL where the service can be reached */
  endpoint: string
  /** Optional protocol version */
  version?: string
  /** Optional skills exposed through this service */
  skills?: string[]
  /** Optional domains the agent operates in */
  domains?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent registration (external registry links)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentRegistration {
  /** The agent's mint address or identifier */
  agentId: string
  /** Registry identifier, e.g. 'solana:101:metaplex' */
  agentRegistry: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent metadata (off-chain, stored by Metaplex API)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentMetadata {
  /** Schema identifier — use 'agent' */
  type: 'agent'
  /** Agent display name */
  name: string
  /** What the agent does and how to interact with it */
  description: string
  /** Service endpoints the agent exposes */
  services: AgentService[]
  /** Links to external registry entries */
  registrations: AgentRegistration[]
  /** Trust mechanisms supported: 'tee', 'reputation', 'crypto-economic' */
  supportedTrust: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent registration document (ERC-8004 format, off-chain JSON)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentRegistrationDocument {
  /** Schema identifier */
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1'
  /** Human-readable agent name */
  name: string
  /** Natural language description */
  description: string
  /** Avatar or logo URI */
  image: string
  /** Service endpoints */
  services: AgentService[]
  /** Whether agent is currently active */
  active: boolean
  /** On-chain registrations */
  registrations: AgentRegistration[]
  /** Trust models supported */
  supportedTrust: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Minting input/output
// ─────────────────────────────────────────────────────────────────────────────

export interface MintAgentInput {
  /** Agent display name */
  name: string
  /** Publicly accessible URI for Core asset NFT metadata JSON */
  uri: string
  /** Off-chain agent metadata stored by the Metaplex API */
  agentMetadata: AgentMetadata
  /** Target network (defaults to 'solana-devnet') */
  network?: SupportedNetwork
}

export interface MintAgentResult {
  /** The MPL Core asset address (base58) */
  assetAddress: string
  /** Transaction signature (base58) */
  signature: string
  /** Network the agent was minted on */
  network: SupportedNetwork
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration input/output (for existing Core assets)
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterAgentInput {
  /** The MPL Core asset public key to register */
  assetAddress: string
  /** Optional collection public key */
  collectionAddress?: string
  /** URI pointing to off-chain agent registration document */
  agentRegistrationUri: string
}

export interface RegisterAgentResult {
  /** Transaction signature */
  signature: string
  /** The registered asset address */
  assetAddress: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent identity data (on-chain read)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentIdentityData {
  /** Whether the agent has a registered identity */
  isRegistered: boolean
  /** Registration URI from the AgentIdentity plugin */
  registrationUri?: string
  /** Lifecycle hook status */
  lifecycleHooks?: {
    transfer: boolean
    update: boolean
    execute: boolean
  }
  /** Agent wallet (Asset Signer PDA) address */
  walletAddress?: string
  /** Agent wallet SOL balance in lamports */
  walletBalance?: bigint
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution delegation
// ─────────────────────────────────────────────────────────────────────────────

export interface DelegateExecutionInput {
  /** The registered agent's MPL Core asset address */
  agentAssetAddress: string
  /** The executive authority wallet public key to delegate to */
  executiveAuthorityAddress: string
}

export interface DelegateExecutionResult {
  /** Transaction signature */
  signature: string
  /** Whether delegation was successful */
  delegated: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration for the Metaplex agent minter
// ─────────────────────────────────────────────────────────────────────────────

export interface MetaplexConfig {
  /** Solana RPC endpoint URL */
  rpcUrl: string
  /** Network identifier */
  network: SupportedNetwork
  /** Secret key bytes for the wallet (Uint8Array) */
  secretKey?: Uint8Array
  /** Optional custom Metaplex API base URL */
  apiBaseUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Clawd-specific agent template presets
// ─────────────────────────────────────────────────────────────────────────────

export type ClawdAgentRole =
  | 'explorer'
  | 'scanner'
  | 'trader'
  | 'analyst'
  | 'monitor'
  | 'custom'

export interface ClawdAgentTemplate {
  role: ClawdAgentRole
  name: string
  description: string
  services: AgentService[]
  supportedTrust: string[]
}

export const CLAWD_AGENT_TEMPLATES: Record<ClawdAgentRole, ClawdAgentTemplate> = {
  explorer: {
    role: 'explorer',
    name: 'Clawd Explorer',
    description: 'Read-only Solana research agent. Fetches prices, token data, and wallet analytics.',
    services: [
      { name: 'A2A', endpoint: '' },
      { name: 'MCP', endpoint: '' },
    ],
    supportedTrust: ['reputation'],
  },
  scanner: {
    role: 'scanner',
    name: 'Clawd Scanner',
    description: 'Market scanner that surfaces high-signal trending tokens and trading opportunities.',
    services: [
      { name: 'A2A', endpoint: '' },
      { name: 'MCP', endpoint: '' },
    ],
    supportedTrust: ['reputation'],
  },
  trader: {
    role: 'trader',
    name: 'Clawd OODA Trader',
    description: 'Full OODA loop trading agent: Observe, Orient, Decide, Act, Learn.',
    services: [
      { name: 'trading', endpoint: '' },
      { name: 'A2A', endpoint: '' },
      { name: 'MCP', endpoint: '' },
    ],
    supportedTrust: ['reputation', 'crypto-economic'],
  },
  analyst: {
    role: 'analyst',
    name: 'Clawd Deep Analyst',
    description: 'Produces structured research reports on tokens and wallets.',
    services: [
      { name: 'A2A', endpoint: '' },
      { name: 'MCP', endpoint: '' },
    ],
    supportedTrust: ['reputation'],
  },
  monitor: {
    role: 'monitor',
    name: 'Clawd Onchain Monitor',
    description: 'Real-time on-chain event monitoring via Helius WebSocket subscriptions.',
    services: [
      { name: 'web', endpoint: '' },
      { name: 'A2A', endpoint: '' },
    ],
    supportedTrust: ['reputation'],
  },
  custom: {
    role: 'custom',
    name: 'Clawd Agent',
    description: 'Custom Solana AI agent powered by the $CLAWD engine.',
    services: [],
    supportedTrust: [],
  },
}
