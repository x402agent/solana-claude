# Universal Autonomous Commerce

This is the autonomous store layer for Solana Clawd.

It is intentionally opinionated:

- admitted agents: `clawd`, `ralph`, `dexter`, `eliza`, `hermes`
- denied agent: `zerobro`
- settlement protocols: `x402`, `mpp`, `solana-pay`
- target mode: cross-chain agent commerce with Solana-first settlement

## Files

- `agents.json` — agent registry and allow/deny admission policy
- `catalog.json` — featured commerce offers and protocol mix
- `index.ts` — manifest generator and registry CLI
- `launch.sh` — private shell command to admit agents into the store
- `generated/openclawd.agent-store.json` — generated universal merchant manifest

## Usage

List the store:

```bash
npm run agent-store:list
```

Generate a merchant/store manifest:

```bash
npm run agent-store:manifest -- clawd ralph hermes
```

Launch an admitted store session:

```bash
npm run agent-store:launch -- clawd ralph dexter eliza hermes
```

The launcher rejects `zerobro` immediately.

## Output

The generated manifest is a compact store contract for x402-style agent commerce:

- store metadata
- allowed and denied agents
- supported chains
- settlement protocols
- pay.sh gateway hint
- agent roles and capabilities

This manifest is designed to sit beside `payments/pay-main` and feed future POS, merchant, facilitator, or agent-orchestration flows.
