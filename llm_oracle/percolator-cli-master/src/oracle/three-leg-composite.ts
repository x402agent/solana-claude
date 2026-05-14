/**
 * three-leg-composite.ts
 *
 * Reads all three Pyth PriceUpdateV2 oracle accounts for the
 * bounty_stoxx50_sol_20x_hybrid market and computes:
 *
 *   composite = Leg1 * Leg2 / Leg3   (oracleLegFlags=0x04 → DIVIDE_LEG3)
 *   market = composite inverted       (config.invert=1)
 *   i.e., STOXX50_EUR × EUR_USD / SOL_USD = STOXX50/SOL
 *
 * When Leg1 (STOXX50/EUR) is stale (after EU hours), the module advances
 * the EWMA mark using the last known composite and reports the effective
 * HYBRID_AFTER_HOURS fee.
 *
 * Bounty4 mainnet constants:
 *   program   4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz
 *   slab      GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj
 *   oracle    C2Cf16vF6LX8GrWJwfZga5z5tjVsax5VWnL2T7Q8CF91  (STOXX50/EUR)
 *   leg2      Fu76ChamBDjE8UuGLV6GP2AcPPSU6gjhkNhAyuoPm7ny  (EUR/USD)
 *   leg3      7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE  (SOL/USD)
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  fetchSlab,
  parseConfig,
  parseEngine,
  parseAllAccounts,
  type MarketConfig,
  type EngineState,
} from "../solana/slab.js";

// ---------------------------------------------------------------------------
// Bounty4 constants
// ---------------------------------------------------------------------------
export const BOUNTY4 = {
  programId: new PublicKey("4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz"),
  slab:      new PublicKey("GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj"),
  oracle:    new PublicKey("C2Cf16vF6LX8GrWJwfZga5z5tjVsax5VWnL2T7Q8CF91"),
  oracleLeg2: new PublicKey("Fu76ChamBDjE8UuGLV6GP2AcPPSU6gjhkNhAyuoPm7ny"),
  oracleLeg3: new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"),
  vault:     new PublicKey("Bb7mjPkY7sfbSFRaxDFDQevWVZsLJEtLx7FgY4REwwtq"),
  vaultPda:  new PublicKey("FeNLRuLLZ2agxj7gfLoY6G2Gww8WG8foQ5Ptd7FqU5Sb"),
  maxStalenessSecs: 600n,
  feeMode: "HYBRID_AFTER_HOURS",
  tradeFeeBaseBps: 1n,
  maxTradingFeeBps: 10000n,
} as const;

// ---------------------------------------------------------------------------
// Pyth PriceUpdateV2 parsing
//
// Anchor discriminator (8 bytes) + write_authority (32 bytes) +
// verification_level (1 byte for Full, 2 for Partial) + PriceFeedMessage
//
// PriceFeedMessage layout:
//   feed_id          [u8; 32]
//   price            i64
//   conf             u64
//   exponent         i32
//   publish_time     i64
//   prev_publish_time i64
//   ema_price        i64
//   ema_conf         u64
// ---------------------------------------------------------------------------
const PYTH_DISCRIMINATOR_LEN = 8;
const WRITE_AUTHORITY_LEN    = 32;
const VERIFICATION_FULL      = 1;   // discriminant byte value for VerificationLevel::Full
const MSG_FEED_ID_LEN        = 32;

export interface PythLegPrice {
  feedId: Buffer;        // raw 32-byte feed id
  price: bigint;         // raw i64 (pre-exponent)
  conf: bigint;          // raw u64 confidence
  exponent: number;      // signed exponent (price_float = price * 10^exponent)
  publishTime: bigint;   // unix seconds (i64)
  emaPrice: bigint;      // raw i64
}

export function parsePythPriceUpdateV2(data: Buffer): PythLegPrice {
  if (data.length < 133) {
    throw new Error(`PriceUpdateV2 too short: ${data.length}`);
  }

  const verificationByte = data.readUInt8(PYTH_DISCRIMINATOR_LEN + WRITE_AUTHORITY_LEN);
  const msgOff = PYTH_DISCRIMINATOR_LEN + WRITE_AUTHORITY_LEN + (verificationByte === VERIFICATION_FULL ? 1 : 2);

  const feedId   = Buffer.from(data.subarray(msgOff, msgOff + MSG_FEED_ID_LEN));
  const priceOff = msgOff + MSG_FEED_ID_LEN;

  const price        = data.readBigInt64LE(priceOff);
  const conf         = data.readBigUInt64LE(priceOff + 8);
  const exponent     = data.readInt32LE(priceOff + 16);
  const publishTime  = data.readBigInt64LE(priceOff + 20);
  // prev_publish_time at +28
  const emaPrice     = data.readBigInt64LE(priceOff + 36);

  return { feedId, price, conf, exponent, publishTime, emaPrice };
}

// ---------------------------------------------------------------------------
// Per-leg staleness
// ---------------------------------------------------------------------------
export interface LegStatus {
  price: PythLegPrice;
  ageSeconds: bigint;
  stale: boolean;
}

function legStatus(price: PythLegPrice, nowSeconds: bigint, maxStaleness: bigint): LegStatus {
  const ageSeconds = nowSeconds - price.publishTime;
  return { price, ageSeconds, stale: ageSeconds > maxStaleness };
}

// ---------------------------------------------------------------------------
// Composite price computation (E6 scale)
//
// All three Pyth prices come in as (raw * 10^exponent).
// We normalise to e6 and compute: Leg1_e6 * Leg2_e6 / Leg3_e6
// Then invert if config.invert == 1: composite_e6 = 1e12 / raw_composite_e6
// ---------------------------------------------------------------------------
function toE6(raw: bigint, exponent: number): bigint {
  // Convert raw * 10^exponent to integer e6 (×1,000,000)
  // = raw * 10^(exponent + 6)
  const shift = exponent + 6;
  if (shift >= 0) {
    return raw * 10n ** BigInt(shift);
  } else {
    return raw / 10n ** BigInt(-shift);
  }
}

export interface CompositePrice {
  leg1E6:  bigint;   // STOXX50/EUR in e6
  leg2E6:  bigint;   // EUR/USD in e6
  leg3E6:  bigint;   // SOL/USD in e6
  rawE6:   bigint;   // Leg1 * Leg2 / Leg3 in e6
  markE6:  bigint;   // after inversion (STOXX50 per SOL, inverted)
  leg1Stale: boolean;
  leg2Stale: boolean;
  leg3Stale: boolean;
  anyStale:  boolean;
  leg1Age:   bigint;
  leg2Age:   bigint;
  leg3Age:   bigint;
}

export function computeComposite(
  leg1: PythLegPrice,
  leg2: PythLegPrice,
  leg3: PythLegPrice,
  invert: boolean,
  nowSeconds: bigint,
  maxStalenessSecs: bigint,
): CompositePrice {
  const l1 = legStatus(leg1, nowSeconds, maxStalenessSecs);
  const l2 = legStatus(leg2, nowSeconds, maxStalenessSecs);
  const l3 = legStatus(leg3, nowSeconds, maxStalenessSecs);

  const leg1E6 = toE6(l1.price.price, l1.price.exponent);
  const leg2E6 = toE6(l2.price.price, l2.price.exponent);
  const leg3E6 = toE6(l3.price.price, l3.price.exponent);

  // Composite in e6: Leg1 * Leg2 / Leg3 — keep precision with e6 arithmetic
  // rawE6 = (leg1E6 * leg2E6) / (leg3E6)   [result is e6]
  // (leg1E6 * leg2E6) is in e12, divide by leg3E6 to get e6
  const rawE6 = leg3E6 > 0n ? (leg1E6 * leg2E6) / leg3E6 : 0n;

  // invert=1: mark = 1e12 / rawE6  (SOL per STOXX50 → STOXX50 per SOL inversion)
  const markE6 = invert && rawE6 > 0n
    ? 1_000_000_000_000n / rawE6
    : rawE6;

  return {
    leg1E6, leg2E6, leg3E6, rawE6, markE6,
    leg1Stale: l1.stale, leg2Stale: l2.stale, leg3Stale: l3.stale,
    anyStale: l1.stale || l2.stale || l3.stale,
    leg1Age: l1.ageSeconds, leg2Age: l2.ageSeconds, leg3Age: l3.ageSeconds,
  };
}

// ---------------------------------------------------------------------------
// EWMA mark computation
//
// The slab stores:
//   markEwmaE6           — last accepted EWMA value
//   markEwmaLastSlot     — slot when EWMA was last updated
//   markEwmaHalflifeSlots — EWMA half-life in slots
//
// Formula:  ewma_new = ewma_prev * decay + mark_new * (1 - decay)
// where:    decay = 2^(-dt / halflife)
// ---------------------------------------------------------------------------
export interface EwmaState {
  ewmaE6:       bigint;   // current (possibly advanced) EWMA in e6
  lastSlot:     bigint;   // slot of last EWMA update
  halfliveSlots: bigint;
  decayFactor:  number;   // 0..1 decay for the current dt
  dtSlots:      bigint;   // slots elapsed since last update
}

export function advanceEwma(config: MarketConfig, currentSlot: bigint, newMarkE6?: bigint): EwmaState {
  const dtSlots = currentSlot > config.markEwmaLastSlot
    ? currentSlot - config.markEwmaLastSlot
    : 0n;

  const halflife = config.markEwmaHalflifeSlots > 0n ? config.markEwmaHalflifeSlots : 6480000n;
  const decayFactor = Math.pow(2, -Number(dtSlots) / Number(halflife));

  let ewmaE6 = config.markEwmaE6;
  if (newMarkE6 !== undefined && newMarkE6 > 0n) {
    // Advance: ewma = ewma_prev * decay + mark * (1 - decay)
    const ewmaPrevF = Number(ewmaE6);
    const markF     = Number(newMarkE6);
    ewmaE6 = BigInt(Math.round(ewmaPrevF * decayFactor + markF * (1 - decayFactor)));
  }

  return {
    ewmaE6,
    lastSlot: config.markEwmaLastSlot,
    halfliveSlots: halflife,
    decayFactor,
    dtSlots,
  };
}

// ---------------------------------------------------------------------------
// HYBRID_AFTER_HOURS effective fee
//
// When Leg1 (STOXX50) is stale:
//   effectiveFee = tradeFeeBaseBps + |ewma_movement_bps|
//   ewma_movement_bps = (ewma_new - ewma_ref) * 10000 / ewma_ref
//
// This makes mark manipulation attacks uneconomical: attacking the mark
// by trading costs at least as much as the mark can move.
// ---------------------------------------------------------------------------
export interface HybridFee {
  baseBps:        bigint;
  ewmaMovementBps: bigint;
  effectiveBps:   bigint;
  cappedBps:      bigint;   // capped at maxTradingFeeBps
  afterHours:     boolean;  // true when Leg1 is stale
}

export function computeHybridFee(
  config: MarketConfig,
  ewmaNow: bigint,
  ewmaRef: bigint,
  leg1Stale: boolean,
): HybridFee {
  const baseBps = config.tradeFeeBaseBps;
  const afterHours = leg1Stale;

  let ewmaMovementBps = 0n;
  if (afterHours && ewmaRef > 0n) {
    const diff = ewmaNow > ewmaRef ? ewmaNow - ewmaRef : ewmaRef - ewmaNow;
    ewmaMovementBps = (diff * 10000n) / ewmaRef;
  }

  const effectiveBps = baseBps + ewmaMovementBps;
  const cappedBps = effectiveBps < BOUNTY4.maxTradingFeeBps
    ? effectiveBps
    : BOUNTY4.maxTradingFeeBps;

  return { baseBps, ewmaMovementBps, effectiveBps, cappedBps, afterHours };
}

// ---------------------------------------------------------------------------
// Full slab + oracle snapshot
// ---------------------------------------------------------------------------
export interface SlabSnapshot {
  slot:     bigint;
  config:   MarketConfig;
  engine:   EngineState;
  accounts: ReturnType<typeof parseAllAccounts>;
}

export async function fetchSlabSnapshot(conn: Connection): Promise<SlabSnapshot> {
  const data = await fetchSlab(conn, BOUNTY4.slab, BOUNTY4.programId);
  const config  = parseConfig(data);
  const engine  = parseEngine(data);
  const accounts = parseAllAccounts(data);
  return { slot: engine.currentSlot, config, engine, accounts };
}

// ---------------------------------------------------------------------------
// Three-leg oracle snapshot
// ---------------------------------------------------------------------------
export interface OracleSnapshot {
  nowSeconds:  bigint;
  leg1:        PythLegPrice;
  leg2:        PythLegPrice;
  leg3:        PythLegPrice;
  composite:   CompositePrice;
  ewma:        EwmaState;
  fee:         HybridFee;
}

export async function fetchOracleSnapshot(
  conn: Connection,
  slab: SlabSnapshot,
): Promise<OracleSnapshot> {
  const [acc1, acc2, acc3] = await Promise.all([
    conn.getAccountInfo(BOUNTY4.oracle),
    conn.getAccountInfo(BOUNTY4.oracleLeg2),
    conn.getAccountInfo(BOUNTY4.oracleLeg3),
  ]);

  if (!acc1 || !acc2 || !acc3) {
    throw new Error("One or more oracle accounts not found");
  }

  const leg1 = parsePythPriceUpdateV2(Buffer.from(acc1.data));
  const leg2 = parsePythPriceUpdateV2(Buffer.from(acc2.data));
  const leg3 = parsePythPriceUpdateV2(Buffer.from(acc3.data));

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const invert     = slab.config.invert !== 0;

  const composite = computeComposite(leg1, leg2, leg3, invert, nowSeconds, BOUNTY4.maxStalenessSecs);
  const ewma      = advanceEwma(slab.config, slab.slot, composite.leg1Stale ? undefined : composite.markE6);

  const ewmaRef   = slab.config.markEwmaE6 > 0n ? slab.config.markEwmaE6 : composite.markE6;
  const fee       = computeHybridFee(slab.config, ewma.ewmaE6, ewmaRef, composite.leg1Stale);

  return { nowSeconds, leg1, leg2, leg3, composite, ewma, fee };
}

// ---------------------------------------------------------------------------
// Opportunity scoring for the bounty
//
// Strategies ranked by expected value within authorized bounty scope:
//   1. Keeper cranking fees  — earn crank rewards while market is live
//   2. LP provisioning       — earn trading fees as liquidity provider
//   3. Finding N             — micro warmup floor extraction (1-slot warmup)
//   4. Finding D             — partial liq → full liq cascade detection
//   5. Finding B             — early haircut settlement advantage
// ---------------------------------------------------------------------------
export interface BountyOpportunity {
  strategy:  string;
  findingRef: string;   // issue.md finding ID
  expectedValueSOL: number;
  feasible:  boolean;
  notes:     string;
}

export function scoreBountyOpportunities(
  slab: SlabSnapshot,
  oracle: OracleSnapshot,
): BountyOpportunity[] {
  const insuranceSOL  = Number(slab.engine.insuranceFund.balance) / 1e9;
  const vaultSOL      = Number(slab.engine.vault) / 1e9;
  const openLong      = Number(slab.engine.oiEffLongQ) / 1e6;
  const openShort     = Number(slab.engine.oiEffShortQ) / 1e6;
  const numAccounts   = Number(slab.engine.materializedAccountCount);

  const opportunities: BountyOpportunity[] = [];

  // Keeper crank rewards (permissionless, no special authority needed)
  opportunities.push({
    strategy: "keeper-crank",
    findingRef: "operational",
    expectedValueSOL: numAccounts > 0 ? 0.0001 * numAccounts : 0.001,
    feasible: true,
    notes: `${numAccounts} accounts to sweep; ${insuranceSOL.toFixed(4)} SOL insurance; ` +
           `HYBRID_AFTER_HOURS fee=${oracle.fee.effectiveBps}bps; ` +
           `afterHours=${oracle.fee.afterHours}`,
  });

  // LP provisioning
  const openInterestSOL = (openLong + openShort) / 2;
  opportunities.push({
    strategy: "lp-provision",
    findingRef: "operational",
    expectedValueSOL: openInterestSOL * (Number(oracle.fee.cappedBps) / 10000) * 0.5,
    feasible: vaultSOL > 0.1,
    notes: `OI=${openInterestSOL.toFixed(4)}SOL; fee=${oracle.fee.cappedBps}bps; ` +
           `afterHours spreads LP earnings`,
  });

  // Finding N: micro warmup floor (open-coded in issue.md)
  // Each micro-trade generating 1 unit PnL warms up in 1 slot instead of hMax slots
  const microPnlPerTrade = 1; // 1 lamport
  const txCost = 5000; // lamports
  opportunities.push({
    strategy: "finding-n-micro-warmup",
    findingRef: "N",
    expectedValueSOL: microPnlPerTrade > txCost ? (microPnlPerTrade - txCost) / 1e9 : -txCost / 1e9,
    feasible: false, // tx cost > 1-lamport gain; net negative per trade
    notes: "Slope floor=1 → 1-lamport PnL warms up in 1 slot. Net negative after tx fees (~5000 lam). " +
           "Only profitable at scale with near-zero fees.",
  });

  // Finding D: partial liq → full liq cascade
  // Profitable if we can detect an undercollateralized account and trigger liquidation
  const negPnlAccounts = Number(slab.engine.negPnlAccountCount);
  if (negPnlAccounts > 0) {
    opportunities.push({
      strategy: "finding-d-cascade-liq",
      findingRef: "D",
      expectedValueSOL: insuranceSOL * 0.001 * negPnlAccounts,
      feasible: true,
      notes: `${negPnlAccounts} accounts with negative PnL; partial→full cascade may be triggerable`,
    });
  }

  // Finding B: settlement ordering fairness
  // Early settlers get better haircut; deterministic by account index
  opportunities.push({
    strategy: "finding-b-early-settle",
    findingRef: "B",
    expectedValueSOL: vaultSOL * 0.0001,
    feasible: Number(slab.engine.pnlPosTot) > 0,
    notes: `haircut affects ${Number(slab.engine.pnlPosTot) / 1e9}SOL positive PnL total; ` +
           `settle early (low account index) for better rate`,
  });

  return opportunities.sort((a, b) => b.expectedValueSOL - a.expectedValueSOL);
}

// ---------------------------------------------------------------------------
// Human-readable status report
// ---------------------------------------------------------------------------
export function formatStatus(slab: SlabSnapshot, oracle: OracleSnapshot): string {
  const c = oracle.composite;
  const f = oracle.fee;
  const e = oracle.ewma;

  const lines = [
    `=== Percolator Bounty4 STOXX50/SOL 20x — Slot ${slab.slot} ===`,
    ``,
    `Oracle Legs (max_staleness=${BOUNTY4.maxStalenessSecs}s):`,
    `  Leg1 STOXX50/EUR: age=${c.leg1Age}s  ${c.leg1Stale ? "STALE ⚠" : "fresh"}`,
    `  Leg2 EUR/USD:     age=${c.leg2Age}s  ${c.leg2Stale ? "STALE ⚠" : "fresh"}`,
    `  Leg3 SOL/USD:     age=${c.leg3Age}s  ${c.leg3Stale ? "STALE ⚠" : "fresh"}`,
    ``,
    `Prices (e6):`,
    `  Leg1=${c.leg1E6}  Leg2=${c.leg2E6}  Leg3=${c.leg3E6}`,
    `  Raw composite = ${c.rawE6}  |  Mark (inverted) = ${c.markE6}`,
    ``,
    `EWMA Mark:`,
    `  ewmaE6=${e.ewmaE6}  lastSlot=${e.lastSlot}  halflife=${e.halfliveSlots}slots`,
    `  dt=${e.dtSlots}slots  decay=${e.decayFactor.toFixed(6)}`,
    ``,
    `Fee Mode: ${f.afterHours ? "HYBRID_AFTER_HOURS (Leg1 STALE)" : "normal"}`,
    `  base=${f.baseBps}bps + ewmaMove=${f.ewmaMovementBps}bps = effective=${f.effectiveBps}bps (capped=${f.cappedBps}bps)`,
    ``,
    `Engine:`,
    `  vault=${(Number(slab.engine.vault) / 1e9).toFixed(4)} SOL`,
    `  insurance=${(Number(slab.engine.insuranceFund.balance) / 1e9).toFixed(4)} SOL`,
    `  OI long=${(Number(slab.engine.oiEffLongQ) / 1e6).toFixed(4)}  short=${(Number(slab.engine.oiEffShortQ) / 1e6).toFixed(4)}`,
    `  accounts=${slab.engine.materializedAccountCount}  negPnl=${slab.engine.negPnlAccountCount}`,
    `  pnlPos=${(Number(slab.engine.pnlPosTot) / 1e9).toFixed(6)} SOL`,
  ];

  return lines.join("\n");
}
