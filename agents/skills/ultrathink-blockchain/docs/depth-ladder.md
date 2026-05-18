# Ultrathink Depth Ladder

A guide to choosing the right level of extended thinking for your task.

---

## Overview

Claude Code's extended thinking mode has multiple depth levels. Each level allocates more internal reasoning tokens before generating output. More depth means better reasoning, but also slower responses and higher cost.

**Rule of thumb:** Use the minimum depth that solves your problem well.

---

## The Levels

### `think` (~500 tokens)

**Best for:** Simple decisions, quick fixes, straightforward refactoring.

```
think about whether this function handles null inputs correctly.
```

Use when the answer is probably obvious but you want a quick sanity check.

---

### `think step by step` (~1000 tokens)

**Best for:** Multi-step problems, debugging, tracing execution paths.

```
think step by step about why this transaction is failing with error 0x1.
```

Use when you need Claude to trace through logic rather than pattern-match.

---

### `think hard` (~2000 tokens)

**Best for:** Architecture decisions, complex logic, design choices.

```
think hard about whether to use a PDA or a token account for this state.
```

Use when there are multiple valid approaches and the choice matters.

---

### `think harder` (~4000 tokens)

**Best for:** System design, security analysis, performance optimization.

```
think harder about the security implications of this instruction handler.
```

Use when you need Claude to consider attack vectors, edge cases, and failure modes.

---

### `ultrathink` (~8000+ tokens)

**Best for:** Production systems, critical infrastructure, complex integrations.

```
ultrathink about the complete transaction flow, MEV exposure,
and failure recovery for this swap aggregator.
```

Use for code that handles real value, runs unattended, or has complex state.

---

### `megathink` (Maximum depth)

**Best for:** Novel problems, research-grade work, unprecedented architectures.

```
megathink about designing a new AMM curve optimized for
concentrated liquidity with dynamic fee adjustment.
```

Use sparingly — for genuinely novel problems where no standard solution exists.

---

## Blockchain Recommendations

| Task | Recommended Depth |
|------|------------------|
| Fix a typo in a config | No extended thinking needed |
| Debug a failing transaction | `think step by step` |
| Choose between RPC providers | `think hard` |
| Design a PDA schema | `think hard` |
| Build a swap execution path | `ultrathink` |
| Audit an Anchor program | `ultrathink` |
| Design a new protocol | `megathink` |
| Build a trading system | `ultrathink` |

---

## Focusing Depth

Never waste deep thinking on boilerplate. Always specify what to think deeply about:

```
Build me a token monitor.

ultrathink specifically about:
- Websocket reconnection strategy
- How to detect rug patterns in real-time
- State management for concurrent token evaluations

For the rest (CLI, config, logging), just write clean code.
```

This gives you production-grade reasoning where it counts without burning tokens on `console.log` statements.
