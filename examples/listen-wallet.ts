/**
 * examples/listen-wallet.ts
 *
 * Real-time wallet monitor — watch any Solana wallet for balance changes
 * and get parsed transaction history via Helius onchain events.
 *
 * Run: npx tsx examples/listen-wallet.ts <WALLET_ADDRESS>
 *
 * Requires: HELIUS_API_KEY in .env (free at helius.dev)
 */

import "dotenv/config";
import { HeliusClient, HeliusListener } from "../src/helius/index.js";
import { writeMemory } from "../src/state/app-state.js";

const wallet = process.argv[2];
if (!wallet) {
  console.error("Usage: npx tsx examples/listen-wallet.ts <WALLET_ADDRESS>");
  process.exit(1);
}

const apiKey = process.env.HELIUS_API_KEY;
if (!apiKey) {
  console.error("Set HELIUS_API_KEY in .env — free at https://helius.dev");
  process.exit(1);
}

const client = new HeliusClient({ apiKey });
const listener = new HeliusListener({ apiKey });

console.log(`\n🌊 solana-claude onchain listener`);
console.log(`📡 Watching wallet: ${wallet.slice(0, 8)}...${wallet.slice(-4)}`);
console.log(`🔑 Helius RPC: ${client.rpcUrl.replace(apiKey, "***")}\n`);

// Get initial balance
const balanceSol = await client.getBalance(wallet);
console.log(`💰 Current balance: ${balanceSol.toFixed(6)} SOL`);

// Get recent transactions (enhanced, human-readable)
console.log("\n📜 Recent transactions (enhanced):");
try {
  const txs = await client.getTransactionsForAddress(wallet, { limit: 5 });
  for (const tx of txs) {
    const time = new Date(tx.timestamp * 1000).toLocaleTimeString();
    console.log(`  [${time}] ${tx.type} — ${tx.description || tx.signature.slice(0, 20) + "..."}`);
    if (tx.tokenTransfers?.length) {
      for (const t of tx.tokenTransfers) {
        console.log(`    → ${t.tokenAmount} tokens (${t.mint.slice(0, 8)}...)`);
      }
    }
  }
} catch (e) {
  console.warn("  (enhanced transactions require HELIUS_API_KEY with API access)");
}

// Connect WebSocket and subscribe
await listener.connect();
console.log("\n✅ WebSocket connected. Listening for onchain events...\n");

// 1. Account balance changes
const accountSub = await listener.subscribeAccount(wallet, (data) => {
  const newBalance = data.account.lamports / 1e9;
  const diff = newBalance - balanceSol;
  const sign = diff >= 0 ? "+" : "";
  console.log(`💸 Balance changed: ${newBalance.toFixed(6)} SOL (${sign}${diff.toFixed(6)}) — slot: ${data.context.slot}`);

  // Write to agent memory as KNOWN fact
  writeMemory({
    tier: "KNOWN",
    content: `Wallet ${wallet.slice(0, 8)}... balance: ${newBalance.toFixed(6)} SOL (slot ${data.context.slot})`,
    source: "helius:accountSubscribe",
    expiresAt: Date.now() + 60_000, // KNOWN facts expire after 60s
  });
});

// 2. Transaction stream (Enhanced WebSocket — Helius-specific)
const txSub = await listener.subscribeTransaction(
  { accountInclude: [wallet], vote: false, failed: false },
  (tx) => {
    console.log(`📦 New tx: ${tx.signature.slice(0, 20)}... @ slot ${tx.slot}`);
  },
);

// 3. Slot heartbeat (fires every ~400ms)
let lastSlot = 0;
let slotCount = 0;
const slotSub = await listener.subscribeSlot((slot) => {
  lastSlot = slot.slot;
  slotCount++;
  if (slotCount % 25 === 0) { // Print every ~10s
    process.stdout.write(`\r⏱  Slot: ${slot.slot.toLocaleString()}  `);
  }
});

console.log("Subscriptions active:");
console.log(`  accountSubscribe  (id: ${accountSub.id})`);
console.log(`  transactionSubscribe (id: ${txSub.id})`);
console.log(`  slotSubscribe     (id: ${slotSub.id})`);
console.log("\nPress Ctrl+C to stop\n");

// Reconnect events
listener.on("reconnecting", (attempt: number, delay: number) => {
  console.warn(`⚠️  Reconnecting (attempt ${attempt}, delay ${delay}ms)...`);
});
listener.on("connected", () => console.log("✅ Reconnected!"));

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down...");
  accountSub.unsubscribe();
  txSub.unsubscribe();
  slotSub.unsubscribe();
  listener.disconnect();
  console.log(`📊 Stats: ${slotCount} slots observed, last slot ${lastSlot.toLocaleString()}`);
  process.exit(0);
});
