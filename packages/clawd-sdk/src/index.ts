/**
 * @openclawd/solana-sdk
 *
 * Solana SDK for agent and token launches with:
 *   - Adaptive bonding curves (sentiment-adjusted fees via DBC)
 *   - SPL Token, Token2022, and pToken (Transfer Hook) support
 *   - Intelligent vault with entropy burns, anti-gravity, agent epoch burns
 *   - Conviction vault (time × amount × consistency scoring)
 *   - Milestone-gated developer locks (on-chain conditions, no pure time-locks)
 *   - Behavioral fingerprint burns (bot detection without oracles)
 *   - Agent-token bindings with constitution hash verification
 */

// ─── IDL ──────────────────────────────────────────────────────────────────────
export { CLAWD_PROTOCOL_IDL } from "./idl/index.js";
export type { ClawdProtocol } from "./idl/index.js";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  CLAWD_PROTOCOL_PROGRAM_ID,
  DBC_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_SOL_MINT,
  USDC_MINT_MAINNET,
  CLAWD_MINT_MAINNET,
  AgentCapability,
  DEFAULT_EPOCH_DURATION_SLOTS,
  FEE_DENOMINATOR,
  BPS_DENOMINATOR,
  MIN_FEE_BPS,
  MAX_FEE_BPS,
  MAX_MILESTONES,
  CONVICTION_EARLY_EXIT_BURN_BPS,
  BOT_THRESHOLD_SCORE,
} from "./constants.js";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type {
  TokenStandard,
  TokenMetadata,
  TokenLaunchConfig,
  Token2022Extensions,
  CurvePoint,
  CurveConfig,
  AdaptiveCurveConfig,
  SwapQuote,
  SentimentState,
  LockType,
  VaultConfig,
  LockParams,
  LockPosition,
  MilestoneType,
  MilestoneCondition,
  MilestoneLockParams,
  ConvictionPosition,
  VaultState,
  BurnEvent,
  EntropyBurnEstimate,
  AntiGravityEstimate,
  AgentBinding,
  AgentLaunchParams,
  AgentCurveConfig,
  SdkInstructions,
  LaunchResult,
} from "./types/index.js";

// ─── Bonding Curve ────────────────────────────────────────────────────────────
export {
  AdaptiveCurve,
  designDefaultAgentCurve,
  buildRanges,
  quoteExactInBuy,
  quoteExactInSell,
  computeSentimentAdjustedFee,
  updateSentimentState,
  fetchSentimentState,
  sentimentLabel,
} from "./bonding-curve/index.js";
export type {
  EnrichedSwapQuote,
  AdaptiveSwapParams,
  CurveRange,
  SentimentUpdate,
  FeeAdjustment,
} from "./bonding-curve/index.js";

// ─── Token ────────────────────────────────────────────────────────────────────
export {
  launchToken,
  isPTokenResult,
  isToken2022Result,
  defaultAgentTokenConfig,
  buildSplLaunchInstructions,
  buildToken2022LaunchInstructions,
  buildPTokenLaunchInstructions,
  buildPTokenTransferAccounts,
} from "./token/index.js";
export type {
  TokenLaunchResult,
  SplLaunchResult,
  Token2022LaunchResult,
  PTokenLaunchResult,
} from "./token/index.js";

// ─── Vault ────────────────────────────────────────────────────────────────────
export {
  // Vault client
  buildInitializeVaultInstruction,
  buildLockTokensInstruction,
  buildUnlockTokensInstruction,
  fetchVaultState,
  fetchLockPosition,
  // Burn engine
  estimateEntropyBurn,
  buildEntropyBurnInstruction,
  estimateAntiGravity,
  buildAntiGravityInstruction,
  estimateAgentEpochBurn,
  buildAgentEpochBurnInstruction,
  estimateBehavioralBurn,
  buildBehavioralBurnInstruction,
  // Conviction vault
  buildConvictionStakeInstruction,
  buildConvictionUnstakeInstruction,
  buildClaimConvictionRewardsInstruction,
  fetchConvictionPosition,
  estimateConvictionScore,
  estimateRevenueShare,
  slotsUntilFreeUnlock,
  // Milestone tracker
  buildCreateMilestoneLockInstruction,
  buildVerifyMilestoneInstruction,
  defaultDevMilestones,
  agentAlignedMilestones,
  checkMilestoneStatus,
} from "./vault/index.js";
export type {
  AgentEpochBurnParams,
  BehaviorBurnParams,
  MilestoneStatus,
} from "./vault/index.js";

// ─── Agent ────────────────────────────────────────────────────────────────────
export {
  buildAgentLaunchInstructions,
  buildRegisterAgentBindingInstruction,
  hashConstitution,
  hashCharacter,
  defaultAgentLaunchParams,
  fetchAgentBinding,
  verifyConstitutionHash,
  decodeCapabilities,
} from "./agent/index.js";

// ─── Utils ────────────────────────────────────────────────────────────────────
export {
  priceToSqrtPrice,
  sqrtPriceToPrice,
  computeEntropyBurn,
  computeAntiGravityBuy,
  computeBehaviorScore,
  computeAgentActivityScore,
  computeConvictionScore,
  computeConvictionReward,
  bnToBigInt,
  bigIntToBN,
} from "./utils/math.js";

export {
  deriveVaultPda,
  deriveLockPositionPda,
  deriveConvictionPositionPda,
  deriveMilestoneLockPda,
  deriveAgentBindingPda,
  deriveSentimentStatePda,
  deriveEntropyStatePda,
  deriveWalletBehaviorPda,
  deriveEpochRecordPda,
  deriveExtraAccountMetasPda,
  deriveVaultAuthorityPda,
} from "./utils/pda.js";
