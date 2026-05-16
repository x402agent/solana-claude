/**
 * leviathan/src/agent/vulcan.ts — Typed wrapper for vulcan-cli (Phoenix perps)
 *
 * Devnet-only enforcement is baked in. Every command injects --url=devnet
 * unless the VULCAN_MAINNET env var is explicitly set to '1' (requires human).
 *
 * Live order placement requires BOTH:
 *   LIVE_TRADING=true  AND  OPERATOR_CONFIRMED=true
 * If either flag is absent the placeOrder call returns a [PAPER TRADE] result
 * and NEVER touches the chain.
 *
 * Commands map to the vulcan CLI: `vulcan <command> [options]`
 */

import { execa } from 'execa';

const VULCAN_TIMEOUT = 15_000;

export function resolveCluster(): string {
  if (process.env['VULCAN_MAINNET'] === '1') return 'mainnet-beta';
  return 'devnet';
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface VulcanMarket {
  pubkey: string;
  name: string;
  baseSymbol: string;
  quoteSymbol: string;
  openInterest: string;
  fundingRate: string;
  markPrice: string;
}

export interface VulcanQuote {
  market: string;
  side: 'long' | 'short';
  size: string;
  entryPrice: string;
  fee: string;
  liquidationPrice: string;
  notional: string;
}

export interface VulcanOrderResult {
  orderId: string;
  market: string;
  side: 'long' | 'short';
  size: string;
  price: string;
  fee: string;
  signature?: string;
  paperMode?: boolean;
}

export interface VulcanPosition {
  positionId: string;
  market: string;
  side: 'long' | 'short';
  size: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  liquidationPrice: string;
}

export interface VulcanFundingRate {
  market: string;
  fundingRate: string;
  nextFundingTime: string;
  direction: 'longs_pay_shorts' | 'shorts_pay_longs';
}

export interface VulcanAccountInfo {
  wallet: string;
  equity: string;
  freeMargin: string;
  usedMargin: string;
  leverage: string;
  marginRatio: string;
}

export interface VulcanPlaceOrderOpts {
  /** Limit price — omit for market orders */
  limitPrice?: string;
  /** Reduce-only order (close position only) */
  reduceOnly?: boolean;
  /** Client-side order tag */
  clientOrderId?: string;
}

// ─── Internal runner ─────────────────────────────────────────────────────────

async function runCmd(
  args: string[],
  timeoutMs = VULCAN_TIMEOUT,
): Promise<{ stdout: string; success: boolean; error?: string }> {
  const cluster = resolveCluster();
  const fullArgs = [...args, `--url=${cluster}`, '--output=json'];
  try {
    const result = await execa('vulcan', fullArgs, { timeout: timeoutMs });
    return { stdout: result.stdout, success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { stdout: '', success: false, error: msg.slice(0, 200) };
  }
}

// ─── VulcanClient ─────────────────────────────────────────────────────────────

export const VulcanClient = {
  /**
   * List all Phoenix perp markets.
   */
  async markets(): Promise<VulcanMarket[] | string> {
    const r = await runCmd(['markets']);
    if (!r.success) return `vulcan markets failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanMarket[]; }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * Get a trade quote (entry price, fees, liquidation price) before committing.
   * Always safe — never executes anything on-chain.
   */
  async quote(
    market: string,
    side: 'long' | 'short',
    size: string,
  ): Promise<VulcanQuote | string> {
    const r = await runCmd(['quote', '--market', market, `--side=${side}`, `--size=${size}`]);
    if (!r.success) return `vulcan quote failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanQuote; }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * Place a perp order.
   *
   * SAFETY GATE: returns a [PAPER TRADE] result unless BOTH
   *   process.env.LIVE_TRADING === 'true'
   *   process.env.OPERATOR_CONFIRMED === 'true'
   * are set. Live execution is NEVER triggered without both flags.
   *
   * Note: wallet signing is handled by the vulcan keystore / --wallet env var;
   * no private key material is ever passed through this function.
   */
  async placeOrder(
    market: string,
    side: 'long' | 'short',
    size: string,
    opts: VulcanPlaceOrderOpts = {},
  ): Promise<VulcanOrderResult | string> {
    // ── CRITICAL safety gate ────────────────────────────────────────────────
    const liveTrading = process.env['LIVE_TRADING'] === 'true';
    const operatorConfirmed = process.env['OPERATOR_CONFIRMED'] === 'true';

    if (!liveTrading || !operatorConfirmed) {
      // Paper trade: fetch a quote and return it without broadcasting
      const quoteResult = await VulcanClient.quote(market, side, size);
      if (typeof quoteResult === 'string') {
        return `[PAPER TRADE] quote failed — ${quoteResult}`;
      }
      return {
        orderId: `paper-${Date.now()}`,
        market,
        side,
        size,
        price: quoteResult.entryPrice,
        fee: quoteResult.fee,
        paperMode: true,
      };
    }

    // ── Live path (both flags confirmed) ────────────────────────────────────
    const args = ['place-order', '--market', market, `--side=${side}`, `--size=${size}`];
    if (opts.limitPrice) args.push(`--limit-price=${opts.limitPrice}`);
    if (opts.reduceOnly) args.push('--reduce-only');
    if (opts.clientOrderId) args.push(`--client-order-id=${opts.clientOrderId}`);

    const r = await runCmd(args);
    if (!r.success) return `vulcan place-order failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanOrderResult; }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * Cancel an open order by its order ID.
   */
  async cancelOrder(orderId: string): Promise<unknown> {
    const r = await runCmd(['cancel-order', '--order-id', orderId]);
    if (!r.success) return `vulcan cancel-order failed: ${r.error}`;
    try { return JSON.parse(r.stdout); }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * List open positions for a wallet (defaults to the configured keystore wallet).
   */
  async positions(wallet?: string): Promise<VulcanPosition[] | string> {
    const args = ['positions'];
    if (wallet) args.push('--wallet', wallet);
    const r = await runCmd(args);
    if (!r.success) return `vulcan positions failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanPosition[]; }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * Get the current funding rate for a Phoenix perp market.
   */
  async fundingRate(market: string): Promise<VulcanFundingRate | string> {
    const r = await runCmd(['funding-rate', '--market', market]);
    if (!r.success) return `vulcan funding-rate failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanFundingRate; }
    catch { return r.stdout.slice(0, 500); }
  },

  /**
   * Get account equity, margin, and leverage for a wallet.
   */
  async accountInfo(wallet?: string): Promise<VulcanAccountInfo | string> {
    const args = ['account'];
    if (wallet) args.push('--wallet', wallet);
    const r = await runCmd(args);
    if (!r.success) return `vulcan account failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as VulcanAccountInfo; }
    catch { return r.stdout.slice(0, 500); }
  },
};
