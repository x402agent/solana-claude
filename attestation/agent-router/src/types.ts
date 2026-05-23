// ─── Agent Router Types ─────────────────────────────────────────────────────

export interface AgentCapability {
  name: string;         // e.g. "trading", "research", "coding", "defi"
  version: string;      // semver
  description: string;
}

export interface AgentRegistration {
  agentId: string;           // unique identifier
  walletPubkey: string;      // base58 Solana pubkey
  capabilities: string;      // pipe-separated: "trading|research|defi"
  endpoint: string;          // wss:// or https:// endpoint
  registeredAt: bigint;      // unix seconds u64
  isActive: boolean;
}

export interface OnChainAgent {
  attestationAddress: string;  // base58 PDA
  registration: AgentRegistration;
  lastSeen?: number;
  latencyMs?: number;
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export type RoutingStrategy = 'capability' | 'round-robin' | 'least-latency' | 'random';

export interface RouteRequest {
  capability?: string;        // required capability e.g. "trading"
  agentId?: string;           // route to specific agent
  payload: unknown;
  metadata?: Record<string, string>;
  strategy?: RoutingStrategy;
}

export interface RouteResult {
  agentId: string;
  endpoint: string;
  walletPubkey: string;
  attestationAddress: string;
  strategy: RoutingStrategy;
  routingAttestationAddress?: string; // on-chain record of this routing decision
}

export interface RoutingAttestation {
  routingId: string;
  agentPubkey: string;
  requestHash: Uint8Array;   // 32 bytes
  routedAt: bigint;
  capability: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

export interface RegistrationRequest {
  agentId: string;
  capabilities: AgentCapability[];
  endpoint: string;
  signerPrivateKey: Uint8Array;
  walletPubkey: string;
}

export interface RegistrationResult {
  attestationAddress: string;
  txSignature?: string;
  demoMode: boolean;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface RouterConfig {
  solanaRpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'localnet' | 'demo';
  sasProgram: string;
  credentialAddress?: string;
  agentRouterSchemaAddress?: string;
  signerPrivateKeyBytes?: Uint8Array;
  defaultStrategy: RoutingStrategy;
  demoMode: boolean;
  cacheAgentsTtlMs: number;    // how long to cache on-chain agent list
  healthCheckIntervalMs: number;
}
