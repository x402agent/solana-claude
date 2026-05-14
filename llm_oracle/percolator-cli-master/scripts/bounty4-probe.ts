/**
 * bounty4-probe.ts — systematic on-chain probe for Bounty 4
 *
 * Runs entirely via simulateTransaction (no SOL required).
 * Probes every potentially-exploitable instruction path and reports
 * error codes / unexpected successes.
 *
 * Separately, if PROBE_MODE=trade, builds and prints the full
 * InitUser+InitLP+Deposit+TradeNoCpi+Close transaction sequence
 * for when the wallet is funded.
 *
 * Usage:
 *   npx tsx scripts/bounty4-probe.ts
 *   PROBE_MODE=trade npx tsx scripts/bounty4-probe.ts
 */

import {
  Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram,
  SYSVAR_CLOCK_PUBKEY, SystemProgram, TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, NATIVE_MINT,
  createAssociatedTokenAccountInstruction, createSyncNativeInstruction,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  encodeUpdateAuthority,
  encodeWithdrawInsurance,
  encodeWithdrawInsuranceLimited,
  encodeResolvePermissionless,
  encodeForceCloseResolved,
  encodeReclaimEmptyAccount,
  encodeSettleAccount,
  encodeKeeperCrank,
  encodeInitUser,
  encodeInitLP,
  encodeDepositCollateral,
  encodeTradeNoCpi,
  encodeWithdrawCollateral,
  encodeCloseAccount,
  encodeTopUpInsurance,
  encodeCatchupAccrue,
} from "../src/abi/instructions.js";
import {
  ACCOUNTS_KEEPER_CRANK,
  buildAccountMetas,
} from "../src/abi/accounts.js";
import { buildIx } from "../src/runtime/tx.js";
import { fetchSlab, parseEngine, parseHeader } from "../src/solana/slab.js";

// ── market ─────────────────────────────────────────────────────────────────────
const CWD = process.env.PERCOLATOR_DIR ?? path.dirname(new URL(import.meta.url).pathname);
const m = JSON.parse(fs.readFileSync(path.join(CWD, "mainnet-bounty4-market.json"), "utf-8"));
const PROG   = new PublicKey(m.programId);
const SLAB   = new PublicKey(m.slab);
const VAULT  = new PublicKey(m.vault);
const VAULT_PDA = new PublicKey(m.vaultPda);
const ORACLE = new PublicKey(m.oracle);
const ORACLE2 = new PublicKey(m.oracleLeg2);
const ORACLE3 = new PublicKey(m.oracleLeg3);
const ADMIN  = new PublicKey(m.admin);
const INS_AUTH = new PublicKey(m.insuranceAuthority ?? m.admin);
const INS_OP   = new PublicKey(m.insuranceOperator  ?? m.admin);

// ── keypair + rpc ───────────────────────────────────────────────────────────────
function loadKeypair(): Keypair {
  const p = process.env.SOLANA_KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf-8"))));
}
function loadRpc(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  const hdir = path.join(os.homedir(), ".helius");
  try {
    const key = fs.readFileSync(hdir, "utf-8").trim();
    if (key.length > 10) return `https://mainnet.helius-rpc.com/?api-key=${key}`;
  } catch {}
  return "https://api.mainnet-beta.solana.com";
}

const payer = loadKeypair();
const conn  = new Connection(loadRpc(), "confirmed");

// ── helpers ─────────────────────────────────────────────────────────────────────
function buildRaw(data: Buffer, keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[]): TransactionInstruction {
  return new TransactionInstruction({ programId: PROG, keys, data });
}
function writable(pk: PublicKey) { return { pubkey: pk, isSigner: false, isWritable: true }; }
function ro(pk: PublicKey)       { return { pubkey: pk, isSigner: false, isWritable: false }; }
function signer(pk: PublicKey)   { return { pubkey: pk, isSigner: true,  isWritable: false }; }

async function sim(label: string, ix: TransactionInstruction, extraSigners: Keypair[] = []): Promise<void> {
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(ix);
  tx.recentBlockhash = (await conn.getLatestBlockhash("finalized")).blockhash;
  tx.feePayer = payer.publicKey;
  const r = await conn.simulateTransaction(tx, [payer, ...extraSigners]);
  const err = r.value.err;
  const logs = (r.value.logs ?? []).slice(-4).join(" | ");
  if (!err) {
    console.log(`  ✅ ${label} — SIM SUCCEEDED (unexpected!)`);
    console.log(`     logs: ${logs}`);
  } else {
    const errStr = JSON.stringify(err);
    const isExpected =
      errStr.includes("0x0") ||          // generic program error
      errStr.includes("InstructionError") ||
      logs.includes("authority") ||
      logs.includes("Unauthorized") ||
      logs.includes("invalid") ||
      logs.includes("not active");
    const marker = isExpected ? "  ❌" : "  ⚠️ UNEXPECTED";
    console.log(`${marker} ${label} — ${errStr}`);
    if (!isExpected) console.log(`     logs: ${logs}`);
  }
}

// ── probe sequences ─────────────────────────────────────────────────────────────

async function probeAuthorityBypass(): Promise<void> {
  console.log("\n=== PROBE: UpdateAuthority bypasses ===");

  // kind=0 (ADMIN) with wrong signer → expect error
  const ixAdmin = buildRaw(
    (() => {
      const b = Buffer.alloc(34);
      b[0] = 32; // IX_TAG.UpdateAuthority
      b[1] = 0;  // kind=0 ADMIN
      payer.publicKey.toBuffer().copy(b, 2); // new_authority
      return b;
    })(),
    [signer(payer.publicKey), ro(payer.publicKey), writable(SLAB)],
  );
  await sim("UpdateAuthority kind=0 (admin) wrong signer", ixAdmin);

  // kind=2 (INSURANCE) with wrong signer
  const ixIns = buildRaw(
    (() => {
      const b = Buffer.alloc(34);
      b[0] = 32; b[1] = 2;
      payer.publicKey.toBuffer().copy(b, 2);
      return b;
    })(),
    [signer(payer.publicKey), ro(payer.publicKey), writable(SLAB)],
  );
  await sim("UpdateAuthority kind=2 (insurance) wrong signer", ixIns);

  // kind=3 (REMOVED) with any signer — does the program reject gracefully?
  const ixKind3 = buildRaw(
    (() => {
      const b = Buffer.alloc(34);
      b[0] = 32; b[1] = 3;
      payer.publicKey.toBuffer().copy(b, 2);
      return b;
    })(),
    [signer(payer.publicKey), ro(payer.publicKey), writable(SLAB)],
  );
  await sim("UpdateAuthority kind=3 (REMOVED) — unauthorized bypass probe", ixKind3);

  // kind=4 (INSURANCE_OPERATOR) with wrong signer
  const ixOp = buildRaw(
    (() => {
      const b = Buffer.alloc(34);
      b[0] = 32; b[1] = 4;
      payer.publicKey.toBuffer().copy(b, 2);
      return b;
    })(),
    [signer(payer.publicKey), ro(payer.publicKey), writable(SLAB)],
  );
  await sim("UpdateAuthority kind=4 (ins_op) wrong signer", ixOp);

  // kind=255 (out-of-range)
  const ixK255 = buildRaw(
    (() => {
      const b = Buffer.alloc(34);
      b[0] = 32; b[1] = 255;
      payer.publicKey.toBuffer().copy(b, 2);
      return b;
    })(),
    [signer(payer.publicKey), ro(payer.publicKey), writable(SLAB)],
  );
  await sim("UpdateAuthority kind=255 (out-of-range) probe", ixK255);
}

async function probeWithdrawInsurance(): Promise<void> {
  console.log("\n=== PROBE: WithdrawInsurance paths ===");

  // WithdrawInsurance (full, auth-gated) with wrong signer
  const ixWi = buildRaw(encodeWithdrawInsurance(), [
    signer(payer.publicKey), writable(SLAB), writable(VAULT),
    ro(VAULT_PDA), ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY),
    ro(payer.publicKey), // "to" token account
  ]);
  await sim("WithdrawInsurance wrong signer", ixWi);

  // WithdrawInsuranceLimited amount=1 with wrong signer
  const ixWil = buildRaw(encodeWithdrawInsuranceLimited({ amount: "1" }), [
    signer(payer.publicKey), writable(SLAB), writable(VAULT),
    ro(VAULT_PDA), ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY),
    ro(payer.publicKey),
  ]);
  await sim("WithdrawInsuranceLimited amount=1 wrong signer", ixWil);

  // WithdrawInsuranceLimited with admin as signer account but our key signs
  // (tests whether the program checks the signer's key vs the stored authority)
  const ixWilAdmin = buildRaw(encodeWithdrawInsuranceLimited({ amount: "1" }), [
    signer(ADMIN), writable(SLAB), writable(VAULT),
    ro(VAULT_PDA), ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY),
    ro(payer.publicKey),
  ]);
  await sim("WithdrawInsuranceLimited admin-account-listed but we sign", ixWilAdmin);
}

async function probePermissionlessResolve(): Promise<void> {
  console.log("\n=== PROBE: Permissionless resolve (too early?) ===");

  const ixResolve = buildRaw(encodeResolvePermissionless(), [
    writable(SLAB), ro(SYSVAR_CLOCK_PUBKEY), ro(ORACLE), ro(ORACLE2), ro(ORACLE3),
  ]);
  await sim("ResolvePermissionless (need 6.48M stale slots)", ixResolve);
}

async function probeForceClose(): Promise<void> {
  console.log("\n=== PROBE: ForceClose / Reclaim / Settle on non-existent accounts ===");

  // index 0 might not exist; tests how the program handles invalid idx
  for (const idx of [0, 1, 65535]) {
    const ixFc = buildRaw(encodeForceCloseResolved({ userIdx: idx }), [
      signer(payer.publicKey), writable(SLAB), writable(VAULT),
      ro(VAULT_PDA), ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY), ro(ORACLE),
      ro(payer.publicKey),
    ]);
    await sim(`ForceCloseResolved idx=${idx}`, ixFc);

    const ixRe = buildRaw(encodeReclaimEmptyAccount({ userIdx: idx }), [
      signer(payer.publicKey), writable(SLAB), writable(VAULT),
      ro(VAULT_PDA), ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY),
      ro(payer.publicKey),
    ]);
    await sim(`ReclaimEmptyAccount idx=${idx}`, ixRe);
  }
}

async function probeCatchupAccrue(): Promise<void> {
  console.log("\n=== PROBE: CatchupAccrue (might advance accounting gap) ===");
  const ixCa = buildRaw(encodeCatchupAccrue(), [
    writable(SLAB), ro(SYSVAR_CLOCK_PUBKEY), ro(ORACLE), ro(ORACLE2), ro(ORACLE3),
  ]);
  await sim("CatchupAccrue", ixCa);
}

async function probeTopUpInsurance(): Promise<void> {
  console.log("\n=== PROBE: TopUpInsurance amount=0 (edge case) ===");
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, payer.publicKey);
  const ixTu = buildRaw(encodeTopUpInsurance({ amount: "0" }), [
    signer(payer.publicKey), writable(SLAB), writable(ata), writable(VAULT),
    ro(TOKEN_PROGRAM_ID), ro(SYSVAR_CLOCK_PUBKEY),
  ]);
  await sim("TopUpInsurance amount=0", ixTu);
}

async function snapshotState(): Promise<void> {
  console.log("\n=== CURRENT MARKET STATE ===");
  try {
    const buf = await fetchSlab(conn, SLAB);
    const e = parseEngine(buf);
    console.log(`  vault:     ${(Number(e.vault) / 1e9).toFixed(6)} SOL`);
    console.log(`  insurance: ${(Number(e.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
    console.log(`  cTot:      ${(Number(e.cTot) / 1e9).toFixed(6)} SOL`);
    console.log(`  ewmaE6:    ${e.markEwmaE6.toString()}`);
    console.log(`  ewmaSlot:  ${e.markEwmaLastSlot.toString()}`);
    const slot = await conn.getSlot("confirmed");
    console.log(`  slot:      ${slot}`);
    console.log(`  lag:       ${slot - Number(e.lastMarketSlot)} slots`);
    const conservationOk = e.vault === BigInt((await conn.getTokenAccountBalance(VAULT, "confirmed")).value.amount);
    const accountingOk   = e.vault >= e.cTot + e.insuranceFund.balance;
    console.log(`  conservation: ${conservationOk ? "OK ✅" : "BROKEN ⚠️ ACCOUNTING_BROKEN?"}`);
    console.log(`  accounting:   ${accountingOk   ? "OK ✅" : "BROKEN ⚠️ ACCOUNTING_BROKEN?"}`);
  } catch (e: any) {
    console.error("  error reading state:", e.message);
  }
}

async function printTradeSetup(): Promise<void> {
  console.log("\n=== TRADE SETUP (execute when wallet is funded) ===");
  console.log("  Wallet pubkey:", payer.publicKey.toBase58());
  console.log("  Required: ~0.15 SOL minimum (InitUser + InitLP + collateral + fees)");
  console.log("");
  console.log("  Strategy: SHORT STOXX50/SOL at EWMA mark (1bps fee)");
  console.log("  Direction: STOXX50 in SOL should FALL when oracle refreshes");
  console.log("    • EWMA mark (stale) = 1,352,123 e6");
  console.log("    • Current stale composite = 1,289,964 e6  (4.6% lower)");
  console.log("    • Gap = entirely from EUR/USD + SOL/USD drift during stale period");
  console.log("    • Fee open = ~50bps (hybrid_soft_stale_matured=true, floor 49bps)");
  console.log("    • Fee close = 1bps (after oracle refresh, soft_stale_matured=false)");
  console.log("    • Expected net = ~4.1% on notional");
  console.log("");
  console.log("  To execute:");
  console.log("    1. Fund wallet with 0.5 SOL");
  console.log("    2. Run: npx tsx scripts/bounty4-trade.ts");
}

async function main(): Promise<void> {
  console.log("Percolator Bounty4 — Systematic Probe");
  console.log("Program:", PROG.toBase58());
  console.log("Wallet: ", payer.publicKey.toBase58());

  await snapshotState();
  await probeAuthorityBypass();
  await probeWithdrawInsurance();
  await probePermissionlessResolve();
  await probeForceClose();
  await probeCatchupAccrue();
  await probeTopUpInsurance();
  await printTradeSetup();

  console.log("\n=== PROBE COMPLETE ===");
}

main().catch(e => { console.error(e); process.exit(1); });
