/**
 * ClawdRouter — x402 Payment Protocol (Solana-native)
 * HTTP 402 Payment Required → wallet signs USDC → retry → response
 * Compatible with the solana-clawd x402 service
 */

import type {
  ClawdWallet,
  ClawdRouterConfig,
  X402PaymentRequired,
  X402PaymentHeader,
  PaymentRecord,
} from '../types.js';
import { signMessage, USDC_MINT } from '../wallet/solana.js';

// ── Constants ───────────────────────────────────────────────────────

const X402_VERSION = '1';
const X402_SCHEME = 'exact';
const PAYMENT_HEADER = 'X-Payment';
const PAYMENT_REQUIRED_HEADER = 'X-Payment-Required';

// ── Payment Flow ────────────────────────────────────────────────────

/**
 * Execute an x402 payment-authenticated fetch
 *
 * Flow:
 * 1. Make initial request
 * 2. If 402, parse payment requirement from header
 * 3. Validate against spending limits
 * 4. Sign USDC transfer with wallet
 * 5. Retry request with X-Payment header
 */
export async function x402Fetch(
  url: string,
  options: RequestInit,
  wallet: ClawdWallet,
  config: ClawdRouterConfig,
  tracker: PaymentTracker,
): Promise<Response> {
  // Initial request
  const response = await fetch(url, options);

  // Not a payment request — return directly
  if (response.status !== 402) {
    return response;
  }

  // Parse payment requirement
  const requirementHeader = response.headers.get(PAYMENT_REQUIRED_HEADER);
  if (!requirementHeader) {
    throw new X402Error('402 received but no X-Payment-Required header', 'MISSING_HEADER');
  }

  let requirement: X402PaymentRequired;
  try {
    requirement = JSON.parse(
      Buffer.from(requirementHeader, 'base64').toString('utf-8')
    );
  } catch {
    throw new X402Error('Invalid X-Payment-Required header', 'INVALID_HEADER');
  }

  // Validate amount against limits
  const amountUSDC = parseFloat(requirement.amount) / 1e6; // Convert from smallest unit
  validateSpendingLimits(amountUSDC, config, tracker);

  // Sign the payment
  const paymentHeader = await signPayment(requirement, wallet, config);

  // Retry with payment header
  const retryOptions = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
      [PAYMENT_HEADER]: Buffer.from(JSON.stringify(paymentHeader)).toString('base64'),
    },
  };

  const paidResponse = await fetch(url, retryOptions);

  // Record payment
  tracker.record({
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    model: extractModelFromUrl(url),
    inputTokens: 0, // Updated after response
    outputTokens: 0,
    costUSDC: amountUSDC,
    txSignature: undefined, // Set after confirmation
    network: config.network,
  });

  return paidResponse;
}

// ── Payment Signing ─────────────────────────────────────────────────

async function signPayment(
  requirement: X402PaymentRequired,
  wallet: ClawdWallet,
  config: ClawdRouterConfig,
): Promise<X402PaymentHeader> {
  // Construct the message to sign
  const message = new TextEncoder().encode(JSON.stringify({
    version: X402_VERSION,
    scheme: X402_SCHEME,
    amount: requirement.amount,
    recipient: requirement.recipient,
    token: requirement.token,
    nonce: requirement.nonce,
    network: config.network,
    sender: wallet.publicKey,
    timestamp: Date.now(),
  }));

  // Sign with Ed25519
  const signature = signMessage(message, wallet.secretKey);

  return {
    version: '1',
    scheme: 'exact',
    network: config.network,
    payload: Buffer.from(signature).toString('base64'),
    sender: wallet.publicKey,
  };
}

// ── Spending Limits ─────────────────────────────────────────────────

function validateSpendingLimits(
  amountUSDC: number,
  config: ClawdRouterConfig,
  tracker: PaymentTracker,
): void {
  // Per-request limit
  if (amountUSDC > config.maxPerRequest) {
    throw new X402Error(
      `Request costs $${amountUSDC.toFixed(4)} USDC, exceeds per-request limit of $${config.maxPerRequest}`,
      'LIMIT_PER_REQUEST',
    );
  }

  // Per-session limit
  if (tracker.sessionTotal + amountUSDC > config.maxPerSession) {
    throw new X402Error(
      `Session spend would reach $${(tracker.sessionTotal + amountUSDC).toFixed(2)}, exceeds limit of $${config.maxPerSession}`,
      'LIMIT_PER_SESSION',
    );
  }
}

// ── Payment Tracker ─────────────────────────────────────────────────

export class PaymentTracker {
  private payments: PaymentRecord[] = [];
  private _sessionStart: number = Date.now();

  get sessionTotal(): number {
    return this.payments.reduce((sum, p) => sum + p.costUSDC, 0);
  }

  get count(): number {
    return this.payments.length;
  }

  get sessionStart(): number {
    return this._sessionStart;
  }

  record(payment: PaymentRecord): void {
    this.payments.push(payment);
  }

  getPayments(): PaymentRecord[] {
    return [...this.payments];
  }

  getByModel(): Record<string, { count: number; total: number }> {
    const byModel: Record<string, { count: number; total: number }> = {};
    for (const p of this.payments) {
      if (!byModel[p.model]) byModel[p.model] = { count: 0, total: 0 };
      byModel[p.model]!.count++;
      byModel[p.model]!.total += p.costUSDC;
    }
    return byModel;
  }

  reset(): void {
    this.payments = [];
    this._sessionStart = Date.now();
  }

  formatStats(): string {
    const lines: string[] = [''];
    lines.push('  💰 Payment History');
    lines.push('  ═══════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`  Session started: ${new Date(this._sessionStart).toLocaleString()}`);
    lines.push(`  Total requests:  ${this.count}`);
    lines.push(`  Total spent:     $${this.sessionTotal.toFixed(4)} USDC`);
    lines.push('');

    const byModel = this.getByModel();
    if (Object.keys(byModel).length > 0) {
      lines.push('  By model:');
      for (const [model, stats] of Object.entries(byModel)) {
        lines.push(`    ${model.padEnd(35)} ${stats.count} reqs  $${stats.total.toFixed(4)}`);
      }
    }

    return lines.join('\n');
  }
}

// ── Error Class ─────────────────────────────────────────────────────

export class X402Error extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'X402Error';
    this.code = code;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function extractModelFromUrl(url: string): string {
  // Try to extract model from request URL
  const match = url.match(/model[=:]([^&\s]+)/);
  return match?.[1] ?? 'unknown';
}
