/**
 * ORE Mining Protocol Client
 * TypeScript types and client for the ORE v2 mining program on Solana
 * Program ID: ore2LrFdxHRrcqwR1KVW5jLEqfAXEJMxRNSGzwj73yz
 * Mint: oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp (11 decimals)
 */

import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ORE_PROGRAM_ID, ORE_MINT, HELIUS_RPC_URL } from './config';

// ============================================================================
// CONSTANTS
// ============================================================================

export const ORE_DECIMALS = 11;
export const ORE_PROGRAM = new PublicKey(ORE_PROGRAM_ID);
export const ORE_TOKEN_MINT = new PublicKey(ORE_MINT);

/** PDA Seeds */
export const ORE_BOARD_SEED = 'board';
export const ORE_MINER_SEED = 'miner';
export const ORE_AUTOMATION_SEED = 'automation';
export const ORE_TREASURY_SEED = 'treasury';
export const ORE_ROUND_SEED = 'round';
export const ORE_STAKE_SEED = 'stake';
export const ORE_CONFIG_SEED = 'config';

/** Instruction discriminators */
export const ORE_IX = {
    AUTOMATE: 0,
    CHECKPOINT: 2,
    CLAIM_SOL: 3,
    CLAIM_ORE: 4,
    DEPLOY: 6,
    RESET: 9,
} as const;

/** Mining grid size (5x5 = 25 squares) */
export const GRID_SIZE = 25;

/** Slots per round (max) */
export const SLOTS_PER_ROUND = 150;

/** Fee per signer (lamports) */
export const FEE_PER_SIGNER = 5000;

/** Slot expiration window */
export const SLOT_EXPIRATION = 156;

// ============================================================================
// TYPES
// ============================================================================

export interface OreBoardState {
    roundId: number;
    startSlot: number;
    endSlot: number;
    epochId: number;
}

export interface OreMinerState {
    authority: string;
    deployed: number[];
    cumulative: number[];
    checkpointFee: number;
    checkpointId: number;
    lastClaimOreAt: number;
    lastClaimSolAt: number;
    rewardsSol: number;
    rewardsOre: number;
    refinedOre: number;
    roundId: number;
    lifetimeRewardsSol: number;
    lifetimeRewardsOre: number;
    lifetimeDeployed: number;
}

export interface OreAutomationState {
    amount: number;
    authority: string;
    balance: number;
    executor: string;
    fee: number;
    strategy: number;
    mask: number;
    reload: boolean;
}

export interface OreRoundInfo {
    roundId: number;
    startSlot: number;
    endSlot: number;
    currentSlot: number;
    slotsRemaining: number;
    timeRemainingSeconds: number;
}

export interface OreMiningStats {
    miner: OreMinerState | null;
    automation: OreAutomationState | null;
    oreBalance: number;
    solBalance: number;
    pendingOreRewards: number;
    pendingSolRewards: number;
    roundInfo: OreRoundInfo | null;
}

export enum OreAutomationStrategy {
    Random = 0,
    Preferred = 1,
    Discretionary = 2,
}

// ============================================================================
// PDA DERIVATION
// ============================================================================

export function oreBoardPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from(ORE_BOARD_SEED)], ORE_PROGRAM);
}

export function oreMinerPda(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(ORE_MINER_SEED), authority.toBuffer()],
        ORE_PROGRAM
    );
}

export function oreAutomationPda(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(ORE_AUTOMATION_SEED), authority.toBuffer()],
        ORE_PROGRAM
    );
}

export function oreTreasuryPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from(ORE_TREASURY_SEED)], ORE_PROGRAM);
}

export function oreRoundPda(roundId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(roundId));
    return PublicKey.findProgramAddressSync([Buffer.from(ORE_ROUND_SEED), buf], ORE_PROGRAM);
}

export function oreStakePda(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(ORE_STAKE_SEED), authority.toBuffer()],
        ORE_PROGRAM
    );
}

export function oreConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from(ORE_CONFIG_SEED)], ORE_PROGRAM);
}

// ============================================================================
// CLIENT
// ============================================================================

export class OreMinerClient {
    public connection: Connection;

    constructor(rpcUrl?: string) {
        this.connection = new Connection(rpcUrl || HELIUS_RPC_URL, 'confirmed');
    }

    /** Parse board state from account data */
    async getBoardState(): Promise<OreBoardState | null> {
        try {
            const [boardAddress] = oreBoardPda();
            const info = await this.connection.getAccountInfo(boardAddress);
            if (!info) return null;

            const data = info.data;
            const offset = 8;
            return {
                roundId: Number(data.readBigUInt64LE(offset)),
                startSlot: Number(data.readBigUInt64LE(offset + 8)),
                endSlot: Number(data.readBigUInt64LE(offset + 16)),
                epochId: Number(data.readBigUInt64LE(offset + 24)),
            };
        } catch {
            return null;
        }
    }

    /** Parse miner state from account data */
    async getMinerState(authority: PublicKey): Promise<OreMinerState | null> {
        try {
            const [minerAddress] = oreMinerPda(authority);
            const info = await this.connection.getAccountInfo(minerAddress);
            if (!info) return null;

            const data = info.data;
            const offset = 8;

            const deployed: number[] = [];
            for (let i = 0; i < GRID_SIZE; i++) {
                deployed.push(Number(data.readBigUInt64LE(offset + 32 + i * 8)));
            }

            const cumulative: number[] = [];
            for (let i = 0; i < GRID_SIZE; i++) {
                cumulative.push(Number(data.readBigUInt64LE(offset + 32 + 200 + i * 8)));
            }

            return {
                authority: new PublicKey(data.subarray(offset, offset + 32)).toString(),
                deployed,
                cumulative,
                checkpointFee: Number(data.readBigUInt64LE(offset + 432)),
                checkpointId: Number(data.readBigUInt64LE(offset + 440)),
                lastClaimOreAt: Number(data.readBigInt64LE(offset + 448)),
                lastClaimSolAt: Number(data.readBigInt64LE(offset + 456)),
                rewardsSol: Number(data.readBigUInt64LE(offset + 480)),
                rewardsOre: Number(data.readBigUInt64LE(offset + 488)),
                refinedOre: Number(data.readBigUInt64LE(offset + 496)),
                roundId: Number(data.readBigUInt64LE(offset + 504)),
                lifetimeRewardsSol: Number(data.readBigUInt64LE(offset + 512)),
                lifetimeRewardsOre: Number(data.readBigUInt64LE(offset + 520)),
                lifetimeDeployed: Number(data.readBigUInt64LE(offset + 528)),
            };
        } catch {
            return null;
        }
    }

    /** Parse automation state from account data */
    async getAutomationState(authority: PublicKey): Promise<OreAutomationState | null> {
        try {
            const [addr] = oreAutomationPda(authority);
            const info = await this.connection.getAccountInfo(addr);
            if (!info) return null;

            const data = info.data;
            const offset = 8;
            return {
                amount: Number(data.readBigUInt64LE(offset)),
                authority: new PublicKey(data.subarray(offset + 8, offset + 40)).toString(),
                balance: Number(data.readBigUInt64LE(offset + 40)),
                executor: new PublicKey(data.subarray(offset + 48, offset + 80)).toString(),
                fee: Number(data.readBigUInt64LE(offset + 80)),
                strategy: Number(data.readBigUInt64LE(offset + 88)),
                mask: Number(data.readBigUInt64LE(offset + 96)),
                reload: data.readBigUInt64LE(offset + 104) > 0,
            };
        } catch {
            return null;
        }
    }

    /** Get current round info with time remaining */
    async getCurrentRoundInfo(): Promise<OreRoundInfo | null> {
        const board = await this.getBoardState();
        if (!board) return null;

        const currentSlot = await this.connection.getSlot();
        const slotsRemaining = Math.max(0, board.endSlot - currentSlot);
        const timeRemainingSeconds = Math.floor(slotsRemaining * 0.4);

        return {
            roundId: board.roundId,
            startSlot: board.startSlot,
            endSlot: board.endSlot,
            currentSlot,
            slotsRemaining,
            timeRemainingSeconds,
        };
    }

    /** Get ORE token balance */
    async getOreBalance(wallet: PublicKey): Promise<number> {
        try {
            const ata = await getAssociatedTokenAddress(ORE_TOKEN_MINT, wallet);
            const bal = await this.connection.getTokenAccountBalance(ata);
            return Number(bal.value.uiAmount || 0);
        } catch {
            return 0;
        }
    }

    /** Get SOL balance */
    async getSolBalance(wallet: PublicKey): Promise<number> {
        try {
            const bal = await this.connection.getBalance(wallet);
            return bal / LAMPORTS_PER_SOL;
        } catch {
            return 0;
        }
    }

    /** Get comprehensive mining stats */
    async getMiningStats(wallet: PublicKey): Promise<OreMiningStats> {
        const [miner, automation, oreBalance, solBalance, roundInfo] = await Promise.all([
            this.getMinerState(wallet),
            this.getAutomationState(wallet),
            this.getOreBalance(wallet),
            this.getSolBalance(wallet),
            this.getCurrentRoundInfo(),
        ]);

        return {
            miner,
            automation,
            oreBalance,
            solBalance,
            pendingOreRewards: miner?.rewardsOre ? miner.rewardsOre / 1e11 : 0,
            pendingSolRewards: miner?.rewardsSol ? miner.rewardsSol / LAMPORTS_PER_SOL : 0,
            roundInfo,
        };
    }

    /** Build deploy instruction */
    buildDeployInstruction(
        signer: PublicKey,
        authority: PublicKey,
        amountSol: number,
        roundId: number,
        squares: boolean[]
    ): TransactionInstruction {
        const [automationAddress] = oreAutomationPda(authority);
        const [boardAddress] = oreBoardPda();
        const [configAddress] = oreConfigPda();
        const [minerAddress] = oreMinerPda(authority);
        const [roundAddress] = oreRoundPda(roundId);

        let mask = 0;
        for (let i = 0; i < GRID_SIZE && i < squares.length; i++) {
            if (squares[i]) mask |= 1 << i;
        }

        const data = Buffer.alloc(13);
        data.writeUInt8(ORE_IX.DEPLOY, 0);
        data.writeBigUInt64LE(BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL)), 1);
        data.writeUInt32LE(mask, 9);

        return new TransactionInstruction({
            programId: ORE_PROGRAM,
            keys: [
                { pubkey: signer, isSigner: true, isWritable: true },
                { pubkey: authority, isSigner: false, isWritable: true },
                { pubkey: automationAddress, isSigner: false, isWritable: true },
                { pubkey: boardAddress, isSigner: false, isWritable: true },
                { pubkey: configAddress, isSigner: false, isWritable: true },
                { pubkey: minerAddress, isSigner: false, isWritable: true },
                { pubkey: roundAddress, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: ORE_PROGRAM, isSigner: false, isWritable: false },
            ],
            data,
        });
    }

    /** Build claim SOL instruction */
    buildClaimSolInstruction(signer: PublicKey): TransactionInstruction {
        const [minerAddress] = oreMinerPda(signer);
        const data = Buffer.alloc(1);
        data.writeUInt8(ORE_IX.CLAIM_SOL, 0);

        return new TransactionInstruction({
            programId: ORE_PROGRAM,
            keys: [
                { pubkey: signer, isSigner: true, isWritable: true },
                { pubkey: minerAddress, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        });
    }

    /** Build claim ORE instruction */
    async buildClaimOreInstruction(signer: PublicKey): Promise<TransactionInstruction> {
        const [minerAddress] = oreMinerPda(signer);
        const [treasuryAddress] = oreTreasuryPda();
        const treasuryTokens = await getAssociatedTokenAddress(ORE_TOKEN_MINT, treasuryAddress, true);
        const recipient = await getAssociatedTokenAddress(ORE_TOKEN_MINT, signer);

        const data = Buffer.alloc(1);
        data.writeUInt8(ORE_IX.CLAIM_ORE, 0);

        return new TransactionInstruction({
            programId: ORE_PROGRAM,
            keys: [
                { pubkey: signer, isSigner: true, isWritable: true },
                { pubkey: minerAddress, isSigner: false, isWritable: true },
                { pubkey: ORE_TOKEN_MINT, isSigner: false, isWritable: true },
                { pubkey: recipient, isSigner: false, isWritable: true },
                { pubkey: treasuryAddress, isSigner: false, isWritable: true },
                { pubkey: treasuryTokens, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
            ],
            data,
        });
    }

    /** Build a deploy transaction */
    async buildDeployTransaction(
        wallet: PublicKey,
        amountSol: number,
        selectedSquares: boolean[]
    ): Promise<{ transaction: Transaction; roundId: number } | null> {
        const roundInfo = await this.getCurrentRoundInfo();
        if (!roundInfo) return null;

        const tx = new Transaction();
        tx.add(this.buildDeployInstruction(wallet, wallet, amountSol, roundInfo.roundId, selectedSquares));
        return { transaction: tx, roundId: roundInfo.roundId };
    }

    /** Build claim all rewards transaction */
    async buildClaimAllTransaction(wallet: PublicKey): Promise<Transaction> {
        const tx = new Transaction();
        const miner = await this.getMinerState(wallet);

        if (miner?.rewardsSol && miner.rewardsSol > 0) {
            tx.add(this.buildClaimSolInstruction(wallet));
        }
        if (miner?.rewardsOre && miner.rewardsOre > 0) {
            tx.add(await this.buildClaimOreInstruction(wallet));
        }

        return tx;
    }
}
