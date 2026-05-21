---
name: imperial-tpsl-management
description: Take-profit and stop-loss management for Imperial-routed positions, including close-leg design, verification, and Telegram operator caveats.
---

# Imperial TP/SL Management

Imperial supports entry orders with attached close legs, and close-side orders can also be managed explicitly.

Use this skill for:

- planning TP/SL structures for a live position
- deciding between attached close legs vs post-entry management
- verifying close-leg presence through `/orders` and `/positions`

Caveat:

- In this repo, TP/SL strategy guidance is stronger than the current Telegram single-shot live surface. Do not imply durable bracket maintenance unless the runner explicitly owns it.
