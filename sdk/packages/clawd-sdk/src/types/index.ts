import type { PublicKey, TransactionInstruction } from "@solana/web3.js";

// ─── Token Types ──────────────────────────────────────────────────────────────

export type TokenStandard = "spl" | "token2022" | "ptoken";

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  additionalMetadata?: [string, string][];
}

export interface TokenLaunchConfig {
  standard: TokenStandard;
  decimals: number;
  initialSupply: bigint;
  metadata: TokenMetadata;
  /**
   * Token2022 / pToken extensions to enable.
   * Ignored for standard SPL.
   */
  extensions?: Token2022Extensions;
}

export interface Token2022Extensions {
  transferFee?: {
    feeBps: number;
    maxFee: bigint;
    transferFeeConfigAuthority: PublicKey;
    withdrawWithheldAuthority: PublicKey;
  };
  transferHook?: {
    programId: PublicKey;
  };
  permanentDelegate?: PublicKey;
  nonTransferable?: boolean;
  interestBearing?: {
    rateAuthority: PublicKey;
    rateBps: number;
  };
  metadataPointer?: {
    authority: PublicKey | null;
    metadataAddress: PublicKey | null;
  };
  mintCloseAuthority?: PublicKey;
  defaultAccountState?: "initialized" | "frozen";
}

// ─── Bonding Curve ─────────────────────────────────────────────────────────

export interface CurvePoint {
  sqrtPrice: bigint;
  liquidity: bigint;
}

export interface CurveConfig {
  sqrtStartPrice: bigint;
  migrationSqrtPrice: bigint;
  migrationQuoteThreshold: bigint;
  curve: CurvePoint[];
}

export interface AdaptiveCurveConfig extends CurveConfig {
  baseFeeNumerator: bigint;
  sentimentFeeRangeBps: number;
  sentimentUpdateIntervalSlots: number;
}

export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  tradingFee: bigint;
  protocolFee: bigint;
  priceImpactBps: number;
  nextSqrtPrice: bigint;
  amountLeft: bigint;
}

export interface SentimentState {
  dbcPool: PublicKey;
  lastUpdateSlot: bigint;
  sentimentScoreSigned: bigint;
  emaBuyVolume: bigint;
  emaSellVolume: bigint;
  currentFeeAdjustmentBps: number;
  updateIntervalSlots: number;
}

// ─── Vault ────────────────────────────────────────────────────────────────────

export type LockType = "time" | "milestone" | "hybrid" | "conviction";

export interface VaultConfig {
  inflationReserveAmount: bigint;
  entropyThreshold: number;
  entropySensitivityBps: number;
  antiGravityFloorBps: number;
  antiGravityMaxStrengthBps: number;
  transferFeeBps: number;
  epochDurationSlots: bigint;
  epochBurnRateBps: number;
}

export interface LockParams {
  amount: bigint;
  lockType: LockType;
  durationSlots?: bigint;
  milestoneConfigIndex?: number;
}

export interface LockPosition {
  owner: PublicKey;
  vault: PublicKey;
  lockedAmount: bigint;
  lockType: LockType;
  lockedAtSlot: bigint;
  unlockSlot?: bigint;
  milestoneIndex?: number;
  isUnlocked: boolean;
}

export type MilestoneType =
  | "holder_count"
  | "market_cap_quote"
  | "cumulative_volume"
  | "graduation_achieved"
  | "agent_tasks_completed";

export interface MilestoneCondition {
  milestoneType: MilestoneType;
  threshold: bigint;
  unlockBps: number;
  achieved: boolean;
}

export interface MilestoneLockParams {
  totalLockedAmount: bigint;
  milestones: MilestoneCondition[];
}

export interface ConvictionPosition {
  staker: PublicKey;
  vault: PublicKey;
  stakedAmount: bigint;
  lockDurationSlots: bigint;
  stakedAtSlot: bigint;
  unlockSlot: bigint;
  convictionScore: bigint;
  consecutiveEpochs: number;
  lastClaimSlot: bigint;
  totalRewardsClaimed: bigint;
}

export interface VaultState {
  baseMint: PublicKey;
  dbcPool: PublicKey;
  agentBinding?: PublicKey;
  vaultTokenAccount: PublicKey;
  feeReserveAccount: PublicKey;
  inflationReserveAmount: bigint;
  totalLocked: bigint;
  totalConvictionScore: bigint;
  totalBurned: bigint;
  totalFeesCollected: bigint;
  athQuotePrice: bigint;
  entropyThreshold: number;
  entropySensitivityBps: number;
  antiGravityFloorBps: number;
  antiGravityMaxStrengthBps: number;
  transferFeeBps: number;
  epochDurationSlots: bigint;
  epochBurnRateBps: number;
}

// ─── Burn Engine ──────────────────────────────────────────────────────────────

export interface BurnEvent {
  type: "entropy" | "behavioral" | "anti_gravity" | "agent_epoch" | "conviction_exit";
  burnedAmount: bigint;
  triggerValue: number | bigint;
  slot: bigint;
  txSignature?: string;
}

export interface EntropyBurnEstimate {
  wouldTrigger: boolean;
  excessVolatility: number;
  estimatedBurnAmount: bigint;
  currentAccumulator: number;
  threshold: number;
}

export interface AntiGravityEstimate {
  wouldTrigger: boolean;
  currentSqrtPrice: bigint;
  floorSqrtPrice: bigint;
  estimatedBuyAmount: bigint;
  estimatedTokensBurned: bigint;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export interface AgentBinding {
  agentPubkey: PublicKey;
  baseMint: PublicKey;
  vault: PublicKey;
  characterHash: Uint8Array;
  constitutionHash: Uint8Array;
  capabilities: bigint;
  isActive: boolean;
  createdAtSlot: bigint;
  lastActivitySlot: bigint;
  lifetimeTasksCompleted: bigint;
  lifetimeRevenueLamports: bigint;
}

export interface AgentLaunchParams {
  agentWallet: PublicKey;
  tokenConfig: TokenLaunchConfig;
  curveConfig: AgentCurveConfig;
  vaultConfig: VaultConfig;
  characterHash: Uint8Array;
  constitutionHash: Uint8Array;
  capabilities: bigint;
}

export interface AgentCurveConfig {
  baseFeeNumerator: bigint;
  sentimentFeeRangeBps: number;
  sentimentUpdateIntervalSlots: number;
  migrationQuoteThreshold: bigint;
  initialBuyAmount?: bigint;
}

// ─── SDK Result ────────────────────────────────────────────────────────────────

export interface SdkInstructions {
  instructions: TransactionInstruction[];
  signers?: import("@solana/web3.js").Signer[];
  computeUnits?: number;
}

export interface LaunchResult extends SdkInstructions {
  mintKeypair: import("@solana/web3.js").Keypair;
  vaultPda: PublicKey;
  dbcPoolPda: PublicKey;
  agentBindingPda?: PublicKey;
}
