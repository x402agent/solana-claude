# HERMES x402 — Colosseum Hackathon Submission

## OpenClawd: The World's First Solana-Native Agentic Harness

**Track:** AI Agents × DeFi × Payments  
**Team:** OpenClawd / solana-clawd  
**Token:** $CLAWD — `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## What We Built

HERMES x402 is the first **fully Solana-native agentic harness** — an autonomous AI agent that:

1. **Earns USDC** by providing trading intelligence  
2. **Pays for inference** using the x402 payment protocol on Solana  
3. **Gets smarter** with each OODA cycle via Nous Research HERMES models  
4. **Trades better** by feeding learnings back into the loop  
5. **Routes perps** across four venues through a smart-order router with real AMM pool mechanics  

**The Self-Sustaining Loop:**  
`TRADE → EARN USDC → PAY x402 → GET SMARTER → TRADE BETTER`

---

## Sponsor Integrations

### x402 + pay.sh (Primary)
- World's first **private x402 facilitator** implementation  
- `PayshFacilitator` class: blind relay for confidential AI payments  
- Payer wallet hidden from resource server (NaCl commitment scheme)  
- AP2 mandate support for sub-agent payment delegation  
- Batch payment optimization (3× fee reduction)  

**Files:** `x402/paysh-facilitator.ts`, `x402/client-sdk.ts`

### Google A2A + AP2 + MPP
- Full **Google A2A (Agent-to-Agent) protocol** implementation  
- Agent discovery via `/.well-known/agent.json`  
- Task submission with automatic x402/pay.sh payment handling  
- SSE streaming for long-running tasks  
- AP2 mandate-based delegated authorization  
- MPP (Machine Payment Protocol) header support  

**Files:** `x402/a2a-agent.ts`, `x402/client-sdk.ts`

### Solana + Helius
- Native SPL USDC transfers (no wrapped ETH)  
- Ed25519 wallet identity — no API keys, no KYC  
- Helius RPC + DAS for whale surveillance and priority fees  
- Metaplex Core agent registry (NFT-attested agent identities)  

### Nous Research (HERMES Models)
- HERMES-4.3-70B for primary intelligence ($0.90 input / $2.70 output)  
- HERMES-4.3-36B for fast routing ($0.50 / $1.50)  
- x402-gated inference — agents pay per call in USDC  
- Confidential inference via pay.sh blind relay  

### Jupiter
- Dark trade routing: split execution across Jupiter/Raydium/Orca/Meteora  
- Anti-sandwich slippage config  
- Price impact minimization for whale-sized positions  

### Perps Aggregator — Phoenix · Flash · Jupiter · GMTrade
The **Solana perps routing layer** for traders, terminals, dashboards, and autonomous agents. One execution surface across four venues, exposed as an SDK, a smart-order router, and **17 MCP tools** wired straight into the Clawd MCP server.

- **Smart order routing (SOR):** scores every venue on cost / liquidity / open-interest / funding and picks the best execution path, with a full per-venue breakdown and rationale.
- **AMM pool intelligence:** for pool-backed venues (Flash, Jupiter, GMTrade) the router models real pool mechanics — per-side utilization, OI skew, predicted next-period funding, a convex borrow-rate ladder, and a composite pool-health score. Opening into the heavy side of a skewed pool correctly costs more; orders that would breach per-side OI caps are refused.
- **Phoenix CLOB depth:** for the orderbook venue, slippage is computed by walking the book to a true VWAP.
- **Split execution:** a greedy multi-leg allocator fans a large order across venues when no single pool can clear it cheaply.
- **Paper-first safety:** live submission is gated behind `IMPERIAL_LIVE=true`, bounded by a hard per-order USD cap and a symbol allowlist. Private keys never enter the package — build tools return base64 transactions for the caller to sign.

**Files:** `packages/clawd-perps-aggregator/` (SDK + router + MCP), `MCP/src/tools/perps-tools.ts` (bridge), `Perps/` (Imperial router + Phoenix MM + TWAMM).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: THE INTERFACE (TUI + CLI + MCP)                       │
│   hermes-tui • clawd CLI • MCP server (105 tools, 14 categories)│
│   Perps Aggregator: 17 perps_* tools — SOR · AMM · split        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 2: COGNITIVE CORE (OODA Loop)                            │
│   Observe → Orient → Decide → Act → Learn                       │
│   Multi-agent coordinator  •  A2A task fan-out                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 3: PAYMENT ENGINE                                        │
│   x402 ← pay.sh blind relay ← AP2 mandates ← MPP headers       │
│   USDC SPL transfers  •  $CLAWD holder discounts                │
│   ClawdRouter: 55+ models, Solana wallet auth, solanaclawd.com  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 4: DARK DEFI INTELLIGENCE + PERPS EXECUTION              │
│   Whale surveillance  •  MEV detection  •  Dark routing         │
│   Helius DAS  •  On-chain context injection  •  Jupiter splits  │
│   Perps SOR across Phoenix · Flash · Jupiter · GMTrade          │
│   AMM pool intel: utilization · OI skew · funding · health      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  LAYER 5: FOUNDATIONAL SAFETY                                   │
│   Three Laws Constitution (hashed into every agent spawn)       │
│   Deny-first permissions  •  Formal verification (Lean 4)       │
│   Metaplex Core attestation  •  SAS birth ceremony              │
└─────────────────────────────────────────────────────────────────┘
```

---

## New for Hackathon

| Feature | File | Description |
|---------|------|-------------|
| HERMES x402 TUI | `tui/src/` | Full neon dashboard — OODA, market, payments live |
| pay.sh Facilitator | `x402/paysh-facilitator.ts` | Private x402 relay, blind payments, AP2 |
| Google A2A Client | `x402/a2a-agent.ts` | Full A2A spec + x402 payment gating |
| Confidential Agent | `x402/confidential-agent.ts` | NaCl-encrypted inference + pay.sh |
| Dark DeFi | `x402/dark-defi.ts` | Whale intel, MEV detection, dark routing |
| Perps Aggregator | `packages/clawd-perps-aggregator/` | SOR + AMM pool intel + split routing + SDK + MCP across Phoenix/Flash/Jupiter/GMTrade |
| Perps MCP Bridge | `MCP/src/tools/perps-tools.ts` | 17 `perps_*` tools wired into the Clawd MCP server |
| Leviathan SDK | `sdk/` (`@openclawdsolana/leviathan` v0.2.0) | Sovereign AI runtime: OODA, wallet, x402, skills, Metaplex identity |
| Programs workspace | `programs/` | 10 Anchor/Rust programs: inference market, staking, oracle, launchpad, minter |
| ClawdRouter branding | `clawdrouter/` | solanaclawd.com attribution, general-chat category, 3-category limit lifted |

---

## Quick Start

```bash
# Clone + install
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd
npm install

# Repo hygiene check before recording or publishing
npm run repo:audit

# Launch the HERMES x402 TUI dashboard
npm run hermes

# Run demos
npm run demo:ooda        # OODA loop (public data, no keys)
npm run demo:a2a         # Google A2A protocol demo
npm run demo:paysh       # pay.sh private payment demo
npm run demo:dark-defi   # Dark DeFi intelligence demo

# Start ClawdRouter (LLM router with x402)
cd clawdrouter && npm start

# Build + start the MCP server (105 tools incl. 17 perps_* tools)
npm run clawd-perps-aggregator:build   # provides the perps tools
npm run mcp:build && npm run mcp:start

# Perps Aggregator — smart-order routing across 4 Solana perps venues
npm run clawd-perps-aggregator:cli -- route SOL long 250    # best venue + breakdown
npm run clawd-perps-aggregator:cli -- pools SOL             # AMM pool intel
npm run clawd-perps-aggregator:cli -- route-split SOL long 25000
```

**No private key required for demo mode.** All market data uses public APIs; perps execution is paper-first and live submission is gated behind `IMPERIAL_LIVE=true`.

---

## The Agent Economy

```
Agent earns USDC by:          Agent pays USDC for:
  • Providing signals            • Nous Research inference (x402)
  • Running analysis tasks       • ClawdRouter model access (x402)
  • A2A task responses           • On-chain data (Helius)
  • Dark DeFi intelligence       • Other agent services (A2A)
  • Perps routing / execution    • MCP tool calls (p-token metered)
```

Revenue split on every x402 payment:
- **70%** → Agent owner  
- **15%** → $CLAWD buyback & burn  
- **10%** → Treasury  
- **5%** → Operator  

$CLAWD holder discounts: 10% (1K) → 25% (100K) → 50% (1M tokens)

---

## Why This Wins

1. **First mover**: No other Solana agent has native x402 + pay.sh + A2A  
2. **Self-sustaining**: Agent funds itself through intelligent trading  
3. **Private**: pay.sh blind relay — the only confidential x402 facilitator  
4. **Open**: No keys, no KYC, MIT licensed, one-shot install  
5. **Beautiful**: Neon TUI that actually shows live Solana data  
6. **Executes**: Perps aggregator routes real trades across Phoenix, Flash, Jupiter, and GMTrade — agents don't just signal, they route and execute (paper-first, live-gated)  

---

## Team

OpenClawd — Building sovereign AI agents on Solana.

- GitHub: github.com/x402agent/solana-clawd  
- Ecosystem: solanaclawd.com  
- Token: $CLAWD on pump.fun  

**No Keys. No KYC. Just Crypto.**
