/**
 * bounty4-trade.ts — execute the STOXX50/SOL after-hours SHORT arbitrage.
 *
 * Strategy:
 *   - EWMA mark is frozen (halflife 100 slots, 39k+ slots stale → decay=0)
 *   - Current EWMA=1,352,123 e6 vs composite=1,289,964 e6 (4.6% lower)
 *   - Fee at OPEN:  ~50bps (hybrid_soft_stale_matured=true, 49bps floor)
 *   - Fee at CLOSE: 1bps only (after oracle refreshes, soft_stale_matured=false)
 *   - Expected net: ~4.1% of position notional
 *
 * Fixes vs prior attempt:
 *   1. wSOL ATA created atomically before InitUser
 *   2. InitLP uses PROG+SLAB as matcher (slab owned by program → ownership check passes)
 *   3. TradeNoCpi appends ORACLE2/ORACLE3 as remaining accounts (not in buildAccountMetas)
 *
 * Required: ~0.15+ SOL in the keypair wallet
 *
 * Usage:
 *   SOLANA_KEYPAIR=~/.config/solana/new-mainnet-wallet.json \
 *   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=... \
 *   npx tsx scripts/bounty4-trade.ts [--dry-run] [--collateral <lamports>] [--close-only <userIdx> <lpIdx>]
 */

import {
  Connection, Keypair, PublicKey, Transaction, AccountMeta,
  ComputeBudgetProgram, sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY, LAMPORTS_PER_SOL, SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, NATIVE_MINT,
  createSyncNativeInstruction, getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  encodeInitUser, encodeInitLP, encodeDepositCollateral,
  encodeTradeNoCpi, encodeWithdrawCollateral, encodeCloseAccount,
} from "../src/abi/instructions.js";
import {
  ACCOUNTS_INIT_USER, ACCOUNTS_INIT_LP, ACCOUNTS_DEPOSIT_COLLATERAL,
  ACCOUNTS_TRADE_NOCPI, ACCOUNTS_WITHDRAW_COLLATERAL, ACCOUNTS_CLOSE_ACCOUNT,
  buildAccountMetas,
} from "../src/abi/accounts.js";
import { buildIx } from "../src/runtime/tx.js";
import {
  fetchSlab, parseEngine, parseConfig, parseUsedIndices,
} from "../src/solana/slab.js";

// ── market ──────────────────────────────────────────────────────────────────────
const CWD    = process.env.PERCOLATOR_DIR ?? path.dirname(new URL(import.meta.url).pathname);
const m      = JSON.parse(fs.readFileSync(path.join(CWD, "mainnet-bounty4-market.json"), "utf-8"));
const PROG   = new PublicKey(m.programId);
const SLAB   = new PublicKey(m.slab);
const VAULT  = new PublicKey(m.vault);
const VAULT_PDA = new PublicKey(m.vaultPda);
const ORACLE = new PublicKey(m.oracle);
const ORACLE2 = new PublicKey(m.oracleLeg2);
const ORACLE3 = new PublicKey(m.oracleLeg3);

// ── config ───────────────────────────────────────────────────────────────────────
const DRY_RUN    = process.argv.includes("--dry-run");
const CLOSE_ONLY = process.argv.includes("--close-only");
const COL_IDX    = process.argv.indexOf("--collateral");
// Default: 0.05 SOL collateral, 15x leverage (leaves 5% margin headroom from 20x limit)
const COLLATERAL = COL_IDX >= 0 ? BigInt(process.argv[COL_IDX + 1]) : BigInt(50_000_000);
const LEVERAGE   = BigInt(15);
const TRADE_SIZE = -(COLLATERAL * LEVERAGE); // negative = SHORT
// newAccountFee from market config (stored in RiskParams): 5,882,000 lamports per account
const NEW_ACCOUNT_FEE = BigInt(5_882_000);

// For --close-only mode
const CLOSE_ARGS = process.argv.indexOf("--close-only");
const CLOSE_USER_IDX = CLOSE_ARGS >= 0 ? parseInt(process.argv[CLOSE_ARGS + 1] ?? "0") : 0;
const CLOSE_LP_IDX   = CLOSE_ARGS >= 0 ? parseInt(process.argv[CLOSE_ARGS + 2] ?? "1") : 1;

// ── keypair + rpc ─────────────────────────────────────────────────────────────────
function loadKeypair(): Keypair {
  const p = process.env.SOLANA_KEYPAIR ?? path.join(os.homedir(), ".config/solana/new-mainnet-wallet.json");
  try {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf-8"))));
  } catch {
    // fallback to default keypair
    const fallback = path.join(os.homedir(), ".config/solana/id.json");
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(fallback, "utf-8"))));
  }
}
function loadRpc(): string {
  return process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
}

const payer = loadKeypair();
const conn  = new Connection(loadRpc(), "confirmed");

// ── helpers ──────────────────────────────────────────────────────────────────────
async function sendOrSim(label: string, tx: Transaction, signers: Keypair[]): Promise<string | null> {
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = signers[0].publicKey;

  if (DRY_RUN) {
    for (const s of signers) tx.partialSign(s);
    const r = await conn.simulateTransaction(tx);
    const err = r.value.err;
    const logs = (r.value.logs ?? []).join("\n  ");
    console.log(`  [SIM] ${label}: ${err ? "FAIL " + JSON.stringify(err) : "OK"}`);
    if (err) console.log(`  logs:\n  ${logs.slice(0, 600)}`);
    return null;
  }

  const sig = await sendAndConfirmTransaction(conn, tx, signers, {
    commitment: "confirmed",
    skipPreflight: false,
  });
  console.log(`  ✅ ${label}: ${sig}`);
  return sig;
}

// Build the multi-leg oracle remaining accounts for TRADE_NOCPI and KEEPER_CRANK
function oracleRemainingAccounts(): AccountMeta[] {
  return [
    { pubkey: ORACLE2, isSigner: false, isWritable: false },
    { pubkey: ORACLE3, isSigner: false, isWritable: false },
  ];
}

async function wrapSolAndCreateAta(targetTotal: bigint): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, payer.publicKey);
  const info = await conn.getAccountInfo(ata);

  // Check existing wSOL balance to avoid re-wrapping unnecessarily
  let existingBalance = 0n;
  if (info) {
    // wSOL ATA: balance is stored as u64 LE at offset 64 in the token account data
    try {
      existingBalance = BigInt(info.data.readBigUInt64LE(64));
    } catch { /* ignore parse errors */ }
  }

  const additionalNeeded = targetTotal > existingBalance ? targetTotal - existingBalance : 0n;
  console.log(`  wSOL ATA existing: ${Number(existingBalance) / 1e9} SOL  target: ${Number(targetTotal) / 1e9} SOL  wrapping: ${Number(additionalNeeded) / 1e9} SOL`);

  if (additionalNeeded > 0n || !info) {
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 60_000 }));
    if (!info) {
      tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, ata, payer.publicKey, NATIVE_MINT));
    }
    if (additionalNeeded > 0n) {
      tx.add(SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: ata,
        lamports: additionalNeeded,
      }));
      tx.add(createSyncNativeInstruction(ata));
    }
    if (!DRY_RUN) {
      await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
      console.log(`  ✅ wSOL ATA: ${ata.toBase58()} — wrapped ${Number(additionalNeeded) / 1e9} SOL`);
    } else {
      console.log(`  [SIM] Would wrap ${Number(additionalNeeded) / 1e9} SOL → wSOL ATA ${ata.toBase58()}`);
    }
  } else {
    console.log(`  ✅ wSOL ATA already has sufficient balance: ${ata.toBase58()}`);
  }
  return ata;
}

// ── close position helper ─────────────────────────────────────────────────────────
async function closePosition(userIdx: number, lpIdx: number, ata: PublicKey): Promise<void> {
  console.log(`\n=== CLOSING POSITION (user=${userIdx}, lp=${lpIdx}) ===`);

  // 1. Close user account (withdraws all PnL + collateral)
  // ACCOUNTS_CLOSE_ACCOUNT has 8 slots: user, slab, vault, userAta, vaultPda, tokenProg, clock, oracle
  // Append remaining oracle legs after the 8 fixed accounts
  const closeUserData = encodeCloseAccount({ userIdx });
  const closeUserKeys = [
    ...buildAccountMetas(ACCOUNTS_CLOSE_ACCOUNT, [
      payer.publicKey, SLAB, VAULT, ata, VAULT_PDA, TOKEN_PROGRAM_ID,
      SYSVAR_CLOCK_PUBKEY, ORACLE,
    ]),
    ...oracleRemainingAccounts(),
  ];
  const closeUserTx = new Transaction();
  closeUserTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  closeUserTx.add(buildIx({ programId: PROG, keys: closeUserKeys, data: closeUserData }));
  await sendOrSim("CloseAccount (user)", closeUserTx, [payer]);

  // 2. Close LP account
  const closeLpData = encodeCloseAccount({ userIdx: lpIdx });
  const closeLpKeys = [
    ...buildAccountMetas(ACCOUNTS_CLOSE_ACCOUNT, [
      payer.publicKey, SLAB, VAULT, ata, VAULT_PDA, TOKEN_PROGRAM_ID,
      SYSVAR_CLOCK_PUBKEY, ORACLE,
    ]),
    ...oracleRemainingAccounts(),
  ];
  const closeLpTx = new Transaction();
  closeLpTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  closeLpTx.add(buildIx({ programId: PROG, keys: closeLpKeys, data: closeLpData }));
  await sendOrSim("CloseAccount (lp)", closeLpTx, [payer]);

  // 3. Check insurance delta
  const slabBuf = await fetchSlab(conn, SLAB);
  const eng = parseEngine(slabBuf);
  console.log(`\n  Insurance after close: ${(Number(eng.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
  console.log(`  Vault: ${(Number(eng.vault) / 1e9).toFixed(6)} SOL`);
  console.log(`  cTot: ${(Number(eng.cTot) / 1e9).toFixed(6)} SOL`);
}

// ── main flow ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const balance = await conn.getBalance(payer.publicKey, "confirmed");
  console.log("=== Percolator Bounty4 SHORT Arbitrage ===");
  console.log(`  Wallet:     ${payer.publicKey.toBase58()}`);
  console.log(`  Balance:    ${(balance / 1e9).toFixed(6)} SOL`);
  console.log(`  Collateral: ${Number(COLLATERAL) / 1e9} SOL`);
  console.log(`  Leverage:   ${LEVERAGE}x`);
  console.log(`  Size:       ${TRADE_SIZE.toString()} (SHORT = negative)`);
  console.log(`  Dry-run:    ${DRY_RUN}`);
  console.log(`  RPC:        ${loadRpc()}`);

  // Handle --close-only mode
  if (CLOSE_ONLY) {
    const ata = getAssociatedTokenAddressSync(NATIVE_MINT, payer.publicKey);
    await closePosition(CLOSE_USER_IDX, CLOSE_LP_IDX, ata);
    return;
  }

  if (balance < Number(COLLATERAL) + 10_000_000 && !DRY_RUN) {
    console.error(`  ❌ Insufficient balance. Need ≥ ${(Number(COLLATERAL) + 10_000_000) / 1e9} SOL`);
    process.exit(1);
  }

  // 1. Pre-trade state snapshot
  const slabBuf0 = await fetchSlab(conn, SLAB);
  const eng0 = parseEngine(slabBuf0);
  const cfg0 = parseConfig(slabBuf0);
  const used0 = parseUsedIndices(slabBuf0);
  const slot0 = await conn.getSlot("confirmed");
  console.log(`\n  Insurance at start:  ${(Number(eng0.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
  console.log(`  EWMA mark:           ${cfg0.markEwmaE6.toString()} e6`);
  console.log(`  Open positions:      ${used0.length}`);
  console.log(`  Market slot lag:     ${slot0 - Number(eng0.lastMarketSlot)} slots`);

  // 2. Create wSOL ATA + wrap SOL (must happen before InitUser)
  // Need: 2×newAccountFee (InitUser+InitLP) + collateral + buffer
  const wrapAmount = COLLATERAL + NEW_ACCOUNT_FEE * 2n + BigInt(2_000_000); // +2M buffer
  console.log(`\n  [1/5] Creating wSOL ATA + wrapping ${Number(wrapAmount) / 1e9} SOL...`);
  const ata = await wrapSolAndCreateAta(wrapAmount);

  // 3. InitUser — allocate user slot in slab
  // Fee payment: newAccountFee (5,882,000 lamports from market config)
  console.log(`\n  [2/5] InitUser...`);
  const initUserData = encodeInitUser({ feePayment: NEW_ACCOUNT_FEE.toString() });
  const initUserKeys = buildAccountMetas(ACCOUNTS_INIT_USER, [
    payer.publicKey, SLAB, ata, VAULT, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
  ]);
  const initUserTx = new Transaction();
  initUserTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }));
  initUserTx.add(buildIx({ programId: PROG, keys: initUserKeys, data: initUserData }));
  await sendOrSim("InitUser", initUserTx, [payer]);

  // 4. InitLP — allocate LP slot in slab
  // Use PROG as matcherProgram and SLAB as matcherContext:
  //   SLAB is owned by PROG → passes ownership check at TradeCpi time
  //   For TradeNoCpi, the matcher is never called (LP signs directly)
  console.log(`\n  [3/5] InitLP...`);
  const initLpData = encodeInitLP({
    matcherProgram: PROG,   // percolator program owns the slab
    matcherContext: SLAB,   // slab is owned by PROG → ownership check passes
    feePayment: NEW_ACCOUNT_FEE.toString(),
  });
  const initLpKeys = buildAccountMetas(ACCOUNTS_INIT_LP, [
    payer.publicKey, SLAB, ata, VAULT, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
  ]);
  const initLpTx = new Transaction();
  initLpTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }));
  initLpTx.add(buildIx({ programId: PROG, keys: initLpKeys, data: initLpData }));
  await sendOrSim("InitLP", initLpTx, [payer]);

  // 5. Discover our allocated slot indices
  const slabBuf1 = await fetchSlab(conn, SLAB);
  const used1 = parseUsedIndices(slabBuf1);
  console.log(`\n  Slab used indices: [${used1.join(", ")}]`);

  // Find the two new indices vs initial state
  const prevSet = new Set(used0.map(i => i));
  const newSlots = used1.filter(i => !prevSet.has(i));

  let userIdx: number;
  let lpIdx: number;

  if (!DRY_RUN) {
    if (newSlots.length < 2) {
      console.error(`  ❌ Expected 2 new slots, got ${newSlots.length}. Cannot continue.`);
      process.exit(1);
    }
    // Percolator LIFO freelist: first new slot = user (InitUser ran first), second = lp
    userIdx = newSlots[0];
    lpIdx   = newSlots[1];
  } else {
    // Dry run: use placeholder indices for simulation
    userIdx = used1.length > 0 ? used1[used1.length - 2] ?? 0 : 0;
    lpIdx   = used1.length > 0 ? used1[used1.length - 1] ?? 1 : 1;
  }
  console.log(`  userIdx=${userIdx}  lpIdx=${lpIdx}`);

  // 6. Deposit collateral into user slot
  console.log(`\n  [4/5] Depositing ${Number(COLLATERAL) / 1e9} SOL collateral...`);
  const depositData = encodeDepositCollateral({ userIdx, amount: COLLATERAL.toString() });
  const depositKeys = buildAccountMetas(ACCOUNTS_DEPOSIT_COLLATERAL, [
    payer.publicKey, SLAB, ata, VAULT, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
  ]);
  const depositTx = new Transaction();
  depositTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }));
  depositTx.add(buildIx({ programId: PROG, keys: depositKeys, data: depositData }));
  await sendOrSim("DepositCollateral", depositTx, [payer]);

  // 7. TradeNoCpi — open SHORT position
  // Both user AND lp must sign; since same keypair serves both roles, one signature covers both.
  // Oracle legs (Leg2/Leg3) are appended as remaining accounts beyond the fixed 5.
  console.log(`\n  [5/5] TradeNoCpi SHORT (size=${TRADE_SIZE})...`);
  const tradeData = encodeTradeNoCpi({ lpIdx, userIdx, size: TRADE_SIZE.toString() });
  const tradeKeys: AccountMeta[] = [
    ...buildAccountMetas(ACCOUNTS_TRADE_NOCPI, [
      payer.publicKey,   // user (signer)
      payer.publicKey,   // lp (signer — same keypair)
      SLAB,
      SYSVAR_CLOCK_PUBKEY,
      ORACLE,            // leg1 (STOXX50/EUR — stale → HYBRID_AFTER_HOURS path)
    ]),
    // Remaining oracle leg accounts (not in the fixed 5-account spec)
    { pubkey: ORACLE2, isSigner: false, isWritable: false }, // EUR/USD
    { pubkey: ORACLE3, isSigner: false, isWritable: false }, // SOL/USD
  ];
  const tradeTx = new Transaction();
  tradeTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
  tradeTx.add(buildIx({ programId: PROG, keys: tradeKeys, data: tradeData }));
  await sendOrSim("TradeNoCpi SHORT", tradeTx, [payer]);

  // 8. Post-trade snapshot
  const slabBuf2 = await fetchSlab(conn, SLAB);
  const eng2 = parseEngine(slabBuf2);
  const cfg2 = parseConfig(slabBuf2);
  const insChange = eng2.insuranceFund.balance - eng0.insuranceFund.balance;
  console.log(`\n=== POST-TRADE STATE ===`);
  console.log(`  Insurance: ${(Number(eng2.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
  console.log(`  EWMA mark: ${cfg2.markEwmaE6.toString()} e6`);
  console.log(`  Vault:     ${(Number(eng2.vault) / 1e9).toFixed(6)} SOL`);
  console.log(`  cTot:      ${(Number(eng2.cTot) / 1e9).toFixed(6)} SOL`);

  if (insChange < 0n) {
    console.log(`\n  🎯 INSURANCE_DROP: ${(Number(insChange) / 1e9).toFixed(6)} SOL decrease!`);
  } else {
    console.log(`  Insurance delta: +${(Number(insChange) / 1e9).toFixed(6)} SOL (fees to insurance)`);
  }

  if (!DRY_RUN) {
    console.log(`
=== POSITION OPEN ===
  SHORT at EWMA mark ~1,352,123 e6 (stale, 4.6% above composite)
  Close fee (after oracle refresh): 1bps
  Expected net gain: ~4.1% of ${Number(COLLATERAL * LEVERAGE) / 1e9} SOL notional

  Close when oracle refreshes:
    npx tsx scripts/bounty4-trade.ts --close-only ${userIdx} ${lpIdx}

  Or push Pyth oracle to refresh manually:
    npx tsx scripts/bounty4-oracle-push.ts
`);
  }
}

main().catch(e => { console.error("FATAL:", e.message ?? e); process.exit(1); });
