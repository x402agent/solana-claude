/**
 * bounty4-oracle-push.ts — push a fresh Pyth Lazer price to the stale Leg1 oracle.
 *
 * The Percolator Bounty4 STOXX50/SOL market uses a 3-leg Pyth Pull oracle.
 * Leg1 (STOXX50/EUR) has been stale for 39k+ slots — the market is stuck in
 * HYBRID_AFTER_HOURS mode with a frozen EWMA mark.
 *
 * Pyth Lazer provides real-time price feeds with Solana-verifiable signed
 * payloads (EVM or Solana encoding). This script:
 *   1. Connects to Pyth Lazer WebSocket and gets a fresh STOXX50/EUR price
 *   2. Posts the Solana-encoded payload to the Pyth receiver program on-chain
 *      to update the PriceUpdateV2 account (Leg1 = C2Cf16vF...)
 *   3. Triggers a KeeperCrank to process the fresh oracle
 *
 * After this, the market's effective price shifts from the frozen EWMA (1,352,123 e6)
 * to the actual composite, allowing SHORT positions to profit on close.
 *
 * Usage:
 *   PYTH_API_KEY=B6BhSjG4f51THaQE1gan6E9iMHoSyrUdSMP8K31F9TyM \
 *   SOLANA_KEYPAIR=~/.config/solana/new-mainnet-wallet.json \
 *   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=... \
 *   npx tsx scripts/bounty4-oracle-push.ts [--dry-run] [--once]
 */

import {
  Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram,
  sendAndConfirmTransaction, TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WebSocket } from "ws";

import { encodeKeeperCrank } from "../src/abi/instructions.js";
import { ACCOUNTS_KEEPER_CRANK, buildAccountMetas, WELL_KNOWN } from "../src/abi/accounts.js";
import { buildIx } from "../src/runtime/tx.js";
import { fetchSlab, parseEngine } from "../src/solana/slab.js";

// ── market ──────────────────────────────────────────────────────────────────────
const CWD    = process.env.PERCOLATOR_DIR ?? path.dirname(new URL(import.meta.url).pathname);
const m      = JSON.parse(fs.readFileSync(path.join(CWD, "mainnet-bounty4-market.json"), "utf-8"));
const PROG   = new PublicKey(m.programId);
const SLAB   = new PublicKey(m.slab);
const ORACLE  = new PublicKey(m.oracle);   // leg1: STOXX50/EUR PriceUpdateV2 account
const ORACLE2 = new PublicKey(m.oracleLeg2);
const ORACLE3 = new PublicKey(m.oracleLeg3);

// Feed IDs (32-byte hex, matching Pyth Lazer feed IDs)
const FEED_ID_STOXX  = "dd08f0a40e21ce42178b25bdd9461a2beebccbaa2a781a6e02b323576c4072ab"; // STOXX50/EUR
const FEED_ID_EURUSD = "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b"; // EUR/USD
const FEED_ID_SOLUSD = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"; // SOL/USD

// Pyth receiver program on Solana mainnet
const PYTH_RECEIVER   = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
const PYTH_WORMHOLE   = new PublicKey("HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ"); // Wormhole bridge on mainnet
const GUARDIAN_SET    = new PublicKey("2yVjuQwpsvdsrywzsJJVs9Ueh4zayyo5R7wWMkYo1yfx"); // Guardian set v3

// ── config ───────────────────────────────────────────────────────────────────────
const DRY_RUN  = process.argv.includes("--dry-run");
const ONCE     = process.argv.includes("--once");
const API_KEY  = process.env.PYTH_API_KEY ?? "B6BhSjG4f51THaQE1gan6E9iMHoSyrUdSMP8K31F9TyM";

// Pyth Lazer WebSocket endpoints (rotate on failure)
const LAZER_WS_ENDPOINTS = [
  "wss://pyth-lazer-0.dourolabs.app/v1/stream",
  "wss://pyth-lazer-1.dourolabs.app/v1/stream",
  "wss://pyth-lazer-2.dourolabs.app/v1/stream",
];

// ── keypair + rpc ─────────────────────────────────────────────────────────────────
function loadKeypair(): Keypair {
  const p = process.env.SOLANA_KEYPAIR ?? path.join(os.homedir(), ".config/solana/new-mainnet-wallet.json");
  try {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf-8"))));
  } catch {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(
      fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf-8")
    )));
  }
}

const payer = loadKeypair();
const conn  = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://mainnet.helius-rpc.com/?api-key=2b52295c-5873-465e-8d71-91f28dc0053d",
  "confirmed"
);

// ── Pyth Lazer price payload types ───────────────────────────────────────────────
interface LazerPriceUpdate {
  feedId: string;
  price: string;
  timestamp: number; // unix ms
  solanaPayload?: string; // hex-encoded Solana-verifiable payload
}

// ── fetch from Pyth Lazer REST API ───────────────────────────────────────────────
async function fetchLazerRestPrice(feedIds: string[]): Promise<Map<string, LazerPriceUpdate>> {
  const feedQuery = feedIds.map(id => `ids[]=${id}`).join("&");
  const url = `https://pyth-lazer.dourolabs.app/v1/latest_price?${feedQuery}&encoding=solana`;

  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Accept": "application/json",
    },
  });

  if (!resp.ok) {
    throw new Error(`Pyth Lazer REST error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json() as any;
  const result = new Map<string, LazerPriceUpdate>();

  // Handle both array and object response formats
  const items: any[] = Array.isArray(data) ? data : (data.parsed ?? data.data ?? [data]);
  for (const item of items) {
    const feedId: string = (item.feed_id ?? item.feedId ?? "").toLowerCase().replace("0x", "");
    const price = item.price ?? item.parsed?.price?.price ?? "0";
    const ts = item.publish_time ?? item.publishTime ?? item.timestamp ?? Date.now() / 1000;
    const payload = item.vaa ?? item.solana_payload ?? item.solanaPayload ?? item.binary ?? null;
    result.set(feedId, {
      feedId,
      price: String(price),
      timestamp: Number(ts) * 1000,
      solanaPayload: payload ? String(payload) : undefined,
    });
  }
  return result;
}

// ── Pyth Lazer WebSocket fetch ────────────────────────────────────────────────────
async function fetchLazerWsPrice(feedIds: string[], endpointIdx: number = 0): Promise<Map<string, LazerPriceUpdate>> {
  return new Promise((resolve, reject) => {
    const endpoint = LAZER_WS_ENDPOINTS[endpointIdx % LAZER_WS_ENDPOINTS.length];
    const ws = new WebSocket(endpoint, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket timeout (10s)"));
    }, 10_000);

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "subscribe",
        feedIds: feedIds.map(id => ({ feedId: id })),
        properties: ["price", "timestamp"],
        chains: ["solana"],
        channel: "fixed_rate@200ms",
      }));
    });

    ws.on("message", (rawData: Buffer) => {
      try {
        const msg = JSON.parse(rawData.toString()) as any;
        if (msg.type === "price_update" || msg.type === "priceFeed") {
          clearTimeout(timeout);
          ws.close();
          const result = new Map<string, LazerPriceUpdate>();
          const updates = msg.parsed ?? msg.feeds ?? msg.priceUpdates ?? [msg];
          for (const update of updates) {
            const feedId = (update.feed_id ?? update.feedId ?? "").toLowerCase().replace("0x", "");
            const price = update.price ?? update.priceUpdate?.price ?? "0";
            const ts = update.publish_time ?? update.publishTime ?? update.timestamp ?? Date.now() / 1000;
            const payload = update.solana ?? update.vaa ?? update.binary ?? null;
            result.set(feedId, {
              feedId,
              price: String(price),
              timestamp: Number(ts) * 1000,
              solanaPayload: payload ? JSON.stringify(payload) : undefined,
            });
          }
          resolve(result);
        }
      } catch (err) {
        // ignore parse errors, wait for valid message
      }
    });

    ws.on("error", err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ── build Pyth receiver update instruction ──────────────────────────────────────
// The Pyth receiver program on Solana accepts a "PostUpdate" or "PostUpdateAtomic" instruction
// with the signed price attestation. The exact encoding depends on the receiver version.
// We use the standard Pythnet receiver instruction format.
function buildPythUpdateIx(
  priceFeedAccount: PublicKey,
  solanaPayloadHex: string,
): TransactionInstruction {
  // Pyth receiver PostUpdateAtomic instruction
  // Discriminator: [18, 4, 121, 45, 149, 139, 91, 168] (Anchor discriminator for post_update_atomic)
  const discriminator = Buffer.from([18, 4, 121, 45, 149, 139, 91, 168]);
  const payload = Buffer.from(solanaPayloadHex.replace("0x", ""), "hex");

  // PostUpdateAtomic args: { merkle_price_update: bytes, treasury_id: u16 }
  // Encode the payload length as u32 LE + payload bytes
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(payload.length, 0);
  const treasuryId = Buffer.alloc(2); // treasury_id = 0
  const data = Buffer.concat([discriminator, lenBuf, payload, treasuryId]);

  return new TransactionInstruction({
    programId: PYTH_RECEIVER,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // payer
      { pubkey: GUARDIAN_SET, isSigner: false, isWritable: false },    // guardian set
      { pubkey: priceFeedAccount, isSigner: false, isWritable: true }, // price feed account to update
      // Wormhole program for VAA verification
      { pubkey: PYTH_WORMHOLE, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── crank after oracle update ─────────────────────────────────────────────────────
async function runCrank(): Promise<void> {
  const crankData = encodeKeeperCrank({ callerIdx: 65535, candidates: [] });
  const crankKeys = [
    ...buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
      payer.publicKey, SLAB, WELL_KNOWN.clock, ORACLE,
    ]),
    { pubkey: ORACLE2, isSigner: false, isWritable: false },
    { pubkey: ORACLE3, isSigner: false, isWritable: false },
  ];
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
  tx.add(buildIx({ programId: PROG, keys: crankKeys, data: crankData }));

  if (!DRY_RUN) {
    const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
    console.log(`  ✅ KeeperCrank after oracle push: ${sig}`);
  } else {
    console.log(`  [SIM] KeeperCrank (dry run)`);
  }
}

// ── display oracle state ─────────────────────────────────────────────────────────
async function snapshotOracle(): Promise<void> {
  const buf = await fetchSlab(conn, SLAB);
  const e = parseEngine(buf);
  const slot = await conn.getSlot("confirmed");
  const lag = slot - Number(e.lastMarketSlot);
  console.log(`  EWMA mark:      ${e.markEwmaE6.toString()} e6`);
  console.log(`  Market slot lag: ${lag} slots (${(lag / 2.5).toFixed(0)}s)`);
  console.log(`  Insurance:      ${(Number(e.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
}

// ── main ─────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("=== Percolator Bounty4 — Pyth Lazer Oracle Push ===");
  console.log(`  Wallet:  ${payer.publicKey.toBase58()}`);
  console.log(`  Balance: ${(await conn.getBalance(payer.publicKey) / 1e9).toFixed(6)} SOL`);
  console.log(`  API key: ${API_KEY.slice(0, 8)}...`);
  console.log(`  Dry-run: ${DRY_RUN}`);
  console.log("");

  console.log("Current state:");
  await snapshotOracle();

  const feedIds = [FEED_ID_STOXX, FEED_ID_EURUSD, FEED_ID_SOLUSD];
  let attempt = 0;

  while (true) {
    attempt++;
    console.log(`\n[Attempt ${attempt}] Fetching Pyth Lazer prices...`);

    let prices: Map<string, LazerPriceUpdate>;
    try {
      // Try REST first (simpler), then WebSocket
      prices = await fetchLazerRestPrice(feedIds);
      console.log(`  ✅ REST API returned ${prices.size} feeds`);
    } catch (restErr: any) {
      console.log(`  REST failed (${restErr.message}), trying WebSocket...`);
      try {
        prices = await fetchLazerWsPrice(feedIds, attempt - 1);
        console.log(`  ✅ WebSocket returned ${prices.size} feeds`);
      } catch (wsErr: any) {
        console.error(`  ❌ Both REST and WebSocket failed: ${wsErr.message}`);
        if (ONCE) process.exit(1);
        await new Promise(r => setTimeout(r, 15_000));
        continue;
      }
    }

    // Display price data
    for (const [feedId, update] of prices) {
      const ageMs = Date.now() - update.timestamp;
      const label = feedId === FEED_ID_STOXX ? "STOXX50/EUR"
        : feedId === FEED_ID_EURUSD ? "EUR/USD"
        : feedId === FEED_ID_SOLUSD ? "SOL/USD"
        : feedId;
      console.log(`  ${label}: ${update.price}  age=${(ageMs / 1000).toFixed(1)}s  payload=${update.solanaPayload ? "✓" : "✗"}`);
    }

    // Compute composite
    const stoxxUpdate  = prices.get(FEED_ID_STOXX);
    const eurusdUpdate = prices.get(FEED_ID_EURUSD);
    const solusdUpdate = prices.get(FEED_ID_SOLUSD);

    if (stoxxUpdate && eurusdUpdate && solusdUpdate) {
      const stoxx  = parseFloat(stoxxUpdate.price);
      const eurusd = parseFloat(eurusdUpdate.price);
      const solusd = parseFloat(solusdUpdate.price);
      if (stoxx && eurusd && solusd) {
        const compositeE6 = Math.round(stoxx * eurusd / solusd * 1e6);
        console.log(`\n  Composite (STOXX50/SOL): ${compositeE6} e6  (vs EWMA frozen ~1,352,123 e6)`);
        const divergenceBps = Math.round((1_352_123 - compositeE6) / 1_352_123 * 10_000);
        console.log(`  Divergence from EWMA: ${divergenceBps} bps (${(divergenceBps / 100).toFixed(2)}%)`);
        console.log(`  Potential profit at 15x leverage: ${(divergenceBps / 10_000 * 15 * 100).toFixed(1)}%`);
      }
    }

    // Push oracle update if we have a Solana payload
    const stoxxPayload = stoxxUpdate?.solanaPayload;
    if (stoxxPayload && !DRY_RUN) {
      console.log(`\n  Pushing STOXX50/EUR oracle update to ${ORACLE.toBase58()}...`);
      try {
        const updateIx = buildPythUpdateIx(ORACLE, stoxxPayload);
        const tx = new Transaction();
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }));
        tx.add(updateIx);
        const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
        console.log(`  ✅ Oracle updated: ${sig}`);

        // Crank immediately after oracle update
        console.log(`  Running KeeperCrank to process fresh oracle...`);
        await runCrank();

        // Check new EWMA
        const buf = await fetchSlab(conn, SLAB);
        const e = parseEngine(buf);
        console.log(`  New EWMA mark: ${e.markEwmaE6.toString()} e6`);
        console.log(`  Insurance:     ${(Number(e.insuranceFund.balance) / 1e9).toFixed(6)} SOL`);
      } catch (err: any) {
        console.error(`  ❌ Oracle push failed: ${err.message}`);
        console.log(`  Note: Pyth Lazer payload format may not match receiver version.`);
        console.log(`  The Pyth pull oracle is updated by Pyth-sponsored crankers automatically.`);
        console.log(`  Monitor: wait for Pyth-sponsored shard update (typically every 10min during EU hours)`);
      }
    } else if (!stoxxPayload) {
      console.log(`\n  No Solana payload in Lazer response — using monitoring mode`);
      console.log(`  The Pyth-sponsored shard-0 cranker updates oracle during EU market hours`);
      console.log(`  (07:00-15:30 UTC). Monitor STOXX50/EUR oracle staleness:`);
      console.log(`    npx tsx scripts/bounty4-status.ts`);

      // Still run a crank to try to pick up any already-refreshed oracle
      if (!DRY_RUN) {
        console.log(`  Running KeeperCrank in case oracle was refreshed externally...`);
        await runCrank();
      }
    } else {
      console.log(`  [DRY RUN] Would push oracle + crank`);
    }

    if (ONCE) break;

    // Wait before next attempt (respect EU equity hours: 07:00-15:30 UTC)
    const hour = new Date().getUTCHours();
    const inEuHours = hour >= 7 && hour < 16;
    const waitMs = inEuHours ? 30_000 : 60_000; // poll more often during EU hours
    console.log(`\n  Next check in ${waitMs / 1000}s (${inEuHours ? "EU hours active" : "off-hours"})...`);
    await new Promise(r => setTimeout(r, waitMs));
  }
}

main().catch(e => { console.error("FATAL:", e.message ?? e); process.exit(1); });
