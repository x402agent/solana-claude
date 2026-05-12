# HERMES x402 — Colosseum Hackathon Submission

## OpenClawd: Solana-Native Agents That Earn, Pay, and Learn

**Track:** AI Agents x DeFi x Payments  
**Team:** OpenClawd / solana-clawd  
**Token:** $CLAWD — `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`  
**Payment Rail:** `pay.solanaclawd.com`  
**Animated Pitch Page:** [beepboop/site/hermes-x402.html](beepboop/site/hermes-x402.html)

---

## The Pitch

OpenClawd turns an AI agent into a closed-loop Solana economy.

HERMES x402 is a fully Solana-native agentic harness that can:

1. **Earn USDC** by producing trading intelligence
2. **Pay for inference** over x402 on Solana
3. **Improve its reasoning** through HERMES model calls
4. **Feed those learnings back** into the next OODA cycle

**The loop is the product:**  
`TRADE -> EARN USDC -> PAY x402 -> GET SMARTER -> TRADE BETTER`

This is not a wrapper around Web2 billing. It is an agent that uses Solana-native identity, Solana-native payments, and Solana-native market context to operate as its own economic actor.

---

## What We Built

HERMES x402 combines:

- A neon operator interface across TUI, CLI, and MCP
- An autonomous OODA loop for observation, decisioning, and learning
- Private x402 payments through a confidential pay.sh relay
- Google A2A tasking with payment-aware agent-to-agent execution
- Dark DeFi intelligence for whale tracking, route splitting, and MEV-aware execution
- A token-aligned economy where $CLAWD holders receive discounts and every paid call strengthens the network

---

## Sponsor Integrations

### x402 + pay.sh

- First **private x402 facilitator** implementation in the stack
- `PayshFacilitator` blind relay for confidential AI payments
- Payer wallet hidden from the resource server through NaCl commitments
- AP2 mandate support for delegated sub-agent payments
- Batch settlement optimization for roughly **3x lower fee overhead**
- Idempotency keys and transient-failure retry hardening on the relay path
- Replay-safe private content-cache keys for lower-cost confidential inference

**Files:** `x402/paysh-facilitator.ts`, `x402/client-sdk.ts`

### Google A2A + AP2 + MPP

- Full **Google A2A** implementation
- Agent discovery through `/.well-known/agent.json`
- Task submission with automatic x402/pay.sh payment handling
- SSE streaming for long-running jobs
- AP2 mandate-based delegated authorization
- MPP header support for machine payment flows

**Files:** `x402/a2a-agent.ts`, `x402/client-sdk.ts`

### Solana + Helius

- Native SPL USDC settlement with no wrapped ETH dependency
- Ed25519 wallet identity instead of API-key-only access
- Helius RPC + DAS for whale surveillance and priority fees
- Metaplex Core agent registry for NFT-attested agent identity

### Nous Research HERMES Models

- HERMES-4.3-70B for premium reasoning
- HERMES-4.3-36B for faster routing decisions
- x402-gated inference paid in USDC
- Confidential inference through the pay.sh blind relay

### Jupiter

- Dark routing across Jupiter, Raydium, Orca, and Meteora
- Anti-sandwich slippage controls
- Lower price impact for larger position sizing

---

## Architecture

```
LAYER 1  INTERFACE
TUI + CLI + MCP

LAYER 2  COGNITIVE CORE
Observe -> Orient -> Decide -> Act -> Learn
Multi-agent coordination + A2A task fan-out

LAYER 3  PAYMENT ENGINE
x402 <- pay.sh blind relay <- AP2 mandates <- MPP headers
USDC SPL settlement + $CLAWD holder discounts + ClawdRouter

LAYER 4  DARK DEFI INTELLIGENCE
Whale surveillance + MEV detection + route splitting

LAYER 5  SAFETY
Three Laws Constitution + deny-first permissions + attestation
```

---

## New for Hackathon

| Feature | File | Description |
|---------|------|-------------|
| HERMES x402 TUI | `tui/src/` | Neon live dashboard for OODA, market, and payments |
| pay.sh Facilitator | `x402/paysh-facilitator.ts` | Private x402 relay with blind payments and AP2 |
| Google A2A Client | `x402/a2a-agent.ts` | Full A2A flow with x402-aware task execution |
| Confidential Agent | `x402/confidential-agent.ts` | NaCl-encrypted inference + pay.sh |
| Private Content Cache | `x402/private-content-cache.ts` | Blinded prompt hashing with TTL cache |
| Dark DeFi | `x402/dark-defi.ts` | Whale intel, MEV detection, and route splitting |

---

## Quick Start

```bash
# Clone + install
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd
npm install

# Launch the HERMES x402 TUI dashboard
npm run hermes

# Run demos
npm run demo:ooda        # OODA loop (public data, no keys)
npm run demo:a2a         # Google A2A protocol demo
npm run demo:paysh       # pay.sh private payment demo
npm run demo:dark-defi   # Dark DeFi intelligence demo

# Start ClawdRouter (LLM router with x402)
cd clawdrouter && npm start

# Start MCP server (31 Solana tools for Claude Desktop / Cursor)
npm run mcp:start
```

**No private key required for demo mode.** Market data uses public APIs.

---

## The Agent Economy

HERMES x402 creates a machine economy where agents can earn, spend, and compound intelligence on Solana.

**Agents earn USDC by:**

- Providing trade signals
- Running analysis tasks
- Responding to A2A task requests
- Selling Dark DeFi intelligence

**Agents pay USDC for:**

- Nous Research inference over x402
- ClawdRouter model access
- On-chain data services
- Other agent services through A2A

**Revenue split on every x402 payment:**

- **70%** -> Agent owner
- **15%** -> $CLAWD buyback and burn
- **10%** -> Treasury
- **5%** -> Operator

**$CLAWD holder discounts:** 10% at 1K -> 25% at 100K -> 50% at 1M tokens

**Live payment surface:** `pay.solanaclawd.com`

---

## Why This Wins

1. **Solana-native from the start**: wallet identity, USDC rails, and on-chain context are built in
2. **Closed-loop economics**: the agent can fund its own intelligence spend
3. **Private by design**: pay.sh blind relay makes confidential x402 possible
4. **Interoperable**: Google A2A + AP2 + MPP let agents discover, delegate, and pay each other
5. **Demoable**: the neon HERMES interface makes the system legible on stage
6. **Token-aligned**: every paid interaction can strengthen $CLAWD through holder discounts and buyback/burn economics

---

## Team

OpenClawd is building sovereign AI agents on Solana.

- GitHub: `github.com/x402agent/solana-clawd`
- Ecosystem: `solanaclawd.com`
- Payments: `pay.solanaclawd.com`
- Token: `$CLAWD` on pump.fun

**No Keys. No KYC. Just Crypto.**
