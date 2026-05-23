// ─── Private Inference Types ────────────────────────────────────────────────

export type ModelProvider = 'claude' | 'openai' | 'local';

export interface InferenceRequest {
  prompt: string;
  model?: string;
  provider?: ModelProvider;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, string>;
}

export interface InferenceResponse {
  text: string;
  model: string;
  provider: ModelProvider;
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
}

// ─── Privacy Layer ───────────────────────────────────────────────────────────

export interface PrivateInferenceRecord {
  inferenceId: string;      // UUID
  promptHash: string;       // hex SHA-256(prompt + salt)
  promptSalt: string;       // hex random 32-byte salt (user keeps this)
  responseHash: string;     // hex SHA-256(response)
  timestamp: number;        // unix seconds
  model: string;
  provider: ModelProvider;
  durationMs: number;
}

// What gets stored on Solana — no plaintext, ever
export interface InferenceAttestation {
  inferenceId: string;
  modelPubkey: string;        // base58 pubkey of model provider credential
  promptHash: Uint8Array;     // 32 bytes
  responseHash: Uint8Array;   // 32 bytes
  timestamp: bigint;          // u64 unix seconds
  isVerified: boolean;
}

export interface AttestationResult {
  attestationAddress: string; // base58 PDA
  txSignature?: string;       // base58 tx signature (real chain)
  blockTime?: number;
  slot?: number;
  demoMode: boolean;
}

// ─── Verification ────────────────────────────────────────────────────────────

export interface VerificationRequest {
  inferenceId: string;
  promptCandidate: string;    // plaintext to verify
  salt: string;               // hex salt from the original record
  attestationAddress: string;
}

export interface VerificationResult {
  verified: boolean;
  promptMatches: boolean;
  attestationFound: boolean;
  onChainPromptHash?: string;
  computedPromptHash?: string;
  timestamp?: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface InferenceConfig {
  solanaRpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'localnet' | 'demo';
  sasProgram: string;
  credentialAddress?: string;
  inferenceSchemaAddress?: string;
  modelRegistrySchemaAddress?: string;
  signerPrivateKeyBytes?: Uint8Array;
  modelProviderPubkey?: string;  // base58 pubkey representing the model provider
  claudeApiKey?: string;
  openaiApiKey?: string;
  demoMode: boolean;
  defaultProvider: ModelProvider;
  defaultModel: string;
}
