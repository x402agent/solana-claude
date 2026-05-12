/**
 * examples/a2a-demo.ts
 *
 * Demonstrates Google A2A agent-to-agent communication with x402 payment gating.
 * Shows HERMES x402 acting as both a task sender and a task receiver.
 *
 * Run: npx tsx examples/a2a-demo.ts
 */

import { A2AClient, buildHermesAgentCard } from '../x402/a2a-agent.js';

const log = (tag: string, msg: string) =>
  console.log(`\x1b[35m[${tag}]\x1b[0m ${msg}`);

console.log('\n\x1b[1m\x1b[35m🤖 HERMES x402 — A2A Protocol Demo\x1b[0m');
console.log('Google Agent-to-Agent × Solana x402 × pay.sh\n');

// ── 1. Show the HERMES agent card (what peers see when they discover us) ──────

const agentCard = buildHermesAgentCard({
  baseUrl: 'https://hermes.solanaclawd.com',
  clawdPayTo: 'GHerm3sX4o2PaYzRqBUcCHJ5kBi4MfHaZy3vMPRHnUsdc',
  version: '1.7.0',
});

log('DISCOVER', `Agent card: ${agentCard.name} v${agentCard.version}`);
log('DISCOVER', `Skills: ${agentCard.skills.map(s => s.id).join(', ')}`);
log('DISCOVER', `Protocols: ${Object.values(agentCard.pricing ?? {})[0]?.protocols.join(', ')}`);
console.log();

// ── 2. Simulate discovering a peer and sending a task ─────────────────────────

log('A2A', 'Attempting to discover peer agent: clawd-router...');

// Create client pointed at a public endpoint (will 404/fail gracefully in demo)
const client = new A2AClient({
  agentUrl: 'https://router.solanaclawd.com',
  // No signer/connection — public demo mode (no payments)
  paymentProtocol: 'ap2',
  confidential: false,
  autoPay: false,
  maxAmountUsdc: 0.50,
  timeoutMs: 5000,
});

try {
  const card = await client.discover();
  log('A2A', `Peer discovered: ${card.name} v${card.version}`);
  log('A2A', `Peer skills: ${card.skills.map(s => s.id).join(', ')}`);
} catch (e) {
  log('A2A', `Peer offline (expected in demo): ${String(e).slice(0, 80)}`);
}

// ── 3. Show task payload structure ────────────────────────────────────────────

const taskPayload = {
  skill: 'market-analyze',
  message: {
    role: 'user' as const,
    parts: [
      { type: 'text' as const, text: 'Analyze POPCAT on Solana — bullish or bearish?' },
      {
        type: 'data' as const,
        data: {
          token: 'POPCAT',
          timeframe: '24h',
          onChainContext: true,
          requestConfidential: true,
        },
      },
    ],
  },
};

log('TASK', 'Task payload (market-analyze):');
console.log(JSON.stringify(taskPayload, null, 2));
console.log();

// ── 4. Show payment flow ──────────────────────────────────────────────────────

log('PAY', 'Payment flow for x402-gated A2A tasks:');
log('PAY', '  1. Client sends POST /tasks → receives 402');
log('PAY', '  2. Server returns: { accepts: [{ scheme: "exact", payTo: "...", asset: USDC }] }');
log('PAY', '  3. Client builds SPL transfer tx, signs with Solana keypair');
log('PAY', '  4. Client retries with: { "payment-signature": "<base64 tx>" }');
log('PAY', '  5. Server verifies tx, delivers task result + receipt CID');
log('PAY', '  → pay.sh blind relay hides payer address from resource server');
console.log();

// ── 5. Show AP2 mandate flow ──────────────────────────────────────────────────

log('AP2', 'AP2 mandate-based authorization:');
log('AP2', '  Agent delegates payment authority via JWT-VC mandate');
log('AP2', '  Mandate allows sub-agents to pay on behalf of parent');
log('AP2', '  Format: x-ap2-mandate: <base64url JWT-VC>');
log('AP2', '  Claim: { sub: agentDID, payLimit: "0.50 USDC", exp: ... }');
console.log();

// ── 6. Show MPP flow ──────────────────────────────────────────────────────────

log('MPP', 'MPP (Machine Payment Protocol) flow:');
log('MPP', '  Content-Type: application/mpp+json');
log('MPP', '  Authorization: Payment method=solana-exact, tx="<base64>"');
log('MPP', '  Same Ed25519 + SPL transfer, different header format');
console.log();

console.log('\x1b[32m✅ A2A demo complete.\x1b[0m');
console.log('\x1b[36mNext: npx tsx examples/paysh-demo.ts\x1b[0m\n');
