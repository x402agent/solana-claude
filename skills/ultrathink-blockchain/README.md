<p align="center">
  <img src="https://img.shields.io/badge/claude--code-skill-9945FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzk5NDVGRiIvPjwvc3ZnPg==&logoColor=white" alt="Claude Code Skill">
  <img src="https://img.shields.io/badge/solana-blockchain-14F195?style=for-the-badge&logo=solana&logoColor=white" alt="Solana">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License">
</p>

<h1 align="center">
  ULTRATHINK &times; BLOCKCHAIN
</h1>

<p align="center">
  <strong>A Claude Code skill for building production Solana systems with deep reasoning.</strong>
</p>

<p align="center">
  Turn Claude Code into a blockchain-native development partner that thinks like a senior Solana engineer &mdash; with MEV awareness, transaction atomicity, retry logic, and production hardening baked into every prompt.
</p>

---

## What This Is

**Ultrathink Blockchain** is an open-source [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code) that teaches Claude how to reason about blockchain development &mdash; specifically Solana &mdash; at a production level.

It combines two ideas:

1. **Ultrathink** &mdash; Claude Code's extended thinking mode, focused on the areas that matter most for chain development (transaction structure, MEV, state races, security)
2. **A structured prompting protocol** &mdash; context dump, interview, plan, constraints &mdash; that prevents generic web2 patterns from leaking into your on-chain code

The result: Claude Code writes blockchain code that actually ships to mainnet.

---

## The Formula

```
CONTEXT + INTENT + INTERVIEW + ULTRATHINK + PLAN + CONSTRAINTS → PRODUCTION CODE
```

| Phase | What Happens |
|-------|-------------|
| **Context Dump** | Prime Claude with chain, stack, and constraints |
| **Intent** | Dimensional goal with success criteria |
| **Interview** | Requirements extraction (3-5 questions at a time) |
| **Ultrathink** | Deep reasoning on TX, MEV, races, security |
| **Plan** | Accounts, instructions, error taxonomy, tests |
| **Constraints** | Retries, simulation, Jito, timeouts |
| **Execute** | Full files, production patterns |
| **Iterate** | Review, steer, continue |

---

## Quick Start

### Install the Skill

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ultrathink-blockchain.git

# Install the skill into Claude Code
cp -r ultrathink-blockchain/skill ~/.claude/skills/ultrathink-blockchain
```

Or use the one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/ultrathink-blockchain/main/install.sh | bash
```

### Use It

Once installed, start a Claude Code session and the skill activates automatically for blockchain work. Here's the one-shot production prompt:

```
Context: Solana mainnet-beta production environment.
Stack: TypeScript, Helius RPC + websockets, Birdeye data, Jito execution.

I want [your goal with success metrics].

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

Write production code. I'm shipping this.
```

---

## What's Inside

```
ultrathink-blockchain/
├── README.md                  # You are here
├── LICENSE                    # MIT
├── CONTRIBUTING.md            # How to contribute
├── install.sh                 # One-line installer
├── skill/                     # The Claude Code skill
│   ├── SKILL.md               # Core skill definition
│   └── references/            # Reference docs the skill loads
│       ├── antipatterns.md    # Common blockchain antipatterns
│       └── templates.md       # Domain-specific prompt templates
├── docs/                      # Extended documentation
│   ├── formula.md             # The complete Ultrathink formula
│   ├── depth-ladder.md        # Extended thinking depth guide
│   └── blockchain-patterns.md # Solana-specific patterns
└── site/                      # Visual reference (landing page)
    └── index.html             # Interactive formula visualization
```

---

## The Depth Ladder

| Invocation | Token Budget | Best For |
|------------|-------------|----------|
| `think` | ~500 tokens | Simple decisions, quick fixes |
| `think step by step` | ~1000 tokens | Multi-step problems, debugging |
| `think hard` | ~2000 tokens | Architecture decisions, complex logic |
| `think harder` | ~4000 tokens | System design, security analysis |
| `ultrathink` | ~8000+ tokens | Production systems, critical code |
| `megathink` | Maximum depth | Novel problems, research-grade work |

**The tradeoff:** deeper thinking = better reasoning but slower response and higher token cost. Use the right level for the task.

---

## Blockchain Focus Areas

When you tell Claude to `ultrathink` about blockchain problems, it focuses on:

- **Transaction Atomicity** &mdash; instruction ordering, PDAs, compute units, lookup tables
- **MEV Exposure** &mdash; sandwich risk, backrun opportunities, Jito bundle decisions
- **State Races** &mdash; stale blockhash, account contention, retry strategies
- **Security** &mdash; attack vectors, authority checks, reentrancy paths
- **Failure Modes** &mdash; what breaks at 3am with no one watching

---

## Templates

The skill includes production-ready prompt templates for common blockchain patterns:

- **Token Sniper / Trading Bot** &mdash; websocket monitoring, Jito execution, exit strategies
- **DeFi Protocol Integration** &mdash; instruction sequences, account schemas, edge cases
- **Indexer / Analytics Pipeline** &mdash; ingestion, schema design, reorg handling
- **Anchor Program (Rust)** &mdash; account sizing, PDA derivation, security invariants
- **Multi-Agent Trading System** &mdash; agent coordination, state machines, risk management

See [`docs/formula.md`](docs/formula.md) for the complete guide with all templates.

---

## Never Ship Without

- [ ] Retry logic on all RPC calls
- [ ] Transaction simulation before send
- [ ] Dynamic priority fees via Helius
- [ ] Jito bundles for value transactions
- [ ] Explicit timeouts on network ops
- [ ] Graceful shutdown / position cleanup
- [ ] Structured logging with correlation IDs
- [ ] Circuit breakers for cascading failures

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. In short:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR with a clear description

We especially welcome contributions for:

- New blockchain prompt templates (EVM, Sui, Aptos, etc.)
- Antipattern documentation
- Skill refinements based on real-world usage
- Translations

---

## License

MIT &mdash; see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>ultrathink. build on-chain. ship to mainnet.</strong>
</p>
