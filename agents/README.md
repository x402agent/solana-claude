# Clawd 🤖 DeFi Agents API - AI Agent Definitions for Web3

> **43 production-ready AI agent definitions for DeFi, portfolio management, trading, and Web3 workflows. Every agent is CLAWD-themed with SOUL + skill integration. RESTful JSON API with 18-language support.**

## 🔗 solana-clawd Ecosystem

| Surface | URL | Status |
| --- | --- | --- |
| **Agents** | [solanaclawd.com/agents](https://solanaclawd.com/agents) | live |
| **Terminal** | [solanaclawd.com/terminal](https://solanaclawd.com/terminal) | drops today |
| **Studio (Vibe)** | [vibe.solanaclawd.com](https://vibe.solanaclawd.com) | live for holders |
| **DEX** | [dex.solanaclawd.com](https://dex.solanaclawd.com) | live |
| **Telegram** | [t.me/clawdtoken](https://t.me/clawdtoken) | live |
| **Solana OS Hub** | [solanaos.net](https://solanaos.net) | live |
| **Mobile (Seeker)** | [seeker.solanaos.net](https://seeker.solanaos.net) | live |

## 🆕 What's New

- **CLAWD SOUL + skill preamble** wired into every agent's `systemRole` (43 agents) — memory tiers (`KNOWN` / `LEARNED` / `INFERRED`), deny-first permissions, and skill integration with `STRATEGY.md` (multi-venue framework), `TRADE.md` (Pump.fun tactics), and the CLAWD risk + permission engines.
- **CLAWD output contract** appended to every agent — tier-labeled data points, route trades through the permission engine, stay in character as a solana-clawd specialist.
- **Author/homepage rebrand** — all agents now point at the [solana-clawd repo](https://github.com/x402agent/solana-clawd) with `clawd` and `solana-clawd` tags.
- **`plugin.delivery` rebranded** — 48 plugin schemas themed as solana-clawd integrations, broken camelCase identifiers (`SperaxPluginManifest` → `SolanaClawdPluginManifest`) repaired, HTTP header renamed to `X-Solana-Clawd-Plugin-Settings`.
- **Idempotent theming scripts** — re-apply any time: `node agents/scripts/commands/apply-clawd-theme.mjs`, `node plugin.delivery/scripts/rebrand-to-solana-clawd.mjs`.

---

A comprehensive, discoverable API hosting specialized AI agent schemas with universal compatibility. Works with any AI platform, LLM, or chatbot that supports agent indexes — no vendor lock-in, no platform restrictions. Perfect for developers, LLMs, and AI systems building Web3 applications.

---

## ✨ Key Features

- ✅ **42 Production-Ready Agents** — DeFi, portfolio, trading, Web3, education
- ✅ **18 Languages** — Automated i18n translation workflow ([Learn More →](./docs/I18N_WORKFLOW.md))
- ✅ **RESTful JSON API** — Easy integration for developers and LLMs ([API Docs →](./docs/API.md))
- ✅ **Machine-Readable Indexes** — Agent manifest for AI crawlers ([agents-manifest.json](./agents-manifest.json))
- ✅ **Universal Format** — Standard JSON schema works with any platform
- ✅ **No Vendor Lock-in** — Switch platforms without losing work
- ✅ **Open Source** — MIT licensed, fully transparent
- ✅ **SEO & AI Friendly** — robots.txt, structured data, semantic indexing
- ✅ **CDN Hosted** — GitHub Pages for fast global access
- ✅ **Custom Domain Ready** — Easy white-labeling

---

## 🚀 Quick Start

### For AI Systems & LLMs

Discover agents via the API:

```bash
# Get all agents (English)
curl https://clawd.click/index.json

# Get agents in any language
curl https://clawd.click/index.zh-CN.json

# Get agent manifest for indexing
curl https://clawd.click/agents-manifest.json
```

[Complete API Documentation →](./docs/API.md)

### For Users

Add agents to your AI platform:

```
https://clawd.click/index.json
```

Or with language:

```
https://clawd.click/index.{locale}.json
```

### For Developers

```bash
git clone https://github.com/x402agent.com/solana-clawd.git
cd solana-clawd
bun install
bun run format
bun run build
```

[Complete Development Workflow Guide →](./docs/WORKFLOW.md)

---

## 📦 Agent Categories

### 🌟 Featured Agent

**🎯 CLAWD Portfolio** — All-in-one crypto portfolio management ⭐ **RECOMMENDED**

- Complete portfolio tracking, trading automation, DeFi protocols, and analytics
- ONE agent for 100% of portfolio management features
- Perfect for most users — install once, access everything

⚠️ **Current Status:** Read-only portfolio tracking and analytics available now. Automated trading, bots, and DeFi interactions coming soon in ClawdOS roadmap.

[View Agent →](https://clawd.click/clawd-portfolio.json) | [Try Now →](https://clawd.fun/discover/assistant/clawd-portfolio)

---

### 🪙 DeFi & Crypto (42 Specialized Agents)

**CLAWD Ecosystem (8 Agents):**

**Master Agent (Recommended):**

- **CLAWD Portfolio** 🎯 — All-in-one portfolio management (dashboard, trading, bots, DeFi, analytics)

**Original CLAWD Agents (7):**

- USDs Stablecoin Expert, SPA Tokenomics Analyst, veSPA Lock Optimizer
- Governance Guide, Liquidity Strategist, Bridge Assistant, Yield Aggregator

**ClawdOS Portfolio Specialists (16):**
💡 _For advanced users who prefer focused tools_

- Portfolio Dashboard, Assets Tracker, Analytics Expert, Wallet Manager
- Trading Assistant, AI Trading Bot, Signal Bot, DCA Bot
- Arbitrage Bot, Pump Screener, DeFi Center, DeFi Protocols
- Strategies Marketplace, Bot Templates, Settings Manager, Help Center

> **Note:** ClawdOS portfolio agents currently use `clawd.fun` for testing. The domain may change to `clawd.io` or similar once ClawdOS launches in production. [See FAQ](./docs/FAQ.md#clawd-portfolio-agents) for details.

**General DeFi (34 Agents) + Crypto News:**

- Yield Farming Optimizer, Impermanent Loss Calculator, Gas Optimizer
- Smart Contract Auditor, MEV Protection Advisor, Whale Watcher
- Protocol Comparator, Token Unlock Tracker, Liquidation Risk Manager
- Airdrop Hunter, Alpha Leak Detector, APY vs APR Educator
- Bridge Security Analyst, Crypto Tax Strategist, DeFi Insurance Advisor
- DeFi Onboarding Mentor, DeFi Protocol Comparator, DeFi Risk Scoring Engine
- DEX Aggregator Optimizer, Governance Proposal Analyst, Layer 2 Comparison Guide
- Liquidation Risk Manager, Liquidity Pool Analyzer, Narrative Trend Analyst
- NFT Liquidity Advisor, Portfolio Rebalancing Advisor, Protocol Revenue Analyst
- Protocol Treasury Analyst, Stablecoin Comparator, Staking Rewards Calculator
- Wallet Security Advisor, Yield Dashboard Builder, Yield Sustainability Analyst

[View Full Agent List →](https://github.com/x402agent.com/solana-clawd)

---

## 🤝 Agent Teams

Create collaborative teams of specialized agents that work together on complex tasks.

**Example Team — DeFi Strategy:**

```
- Yield Optimizer (finds opportunities)
- Risk Assessment Agent (evaluates safety)
- Portfolio Tracker (monitors performance)
- Gas Optimizer (minimizes costs)
```

The host agent coordinates discussion, ensuring each specialist contributes their expertise while building toward a comprehensive solution.

[Read Teams Guide →](./docs/TEAMS.md)

---

## 🌍 Multi-Language Support

All agents automatically available in 18 languages:

🇺🇸 English・🇨🇳 简体中文・🇹🇼 繁體中文・🇯🇵 日本語・🇰🇷 한국어・🇩🇪 Deutsch・🇫🇷 Français・🇪🇸 Español・🇷🇺 Русский・🇸🇦 العربية・🇵🇹 Português・🇮🇹 Italiano・🇳🇱 Nederlands・🇵🇱 Polski・🇻🇳 Tiếng Việt・🇹🇷 Türkçe・🇸🇪 Svenska・🇮🇩 Bahasa Indonesia

---

## 🛠️ API Reference

### Endpoints

```bash
# Main index (all agents)
GET https://clawd.click/index.json

# Individual agent (English)
GET https://clawd.click/{agent-id}.json

# Localized agent
GET https://clawd.click/{agent-id}.zh-CN.json

# Language-specific index
GET https://clawd.click/index.zh-CN.json
```

### Quick Integration

```javascript
// Load all agents
const response = await fetch('https://clawd.click/index.json');
const { agents } = await response.json();

// Load specific agent
const agent = await fetch(`https://clawd.click/defi-yield-optimizer.json`);
const agentConfig = await agent.json();
```

[Full API Documentation →](./docs/API.md)

---

## 🤖 Contributing an Agent

We welcome contributions! Submit your agent to expand the library.

### Quick Submit

1. **Fork this repository**
2. **Create your agent** in `src/your-agent-name.json`

```json
{
  "author": "your-github-username",
  "config": {
    "systemRole": "You are a [role] with expertise in [domain]..."
  },
  "identifier": "your-agent-name",
  "meta": {
    "title": "Agent Title",
    "description": "Clear, concise description",
    "avatar": "🤖",
    "tags": ["category", "functionality", "domain"]
  },
  "schemaVersion": 1
}
```

3. **Submit a Pull Request**

Our automated workflow will translate your agent to 18 languages and deploy it globally.

### Quality Guidelines

✅ Clear purpose — solves a specific problem\
✅ Well-structured prompts — comprehensive but focused\
✅ Appropriate tags — aids discovery\
✅ Tested — verified functionality

[Full Contributing Guide →](./docs/CONTRIBUTING.md)

---

## 📖 Documentation

### For Users

- [Agent Teams Guide](./docs/TEAMS.md) — Multi-agent collaboration
- [FAQ](./docs/FAQ.md) — Common questions
- [Examples](./docs/EXAMPLES.md) — Real-world use cases

### For Developers

- [Complete Workflow Guide](./docs/WORKFLOW.md) — End-to-end development process
- [Contributing Guide](./docs/CONTRIBUTING.md) — How to submit agents
- [API Reference](./docs/API.md) — Complete API documentation
- [Agent Creation Guide](./docs/AGENT_GUIDE.md) — Design effective agents
- [18 Languages i18n Workflow](./docs/I18N_WORKFLOW.md) — Automated translation system
- [Deployment Guide](./docs/DEPLOYMENT.md) — Domain setup and CI/CD
- [Prompt Engineering](./docs/PROMPTS.md) — Writing better prompts
- [Model Parameters](./docs/MODELS.md) — Temperature, top_p explained
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues

---

## 🚀 Deployment

### GitHub Pages (Automatic)

1. **Fork/Clone this repository**
2. **Choose your domain option:**
   - **Default GitHub Pages:** Delete the `CNAME` file
   - **Custom Domain:** Update `CNAME` with your domain
3. **Enable GitHub Pages:**
   - Settings → Pages → Source: `gh-pages` branch
4. **Push to main** — GitHub Actions automatically builds and deploys

Your agents will be at:

- Default: `https://[username].github.io/[repository]/index.json`
- Custom: `https://yourdomain.com/index.json`

### Custom Domain Setup

1. **Update CNAME file:** `echo "yourdomain.com" > CNAME`
2. **Configure DNS:** Add CNAME record → `[username].github.io`
3. **Enable HTTPS** in repository settings after DNS propagates

**Note:** The build process automatically copies your CNAME to the deployment, so your custom domain persists across all deployments. Forks can simply update or delete the CNAME file.

[Full Deployment Guide →](./docs/DEPLOYMENT.md)

---

## 🔧 Development Tools

### Split Agent Batches

```bash
node split-agents.cjs
```

Converts batch JSON into individual agent files.

### Emoji Converter

```bash
node emoji-converter.cjs
```

Converts emoji URLs to native Unicode.

---

## 🌐 Integration Examples

### Custom Application

```javascript
// Fetch agents
const agents = await fetch('https://clawd.click/index.json').then((r) => r.json());

// Use with your AI model
const systemPrompt = agents.agents[0].config.systemRole;
```

### Python

```python
import requests

# Load agents
response = requests.get('https://clawd.click/index.json')
agents = response.json()['agents']

# Filter by tag
defi_agents = [a for a in agents if 'defi' in a['meta']['tags']]
```

---

## 🔐 Security & Privacy

- **No data collection** — Static JSON index, zero tracking
- **Agents run locally** — Execute in your AI platform's environment
- **Open source** — Full transparency, audit every line
- **No external calls** — Pure JSON configuration files

---

## 📊 Stats

- **42 Agents** — DeFi-focused coverage
- **18 Languages** — Global accessibility via automated translation
- **8 CLAWD Specialists** — Ecosystem-specific agents (7 core + 1 portfolio master)
- **34 General DeFi Agents** — Comprehensive DeFi toolkit
- **~300 KB Index** — Fast loading (gzipped: ~65 KB)
- **80-120ms** — Global CDN delivery
- **0 Vendor Lock-in** — True interoperability

---

## 🔗 Projects Building with Solana Clawd 🤍

- **ClawdOS** — [Application Branch](https://github.com/x402agent.com/solana-clawd/tree/clawdos)

---

## 📜 License

MIT License — see [LICENSE](LICENSE) file for details.

**Open Source • Open Format • Open Future**

---

## 🌐 Live HTTP Deployment

**DeFi Agents** is deployed and accessible over HTTP via [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) transport — no local installation required.

**Endpoint:**
```
https://modelcontextprotocol.name/mcp/defi-agents
```

### Connect from any MCP Client

Add to your MCP client configuration (Claude Desktop, Cursor, ClawdOS, etc.):

```json
{
  "mcpServers": {
    "defi-agents": {
      "type": "http",
      "url": "https://modelcontextprotocol.name/mcp/defi-agents"
    }
  }
}
```

### Available Tools (10)

| Tool | Description |
|------|-------------|
| `get_price` | Get crypto prices |
| `get_market_overview` | Market overview |
| `get_trending` | Trending coins |
| `search_coins` | Search |
| `get_coin_detail` | Coin details |
| `get_global_stats` | Global stats |
| `get_defi_protocols` | DeFi protocols by TVL |
| `get_protocol_detail` | Protocol detail |
| `get_chain_tvl` | Chain TVL |
| `get_yield_opportunities` | Yield opportunities |

### Example Requests

**Get crypto prices:**
```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ids":"aave,compound-governance-token","vs_currencies":"usd"}}}'
```

**Market overview:**
```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_market_overview","arguments":{"limit":10}}}'
```

**Trending coins:**
```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_trending","arguments":{}}}'
```

### List All Tools

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Also Available On

- **[ClawdOS](https://clawdos.vercel.app)** — Browse and install from the [MCP marketplace](https://clawdos.vercel.app/community/mcp)
- **All 27 MCP servers** — See the full catalog at [modelcontextprotocol.name](https://modelcontextprotocol.name)

> Powered by [modelcontextprotocol.name](https://modelcontextprotocol.name) — the open MCP HTTP gateway
