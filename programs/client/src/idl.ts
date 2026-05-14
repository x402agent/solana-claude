/**
 * Solana AI Inference Protocol IDL Types
 * Auto-generated types for the Anchor program
 */

export const PROGRAM_ID = "3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc";

// Seeds
export const CONFIG_SEED = "config";
export const MODEL_SEED = "model";
export const DATA_SEED = "data";
export const VALIDATOR_SEED = "validator";
export const INFERENCE_SEED = "inference";
export const STAKE_SEED = "stake";
export const DNA_SEED = "dna";
export const VAULT_SEED = "vault";
export const ESCROW_SEED = "escrow";
export const VALIDATOR_VAULT_SEED = "validator_vault";

// Lock Duration Constants (in seconds)
export const LOCK_1_DAY = 86_400;
export const LOCK_1_WEEK = 604_800;
export const LOCK_1_MONTH = 2_592_000;
export const LOCK_3_MONTHS = 7_776_000;
export const LOCK_6_MONTHS = 15_552_000;
export const LOCK_1_YEAR = 31_536_000;

// Protocol Constants
export const MIN_VALIDATOR_STAKE = 1_000_000;
export const PROTOCOL_FEE_BPS = 250;
export const SLASH_RATE_BPS = 500;
export const UNSTAKE_COOLDOWN = 172_800;
export const MAX_REPUTATION = 10_000;
export const BPS_DENOMINATOR = 10_000;

// ============================================================================
// TYPES
// ============================================================================

export type ModelType =
    | { sentimentAnalysis: {} }
    | { textGeneration: {} }
    | { imageClassification: {} }
    | { pricePrediction: {} }
    | { documentUnderstanding: {} }
    | { audioTranscription: {} }
    | { codeGeneration: {} }
    | { embedding: {} };

export type DataType =
    | { text: {} }
    | { image: {} }
    | { audio: {} }
    | { video: {} }
    | { tradingData: {} }
    | { solanaTransactions: {} }
    | { nftMetadata: {} }
    | { deFiData: {} }
    | { embeddings: {} };

export type InferenceStatus =
    | { pending: {} }
    | { processing: {} }
    | { completed: {} }
    | { failed: {} }
    | { refunded: {} };

// ============================================================================
// ACCOUNTS
// ============================================================================

export interface ProtocolConfigAccount {
    admin: string;
    pendingAdmin: string | null;
    treasury: string;
    paused: boolean;
    totalModels: bigint;
    totalValidators: bigint;
    totalInferences: bigint;
    totalStaked: bigint;
    protocolFeeBps: bigint;
    createdAt: bigint;
    bump: number;
}

export interface ModelRegistryAccount {
    authority: string;
    modelCid: string;
    modelType: ModelType;
    apiEndpoint: string;
    inferenceFee: bigint;
    accuracyBps: bigint;
    trainingComplete: boolean;
    validationCount: bigint;
    totalInferences: bigint;
    totalRevenue: bigint;
    active: boolean;
    nonce: bigint;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}

export interface DataSubmissionAccount {
    submitter: string;
    dataHash: string;
    dataType: DataType;
    dataSize: bigint;
    metadata: string;
    qualityScore: number;
    validated: boolean;
    nonce: bigint;
    submittedAt: bigint;
    validatedAt: bigint | null;
    validator: string | null;
    bump: number;
}

export interface ValidatorAccount {
    validator: string;
    tokensStaked: bigint;
    validationsPerformed: bigint;
    reputationScore: bigint;
    active: boolean;
    slashed: boolean;
    joinedAt: bigint;
    bump: number;
}

export interface InferenceRequestAccount {
    requester: string;
    modelId: string;
    inputData: string;
    confidenceThresholdBps: bigint;
    prediction: string | null;
    confidenceBps: bigint | null;
    processingTimeMs: bigint | null;
    qualityScore: number | null;
    status: InferenceStatus;
    modelFee: bigint;
    protocolFee: bigint;
    nonce: bigint;
    requestedAt: bigint;
    completedAt: bigint | null;
    bump: number;
}

export interface StakeAccount {
    staker: string;
    amount: bigint;
    lockDuration: bigint;
    stakedAt: bigint;
    unlockAt: bigint;
    lastClaimAt: bigint;
    unstakeRequestedAt: bigint | null;
    bump: number;
}

export interface DnaSubmissionAccount {
    author: string;
    dnaHash: string;
    utilityScore: bigint;
    timestamp: bigint;
    bump: number;
}

// ============================================================================
// INSTRUCTION PARAMS
// ============================================================================

export interface InitializeProtocolParams {
    treasury: string;
}

export interface InitializeModelParams {
    modelHash: string;
    modelType: ModelType;
    apiEndpoint: string;
    inferenceFee: bigint;
    nonce: bigint;
}

export interface UpdateModelParams {
    apiEndpoint: string | null;
    inferenceFee: bigint | null;
    active: boolean | null;
}

export interface SubmitDataParams {
    dataHash: string;
    dataType: DataType;
    dataSize: bigint;
    metadata: string;
    nonce: bigint;
}

export interface RequestInferenceParams {
    inputData: string;
    confidenceThresholdBps: bigint;
    nonce: bigint;
}

export interface SubmitInferenceResultParams {
    prediction: string;
    confidenceBps: bigint;
    processingTimeMs: bigint;
}

export interface StakeTokensParams {
    amount: bigint;
    lockDuration: bigint;
}

export interface RegisterValidatorParams {
    stakeAmount: bigint;
}

export interface RecordDnaParams {
    dnaHash: string;
    utilityScore: bigint;
}

// ============================================================================
// EVENTS
// ============================================================================

export interface ProtocolInitializedEvent {
    admin: string;
    treasury: string;
}

export interface ProtocolPauseToggledEvent {
    paused: boolean;
}

export interface AdminProposedEvent {
    current: string;
    proposed: string;
}

export interface AdminTransferredEvent {
    oldAdmin: string;
    newAdmin: string;
}

export interface ProtocolFeeUpdatedEvent {
    newFeeBps: bigint;
}

export interface ModelInitializedEvent {
    modelId: string;
    authority: string;
    modelType: ModelType;
    inferenceFee: bigint;
    nonce: bigint;
}

export interface ModelUpdatedEvent {
    modelId: string;
}

export interface TrainingFinalizedEvent {
    modelId: string;
    accuracyBps: bigint;
}

export interface DataSubmittedEvent {
    submissionId: string;
    submitter: string;
    dataType: DataType;
    dataSize: bigint;
    nonce: bigint;
}

export interface DataRatedEvent {
    submissionId: string;
    validator: string;
    qualityScore: number;
}

export interface InferenceRequestedEvent {
    requestId: string;
    requester: string;
    modelId: string;
    totalFee: bigint;
    nonce: bigint;
}

export interface InferenceCompletedEvent {
    requestId: string;
    prediction: string;
    confidenceBps: bigint;
    qualityScore: number;
    processingTimeMs: bigint;
}

export interface InferenceFailedEvent {
    requestId: string;
    refunded: bigint;
}

export interface TokensStakedEvent {
    staker: string;
    amount: bigint;
    lockDuration: bigint;
    unlockAt: bigint;
}

export interface UnstakeRequestedEvent {
    staker: string;
    cooldownEnds: bigint;
}

export interface UnstakeExecutedEvent {
    staker: string;
    amount: bigint;
}

export interface ValidatorRegisteredEvent {
    validator: string;
    stakeAmount: bigint;
}

export interface ValidatorSlashedEvent {
    validator: string;
    slashAmount: bigint;
    remainingStake: bigint;
}

export interface DnaRecordedEvent {
    author: string;
    utilityScore: bigint;
}

// ============================================================================
// IDL
// ============================================================================

export const IDL = {
    version: "0.1.0",
    name: "solana_ai_inference",
    address: PROGRAM_ID,
    metadata: {
        name: "solana_ai_inference",
        version: "0.1.0",
        spec: "0.1.0",
    },
    instructions: [
        {
            name: "initializeProtocol",
            accounts: [
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "admin", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "treasury", type: "publicKey" },
            ],
        },
        {
            name: "setPaused",
            accounts: [
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "admin", isMut: false, isSigner: true },
            ],
            args: [
                { name: "paused", type: "bool" },
            ],
        },
        {
            name: "proposeAdmin",
            accounts: [
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "admin", isMut: false, isSigner: true },
            ],
            args: [
                { name: "newAdmin", type: "publicKey" },
            ],
        },
        {
            name: "acceptAdmin",
            accounts: [
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "newAdmin", isMut: false, isSigner: true },
            ],
            args: [],
        },
        {
            name: "updateProtocolFee",
            accounts: [
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "admin", isMut: false, isSigner: true },
            ],
            args: [
                { name: "newFeeBps", type: "u64" },
            ],
        },
        {
            name: "initializeModel",
            accounts: [
                { name: "modelRegistry", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "authority", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "modelHash", type: "string" },
                { name: "modelType", type: { defined: "ModelType" } },
                { name: "apiEndpoint", type: "string" },
                { name: "inferenceFee", type: "u64" },
                { name: "nonce", type: "u64" },
            ],
        },
        {
            name: "updateModel",
            accounts: [
                { name: "modelRegistry", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "authority", isMut: false, isSigner: true },
            ],
            args: [
                { name: "apiEndpoint", type: { option: "string" } },
                { name: "inferenceFee", type: { option: "u64" } },
                { name: "active", type: { option: "bool" } },
            ],
        },
        {
            name: "finalizeTraining",
            accounts: [
                { name: "modelRegistry", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "authority", isMut: false, isSigner: true },
            ],
            args: [
                { name: "accuracyBps", type: "u64" },
            ],
        },
        {
            name: "submitData",
            accounts: [
                { name: "dataSubmission", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "submitter", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "dataHash", type: "string" },
                { name: "dataType", type: { defined: "DataType" } },
                { name: "dataSize", type: "u64" },
                { name: "metadata", type: "string" },
                { name: "nonce", type: "u64" },
            ],
        },
        {
            name: "rateData",
            accounts: [
                { name: "dataSubmission", isMut: true, isSigner: false },
                { name: "validatorAccount", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "validator", isMut: false, isSigner: true },
            ],
            args: [
                { name: "qualityScore", type: "u8" },
            ],
        },
        {
            name: "requestInference",
            accounts: [
                { name: "inferenceRequest", isMut: true, isSigner: false },
                { name: "modelRegistry", isMut: false, isSigner: false },
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "requesterTokenAccount", isMut: true, isSigner: false },
                { name: "escrowTokenAccount", isMut: true, isSigner: false },
                { name: "requester", isMut: true, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "inputData", type: "string" },
                { name: "confidenceThresholdBps", type: "u64" },
                { name: "nonce", type: "u64" },
            ],
        },
        {
            name: "submitInferenceResult",
            accounts: [
                { name: "inferenceRequest", isMut: true, isSigner: false },
                { name: "modelRegistry", isMut: true, isSigner: false },
                { name: "validatorAccount", isMut: false, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "escrowTokenAccount", isMut: true, isSigner: false },
                { name: "modelOwnerTokenAccount", isMut: true, isSigner: false },
                { name: "treasuryTokenAccount", isMut: true, isSigner: false },
                { name: "submitter", isMut: false, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "prediction", type: "string" },
                { name: "confidenceBps", type: "u64" },
                { name: "processingTimeMs", type: "u64" },
            ],
        },
        {
            name: "failInference",
            accounts: [
                { name: "inferenceRequest", isMut: true, isSigner: false },
                { name: "modelRegistry", isMut: false, isSigner: false },
                { name: "escrowTokenAccount", isMut: true, isSigner: false },
                { name: "requesterTokenAccount", isMut: true, isSigner: false },
                { name: "authority", isMut: false, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        },
        {
            name: "stakeTokens",
            accounts: [
                { name: "stakeAccount", isMut: true, isSigner: false },
                { name: "userTokenAccount", isMut: true, isSigner: false },
                { name: "vaultTokenAccount", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "user", isMut: true, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "amount", type: "u64" },
                { name: "lockDuration", type: "u64" },
            ],
        },
        {
            name: "requestUnstake",
            accounts: [
                { name: "stakeAccount", isMut: true, isSigner: false },
                { name: "user", isMut: false, isSigner: true },
            ],
            args: [],
        },
        {
            name: "executeUnstake",
            accounts: [
                { name: "stakeAccount", isMut: true, isSigner: false },
                { name: "userTokenAccount", isMut: true, isSigner: false },
                { name: "vaultTokenAccount", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "user", isMut: true, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        },
        {
            name: "registerValidator",
            accounts: [
                { name: "validatorAccount", isMut: true, isSigner: false },
                { name: "userTokenAccount", isMut: true, isSigner: false },
                { name: "validatorVault", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: true, isSigner: false },
                { name: "validator", isMut: true, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "stakeAmount", type: "u64" },
            ],
        },
        {
            name: "slashValidator",
            accounts: [
                { name: "validatorAccount", isMut: true, isSigner: false },
                { name: "validatorVault", isMut: true, isSigner: false },
                { name: "tokenMint", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "admin", isMut: false, isSigner: true },
                { name: "tokenProgram", isMut: false, isSigner: false },
            ],
            args: [],
        },
        {
            name: "recordDnaGeneration",
            accounts: [
                { name: "dnaSubmission", isMut: true, isSigner: false },
                { name: "protocolConfig", isMut: false, isSigner: false },
                { name: "author", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false },
            ],
            args: [
                { name: "dnaHash", type: "string" },
                { name: "utilityScore", type: "u64" },
            ],
        },
    ],
    accounts: [
        { name: "ProtocolConfig", type: { kind: "struct", fields: [] } },
        { name: "ModelRegistry", type: { kind: "struct", fields: [] } },
        { name: "DataSubmission", type: { kind: "struct", fields: [] } },
        { name: "ValidatorAccount", type: { kind: "struct", fields: [] } },
        { name: "InferenceRequest", type: { kind: "struct", fields: [] } },
        { name: "StakeAccount", type: { kind: "struct", fields: [] } },
        { name: "DnaSubmission", type: { kind: "struct", fields: [] } },
    ],
    types: [
        {
            name: "ModelType",
            type: {
                kind: "enum",
                variants: [
                    { name: "SentimentAnalysis" },
                    { name: "TextGeneration" },
                    { name: "ImageClassification" },
                    { name: "PricePrediction" },
                    { name: "DocumentUnderstanding" },
                    { name: "AudioTranscription" },
                    { name: "CodeGeneration" },
                    { name: "Embedding" },
                ],
            },
        },
        {
            name: "DataType",
            type: {
                kind: "enum",
                variants: [
                    { name: "Text" },
                    { name: "Image" },
                    { name: "Audio" },
                    { name: "Video" },
                    { name: "TradingData" },
                    { name: "SolanaTransactions" },
                    { name: "NftMetadata" },
                    { name: "DeFiData" },
                    { name: "Embeddings" },
                ],
            },
        },
        {
            name: "InferenceStatus",
            type: {
                kind: "enum",
                variants: [
                    { name: "Pending" },
                    { name: "Processing" },
                    { name: "Completed" },
                    { name: "Failed" },
                    { name: "Refunded" },
                ],
            },
        },
    ],
    events: [
        { name: "ProtocolInitialized", fields: [] },
        { name: "ProtocolPauseToggled", fields: [] },
        { name: "AdminProposed", fields: [] },
        { name: "AdminTransferred", fields: [] },
        { name: "ProtocolFeeUpdated", fields: [] },
        { name: "ModelInitialized", fields: [] },
        { name: "ModelUpdated", fields: [] },
        { name: "TrainingFinalized", fields: [] },
        { name: "DataSubmitted", fields: [] },
        { name: "DataRated", fields: [] },
        { name: "InferenceRequested", fields: [] },
        { name: "InferenceCompleted", fields: [] },
        { name: "InferenceFailed", fields: [] },
        { name: "TokensStaked", fields: [] },
        { name: "UnstakeRequested", fields: [] },
        { name: "UnstakeExecuted", fields: [] },
        { name: "ValidatorRegistered", fields: [] },
        { name: "ValidatorSlashed", fields: [] },
        { name: "DnaRecorded", fields: [] },
    ],
    errors: [
        { code: 6000, name: "ProtocolPaused", msg: "Protocol is paused" },
        { code: 6001, name: "UnauthorizedAdmin", msg: "Unauthorized admin" },
        { code: 6002, name: "UnauthorizedModelOwner", msg: "Unauthorized model owner" },
        { code: 6003, name: "UnauthorizedValidator", msg: "Unauthorized validator" },
        { code: 6004, name: "UnauthorizedOracle", msg: "Unauthorized oracle" },
        { code: 6005, name: "UnauthorizedStaker", msg: "Unauthorized staker" },
        { code: 6006, name: "InvalidQualityScore", msg: "Invalid quality score (0-100)" },
        { code: 6007, name: "InvalidBps", msg: "Invalid basis points value" },
        { code: 6008, name: "StringTooLong", msg: "String exceeds maximum length" },
        { code: 6009, name: "InvalidDataSize", msg: "Invalid data size" },
        { code: 6010, name: "ModelInactive", msg: "Model is inactive" },
        { code: 6011, name: "ModelNotTrained", msg: "Model training not complete" },
        { code: 6012, name: "ModelMismatch", msg: "Model ID mismatch" },
        { code: 6013, name: "InvalidInferenceState", msg: "Invalid inference state for this operation" },
        { code: 6014, name: "InsufficientStake", msg: "Insufficient stake amount" },
        { code: 6015, name: "StakeLocked", msg: "Stake is still locked" },
        { code: 6016, name: "UnstakeAlreadyRequested", msg: "Unstake already requested" },
        { code: 6017, name: "UnstakeNotRequested", msg: "Unstake not yet requested" },
        { code: 6018, name: "CooldownNotElapsed", msg: "Cooldown period not elapsed" },
        { code: 6019, name: "InvalidLockDuration", msg: "Invalid lock duration" },
        { code: 6020, name: "Overflow", msg: "Arithmetic overflow" },
        { code: 6021, name: "ZeroAmount", msg: "Zero amount not allowed" },
        { code: 6022, name: "FeeTooHigh", msg: "Fee exceeds maximum (10%)" },
        { code: 6023, name: "AlreadyValidated", msg: "Data already validated" },
        { code: 6024, name: "SelfValidation", msg: "Cannot validate own submission" },
        { code: 6025, name: "ValidatorInactive", msg: "Validator is inactive" },
    ],
} as const;
