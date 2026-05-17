/**
 * x402 Facilitator — Payment Verification & Settlement (Solana)
 *
 * Verifies x402 payment transactions and optionally submits them on-chain.
 *
 * Can be used:
 * - **Locally** inside the server middleware (verifyPaymentLocal)
 * - **As a standalone service** (X402Facilitator class)
 */

import {
  Connection,
  Transaction,
  PublicKey,
  SendOptions,
} from '@solana/web3.js';
import {
  decodeTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import type {
  PaymentPayload,
  VerificationResult,
  SettlementResult,
  SolanaNetwork,
} from './types.js';
import { X402_VERSION } from './types.js';
import { getDefaultRpcUrl } from './constants.js';

// ---------------------------------------------------------------------------
// Local verification (no on-chain submission)
// ---------------------------------------------------------------------------

/**
 * Verify a payment payload locally by deserialising the transaction
 * and checking its instructions.
 *
 * This does NOT submit the transaction — use `X402Facilitator.settle()`
 * for that.
 */
export async function verifyPaymentLocal(
  payment: PaymentPayload,
  network: SolanaNetwork
): Promise<VerificationResult> {
  // Version check
  if (payment.x402Version !== X402_VERSION) {
    return {
      valid: false,
      error: `Unsupported x402 version: ${payment.x402Version}`,
    };
  }

  // Scheme check
  if (payment.scheme !== 'exact') {
    return {
      valid: false,
      error: `Unsupported payment scheme: ${payment.scheme}`,
    };
  }

  // Network check
  if (payment.network !== network) {
    return {
      valid: false,
      error: `Network mismatch: expected ${network}, got ${payment.network}`,
    };
  }

  // Deserialise the transaction
  let transaction: Transaction;
  try {
    const buffer = Buffer.from(payment.transaction, 'base64');
    transaction = Transaction.from(buffer);
  } catch (error) {
    return {
      valid: false,
      error: `Failed to deserialise transaction: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Verify the transaction has at least one signature
  if (!transaction.signatures.length) {
    return {
      valid: false,
      error: 'Transaction has no signatures',
    };
  }

  // Verify the fee payer matches the declared payer
  const feePayer = transaction.feePayer;
  if (!feePayer || feePayer.toBase58() !== payment.payer) {
    return {
      valid: false,
      error: `Fee payer mismatch: expected ${payment.payer}, got ${feePayer?.toBase58() ?? 'none'}`,
    };
  }

  const tokenMint = new PublicKey(payment.token);
  const recipientWallet = new PublicKey(payment.payTo);
  const payerWallet = new PublicKey(payment.payer);
  const expectedDestination = getAssociatedTokenAddressSync(
    tokenMint,
    recipientWallet,
    true
  );
  const expectedSource = getAssociatedTokenAddressSync(tokenMint, payerWallet);

  const transferInstruction = transaction.instructions.find((instruction) =>
    instruction.programId.equals(TOKEN_PROGRAM_ID)
  );

  if (!transferInstruction) {
    return {
      valid: false,
      error: 'Transaction does not contain a token transfer instruction',
    };
  }

  let decodedTransfer: ReturnType<typeof decodeTransferCheckedInstruction>;
  try {
    decodedTransfer = decodeTransferCheckedInstruction(transferInstruction);
  } catch (error) {
    return {
      valid: false,
      error: `Unsupported token transfer instruction: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!decodedTransfer.keys.owner.pubkey.equals(payerWallet)) {
    return {
      valid: false,
      error: 'Token transfer authority does not match the declared payer',
    };
  }

  if (!decodedTransfer.keys.source.pubkey.equals(expectedSource)) {
    return {
      valid: false,
      error: 'Token transfer source account mismatch',
    };
  }

  if (!decodedTransfer.keys.destination.pubkey.equals(expectedDestination)) {
    return {
      valid: false,
      error: 'Token transfer destination account mismatch',
    };
  }

  if (!decodedTransfer.keys.mint.pubkey.equals(tokenMint)) {
    return {
      valid: false,
      error: 'Token mint mismatch',
    };
  }

  if (BigInt(decodedTransfer.data.amount.toString()) < BigInt(payment.amount)) {
    return {
      valid: false,
      error: 'Token transfer amount is below the declared payment amount',
    };
  }

  const signature = transaction.signatures.find((entry) =>
    entry.publicKey.equals(payerWallet)
  );
  if (!signature?.signature) {
    return {
      valid: false,
      error: 'Transaction not signed by the declared payer',
    };
  }

  return {
    valid: true,
    amount: payment.amount,
    payer: payment.payer,
    payTo: payment.payTo,
  };
}

// ---------------------------------------------------------------------------
// Facilitator service (verify + settle on-chain)
// ---------------------------------------------------------------------------

export interface FacilitatorOptions {
  /** Solana RPC endpoint */
  rpcUrl?: string;

  /** Network */
  network?: SolanaNetwork;

  /** Options passed to sendRawTransaction */
  sendOptions?: SendOptions;

  /** Whether to wait for confirmation after submission */
  waitForConfirmation?: boolean;

  /** Maximum allowed age of the transaction blockhash (seconds) */
  maxBlockhashAge?: number;
}

/**
 * A facilitator verifies and settles x402 payments on Solana.
 *
 * ```ts
 * const facilitator = new X402Facilitator({
 *   network: 'solana-devnet',
 * });
 *
 * // Verify only
 * const result = await facilitator.verify(paymentPayload);
 *
 * // Verify + submit on-chain
 * const settlement = await facilitator.settle(paymentPayload);
 * console.log(settlement.txSignature);
 * ```
 */
export class X402Facilitator {
  private readonly connection: Connection;
  private readonly network: SolanaNetwork;
  private readonly sendOptions: SendOptions;
  private readonly waitForConfirmation: boolean;

  constructor(options: FacilitatorOptions = {}) {
    this.network = options.network ?? 'solana-mainnet';
    this.connection = new Connection(
      options.rpcUrl ?? getDefaultRpcUrl(this.network),
      'confirmed'
    );
    this.sendOptions = options.sendOptions ?? {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    };
    this.waitForConfirmation = options.waitForConfirmation ?? true;
  }

  /**
   * Verify a payment payload without submitting it.
   */
  async verify(payment: PaymentPayload): Promise<VerificationResult> {
    return verifyPaymentLocal(payment, this.network);
  }

  /**
   * Verify and submit a payment transaction on-chain.
   */
  async settle(payment: PaymentPayload): Promise<SettlementResult> {
    // First verify
    const verification = await this.verify(payment);
    if (!verification.valid) {
      return {
        success: false,
        error: verification.error,
        network: this.network,
      };
    }

    // Deserialise and submit
    try {
      const buffer = Buffer.from(payment.transaction, 'base64');
      const txSignature = await this.connection.sendRawTransaction(
        buffer,
        this.sendOptions
      );

      if (this.waitForConfirmation) {
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash('confirmed');

        await this.connection.confirmTransaction(
          {
            signature: txSignature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );
      }

      return {
        success: true,
        txSignature,
        network: this.network,
        payer: payment.payer,
        amount: payment.amount,
      };
    } catch (error) {
      return {
        success: false,
        error: `Settlement failed: ${error instanceof Error ? error.message : String(error)}`,
        network: this.network,
        payer: payment.payer,
        amount: payment.amount,
      };
    }
  }

  /**
   * Check the status of a previously settled transaction.
   */
  async getSettlementStatus(
    txSignature: string
  ): Promise<{ confirmed: boolean; slot?: number; error?: string }> {
    try {
      const status = await this.connection.getSignatureStatus(txSignature);
      if (!status.value) {
        return { confirmed: false, error: 'Transaction not found' };
      }
      return {
        confirmed:
          status.value.confirmationStatus === 'confirmed' ||
          status.value.confirmationStatus === 'finalized',
        slot: status.value.slot,
      };
    } catch (error) {
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new facilitator instance */
export function createFacilitator(
  options?: FacilitatorOptions
): X402Facilitator {
  return new X402Facilitator(options);
}

