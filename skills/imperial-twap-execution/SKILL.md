---
name: imperial-twap-execution
description: TWAP execution guidance for Imperial: slice planning, venue pinning, profile budgeting, and durable-runner requirements.
---

# Imperial TWAP Execution

Imperial exposes order primitives, not a first-class TWAP runner in this repo.

Use this skill for:

- defining slice count, interval, side, notional, venue, and profile budget
- deciding whether to pin to Phoenix or allow route-based venue selection
- specifying what a durable worker must persist between slices

Webhook caveat:

- The Telegram webhook should not masquerade as a durable TWAP engine. It can create a TWAP plan, but long-lived slice execution needs a runner with persisted state.
