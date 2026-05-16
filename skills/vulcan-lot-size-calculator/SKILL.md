---
name: vulcan-lot-size-calculator
description: Convert desired token/notional amounts to Phoenix base lots. Use whenever a Vulcan command requires size/base lots.
---

# Vulcan Lot Size Calculator

Canonical source: `../../vulcan-cli-master/skills/vulcan-lot-size-calculator/SKILL.md`

Never guess lot sizes. Call `vulcan market info <SYMBOL> -o json` before using `size`; prefer `--tokens` or `--notional-usdc` for market orders when supported.
