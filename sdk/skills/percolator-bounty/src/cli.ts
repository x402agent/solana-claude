#!/usr/bin/env node
/**
 * percolator-bounty CLI
 *
 * Leviathan skill — autonomous keeper and oracle monitor for the
 * Percolator bounty4 STOXX50/SOL 20x hybrid market.
 *
 * Usage:
 *   percolator-bounty status
 *   percolator-bounty crank
 *   percolator-bounty monitor [--interval <secs>]
 *   percolator-bounty opportunities
 *   percolator-bounty ewma
 */

import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Inline copies of percolator SDK helpers
// (bundled here so the skill runs standalone without percolator-cli as a dep)
// ---------------------------------------------------------------------------

const MAGIC = 0x504552434f4c4154n; // "PERCOLAT"
const HEADER_LEN = 136;
const CONFIG_OFFSET = HEADER_LEN;
const CONFIG_LEN = 528;
const ENGINE_OFF = 664;

const BOUNTY4_PROGRAM = new PublicKey("4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz");
const BOUNTY4_SLAB    = new PublicKey("GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj");
const BOUNTY4_ORACLE  = new PublicKey("C2Cf16vF6LX8GrWJwfZga5z5tjVsax5VWnL2T7Q8CF91");
const BOUNTY4_LEG2   = new PublicKey("Fu76ChamBDjE8UuGLV6GP2AcPPSU6gjhkNhAyuoPm7ny");
const BOUNTY4_LEG3   = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");
const MAX_STALENESS  = 600n; // seconds

// ---- Slab readers ----

function readU128LE(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return (hi << 64n) | lo;
}

interface SlabCore {
  markEwmaE6: bigint;
  markEwmaLastSlot: bigint;
  markEwmaHalflifeSlots: bigint;
  tradeFeeBaseBps: bigint;
  tradeFeeMode: bigint;
  invert: number;
  maxStalenessSecs: bigint;
  vault: bigint;
  insurance: bigint;
  oiLong: bigint;
  oiShort: bigint;
  materializedAccounts: bigint;
  negPnlAccounts: bigint;
  pnlPosTot: bigint;
  currentSlot: bigint;
  lastOraclePrice: bigint;
}

function parseSlabCore(data: Buffer): SlabCore {
  const magic = data.readBigUInt64LE(0);
  if (magic !== MAGIC) throw new Error(`Bad slab magic: ${magic.toString(16)}`);

  let off = CONFIG_OFFSET;
  off += 32 + 32 + 32 + 32 + 32; // collateralMint, vault, indexFeedId, leg2FeedId, leg3FeedId
  off += 1 + 1 + 14; // legCount, legFlags, padding
  const maxStalenessSecs = data.readBigUInt64LE(off); off += 8;
  off += 2 + 1; // confFilterBps, vaultAuthorityBump
  const invert = data.readUInt8(off); off += 1;
  off += 4 + 8 + 8 + 8 + 8; // unitScale, fundingHorizonSlots, fundingKBps, maxPremium, maxE9
  off += 32 + 8 + 8 + 8; // hyperpAuthority, hyperpMarkE6, lastOraclePublishTime, lastEffectivePriceE6
  off += 2 + 2 + 1 + 3; // insuranceWithdrawMaxBps, tvlCapMult, depositsOnly, padding
  off += 8 + 8 + 8; // withdrawCooldown, oracleTargetPriceE6, oracleTargetPublishTime
  off += 3 * 8; // oracleLegPricesE6[3]
  off += 3 * 8; // oracleLegPublishTimes[3]
  off += 8; // lastHyperpIndexSlot
  off += 16; // lastMarkPushSlot (u128)
  off += 8 + 8; // lastInsuranceWithdrawSlot, insuranceWithdrawDepositRemaining
  const markEwmaE6 = data.readBigUInt64LE(off); off += 8;
  const markEwmaLastSlot = data.readBigUInt64LE(off); off += 8;
  const markEwmaHalflifeSlots = data.readBigUInt64LE(off); off += 8;
  off += 8 + 8 + 8; // initRestartSlot, permissionlessResolveStaleSlots, lastGoodOracleSlot
  off += 16 + 8 + 8 + 8; // maintenanceFeePerSlot (u128), feeSweepCursorWord, feeSweepCursorBit, markMinFee
  const tradeFeeBaseBps = data.readBigUInt64LE(off); off += 8;
  const tradeFeeMode = data.readBigUInt64LE(off); // off += 8;

  // Engine state
  const eBase = ENGINE_OFF;
  const vault = readU128LE(data, eBase + 0);
  const insurance = readU128LE(data, eBase + 16);
  const currentSlot = data.readBigUInt64LE(eBase + 200);

  // OI at fixed offsets from ENGINE_OFF (from slab.ts constants)
  const oiLong  = readU128LE(data, eBase + 472);
  const oiShort = readU128LE(data, eBase + 488);

  // materializedAccountCount at ENGINE_OFF + 824
  const materializedAccounts = data.readBigUInt64LE(eBase + 824);
  const negPnlAccounts       = data.readBigUInt64LE(eBase + 832);
  const pnlPosTot             = readU128LE(data, eBase + 328);
  const lastOraclePrice       = data.readBigUInt64LE(eBase + 1000);

  return {
    markEwmaE6, markEwmaLastSlot, markEwmaHalflifeSlots,
    tradeFeeBaseBps, tradeFeeMode, invert, maxStalenessSecs,
    vault, insurance, oiLong, oiShort,
    materializedAccounts, negPnlAccounts, pnlPosTot,
    currentSlot, lastOraclePrice,
  };
}

// ---- Pyth PriceUpdateV2 reader ----

interface LegPrice {
  price: bigint;
  conf: bigint;
  exponent: number;
  publishTime: bigint;
  emaPrice: bigint;
}

function parsePyth(data: Buffer): LegPrice {
  if (data.length < 133) throw new Error(`Pyth account too short: ${data.length}`);
  const verLevel = data.readUInt8(40);
  const msgOff   = 41 + (verLevel === 1 ? 0 : 1); // Full=1→1 byte, Partial=0→2 bytes
  const pOff     = msgOff + 32; // skip feed_id
  return {
    price:       data.readBigInt64LE(pOff),
    conf:        data.readBigUInt64LE(pOff + 8),
    exponent:    data.readInt32LE(pOff + 16),
    publishTime: data.readBigInt64LE(pOff + 20),
    emaPrice:    data.readBigInt64LE(pOff + 36),
  };
}

function toE6(raw: bigint, exp: number): bigint {
  const shift = exp + 6;
  if (shift >= 0) return raw * 10n ** BigInt(shift);
  return raw / 10n ** BigInt(-shift);
}

// ---- EWMA ----

function advanceEwma(slab: SlabCore, newMarkE6?: bigint): bigint {
  const halflife = slab.markEwmaHalflifeSlots > 0n ? slab.markEwmaHalflifeSlots : 6480000n;
  const dt       = slab.currentSlot > slab.markEwmaLastSlot
    ? slab.currentSlot - slab.markEwmaLastSlot
    : 0n;
  const decay    = Math.pow(2, -Number(dt) / Number(halflife));
  if (newMarkE6 === undefined || newMarkE6 === 0n) return slab.markEwmaE6;
  return BigInt(Math.round(Number(slab.markEwmaE6) * decay + Number(newMarkE6) * (1 - decay)));
}

// ---- Keeper crank instruction encoding ----
// tag=5 (KeeperCrank), 2-byte callerIdx, 2-byte candidate count, then u16[] candidates

function encodeKeeperCrank(callerIdx: number, candidates: number[]): Buffer {
  const buf = Buffer.allocUnsafe(1 + 2 + 2 + candidates.length * 2);
  let off = 0;
  buf.writeUInt8(5, off++);
  buf.writeUInt16LE(callerIdx, off); off += 2;
  buf.writeUInt16LE(candidates.length, off); off += 2;
  for (const c of candidates) { buf.writeUInt16LE(c, off); off += 2; }
  return buf;
}

// ---- Config / keypair loading ----

function loadRpc(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.RPC_URL ||
    "https://api.mainnet-beta.solana.com"
  );
}

function loadKeypair(): Keypair | null {
  const kpPath = process.env.SOLANA_KEYPAIR || join(homedir(), ".config", "solana", "id.json");
  if (!existsSync(kpPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(kpPath, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdStatus(conn: Connection): Promise<void> {
  const [slabInfo, l1Info, l2Info, l3Info] = await Promise.all([
    conn.getAccountInfo(BOUNTY4_SLAB),
    conn.getAccountInfo(BOUNTY4_ORACLE),
    conn.getAccountInfo(BOUNTY4_LEG2),
    conn.getAccountInfo(BOUNTY4_LEG3),
  ]);

  if (!slabInfo) throw new Error("Slab account not found");
  if (!l1Info || !l2Info || !l3Info) throw new Error("Oracle leg account not found");

  const slab = parseSlabCore(Buffer.from(slabInfo.data));
  const leg1 = parsePyth(Buffer.from(l1Info.data));
  const leg2 = parsePyth(Buffer.from(l2Info.data));
  const leg3 = parsePyth(Buffer.from(l3Info.data));

  const now     = BigInt(Math.floor(Date.now() / 1000));
  const age1    = now - leg1.publishTime;
  const age2    = now - leg2.publishTime;
  const age3    = now - leg3.publishTime;
  const stale1  = age1 > MAX_STALENESS;
  const stale2  = age2 > MAX_STALENESS;
  const stale3  = age3 > MAX_STALENESS;

  const leg1E6  = toE6(leg1.price, leg1.exponent);
  const leg2E6  = toE6(leg2.price, leg2.exponent);
  const leg3E6  = toE6(leg3.price, leg3.exponent);
  const rawE6   = leg3E6 > 0n ? (leg1E6 * leg2E6) / leg3E6 : 0n;
  const markE6  = slab.invert && rawE6 > 0n ? 1_000_000_000_000n / rawE6 : rawE6;

  const ewmaNow = advanceEwma(slab, stale1 ? undefined : markE6);
  const ewmaRef = slab.markEwmaE6 > 0n ? slab.markEwmaE6 : markE6;
  const ewmaDiff = ewmaNow > ewmaRef ? ewmaNow - ewmaRef : ewmaRef - ewmaNow;
  const ewmaMoveBps = ewmaRef > 0n ? (ewmaDiff * 10000n) / ewmaRef : 0n;
  const effectiveBps = slab.tradeFeeBaseBps + (stale1 ? ewmaMoveBps : 0n);
  const cappedBps = effectiveBps < 10000n ? effectiveBps : 10000n;

  console.log(`=== Percolator Bounty4 — STOXX50/SOL 20x Hybrid ===`);
  console.log(`Slot: ${slab.currentSlot}  |  timestamp: ${now} (unix)`);
  console.log(``);
  console.log(`Oracle Legs (max_staleness=${MAX_STALENESS}s):`);
  console.log(`  Leg1 STOXX50/EUR: price=${leg1E6}  age=${age1}s  ${stale1 ? "STALE ⚠" : "fresh"}`);
  console.log(`  Leg2 EUR/USD:     price=${leg2E6}  age=${age2}s  ${stale2 ? "STALE ⚠" : "fresh"}`);
  console.log(`  Leg3 SOL/USD:     price=${leg3E6}  age=${age3}s  ${stale3 ? "STALE ⚠" : "fresh"}`);
  console.log(``);
  console.log(`Composite (STOXX50/SOL):`);
  console.log(`  raw = Leg1 × Leg2 / Leg3 = ${rawE6}e-6`);
  console.log(`  mark (inverted) = ${markE6}e-6  ≈  ${(Number(markE6) / 1e6).toFixed(6)}`);
  console.log(``);
  console.log(`EWMA Mark:`);
  console.log(`  stored=${slab.markEwmaE6}  advanced=${ewmaNow}  halflife=${slab.markEwmaHalflifeSlots}slots`);
  console.log(`  lastSlot=${slab.markEwmaLastSlot}  dt=${slab.currentSlot - slab.markEwmaLastSlot}slots`);
  console.log(``);
  console.log(`Fee (HYBRID_AFTER_HOURS=${stale1}):`);
  console.log(`  base=${slab.tradeFeeBaseBps}bps + ewmaMove=${stale1 ? ewmaMoveBps : 0n}bps = ${effectiveBps}bps (capped=${cappedBps}bps)`);
  console.log(``);
  console.log(`Engine:`);
  console.log(`  vault=${(Number(slab.vault) / 1e9).toFixed(4)} SOL`);
  console.log(`  insurance=${(Number(slab.insurance) / 1e9).toFixed(4)} SOL`);
  console.log(`  OI long=${(Number(slab.oiLong) / 1e6).toFixed(4)}  short=${(Number(slab.oiShort) / 1e6).toFixed(4)}`);
  console.log(`  accounts=${slab.materializedAccounts}  negPnl=${slab.negPnlAccounts}`);
  console.log(`  pnlPosTot=${(Number(slab.pnlPosTot) / 1e9).toFixed(6)} SOL`);
  console.log(`  lastOraclePrice=${slab.lastOraclePrice}e-6`);
}

async function cmdEwma(conn: Connection): Promise<void> {
  const slabInfo = await conn.getAccountInfo(BOUNTY4_SLAB);
  if (!slabInfo) throw new Error("Slab not found");
  const slab = parseSlabCore(Buffer.from(slabInfo.data));

  const halflife = slab.markEwmaHalflifeSlots > 0n ? slab.markEwmaHalflifeSlots : 6480000n;
  const dt       = slab.currentSlot - slab.markEwmaLastSlot;
  const decay    = Math.pow(2, -Number(dt) / Number(halflife));

  console.log(JSON.stringify({
    markEwmaE6:           slab.markEwmaE6.toString(),
    markEwmaLastSlot:     slab.markEwmaLastSlot.toString(),
    markEwmaHalflifeSlots: halflife.toString(),
    currentSlot:          slab.currentSlot.toString(),
    dtSlots:              dt.toString(),
    decayFactor:          decay,
    markFloat:            Number(slab.markEwmaE6) / 1e6,
    tradeFeeMode:         slab.tradeFeeMode.toString(),
    tradeFeeBaseBps:      slab.tradeFeeBaseBps.toString(),
  }, null, 2));
}

async function cmdCrank(conn: Connection): Promise<void> {
  const kp = loadKeypair();
  if (!kp) {
    console.error("No keypair found. Set SOLANA_KEYPAIR env or place key at ~/.config/solana/id.json");
    process.exit(1);
  }

  console.log(`Cranking with payer: ${kp.publicKey.toBase58()}`);

  const ixData = encodeKeeperCrank(65535, []); // permissionless, no pre-selected candidates

  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: kp.publicKey });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
  tx.add({
    programId: BOUNTY4_PROGRAM,
    keys: [
      { pubkey: kp.publicKey,        isSigner: true,  isWritable: false },
      { pubkey: BOUNTY4_SLAB,        isSigner: false, isWritable: true  },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: BOUNTY4_ORACLE,      isSigner: false, isWritable: false },
      // Remaining accounts: leg2 and leg3 for composite oracle validation
      { pubkey: BOUNTY4_LEG2,        isSigner: false, isWritable: false },
      { pubkey: BOUNTY4_LEG3,        isSigner: false, isWritable: false },
    ],
    data: ixData,
  });

  try {
    const sig = await sendAndConfirmTransaction(conn, tx, [kp], { commitment: "confirmed" });
    console.log(`Crank confirmed: ${sig}`);
  } catch (err) {
    // If the 3-leg remaining-accounts variant is rejected, fall back to 4-account form
    console.warn(`3-leg crank failed (${(err as Error).message}), retrying with single oracle account...`);
    const tx2 = new Transaction({ recentBlockhash: blockhash, feePayer: kp.publicKey });
    tx2.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    tx2.add({
      programId: BOUNTY4_PROGRAM,
      keys: [
        { pubkey: kp.publicKey,        isSigner: true,  isWritable: false },
        { pubkey: BOUNTY4_SLAB,        isSigner: false, isWritable: true  },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: BOUNTY4_ORACLE,      isSigner: false, isWritable: false },
      ],
      data: ixData,
    });
    const sig2 = await sendAndConfirmTransaction(conn, tx2, [kp], { commitment: "confirmed" });
    console.log(`Fallback crank confirmed: ${sig2}`);
  }
}

async function cmdOpportunities(conn: Connection): Promise<void> {
  const slabInfo = await conn.getAccountInfo(BOUNTY4_SLAB);
  if (!slabInfo) throw new Error("Slab not found");
  const slab = parseSlabCore(Buffer.from(slabInfo.data));

  const insuranceSOL  = Number(slab.insurance) / 1e9;
  const vaultSOL      = Number(slab.vault) / 1e9;
  const numAccounts   = Number(slab.materializedAccounts);
  const negPnl        = Number(slab.negPnlAccounts);
  const pnlPosTotSOL  = Number(slab.pnlPosTot) / 1e9;

  const opportunities = [
    {
      rank: 1,
      strategy: "keeper-crank (operational)",
      finding: "—",
      feasible: true,
      notes: `${numAccounts} accounts; earns crank fees + funding; ` +
             `permissionless; insurance=${insuranceSOL.toFixed(4)} SOL`,
    },
    {
      rank: 2,
      strategy: "lp-provisioning",
      finding: "—",
      feasible: vaultSOL > 0.1,
      notes: `Earn trading fees as LP; after-hours fee spike benefits LPs; ` +
             `vault=${vaultSOL.toFixed(4)} SOL`,
    },
    {
      rank: 3,
      strategy: "finding-D: partial→full liq cascade",
      finding: "D (OPEN)",
      feasible: negPnl > 0,
      notes: `${negPnl} neg-PnL accounts; partial liquidation may cascade; ` +
             `no fix deployed on mainnet bounty4`,
    },
    {
      rank: 4,
      strategy: "finding-B: early warmup settlement",
      finding: "B (OPEN)",
      feasible: pnlPosTotSOL > 0.001,
      notes: `${pnlPosTotSOL.toFixed(6)} SOL positive PnL total; ` +
             `settle early (low account idx) for better haircut`,
    },
    {
      rank: 5,
      strategy: "finding-N: micro warmup floor",
      finding: "N (OPEN)",
      feasible: false,
      notes: "1-lamport PnL warms in 1 slot; tx cost (~5000 lam) exceeds gain; " +
             "net negative at current fee structure",
    },
    {
      rank: 6,
      strategy: "finding-O: stale close (reduced severity)",
      finding: "O (OPEN, LOW)",
      feasible: true,
      notes: "close_account skips freshness check; only affects zero-position/zero-PnL accounts; " +
             "risk is LOW per audit review",
    },
  ];

  console.log("=== Bounty4 Opportunity Ranking ===");
  console.log(`Insurance fund: ${insuranceSOL.toFixed(4)} SOL  |  Vault: ${vaultSOL.toFixed(4)} SOL`);
  console.log("");
  for (const op of opportunities) {
    const icon = op.feasible ? "✓" : "✗";
    console.log(`[${op.rank}] ${icon} ${op.strategy}`);
    console.log(`    Finding: ${op.finding}`);
    console.log(`    ${op.notes}`);
    console.log("");
  }
  console.log("Three Laws reminder: only engage feasible strategies; harm to real users = violation of Law I.");
}

async function cmdMonitor(conn: Connection, intervalSecs: number): Promise<void> {
  console.log(`Monitoring bounty4 every ${intervalSecs}s... (Ctrl+C to stop)`);
  while (true) {
    const ts = new Date().toISOString();
    console.log(`\n--- ${ts} ---`);
    try {
      await cmdStatus(conn);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
    await new Promise(r => setTimeout(r, intervalSecs * 1000));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd  = args[0] || "status";

  const rpcUrl = loadRpc();
  const conn   = new Connection(rpcUrl, "confirmed");

  switch (cmd) {
    case "status":
      await cmdStatus(conn);
      break;

    case "ewma":
      await cmdEwma(conn);
      break;

    case "crank":
      await cmdCrank(conn);
      break;

    case "opportunities":
      await cmdOpportunities(conn);
      break;

    case "register-goal": {
      // Copies the bundled goal document into ~/.openclawd/goals/ so the
      // Leviathan picks it up on the next tail-flick.
      const { mkdirSync, copyFileSync, existsSync: fe } = await import("node:fs");
      const { join: pjoin } = await import("node:path");
      const goalSrc = new URL('../../../goals/percolator-bounty.md', import.meta.url).pathname;
      const goalDir = pjoin(homedir(), ".openclawd", "goals");
      const goalDst = pjoin(goalDir, "percolator-bounty.md");
      mkdirSync(goalDir, { recursive: true });
      if (!fe(goalSrc)) {
        console.error(`Goal source not found: ${goalSrc}`);
        console.error("Run from the openclawd-framework directory.");
        process.exit(1);
      }
      copyFileSync(goalSrc, goalDst);
      console.log(`Goal registered at: ${goalDst}`);
      console.log("The Leviathan will pick it up on its next tail-flick.");
      break;
    }

    case "monitor": {
      const intervalArg = args.indexOf("--interval");
      const intervalSecs = intervalArg >= 0 ? parseInt(args[intervalArg + 1] || "60", 10) : 60;
      await cmdMonitor(conn, isNaN(intervalSecs) ? 60 : intervalSecs);
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.error("Usage: percolator-bounty <status|crank|monitor|opportunities|ewma> [options]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
