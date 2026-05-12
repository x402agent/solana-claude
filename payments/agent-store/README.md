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
- `catalog.json` — merchant profile, featured offers, and actual product catalog
- `index.ts` — manifest generator, fleet planner, and session CLI
- `launch.sh` — thin shell wrapper around the TypeScript launcher
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

The launcher rejects `zerobro` immediately and now generates:

- a richer merchant manifest with topology, workflow, and runtime metadata
- a session file in `generated/sessions/` with per-agent sandbox commands
- an infrastructure plan for the x402 gateway, facilitator/debugger, and fleet

## Output

The generated manifest is a compact store contract for x402-style agent commerce:

- store metadata
- merchant metadata for `solanaclawd.com`
- Google Merchant-style business and product metadata
- allowed and denied agents
- supported chains
- settlement protocols
- pay.sh gateway hint
- agent roles and capabilities
- actual digital product records and storefront paths

This manifest is designed to sit beside `payments/pay-main` and `x402/worker` as the merchant control plane for:

- 24/7 customer support via `eliza`
- control-plane orchestration via `clawd`
- programmable checkout via `dexter`
- payment and facilitator supervision via `hermes`
- premium research inventory via `ralph`

The generated session file includes runnable sandbox commands for each lane plus the supporting gateway/facilitator services.

## Private Edge

`payments/agent-store/apigee/` now contains an Apigee proxy scaffold for making the store private and confidential:

- Apigee private ingress via Private Service Connect
- VPC Service Controls as the service perimeter
- `VerifyAPIKey` as the first admission gate
- masking guidance via `debugmask.json`
- `private.` flow variables so secrets do not appear in Trace/debug

This sits in front of the existing `x402/worker` gateway rather than replacing the payment stack.

## Storefront

`payments/agent-store/storefront/` is a local hackathon storefront with:

- a luxury-style static frontend
- a tiny server that exposes only safe public config to the browser
- MoonPay public checkout wiring
- optional Google Places browser integration via `GOOGLE_API_KEY`
- zero tracked secret material

Run it with:

```bash
npm --prefix payments/agent-store/storefront install
npm run agent-store:storefront
```

Put local credentials in `payments/agent-store/storefront/.env.local`.
Only these are ever sent to the browser:

- `GOOGLE_API_KEY` — should be browser/referrer restricted
- `MOONPAY_MERCHANT_ID`
- `MOONPAY_WALLET`
- `MOONPAY_API_KEY`

Keep all MoonPay secret keys, webhook secrets, merchant password, and upload credentials server-side only.

## Truands

`payments/agent-store/truand/` provisions a new autonomous agent breed:

- keep-alive Upstash Box sandboxes
- Codex as the built-in box agent harness using `OPENAI_API_KEY`
- Neon branch tracking using `NEON_API_KEY`
- `$CLAWD` utility metadata on top of USDC-denominated paid work

Commands:

```bash
npm --prefix payments/agent-store/truand install
npm run agent-store:truand:plan
npm run agent-store:truand:manifest
npm run agent-store:truand:provision
```

The provisioner expects `UPSTASH_BOX_API_KEY`, `OPENAI_API_KEY`, `NEON_API_KEY`, and `NEON_PROJECT_ID` in an untracked local env file or shell environment.
