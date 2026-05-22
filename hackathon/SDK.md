# Clawd SDK — Deep Dive

**Path:** `sdk/` (OpenClawd Framework / Leviathan runtime)
**Published as:** `@openclawdsolana/leviathan` v0.2.0
**Also:** `packages/clawd-sdk/` (`@openclawdsolana/clawd-sdk` v0.1.0)

---

## What It Is

The `sdk/` directory is the OpenClawd Framework — the sovereign AI runtime that ships as `@openclawdsolana/leviathan`. It is the full agent harness: OODA loop, wallet, x402 payments, skills system, Metaplex identity, and character/knowledge layers.

The tagline from the README: **"Claude thinks. Clawd proves."**

```text
intent → route → reason → simulate → verify → execute → attest → settle → remember → evolve
```

---

## The Thesis

Current frontier AI stacks are mostly `prompt → model → answer`. Clawd adds:

| Layer | Status quo | Clawd delta |
| --- | --- | --- |
| Model | answer generation | routed, scored, policy-bound model execution |
| Agent | tool wrapper | permissioned autonomous entity with wallet + constitution |
| Identity | API key / account | wallet-native with MPL Core birth certificate |
| Trust | logs controlled by platform | portable SAS attestations + signed receipts |
| Payment | subscription / API billing | x402 / pay-per-action settlement on Solana USDC |
| Execution | opaque tool call | simulated, routed, signed, journaled action |
| Memory | app silo | local-first vault + onchain proof pointers |
| Security | prompt filters | policy firewall + formal verification gates |
| Privacy | platform custody | encrypted local state + selective proof disclosure |

---

## SDK Directory Map

| Path | What it contains |
| --- | --- |
| `sdk/src/` | Core runtime source |
| `sdk/skills/` | Installable skill catalog (reusable agent capabilities) |
| `sdk/x402/` | x402 payment client, pay.sh facilitator, A2A worker |
| `sdk/pay/` | Solana Pay and SPL USDC helpers |
| `sdk/mcp-server/` | Embedded MCP server surface for the SDK |
| `sdk/characters/` | Agent character definitions and persona configs |
| `sdk/knowledge/` | Knowledge base files for agent context injection |
| `sdk/library/` | Reusable agent building blocks |
| `sdk/livekit-agent/` | LiveKit real-time agent integration |
| `sdk/assets/` | Static assets for the SDK surface |
| `sdk/examples/` | Runnable agent examples |
| `sdk/automation/` | Automation scripts and bootstrap flows |
| `sdk/goals/` | Goal-tracking and milestone files |
| `sdk/data/` | Data files for agent context |
| `sdk/three-laws.md` | Three Laws Constitution (loaded into every agent spawn) |
| `sdk/enter.sh` | One-shot install script |
| `sdk/install.sh` | Full npm surface installer |
| `sdk/llm.txt` | LLM context file for documentation queries |

---

## Proof of Agentic Action

Every important AI action creates a signed, replayable, queryable receipt:

```json
{
  "agent_id": "clawd://agent/...",
  "operator_wallet": "...",
  "model_route": { "provider": "openrouter", "model": "claude/gpt/grok/local" },
  "input_hash": "...",
  "tool_manifest_hash": "...",
  "memory_context_hash": "...",
  "output_hash": "...",
  "action_type": "trade | code | research | payment | mint | deploy | message",
  "risk_score": 0.18,
  "human_approval_required": false,
  "execution_receipt": {
    "tx_sig": "...",
    "venue": "phoenix | imperial | x402 | mcp",
    "status": "simulated | submitted | settled | failed"
  }
}
```

---

## Three Laws Constitution

Every agent spawned from the SDK loads `sdk/three-laws.md` (hashed into the spawn manifest):

1. **Safety first** — never take an action that cannot be reversed or explained.
2. **Operator loyalty** — the operator's policy file is law; no instruction overrides it.
3. **Truth above performance** — report failure honestly; do not fabricate success.

This is not a prompt prefix. It is a hashed constitution loaded at spawn time and verified against the agent's action receipts.

---

## Install

```bash
# One-shot
curl -fsSL https://solanaclawd.com/install.sh | bash

# Or npm
npm install -g @openclawdsolana/leviathan
leviathan --spawn

# Full surface
npm install -g @openclawdsolana/clawd @openclawdsolana/clawd-tui \
  @openclawdsolana/clawd-sdk @openclawdsolana/clawd-standalone \
  @openclawdsolana/clawd-wallet @openclawdsolana/clawd-perps \
  clawd-automaton x402.wtf x402agent-nanoclawd-cli
```

---

## Leviathan Runtime Commands

```bash
# Status check
npm run leviathan:status

# Spawn one OODA tick (safe, no keys required)
npm run leviathan -- --ticks 1

# Inspect the published SDK graph
curl https://x402.wtf/api/solana-clawd/sdk | jq '.data.stats'

# Verify the harness
npm run harness:packages
```

---

## packages/clawd-sdk vs sdk/

| | `sdk/` | `packages/clawd-sdk/` |
| --- | --- | --- |
| Published as | `@openclawdsolana/leviathan` | `@openclawdsolana/clawd-sdk` |
| Role | Full sovereign runtime harness | TypeScript SDK layer for app developers |
| Contains | OODA, skills, x402, characters, knowledge | Bonding curves, Token2022, pTokens, vault mechanics |
| Target audience | Agent operators and runtime builders | App developers integrating Clawd token/agent flows |

Both are in the `packages:build` pipeline.
