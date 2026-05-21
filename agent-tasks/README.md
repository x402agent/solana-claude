# Agent Tasks

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=14F195&center=true&vCenter=true&width=900&lines=task+briefs+%E2%86%92+implementation+notes+%E2%86%92+judge-ready+evidence;one+folder+for+agent+work+items+and+handoffs" alt="Agent Tasks animated header" />
</p>

`agent-tasks/` stores implementation briefs, work orders, and handoff notes used by the Solana Clawd agent stack.

## Contents

| Path | Purpose |
| --- | --- |
| [`agent-tasks/`](./agent-tasks/) | Task briefs and feature work items. |
| [`agent-tasks/README.md`](./agent-tasks/README.md) | Source task index. |

## Smoke

```bash
find agent-tasks -maxdepth 2 -type f -name '*.md' | sort
npm run smoke:readme
```
