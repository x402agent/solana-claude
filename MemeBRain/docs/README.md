# Clawd Memory Documentation

Clawd Memory is the local brain for Clawd agents. It combines a Clawd-facing agent memory contract, a markdown vault, and a SQLite-backed memory engine.

Start here:

| Guide | Purpose |
|---|---|
| [Getting Started](getting-started.md) | Initialize the Clawd bank, write memories, recall context, and archive research |
| [Architecture](architecture.md) | Understand the Clawd layers, vault, BEAM engine, and recall pipeline |
| [Configuration](configuration.md) | Environment variables, vault paths, LLM consolidation, and Hermes config |
| [API Reference](api-reference.md) | `ClawdBrain`, `clawd-brain`, and lower-level engine APIs |
| [Hermes Integration](hermes-integration.md) | Use Clawd Memory through Hermes-compatible tools |
| [LLM Installation Guide](llm-installation-guide.md) | Agent-oriented install and verification checklist |
| [BEAM Benchmark](beam-benchmark.md) | Benchmark notes for the underlying memory engine |
| [Comparison](comparison.md) | Trade-offs versus external/self-hosted memory providers |

Compatibility names:

| Name | Meaning |
|---|---|
| `clawd-brain` | Clawd-facing CLI |
| `ClawdBrain` | Clawd-facing Python API |
| `mnemosyne` | Underlying Python storage engine |
| `mnemosyne_*` | Existing Hermes/MCP tool names kept for compatibility |

Use Clawd names in user-facing docs and agent workflows. Use Mnemosyne names only where the code, package, or integration contract requires them.
