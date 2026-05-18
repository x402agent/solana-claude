# Blockchain Prompt Templates

Production-ready prompt templates for common blockchain development patterns. Copy-paste and customize for your project.

---

## Template: Token Sniper / Trading Bot

```
I want a production Solana token sniper that:
- Monitors [Raydium/Pump.fun/Moonshot] for new pools via websocket
- Evaluates tokens against [criteria: liquidity, holder distribution, etc.]
- Executes buys within [X]ms of detection using Jito bundles
- Implements [trailing stop / take profit / time-based exit] strategy
- Exposes a terminal UI with real-time PnL

Interview me about:
- My RPC setup (Helius tier, dedicated nodes?)
- Risk parameters (max position size, daily loss limit)
- The specific signals I want to filter on
- My existing infra this needs to integrate with

ultrathink about:
- The latency budget from detection → execution
- Race conditions between the monitor and executor
- State management for open positions
- Failure modes when RPC lags or Jito rejects bundles
- How to avoid getting rekt by rugs and honeypots

plan mode: on — I need to see the architecture before code.

Constraints:
- TypeScript with strict mode
- Use Helius websockets for pool detection
- Jito bundle submission for execution
- All secrets from environment variables
- Graceful shutdown that doesn't leave orphan positions
```

---

## Template: DeFi Protocol Integration

```
I want to integrate with [Protocol] to [action: swap/stake/lend/etc.].

Context:
- Protocol address: [address]
- IDL available: [yes/no, location]
- Documentation: [link if exists]

Interview me about:
- The specific user flow I'm building
- Whether I need to handle [token accounts, ATAs, wrapping SOL]
- Expected transaction frequency
- Error handling requirements

ultrathink about:
- The exact instruction sequence this protocol expects
- Account validation — what PDAs need derivation?
- Edge cases: what if user has no ATA? What if balance insufficient?
- How to simulate this transaction before sending

Before writing code, show me:
1. The account schema for each instruction
2. The instruction data layout
3. Example transaction structure

Then implement with full error handling.
```

---

## Template: Indexer / Analytics Pipeline

```
I want to index [event type] from [program/token/protocol] and:
- Store in [Postgres/SQLite/Redis]
- Expose via [REST API / GraphQL / websocket]
- Update in [real-time / batched]

Interview me about:
- Historical depth needed (how far back?)
- Query patterns (what questions am I answering?)
- Update latency requirements
- Scale expectations (events per second)

ultrathink about:
- The gRPC vs websocket vs polling tradeoff for ingestion
- Schema design for the query patterns I described
- Handling chain reorgs and missed slots
- Backfill strategy for historical data
- Rate limit management with the RPC provider

plan mode: on

Constraints:
- Use Helius webhooks or geyser if applicable
- Idempotent processing (re-running is safe)
- Include health checks and lag monitoring
- Document the schema with example queries
```

---

## Template: Anchor Program (Rust)

```
I want an Anchor program that [functionality].

Interview me about:
- The accounts this program will manage
- Who can call which instructions (authority model)
- Fee structure if any
- Upgrade authority plan

ultrathink about:
- Account sizing and rent implications
- PDA derivation strategy (seeds, bump handling)
- Access control vulnerabilities
- Integer overflow/underflow risks
- Reentrancy potential
- What happens if accounts are passed in wrong order

plan mode: on — show me:
1. Account struct definitions
2. Instruction signatures
3. Error enum
4. Events emitted
5. Key security invariants

Constraints:
- Anchor 0.29+ patterns
- All math uses checked operations or safe-math
- Events for every state change
- Comprehensive error types (no generic errors)
- Include test scaffolding in TypeScript
```

---

## Template: Multi-Agent Trading System

```
I want a multi-agent system where:
- Agent A monitors [data source] for signals
- Agent B evaluates signals against [strategy]
- Agent C executes approved trades via [execution venue]
- Agent D manages risk and position limits
- All agents coordinate via [message bus / shared state]

Interview me about:
- The specific signal sources and their data format
- Strategy parameters (what makes a "good" signal?)
- Execution requirements (speed, MEV protection)
- Risk limits (position size, correlation, drawdown)
- How I want to monitor and intervene

ultrathink about:
- Agent coordination — avoiding race conditions and conflicts
- State consistency across agents
- Failure isolation — one agent crashing shouldn't kill the system
- Human override mechanisms
- Backtest vs live mode switching

plan mode: on

Show me the message schemas, state machine for each agent,
and the coordination protocol before writing implementation.
```

---

## Template: One-Shot Production Prompt

The universal template that combines all patterns:

```
Context: Solana mainnet-beta production environment.
Stack: TypeScript, Helius RPC + websockets, Birdeye data, Jito execution.

I want [detailed goal with success metrics].

Before writing code, interview me about requirements, constraints,
existing infrastructure, and edge cases. Ask 3-5 questions at a time.

After the interview:
1. Reflect requirements back for confirmation
2. ultrathink about:
   - Transaction structure and instruction ordering
   - Account validation and PDA derivation
   - MEV exposure and protection strategy
   - Failure modes and retry logic
   - State race conditions
3. Present plan (accounts, instructions, error taxonomy, tests)
4. Wait for my approval

Constraints:
- All RPC calls through retry wrapper with backoff
- All transactions simulated before sending
- Dynamic priority fees via Helius
- Value transactions through Jito bundles
- Explicit timeout on all network operations
- Graceful degradation when dependencies fail
- Comprehensive error types (no generic throws)
- Structured logging with correlation IDs

Code style:
- TypeScript strict mode, no `any`
- Pure functions where possible
- Explicit state machines for async flows
- Full files, no placeholders

Write production code. I'm shipping this.
```
