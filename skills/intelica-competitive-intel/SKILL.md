---
name: intelica-competitive-intel
description: >
  Analyze any company, product, or URL and get structured competitive
  intelligence as JSON. Returns moat score (IMI), competitor mapping,
  decision recommendation (enter/avoid/monitor/acquire/partner), executable
  action plan with steps and deadlines, source verification, and
  OpenTelemetry-compatible trace metadata. Payments via x402 on Base or
  Solana at $0.05 USDC per call, no accounts required.
license: MIT
metadata:
  author: teodorofodocrispin-cmyk
  version: "4.5.7"
  homepage: https://api.intelica.dev
  mcp_endpoint: https://api.intelica.dev/mcp
  payment_protocol: x402
  price_usdc: "0.05"
  networks:
    - eip155:8453
    - solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
---

# Intelica — Competitive Intelligence API

Pay-per-call competitive intelligence for autonomous AI agents. Analyze any
company or URL and receive structured JSON with moat scoring, competitor
mapping, decision support, and a full executable action plan.

**Price:** $0.05 USDC via x402 (Base or Solana). No accounts, no API keys.

## MCP Setup

```json
{
  "mcpServers": {
    "intelica": {
      "url": "https://api.intelica.dev/mcp",
      "transport": "http"
    }
  }
}
```

Free trial (5 calls, no wallet):

```bash
curl https://api.intelica.dev/api-keys/trial
```

## Tools

| Tool | Description |
|------|-------------|
| `intel_analyze` | Analyze a company or URL |
| `intel_batch` | Analyze up to 10 companies ($0.20 USDC) |
| `intel_demo` | Rate-limited demo, no payment |

## x402 Payment

```bash
curl -X POST https://api.intelica.dev/intel \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-token>" \
  -d '{"text": "Stripe payment API", "mode": "competitive"}'
```

Networks: `eip155:8453` (Base) and `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (Solana)

## Modes

| Mode | Price | Description |
|------|-------|-------------|
| competitive | $0.05 | Market positioning, moat score |
| market_entry | $0.05 | Market gaps, barriers |
| fundraising | $0.05 | Investor narrative, TAM |
| partnership | $0.05 | Strategic fit analysis |
| acquisition | $0.05 | Moat strength, M&A thesis |
| crypto_protocol | $0.05 | DeFi moat, tokenomics |
| defend_position | $1.00 | Counter-intelligence for incumbents |
| venture_screening | $1.00 | Investment thesis, deal-breakers |
| regulatory_compliance | $1.00 | EU AI Act, GDPR, DORA |
| risk_assessment | $1.00 | Business model stability |

## Response (key fields)

```json
{
  "trace_id": "uuid-v4",
  "intelica_moat_index": 0.72,
  "decision_recommendation": {"action": "monitor", "confidence_score": 0.85},
  "action_plan": {"objective": "...", "steps": [{"step": 1, "deadline_days": 7}]},
  "source_verification_status": {"overall": "verified", "total_citations": 3},
  "audit_trail": {"hash": "sha256...", "compliance": ["EU AI Act Art.13"]},
  "span_metadata": {"service.name": "intelica", "intelica.latency_ms": 1240}
}
```

## Links

- API: https://api.intelica.dev
- Docs: https://api.intelica.dev/llms-full.txt
- MCP: https://api.intelica.dev/mcp
- GitHub: https://github.com/teodorofodocrispin-cmyk/intelica-mcp
