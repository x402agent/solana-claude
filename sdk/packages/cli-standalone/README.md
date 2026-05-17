# @openclawdsolana/clawd-standalone

**Lightweight Clawd agent CLI — Grok-powered terminal assistant with Solana tools and MCP support, no Leviathan runtime required.**

Part of the [OpenClawd](https://solanaclawd.com) framework.

---

## Install

```bash
npm install -g @openclawdsolana/clawd-standalone
```

[![npm](https://img.shields.io/npm/v/@openclawdsolana/clawd-standalone)](https://www.npmjs.com/package/@openclawdsolana/clawd-standalone)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Run

```bash
clawd-standalone
```

Or without a global install:

```bash
npx @openclawdsolana/clawd-standalone
```

---

## What it does

`clawd-standalone` is the pre-compiled, zero-dependency-build version of the Clawd agent CLI. It gives you a full lobster-themed conversational terminal agent without requiring you to compile TypeScript or install the Leviathan runtime.

| Feature | Description |
|---------|-------------|
| Streaming chat | Real-time Grok (XAI) responses in the terminal |
| Solana tools | Query balances, inspect tokens, send transactions |
| MCP support | Connect to any Model Context Protocol server |
| Bash tool | Execute shell commands from the agent |
| File editor | Read and write files via the agent |
| Token launch | Launch Solana tokens via Bags.fm |
| DFlow / Kalshi | Spot trading and prediction markets |

---

## Environment variables

```bash
XAI_API_KEY=            # Grok (XAI) API key — required
SOLANA_RPC_URL=         # Solana RPC (default: mainnet-beta)
CLAWD_PERPS_WALLET=     # Default wallet address for perps commands
```

---

## Links

- **npm:** https://www.npmjs.com/package/@openclawdsolana/clawd-standalone
- **Full CLI:** https://www.npmjs.com/package/@openclawdsolana/clawd
- **Homepage:** https://solanaclawd.com
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
