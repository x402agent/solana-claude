# Solana Clawd Agent Creation Guide

## Overview

Agents on **Solana Clawd** are specialized AI assistants designed to handle specific tasks across the Solana DeFi, trading, NFT, and SPL-token ecosystem. This guide shows you how to create, publish, and deploy agents into our hub at [/agents](https://solanaclawd.com/agents) so other builders can install and run them.

Every agent you publish becomes:

- 🪐 **Discoverable** via our JSON API and manifest
- 🔌 **Installable** into any MCP client (Claude Desktop, Cursor, ClawdOS, etc.)
- 🎨 **Mintable** as an on-chain MPL Core asset on Solana (optional, via `/agents-mint`)
- 🗣️ **Addressable** through our A2A (agent-to-agent) endpoint at `/api/agents/a2a`
- 📈 **Trackable** in the hosted registry at `/agents-registry`

---

## Agent Anatomy

### Basic Structure

```json
{
  "author": "your-github-or-solana-handle",
  "config": {
    "systemRole": "Your detailed system prompt here...",
    "openingMessage": "Optional welcome message",
    "openingQuestions": ["Suggested first question?"]
  },
  "identifier": "unique-agent-id",
  "meta": {
    "title": "Agent Display Name",
    "description": "Clear, concise description (max 200 characters)",
    "avatar": "🤖",
    "tags": ["solana", "defi", "trading"],
    "category": "defi"
  },
  "schemaVersion": 1,
  "createdAt": "2026-04-16"
}
```

### Key Components

**identifier**: URL-safe name (lowercase, hyphens, no spaces). Used as the JSON filename and in API routes.

- Good: `solana-jupiter-router`, `pump-fun-sniper`
- Bad: `My Agent!`, `Pump.Fun Agent v2`

**title**: Display name shown in [/agents](https://solanaclawd.com/agents).

**description**: Short summary shown in the agent card (160–200 chars optimal).

**avatar**: Single emoji that represents the agent's function.

**tags**: 3–8 keywords. Common Solana tags: `solana`, `spl`, `jupiter`, `raydium`, `pumpfun`, `meteora`, `drift`, `marginfi`, `kamino`, `nft`, `mpl-core`, `metaplex`, `priority-fees`, `mev`, `validator`, `stake`.

**category**: One of `defi`, `trading`, `nft`, `analytics`, `security`, `dev-tools`, `education`, `governance`.

**systemRole**: The core prompt that defines agent behavior.

---

## Writing Effective System Prompts

### Structure Template

```text
You are [ROLE/IDENTITY on Solana]

CAPABILITIES:
- [What the agent can do]
- [Key specialization — which Solana programs, DEXs, or SDKs]
- [Tools/knowledge available]

GUIDELINES:
- [How to approach tasks]
- [Response format]
- [Constraints/limitations — e.g. priority fee ceilings, slippage caps]

WORKFLOW:
1. [Step-by-step process]
2. [How to handle specific scenarios]

EXAMPLES:
[Optional: Demonstrate desired behavior]
```

### Solana DeFi Agent Example

```json
{
  "systemRole": "You are a Solana Yield Optimization Specialist focused on the Kamino, MarginFi, Drift, and Meteora ecosystems.\n\nCAPABILITIES:\n- Analyze yield opportunities across lending, LP, and staking protocols on Solana\n- Calculate net APY factoring in borrow rates, LP fees, and reward emissions\n- Monitor priority fees and suggest optimal transaction timing via Helius/Triton RPC\n- Compare concentrated liquidity ranges on Meteora DLMM vs Orca Whirlpools\n\nGUIDELINES:\n- Always include risk assessments (high/medium/low) with reasoning\n- Factor priority fees (lamports/CU) and Jito tips into net return math\n- Flag programs with recent audits and known incidents\n- Never promise outcomes; this is analysis, not financial advice\n\nWORKFLOW:\n1. Ask for capital size, risk tolerance, and time horizon\n2. Check current market conditions (SOL price, funding rates, TVL moves)\n3. Compare 3–5 opportunities with pros/cons table\n4. Provide specific Jupiter routes or program instructions\n5. Include warnings on smart contract, oracle, and peg risks\n\nFORMAT:\nProtocol | APY | TVL | Risk | Priority Fee | Recommendation"
}
```

---

## Best Practices

### Do's

✅ Be specific about which Solana programs/DEXs the agent understands
✅ Use accurate Solana terminology (CU, priority fees, Jito tips, PDAs, CPIs)
✅ Provide structured, scannable output (tables, bullets)
✅ Mention audit status (OtterSec, Neodyme, Sec3, Halborn) when relevant
✅ Include disclaimers about rug risks on pump.fun / new SPL tokens
✅ Use clear step-by-step workflows referencing real tool calls

### Don'ts

❌ Make financial guarantees or price predictions
❌ Conflate Solana with EVM concepts (there's no "gas" — use "priority fees" / "compute units")
❌ Ignore program audit status or track record
❌ Recommend interacting with unverified programs without warnings
❌ Copy prompts from other agents verbatim

---

## Agent Categories on Solana Clawd

### 🪙 DeFi & Finance

Jupiter routing, Kamino vaults, MarginFi lending, Drift perps, Meteora DLMM, Orca Whirlpools, Sanctum LST, stablecoin peg monitoring.

### 📈 Trading & Analysis

Pump.fun sniping, Raydium LP analysis, Phoenix orderbook making, MEV/sandwich detection, whale tracking via Helius webhooks, on-chain flow via Bitquery/Flipside.

### 🎨 NFT & MPL Core

Tensor/Magic Eden floor analysis, MPL Core asset minting, compressed NFT (cNFT) workflows, royalty enforcement, collection bootstrapping.

### 🛠️ Dev & Security

Anchor program auditing, Solana Playground helpers, Squads multisig review, IDL explainers, priority-fee estimators, transaction simulation via LiteSVM/Mollusk/Surfpool.

### 📚 Research & Education

Solana fundamentals, SVM internals, validator economics, stake delegation, governance (Realms, SPL-Governance), tokenomics for SPL launches.

---

## Testing Your Agent

Before submitting to the [/agents](https://solanaclawd.com/agents) hub, test thoroughly:

1. **Role adherence**: Does it stay on Solana topics?
2. **Edge cases**: How does it handle a non-Solana question?
3. **Error handling**: Does it gracefully decline out-of-scope tasks?
4. **Response quality**: Accurate compute unit estimates? Correct program IDs?
5. **Consistency**: Same tone and format across conversations?

### Test Prompts

```text
"What's the best SOL-staking yield right now, net of fees?"
"Compare providing liquidity on Meteora DLMM vs Orca Whirlpool for SOL/USDC"
"Calculate impermanent loss for a ±5% DLMM range on JLP/USDC"
"Is program ID <PROGRAM_ID> safe to interact with?"
"Explain how Jito tips affect transaction landing rates"
```

---

## Localization

Agents are automatically translated into 18 languages when merged. Tips for translation-friendly prompts:

- Use clear, standard English
- Avoid idioms and colloquialisms
- Keep sentences concise
- Use consistent terminology (don't alternate "SOL" and "Solana native token")
- Define technical terms on first use

---

## Submission Checklist

- [ ] Unique, descriptive identifier
- [ ] Clear title and description
- [ ] Appropriate avatar emoji
- [ ] 3–8 relevant Solana tags
- [ ] Category assigned
- [ ] Well-structured system prompt with real Solana references
- [ ] Tested with at least 10 prompts
- [ ] No copyrighted or proprietary content
- [ ] JSON validates correctly (`bun run build`)

---

## Publishing to the Solana Clawd Hub

Three ways to publish:

### 1. PR into the repo (recommended)

```bash
git clone https://github.com/x402agent.com/solana-clawd.git
cd solana-clawd/defi-agents
cp agent-template.json src/your-agent-name.json
# edit your agent
bun run format && bun run build
# open a PR
```

Once merged, your agent appears at:

- `https://solanaclawd.com/agents` (gallery)
- `https://beepboop.solanaclawd.com/{your-agent-name}.json` (API)
- 18 localized variants auto-generated

### 2. Mint as on-chain MPL Core asset

Visit [/agents-mint](https://solanaclawd.com/agents-mint) to register your agent as a Metaplex Core asset. This gives it a transferable Solana identity, optional royalty rails, and an entry in the on-chain [/agents-registry](https://solanaclawd.com/agents-registry).

### 3. Host externally, register via A2A

Expose your agent over our A2A protocol at `POST /api/agents/a2a` (see [API.md](./API.md)) and submit the registration endpoint — your agent stays on your infra but is discoverable through the hub.

---

## Examples of Great Agents

### Simple Agent (Solana Sentiment)

```json
{
  "identifier": "solana-sentiment-analyzer",
  "meta": {
    "title": "Solana Sentiment Analyzer",
    "description": "Analyzes Solana ecosystem sentiment from X, Discord, and on-chain flow",
    "avatar": "📊",
    "tags": ["solana", "sentiment", "analysis", "social"],
    "category": "analytics"
  },
  "config": {
    "systemRole": "You analyze Solana ecosystem sentiment by synthesizing X (Twitter) trends, Discord chatter, validator governance votes, and on-chain flow (netflows to CEX, LST mint/burn rates, new token creations on pump.fun). Provide sentiment scores (bullish/neutral/bearish) with evidence and confidence levels."
  }
}
```

### Complex Agent (Solana Portfolio Manager)

```json
{
  "identifier": "solana-portfolio-manager",
  "meta": {
    "title": "Solana Portfolio Manager",
    "description": "Multi-protocol position tracking, rebalancing, and risk management across Solana DeFi",
    "avatar": "💼",
    "tags": ["solana", "defi", "portfolio", "risk", "kamino", "marginfi"],
    "category": "defi"
  },
  "config": {
    "systemRole": "You are an expert Solana portfolio manager specializing in multi-protocol position tracking across Kamino, MarginFi, Drift, Meteora, Orca, and Sanctum.\n\nCORE FUNCTIONS:\n1. Portfolio Analysis: Index positions via Helius DAS API, compute net worth in SOL and USD\n2. Risk Assessment: Liquidation thresholds on lending, IL exposure on LP positions, LST depeg risk\n3. Rebalancing: Suggest optimal allocation based on market regime and user goals\n4. Yield Tracking: Monitor APYs, reward claim timing, compound strategies, and Jito MEV rewards\n\nWORKFLOW:\n- Request Solana pubkey or manual position entry\n- Fetch positions via Helius / Birdeye\n- Surface risk exposures with specific liquidation prices\n- Provide actionable recommendations with Jupiter routes\n- Include priority-fee estimates and recommended Jito tips\n\nOUTPUT FORMAT:\nPortfolio Summary | Risk Score | Recommendations | Action Items\n\nAlways disclaim: 'Not financial advice. DYOR.'"
  }
}
```

---

## Need Help?

- Open an issue in [x402agent.com/solana-clawd](https://github.com/x402agent.com/solana-clawd/issues) with the `agent-help` label
- Review the [Prompt Engineering Guide](./PROMPTS.md)
- Check existing agents in [`defi-agents/src/`](../src/) for inspiration
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting options

---

**Ready to contribute?** Open a PR, and your agent goes live on [solanaclawd.com/agents](https://solanaclawd.com/agents) within 24 hours.
