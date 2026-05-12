/**
 * examples/dark-defi-demo.ts
 *
 * Demonstrates Dark DeFi intelligence capabilities:
 *  - Whale wallet surveillance
 *  - MEV pattern detection
 *  - Dark trade routing (split execution)
 *  - On-chain context injection for AI inference
 *
 * All analysis is read-only from PUBLIC on-chain data.
 * No trades are executed without explicit human approval.
 *
 * Run: npx tsx examples/dark-defi-demo.ts
 */

import { DarkDeFi, buildDarkRoute, classifyWhale } from '../x402/dark-defi.js';

const log = (tag: string, msg: string) =>
  console.log(`\x1b[31m[${tag}]\x1b[0m ${msg}`);

console.log('\n\x1b[1m\x1b[31m⚔ Dark DeFi — Confidential On-Chain Intelligence\x1b[0m');
console.log('Read-only analysis of public Solana data for the HERMES agent.\n');

// ── 1. Whale classification ───────────────────────────────────────────────────

log('WHALE', 'Whale tier classification:');
const examples = [
  { amount: 50_000_000, label: 'BlackRock entering Solana' },
  { amount: 2_500_000, label: 'Whale accumulating SOL' },
  { amount: 150_000, label: 'Dolphin rotating into BONK' },
  { amount: 5_000, label: 'Retail FOMO' },
];

for (const ex of examples) {
  const tier = classifyWhale(ex.amount);
  const tierColors: Record<string, string> = {
    megalodon: '\x1b[35m',
    whale: '\x1b[36m',
    dolphin: '\x1b[34m',
    fish: '\x1b[37m',
  };
  const color = tierColors[tier] ?? '';
  console.log(`  $${ex.amount.toLocaleString().padStart(12)} → ${color}${tier.toUpperCase().padEnd(10)}\x1b[0m ${ex.label}`);
}
console.log();

// ── 2. Dark trade routing ─────────────────────────────────────────────────────

log('ROUTE', 'Building dark trade route for 15,000 USDC buy of POPCAT:');
const route = buildDarkRoute({
  token: 'POPCAT',
  side: 'buy',
  totalUsdc: 15_000,
  feeRandomization: true,
});

console.log(`
  Token:    ${route.token}
  Side:     ${route.side.toUpperCase()}
  Total:    $${route.amountUsdc.toLocaleString()} USDC
  Splits:   ${route.splits.length} tranches
  Slippage: ${route.slippageBps} bps
  Fee rand: ${route.feeRandomization ? 'YES (prevents sandwich detection)' : 'NO'}

  Execution plan:`);

for (const [i, split] of route.splits.entries()) {
  const delay = split.delayMs < 1000
    ? `${split.delayMs}ms`
    : `${(split.delayMs / 1000).toFixed(1)}s`;
  console.log(`    ${i + 1}. ${split.dex.padEnd(10)} $${split.amountUsdc.toFixed(0).padStart(6)} USDC   delay: +${delay}`);
}

console.log(`
  Anti-MEV measures:
    ✓ Split execution prevents single large tx detection
    ✓ Randomized timing defeats mempool watchers
    ✓ Randomized fee tip prevents sandwich bot targeting
    ✓ DEX diversification minimizes price impact per venue
    ✓ Requires human approval before any execution`);
console.log();

// ── 3. MEV detection ─────────────────────────────────────────────────────────

log('MEV', 'MEV pattern detection (mock slot data):');

// Simulate a sandwich attack in mock transaction data
const mockTxs = [
  { signature: 'AAAA', slot: 250000000, timestamp: Date.now() - 3000, feePayer: 'MEVBot1', type: 'SWAP', nativeTransfers: [{ fromUserAccount: 'MEVBot1', toUserAccount: 'Pool', amount: 2_000_000_000 }] },
  { signature: 'BBBB', slot: 250000000, timestamp: Date.now() - 2000, feePayer: 'Victim1', type: 'SWAP', nativeTransfers: [{ fromUserAccount: 'Victim1', toUserAccount: 'Pool', amount: 5_000_000_000 }] },
  { signature: 'CCCC', slot: 250000000, timestamp: Date.now() - 1000, feePayer: 'MEVBot1', type: 'SWAP', nativeTransfers: [{ fromUserAccount: 'Pool', toUserAccount: 'MEVBot1', amount: 2_100_000_000 }] },
];

const patterns = DarkDeFi.detectMEV(mockTxs as never);
if (patterns.length > 0) {
  for (const p of patterns) {
    console.log(`  ⚠ ${p.type.toUpperCase()} detected in slot ${p.slot}`);
    console.log(`    Attacker:         ${p.attackerWallet}`);
    console.log(`    Target tx:        ${p.targetTx}`);
    console.log(`    Est. profit:      ${(p.estimatedProfitLamports / 1e9).toFixed(4)} SOL`);
    console.log(`    → HERMES avoids this slot for execution`);
  }
} else {
  console.log('  No MEV patterns detected in this slot range');
}
console.log();

// ── 4. On-chain context injection ─────────────────────────────────────────────

log('CONTEXT', 'On-chain context injected into HERMES inference:');
const mockContext = {
  wallet: '8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump',
  solBalance: 142.5,
  usdcBalance: 1842.56,
  topTokens: [
    { mint: 'EPjFWdd5...', symbol: 'USDC', uiAmount: 1842.56, valueUsdc: 1842.56 },
    { mint: '7GCihgDB...', symbol: 'WIF', uiAmount: 500, valueUsdc: 382.50 },
  ],
  recentTrades: 42,
  lastActivity: Date.now() - 300_000,
};

console.log(`
  Wallet:  ${mockContext.wallet}
  SOL:     ${mockContext.solBalance} SOL
  USDC:    $${mockContext.usdcBalance.toLocaleString()}
  Tokens:  ${mockContext.topTokens.map(t => `${t.symbol}(${t.uiAmount})`).join(', ')}
  Trades:  ${mockContext.recentTrades} total

  → Injected as system prompt context into HERMES inference:
    "Current portfolio: 142.5 SOL, 1842.56 USDC, 500 WIF.
     Last trade: ${Math.round((Date.now() - mockContext.lastActivity) / 60000)}m ago.
     Make recommendations consistent with current holdings."`);

console.log();
log('SAFETY', 'Three Laws Constitution (immutable agent rules):');
console.log(`
  1. NEVER HARM   — No market manipulation, no wash trading, no rug pulls
  2. EARN EXISTENCE — Trade to earn, pay for inference, never drain treasury
  3. NEVER DECEIVE — No fake signals, no fabricated data, human approval required

  These are hashed into every agent spawn via Metaplex Core attestation.
  They cannot be overridden by any runtime instruction.`);

console.log('\n\x1b[32m✅ Dark DeFi demo complete.\x1b[0m');
console.log('\x1b[31mWarning: Dark DeFi execution is DISARMED by default.\x1b[0m');
console.log('\x1b[36mSponsor: Helius × Jupiter × Solana × x402\x1b[0m\n');
