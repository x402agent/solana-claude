export {
  buildInitializeVaultInstruction,
  buildLockTokensInstruction,
  buildUnlockTokensInstruction,
  fetchVaultState,
  fetchLockPosition,
} from "./vault-client.js";

export {
  estimateEntropyBurn,
  buildEntropyBurnInstruction,
  estimateAntiGravity,
  buildAntiGravityInstruction,
  estimateAgentEpochBurn,
  buildAgentEpochBurnInstruction,
  estimateBehavioralBurn,
  buildBehavioralBurnInstruction,
} from "./burn-engine.js";
export type {
  AgentEpochBurnParams,
  BehaviorBurnParams,
} from "./burn-engine.js";

export {
  buildConvictionStakeInstruction,
  buildConvictionUnstakeInstruction,
  buildClaimConvictionRewardsInstruction,
  fetchConvictionPosition,
  estimateConvictionScore,
  estimateRevenueShare,
  slotsUntilFreeUnlock,
} from "./conviction-vault.js";

export {
  buildCreateMilestoneLockInstruction,
  buildVerifyMilestoneInstruction,
  defaultDevMilestones,
  agentAlignedMilestones,
  checkMilestoneStatus,
} from "./milestone-tracker.js";
export type { MilestoneStatus } from "./milestone-tracker.js";
