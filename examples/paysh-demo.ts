/**
 * examples/paysh-demo.ts
 *
 * Demonstrates pay.sh — the world's first private x402 facilitator.
 * Shows how HERMES x402 makes confidential AI payments on Solana.
 *
 * Run: npx tsx examples/paysh-demo.ts
 */

import { PayshFacilitator } from '../x402/paysh-facilitator.js';

const log = (tag: string, msg: string) =>
  console.log(`\x1b[32m[${tag}]\x1b[0m ${msg}`);

console.log('\n\x1b[1m\x1b[32m💰 pay.sh — Private x402 Facilitator Demo\x1b[0m');
console.log('The world\'s first blind relay for confidential AI payments on Solana.\n');

// ── 1. What pay.sh does ───────────────────────────────────────────────────────

log('PAY.SH', 'Architecture overview:');
console.log(`
  ┌───────────┐   POST /resource   ┌─────────────┐
  │  HERMES   │──────────────────→ │  pay.sh     │
  │  Agent    │                    │  Blind Relay│
  │  Wallet   │←── 402 challenge ─ │             │
  │           │                    │  (escrow)   │
  └───────────┘                    └─────┬───────┘
       │                                 │ forward + relay
       │  SPL USDC transfer              ↓
       │  to pay.sh escrow          ┌─────────────┐
       └───────────────────────────→│  Resource   │
                                    │  Server     │
  ✓ Resource never sees payer addr  │  (Nous AI)  │
  ✓ pay.sh never sees request body  └─────────────┘
  ✓ Payer wallet hidden on-chain
`);

// ── 2. Privacy properties ─────────────────────────────────────────────────────

log('PRIVACY', 'Confidentiality guarantees:');
const properties = [
  { prop: 'Payer wallet → Resource', private: true, method: 'Blind relay (escrow address shown)' },
  { prop: 'Request body → pay.sh', private: true, method: 'TweetNaCl box encryption' },
  { prop: 'Response body → pay.sh', private: true, method: 'End-to-end encryption' },
  { prop: 'On-chain linkability', private: true, method: 'Escrow batching + commitment scheme' },
  { prop: 'Payment amount', private: false, method: 'On-chain SPL visible (obfuscated by batching)' },
];

for (const p of properties) {
  const icon = p.private ? '\x1b[32m✓\x1b[0m' : '\x1b[33m~\x1b[0m';
  console.log(`  ${icon} ${p.prop.padEnd(30)} ${p.method}`);
}
console.log();

// ── 3. Code example ───────────────────────────────────────────────────────────

log('CODE', 'Example: confidential Nous Research inference call');
console.log(`
  import { PayshFacilitator } from '@solanaclawd/x402-client/paysh';
  import { Connection, Keypair } from '@solana/web3.js';

  const facilitator = new PayshFacilitator({
    connection: new Connection(process.env.HELIUS_RPC_URL),
    signer: Keypair.fromSecretKey(/* your key */),
    useBlinding: true,        // hides your wallet from Nous
    batchWindowMs: 500,       // batch payments every 500ms
  });

  // POST to Nous Research HERMES endpoint — pay.sh handles the 402
  const result = await facilitator.fetch(
    'https://inference.nousresearch.com/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: 'hermes-4.3-70b',
        messages: [{ role: 'user', content: 'Analyze SOL price action' }],
      }),
    },
    {
      ap2Mandate: process.env.AP2_MANDATE_JWT, // optional delegation
      onPaymentRequired: async (req) => {
        console.log('Paying', req.maxAmountRequired, 'USDC via pay.sh escrow');
        return true; // auto-approve
      },
    },
  );

  console.log('Response:', result.body);
  console.log('Blind receipt:', result.blindReceipt); // proves payment w/o revealing you
  console.log('Solana tx:', result.escrowSignature);
`);

// ── 4. Batch payment optimization ────────────────────────────────────────────

log('BATCH', 'Payment batching for cost efficiency:');
console.log(`
  Traditional x402 (1 tx per call):
    Inference 1: 0.50 USDC tx + 0.000005 SOL fee
    Inference 2: 0.50 USDC tx + 0.000005 SOL fee
    Inference 3: 0.50 USDC tx + 0.000005 SOL fee
    Total fees: 3 × 0.000005 = 0.000015 SOL

  pay.sh batched (1 tx per batch window):
    [500ms window] Inferences 1,2,3 → 1 SPL transfer: 1.50 USDC
    Total fees: 1 × 0.000005 = 0.000005 SOL   (3× cheaper)
    Bonus: 3 calls linked to 1 on-chain tx = less linkability
`);

// ── 5. AP2 mandate example ────────────────────────────────────────────────────

log('AP2', 'AP2 mandate for sub-agent delegation:');
console.log(`
  // Parent agent creates a spending mandate:
  const mandate = createAP2Mandate({
    sub: 'did:solana:' + subAgentPubkey.toBase58(),
    payLimit: '5.00',         // USDC
    asset: 'USDC',
    exp: Date.now() / 1000 + 3600, // 1 hour
    iss: 'did:solana:' + parentPubkey.toBase58(),
  });

  // Sub-agent uses it (no private key needed for payment auth):
  const result = await facilitator.fetch(url, body, {
    ap2Mandate: mandate,      // delegated payment authorization
  });
`);

console.log('\x1b[32m✅ pay.sh demo complete.\x1b[0m');
console.log('\x1b[36mSponsor: pay.sh × x402 × Solana × Nous Research\x1b[0m\n');
