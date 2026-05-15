/**
 * Solana AI Inference Protocol Client
 * TypeScript client for interacting with the on-chain program
 */

import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
    PROGRAM_ID,
    CONFIG_SEED,
    MODEL_SEED,
    DATA_SEED,
    VALIDATOR_SEED,
    INFERENCE_SEED,
    STAKE_SEED,
    DNA_SEED,
    VAULT_SEED,
    ESCROW_SEED,
    VALIDATOR_VAULT_SEED,
    LOCK_1_DAY,
    LOCK_1_WEEK,
    LOCK_1_MONTH,
    LOCK_3_MONTHS,
    LOCK_6_MONTHS,
    LOCK_1_YEAR,
    ModelType,
    DataType,
    ProtocolConfigAccount,
    ModelRegistryAccount,
    DataSubmissionAccount,
    ValidatorAccount,
    InferenceRequestAccount,
    StakeAccount,
    DnaSubmissionAccount,
    IDL,
} from './idl';

// ============================================================================
// CLIENT CLASS
// ============================================================================

export class SolanaAiInferenceClient {
    public program: Program;
    public connection: Connection;
    public programId: PublicKey;

    constructor(
        connection: Connection,
        wallet: Wallet,
        programId: string = PROGRAM_ID
    ) {
        this.connection = connection;
        this.programId = new PublicKey(programId);

        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
        });

        this.program = new Program(
            { ...(IDL as any), address: this.programId.toBase58() },
            provider
        );
    }

    // ========================================================================
    // PDA DERIVATION
    // ========================================================================

    getConfigPda(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(CONFIG_SEED)],
            this.programId
        );
    }

    getModelPda(authority: PublicKey, nonce: bigint): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from(MODEL_SEED),
                authority.toBuffer(),
                new BN(nonce.toString()).toArrayLike(Buffer, 'le', 8),
            ],
            this.programId
        );
    }

    getDataSubmissionPda(submitter: PublicKey, nonce: bigint): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from(DATA_SEED),
                submitter.toBuffer(),
                new BN(nonce.toString()).toArrayLike(Buffer, 'le', 8),
            ],
            this.programId
        );
    }

    getValidatorPda(validator: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(VALIDATOR_SEED), validator.toBuffer()],
            this.programId
        );
    }

    getValidatorVaultPda(validator: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(VALIDATOR_VAULT_SEED), validator.toBuffer()],
            this.programId
        );
    }

    getInferencePda(requester: PublicKey, nonce: bigint): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from(INFERENCE_SEED),
                requester.toBuffer(),
                new BN(nonce.toString()).toArrayLike(Buffer, 'le', 8),
            ],
            this.programId
        );
    }

    getStakePda(staker: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(STAKE_SEED), staker.toBuffer()],
            this.programId
        );
    }

    getDnaPda(author: PublicKey, dnaHash: string): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(DNA_SEED), author.toBuffer(), Buffer.from(dnaHash)],
            this.programId
        );
    }

    getVaultPda(configPda: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED), configPda.toBuffer()],
            this.programId
        );
    }

    getEscrowPda(modelId: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(ESCROW_SEED), modelId.toBuffer()],
            this.programId
        );
    }

    // ========================================================================
    // PROTOCOL ADMIN
    // ========================================================================

    async initializeProtocol(
        admin: Keypair,
        treasury: PublicKey
    ): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .initializeProtocol(treasury)
            .accounts({
                protocolConfig: configPda,
                admin: admin.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        return tx;
    }

    async setPaused(admin: Keypair, paused: boolean): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .setPaused(paused)
            .accounts({
                protocolConfig: configPda,
                admin: admin.publicKey,
            })
            .signers([admin])
            .rpc();

        return tx;
    }

    async updateProtocolFee(admin: Keypair, newFeeBps: bigint): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .updateProtocolFee(new BN(newFeeBps.toString()))
            .accounts({
                protocolConfig: configPda,
                admin: admin.publicKey,
            })
            .signers([admin])
            .rpc();

        return tx;
    }

    // ========================================================================
    // MODEL REGISTRY
    // ========================================================================

    async initializeModel(
        authority: Keypair,
        modelHash: string,
        modelType: ModelType,
        apiEndpoint: string,
        inferenceFee: bigint,
        nonce: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [modelPda] = this.getModelPda(authority.publicKey, nonce);

        const tx = await this.program.methods
            .initializeModel(
                modelHash,
                modelType,
                apiEndpoint,
                new BN(inferenceFee.toString()),
                new BN(nonce.toString())
            )
            .accounts({
                modelRegistry: modelPda,
                protocolConfig: configPda,
                authority: authority.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([authority])
            .rpc();

        return tx;
    }

    async updateModel(
        authority: Keypair,
        modelPda: PublicKey,
        apiEndpoint: string | null,
        inferenceFee: bigint | null,
        active: boolean | null
    ): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .updateModel(
                apiEndpoint,
                inferenceFee ? new BN(inferenceFee.toString()) : null,
                active
            )
            .accounts({
                modelRegistry: modelPda,
                protocolConfig: configPda,
                authority: authority.publicKey,
            })
            .signers([authority])
            .rpc();

        return tx;
    }

    async finalizeTraining(
        authority: Keypair,
        modelPda: PublicKey,
        accuracyBps: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .finalizeTraining(new BN(accuracyBps.toString()))
            .accounts({
                modelRegistry: modelPda,
                protocolConfig: configPda,
                authority: authority.publicKey,
            })
            .signers([authority])
            .rpc();

        return tx;
    }

    // ========================================================================
    // DATA SUBMISSIONS
    // ========================================================================

    async submitData(
        submitter: Keypair,
        dataHash: string,
        dataType: DataType,
        dataSize: bigint,
        metadata: string,
        nonce: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [dataPda] = this.getDataSubmissionPda(submitter.publicKey, nonce);

        const tx = await this.program.methods
            .submitData(
                dataHash,
                dataType,
                new BN(dataSize.toString()),
                metadata,
                new BN(nonce.toString())
            )
            .accounts({
                dataSubmission: dataPda,
                protocolConfig: configPda,
                submitter: submitter.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([submitter])
            .rpc();

        return tx;
    }

    async rateData(
        validator: Keypair,
        dataSubmissionPda: PublicKey,
        qualityScore: number
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [validatorPda] = this.getValidatorPda(validator.publicKey);

        const tx = await this.program.methods
            .rateData(qualityScore)
            .accounts({
                dataSubmission: dataSubmissionPda,
                validatorAccount: validatorPda,
                protocolConfig: configPda,
                validator: validator.publicKey,
            })
            .signers([validator])
            .rpc();

        return tx;
    }

    // ========================================================================
    // STAKING
    // ========================================================================

    async stakeTokens(
        user: Keypair,
        userTokenAccount: PublicKey,
        vaultTokenAccount: PublicKey,
        amount: bigint,
        lockDuration: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [stakePda] = this.getStakePda(user.publicKey);

        const tx = await this.program.methods
            .stakeTokens(
                new BN(amount.toString()),
                new BN(lockDuration.toString())
            )
            .accounts({
                stakeAccount: stakePda,
                userTokenAccount,
                vaultTokenAccount,
                protocolConfig: configPda,
                user: user.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc();

        return tx;
    }

    async requestUnstake(user: Keypair): Promise<string> {
        const [stakePda] = this.getStakePda(user.publicKey);

        const tx = await this.program.methods
            .requestUnstake()
            .accounts({
                stakeAccount: stakePda,
                user: user.publicKey,
            })
            .signers([user])
            .rpc();

        return tx;
    }

    async executeUnstake(
        user: Keypair,
        userTokenAccount: PublicKey,
        vaultTokenAccount: PublicKey
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [stakePda] = this.getStakePda(user.publicKey);

        const tx = await this.program.methods
            .executeUnstake()
            .accounts({
                stakeAccount: stakePda,
                userTokenAccount,
                vaultTokenAccount,
                protocolConfig: configPda,
                user: user.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        return tx;
    }

    // ========================================================================
    // VALIDATORS
    // ========================================================================

    async registerValidator(
        validator: Keypair,
        userTokenAccount: PublicKey,
        validatorVault: PublicKey,
        stakeAmount: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [validatorPda] = this.getValidatorPda(validator.publicKey);

        const tx = await this.program.methods
            .registerValidator(new BN(stakeAmount.toString()))
            .accounts({
                validatorAccount: validatorPda,
                userTokenAccount,
                validatorVault,
                protocolConfig: configPda,
                validator: validator.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([validator])
            .rpc();

        return tx;
    }

    async slashValidator(
        admin: Keypair,
        validatorPda: PublicKey,
        validatorVault: PublicKey,
        tokenMint: PublicKey
    ): Promise<string> {
        const [configPda] = this.getConfigPda();

        const tx = await this.program.methods
            .slashValidator()
            .accounts({
                validatorAccount: validatorPda,
                validatorVault,
                tokenMint,
                protocolConfig: configPda,
                admin: admin.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([admin])
            .rpc();

        return tx;
    }

    // ========================================================================
    // DNA RECORDING
    // ========================================================================

    async recordDnaGeneration(
        author: Keypair,
        dnaHash: string,
        utilityScore: bigint
    ): Promise<string> {
        const [configPda] = this.getConfigPda();
        const [dnaPda] = this.getDnaPda(author.publicKey, dnaHash);

        const tx = await this.program.methods
            .recordDnaGeneration(dnaHash, new BN(utilityScore.toString()))
            .accounts({
                dnaSubmission: dnaPda,
                protocolConfig: configPda,
                author: author.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([author])
            .rpc();

        return tx;
    }

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    async getProtocolConfig(): Promise<ProtocolConfigAccount | null> {
        const [configPda] = this.getConfigPda();
        try {
            const account = await (this.program.account as any).protocolConfig.fetch(configPda);
            return this.parseProtocolConfig(account);
        } catch {
            return null;
        }
    }

    async getModel(modelPda: PublicKey): Promise<ModelRegistryAccount | null> {
        try {
            const account = await (this.program.account as any).modelRegistry.fetch(modelPda);
            return this.parseModelRegistry(account);
        } catch {
            return null;
        }
    }

    async getDataSubmission(dataPda: PublicKey): Promise<DataSubmissionAccount | null> {
        try {
            const account = await (this.program.account as any).dataSubmission.fetch(dataPda);
            return this.parseDataSubmission(account);
        } catch {
            return null;
        }
    }

    async getValidator(validatorPda: PublicKey): Promise<ValidatorAccount | null> {
        try {
            const account = await (this.program.account as any).validatorAccount.fetch(validatorPda);
            return this.parseValidator(account);
        } catch {
            return null;
        }
    }

    async getInferenceRequest(inferencePda: PublicKey): Promise<InferenceRequestAccount | null> {
        try {
            const account = await (this.program.account as any).inferenceRequest.fetch(inferencePda);
            return this.parseInferenceRequest(account);
        } catch {
            return null;
        }
    }

    async getStakeAccount(stakePda: PublicKey): Promise<StakeAccount | null> {
        try {
            const account = await (this.program.account as any).stakeAccount.fetch(stakePda);
            return this.parseStakeAccount(account);
        } catch {
            return null;
        }
    }

    async getDnaSubmission(dnaPda: PublicKey): Promise<DnaSubmissionAccount | null> {
        try {
            const account = await (this.program.account as any).dnaSubmission.fetch(dnaPda);
            return this.parseDnaSubmission(account);
        } catch {
            return null;
        }
    }

    async getDnaByAuthorAndHash(
        author: PublicKey,
        dnaHash: string
    ): Promise<DnaSubmissionAccount | null> {
        const [dnaPda] = this.getDnaPda(author, dnaHash);
        return this.getDnaSubmission(dnaPda);
    }

    // ========================================================================
    // PARSERS
    // ========================================================================

    private parseProtocolConfig(account: any): ProtocolConfigAccount {
        return {
            admin: account.admin.toBase58(),
            pendingAdmin: account.pendingAdmin ? account.pendingAdmin.toBase58() : null,
            treasury: account.treasury.toBase58(),
            paused: account.paused,
            totalModels: BigInt(account.totalModels.toString()),
            totalValidators: BigInt(account.totalValidators.toString()),
            totalInferences: BigInt(account.totalInferences.toString()),
            totalStaked: BigInt(account.totalStaked.toString()),
            protocolFeeBps: BigInt(account.protocolFeeBps.toString()),
            createdAt: BigInt(account.createdAt.toString()),
            bump: account.bump,
        };
    }

    private parseModelRegistry(account: any): ModelRegistryAccount {
        return {
            authority: account.authority.toBase58(),
            modelCid: account.modelCid,
            modelType: account.modelType,
            apiEndpoint: account.apiEndpoint,
            inferenceFee: BigInt(account.inferenceFee.toString()),
            accuracyBps: BigInt(account.accuracyBps.toString()),
            trainingComplete: account.trainingComplete,
            validationCount: BigInt(account.validationCount.toString()),
            totalInferences: BigInt(account.totalInferences.toString()),
            totalRevenue: BigInt(account.totalRevenue.toString()),
            active: account.active,
            nonce: BigInt(account.nonce.toString()),
            createdAt: BigInt(account.createdAt.toString()),
            updatedAt: BigInt(account.updatedAt.toString()),
            bump: account.bump,
        };
    }

    private parseDataSubmission(account: any): DataSubmissionAccount {
        return {
            submitter: account.submitter.toBase58(),
            dataHash: account.dataHash,
            dataType: account.dataType,
            dataSize: BigInt(account.dataSize.toString()),
            metadata: account.metadata,
            qualityScore: account.qualityScore,
            validated: account.validated,
            nonce: BigInt(account.nonce.toString()),
            submittedAt: BigInt(account.submittedAt.toString()),
            validatedAt: account.validatedAt ? BigInt(account.validatedAt.toString()) : null,
            validator: account.validator ? account.validator.toBase58() : null,
            bump: account.bump,
        };
    }

    private parseValidator(account: any): ValidatorAccount {
        return {
            validator: account.validator.toBase58(),
            tokensStaked: BigInt(account.tokensStaked.toString()),
            validationsPerformed: BigInt(account.validationsPerformed.toString()),
            reputationScore: BigInt(account.reputationScore.toString()),
            active: account.active,
            slashed: account.slashed,
            joinedAt: BigInt(account.joinedAt.toString()),
            bump: account.bump,
        };
    }

    private parseInferenceRequest(account: any): InferenceRequestAccount {
        return {
            requester: account.requester.toBase58(),
            modelId: account.modelId.toBase58(),
            inputData: account.inputData,
            confidenceThresholdBps: BigInt(account.confidenceThresholdBps.toString()),
            prediction: account.prediction ?? null,
            confidenceBps: account.confidenceBps ? BigInt(account.confidenceBps.toString()) : null,
            processingTimeMs: account.processingTimeMs
                ? BigInt(account.processingTimeMs.toString())
                : null,
            qualityScore: account.qualityScore ?? null,
            status: account.status,
            modelFee: BigInt(account.modelFee.toString()),
            protocolFee: BigInt(account.protocolFee.toString()),
            nonce: BigInt(account.nonce.toString()),
            requestedAt: BigInt(account.requestedAt.toString()),
            completedAt: account.completedAt ? BigInt(account.completedAt.toString()) : null,
            bump: account.bump,
        };
    }

    private parseStakeAccount(account: any): StakeAccount {
        return {
            staker: account.staker.toBase58(),
            amount: BigInt(account.amount.toString()),
            lockDuration: BigInt(account.lockDuration.toString()),
            stakedAt: BigInt(account.stakedAt.toString()),
            unlockAt: BigInt(account.unlockAt.toString()),
            lastClaimAt: BigInt(account.lastClaimAt.toString()),
            unstakeRequestedAt: account.unstakeRequestedAt
                ? BigInt(account.unstakeRequestedAt.toString())
                : null,
            bump: account.bump,
        };
    }

    private parseDnaSubmission(account: any): DnaSubmissionAccount {
        return {
            author: account.author.toBase58(),
            dnaHash: account.dnaHash,
            utilityScore: BigInt(account.utilityScore.toString()),
            timestamp: BigInt(account.timestamp.toString()),
            bump: account.bump,
        };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create model type enum
 */
export function createModelType(type: string): ModelType {
    const types: Record<string, ModelType> = {
        sentimentAnalysis: { sentimentAnalysis: {} },
        textGeneration: { textGeneration: {} },
        imageClassification: { imageClassification: {} },
        pricePrediction: { pricePrediction: {} },
        documentUnderstanding: { documentUnderstanding: {} },
        audioTranscription: { audioTranscription: {} },
        codeGeneration: { codeGeneration: {} },
        embedding: { embedding: {} },
    };
    return types[type] || types.textGeneration;
}

/**
 * Create data type enum
 */
export function createDataType(type: string): DataType {
    const types: Record<string, DataType> = {
        text: { text: {} },
        image: { image: {} },
        audio: { audio: {} },
        video: { video: {} },
        tradingData: { tradingData: {} },
        solanaTransactions: { solanaTransactions: {} },
        nftMetadata: { nftMetadata: {} },
        deFiData: { deFiData: {} },
        embeddings: { embeddings: {} },
    };
    return types[type] || types.text;
}

/**
 * Get lock duration value from tier name
 */
export function getLockDuration(tier: string): bigint {
    const tiers: Record<string, bigint> = {
        '1day': BigInt(LOCK_1_DAY),
        '1week': BigInt(LOCK_1_WEEK),
        '1month': BigInt(LOCK_1_MONTH),
        '3months': BigInt(LOCK_3_MONTHS),
        '6months': BigInt(LOCK_6_MONTHS),
        '1year': BigInt(LOCK_1_YEAR),
    };
    return tiers[tier] || BigInt(LOCK_1_DAY);
}

/**
 * Get lock multiplier for a duration (for display purposes)
 */
export function getLockMultiplier(lockDuration: bigint): number {
    const duration = Number(lockDuration);
    switch (duration) {
        case LOCK_1_DAY:
            return 1.0;
        case LOCK_1_WEEK:
            return 1.5;
        case LOCK_1_MONTH:
            return 2.0;
        case LOCK_3_MONTHS:
            return 3.0;
        case LOCK_6_MONTHS:
            return 4.0;
        case LOCK_1_YEAR:
            return 6.0;
        default:
            return 1.0;
    }
}

/**
 * Generate a random DNA hash (for testing)
 */
export function generateRandomDnaHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}
