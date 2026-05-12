# Demo Video Script

Target length: 2.5 to 3 minutes  
Goal: show the live product, not code.

## Shot list

1. Open the repo root and show `HACKATHON.md`.
2. Run `npm run hermes` and show the CLAWD terminal booting.
3. Switch between Market, Trading, Portfolio, Analytics, and Agent views.
4. Run `npm run ooda` and `npm run ooda:tui` to show the Solana-native OODA loop.
5. Run `npm run demo:paysh` and explain private x402/pay.sh.
6. Run `npm run demo:a2a` and explain Google A2A + Solana payments.
7. Show `x402/confidential-agent.ts` and explain confidential inference + private cache.
8. Close on `README.md` and `HACKATHON.md`.

## Spoken script

OpenClawd is a Solana-native agentic harness. We built a private AI agent stack that combines a live CLAWD terminal, a Ralph-style OODA loop, Google A2A tasking, and a private x402 payment path on Solana.

This is the CLAWD terminal. It gives operators a live view of market conditions, portfolio context, network stats, agent activity, and autonomous trading state in one place.

Under the hood, the agent runs an OODA loop: observe, orient, decide, act, and learn. We can run that loop directly in paper mode and stream it into a terminal UI.

For payments, we use x402 and pay.sh to support private AI transactions. The agent can pay for inference and services using Solana-native rails instead of API-key-only workflows.

For interoperability, we added Google A2A support so agents can discover peers, send tasks, and pay for work over Solana-aware payment paths.

For privacy and robustness, we added confidential inference, retry and idempotency hardening, and a private content-addressed cache so repeated requests get cheaper without exposing prompt contents.

The result is a Solana-native AI platform for operators, developers, and traders who want paid, private, interoperable agents running on crypto rails.
