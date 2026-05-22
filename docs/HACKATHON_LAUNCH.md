# Hackathon Launch Plan

This repo is too large to win on raw surface area alone. The winning move is to force the audience into one clear story:

**Clawd is a Solana-native agent that can think, pay, and act without leaking the operator's identity.**

## Judge TL;DR

- **What is new:** Solana-native x402 payments, agent-to-agent flows, privacy-preserving payment relay, and live OODA demos in one repo.
- **What judges should remember:** this is not "an LLM wrapper with a token." It is a payment-aware agent runtime with live market intelligence and a real operator surface.
- **What feels demo-worthy:** the TUI, confidential payment flow, whale/market intelligence, and the "no private key required for demo mode" path.

## Demo Order

Run these in sequence and do not improvise the story:

```bash
npm run repo:audit
npm run demo:ooda
npm run demo:a2a
npm run demo:paysh
npm run demo:dark-defi
npm run clawd-perps-aggregator:cli -- route SOL long 250
npm run hermes
```

Recommended narration:

1. **Open with trust**
   `npm run repo:audit`
   Show that the repo is not shipping tracked `.env` files or obvious credential files.

2. **Show the brain**
   `npm run demo:ooda`
   Frame this as the decision loop that turns noisy market input into action.

3. **Show agent commerce**
   `npm run demo:a2a`
   Explain that other agents can discover and pay this agent through a standard protocol path.

4. **Show privacy**
   `npm run demo:paysh`
   Make the privacy claim explicit: payment routing does not require exposing the payer identity to the resource server.

5. **Show differentiated alpha**
   `npm run demo:dark-defi`
   This is where you earn the DeFi angle: whale intel, flow awareness, and execution context.

6. **Show real execution**
   `npm run clawd-perps-aggregator:cli -- route SOL long 250`
   The agent doesn't just signal — it routes a real perps trade across Phoenix, Flash, Jupiter, and GMTrade and explains why it chose that venue (cost, slippage, funding, pool health). Follow with `pools SOL` to show the AMM intelligence and `route-split SOL long 25000` to show capacity-aware split execution. Same surface is exposed as 17 `perps_*` MCP tools.

7. **Close with the visual**
   `npm run hermes`
   End on the TUI because static claims become believable when the runtime looks alive.

## Viral Cut List

Clip these moments into short posts:

- A live TUI sequence with market panels moving.
- The x402/pay.sh privacy explanation in one sentence.
- The self-sustaining loop from `HACKATHON.md`: trade, earn, pay, get smarter.
- One command proving demo mode works without a private key.
- The perps router picking the best of 4 venues with a one-line rationale, then a capacity-aware split across venues.

Keep each clip under 20 seconds and end with the repo URL.

## Hard Rules Before Publishing

- Run `npm run repo:audit`.
- Do not export the repo with nested `.git` directories included.
- Do not ship vendored `node_modules` folders in screenshots, archives, or demo zips.
- Keep the demo in public-data mode unless you control every key on the machine.
- Record one clean terminal session instead of relying on live typing under pressure.

## What To Say If Judges Push

- **"Why is this better than a normal bot?"**
  Because the payment path, agent-to-agent path, and operator surface are integrated instead of glued together from separate products.

- **"Where is the moat?"**
  Solana-native payments plus privacy-preserving relay plus live multi-agent orchestration is the moat, not a single model call.

- **"Is this safe to inspect?"**
  Yes, demo mode is public-data first, and the repo includes a hygiene audit for tracked secret files and release debris.

- **"What should exist after the hackathon?"**
  A hosted demo, one canonical short video, and one narrow onboarding path that gets a new user from clone to TUI in minutes.
