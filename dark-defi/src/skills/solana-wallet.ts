// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Solana Wallet Skills
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WalletInfo {
  publicKey: string;
  solBalance: number;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  mint: string;
  symbol?: string;
  balance: number;
  decimals: number;
  uiBalance: number;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Manager
// ─────────────────────────────────────────────────────────────────────────────

export class SolanaWalletManager {
  private connection: Connection;
  private keypair?: Keypair;
  private walletPath: string;

  constructor(rpcUrl: string, walletPath?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.walletPath = walletPath || path.join(os.homedir(), '.darkralph', 'wallet.json');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Wallet Management
  // ─────────────────────────────────────────────────────────────────────────────

  async createWallet(): Promise<{ publicKey: string; created: boolean }> {
    // Check if wallet already exists
    if (fs.existsSync(this.walletPath)) {
      const loaded = this.loadWallet();
      if (loaded) {
        return { publicKey: this.keypair!.publicKey.toString(), created: false };
      }
    }

    // Create new wallet
    this.keypair = Keypair.generate();

    // Ensure directory exists
    const dir = path.dirname(this.walletPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save wallet
    const walletData = {
      publicKey: this.keypair.publicKey.toString(),
      secretKey: Array.from(this.keypair.secretKey),
    };

    fs.writeFileSync(this.walletPath, JSON.stringify(walletData, null, 2));

    return { publicKey: this.keypair.publicKey.toString(), created: true };
  }

  loadWallet(): boolean {
    try {
      if (!fs.existsSync(this.walletPath)) {
        return false;
      }

      const data = JSON.parse(fs.readFileSync(this.walletPath, 'utf-8'));
      this.keypair = Keypair.fromSecretKey(Uint8Array.from(data.secretKey));
      return true;
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return false;
    }
  }

  loadFromPrivateKey(privateKey: string): boolean {
    try {
      // Support base58 or array format
      let secretKey: Uint8Array;

      if (privateKey.startsWith('[')) {
        // Array format
        secretKey = Uint8Array.from(JSON.parse(privateKey));
      } else {
        // Base58 format - would need bs58 library
        // For now, assume it's a JSON array string
        secretKey = Uint8Array.from(JSON.parse(privateKey));
      }

      this.keypair = Keypair.fromSecretKey(secretKey);
      return true;
    } catch (error) {
      console.error('Failed to load from private key:', error);
      return false;
    }
  }

  getPublicKey(): string | null {
    return this.keypair?.publicKey.toString() || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Balance & Token Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async getBalance(address?: string): Promise<number> {
    const pubkey = address ? new PublicKey(address) : this.keypair?.publicKey;
    if (!pubkey) throw new Error('No wallet loaded');

    const balance = await this.connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getTokenBalances(address?: string): Promise<TokenBalance[]> {
    const pubkey = address ? new PublicKey(address) : this.keypair?.publicKey;
    if (!pubkey) throw new Error('No wallet loaded');

    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    return tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: parseInt(info.tokenAmount.amount),
        decimals: info.tokenAmount.decimals,
        uiBalance: info.tokenAmount.uiAmount || 0,
      };
    });
  }

  async getWalletInfo(address?: string): Promise<WalletInfo> {
    const pubkey = address || this.keypair?.publicKey.toString();
    if (!pubkey) throw new Error('No wallet loaded');

    const [solBalance, tokens] = await Promise.all([this.getBalance(pubkey), this.getTokenBalances(pubkey)]);

    return {
      publicKey: pubkey,
      solBalance,
      tokens,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transactions
  // ─────────────────────────────────────────────────────────────────────────────

  async sendSol(toAddress: string, amount: number): Promise<TransactionResult> {
    if (!this.keypair) {
      return { success: false, error: 'No wallet loaded' };
    }

    try {
      const toPublicKey = new PublicKey(toAddress);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.keypair]);

      return { success: true, signature };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendToken(tokenMint: string, toAddress: string, amount: number): Promise<TransactionResult> {
    if (!this.keypair) {
      return { success: false, error: 'No wallet loaded' };
    }

    try {
      const mintPublicKey = new PublicKey(tokenMint);
      const toPublicKey = new PublicKey(toAddress);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, this.keypair.publicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // Get token decimals
      const fromAccount = await getAccount(this.connection, fromTokenAccount);

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          this.keypair.publicKey,
          BigInt(Math.round(amount * Math.pow(10, 9))) // Assuming 9 decimals, adjust as needed
        )
      );

      const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.keypair]);

      return { success: true, signature };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transaction History
  // ─────────────────────────────────────────────────────────────────────────────

  async getRecentTransactions(limit = 10): Promise<any[]> {
    if (!this.keypair) return [];

    try {
      const signatures = await this.connection.getSignaturesForAddress(this.keypair.publicKey, { limit });

      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        err: sig.err,
        memo: sig.memo,
      }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  async getTransactionDetails(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  async requestAirdrop(amount = 1): Promise<TransactionResult> {
    if (!this.keypair) {
      return { success: false, error: 'No wallet loaded' };
    }

    try {
      // Only works on devnet/testnet
      const signature = await this.connection.requestAirdrop(
        this.keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);

      return { success: true, signature };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    return blockhash;
  }

  async getSlot(): Promise<number> {
    return this.connection.getSlot();
  }

  isWalletLoaded(): boolean {
    return this.keypair !== undefined;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default SolanaWalletManager;
