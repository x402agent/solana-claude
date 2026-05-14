# Pinocchio and p-token Support

This folder is the solana-clawd starting point for developers and agents building optimized native Solana programs with Pinocchio.

Pinocchio is a zero-dependency, `no_std` Solana program library from Anza that replaces most `solana-program` runtime overhead with zero-copy account access. It is useful when compute units and binary size matter more than framework convenience. It is not beginner-focused: developers must own account validation, instruction parsing, serialization, CPI safety, and tests.

solana-clawd uses this area for:

- p-token launch workflows and registry exploration.
- Pinocchio program templates for vaults and escrow applications.
- agent/MCP discovery so local agents can inspect templates, explain tradeoffs, and register launched p-tokens.
- x402 p-token payment support through the existing Solana payment rail.

## Quick Start

List available templates:

```bash
npm run pinocchio:templates
```

Scaffold a starter program:

```bash
npm run pinocchio:scaffold -- --template vault --name my-vault --out ./programs/my-vault
npm run pinocchio:scaffold -- --template escrow --name my-escrow --out ./programs/my-escrow
```

Inspect or register a p-token mint:

```bash
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
npm run ptoken:list
```

## Folder Map

| Path | Purpose |
| --- | --- |
| [`docs/PINOCCHIO_GUIDE.md`](./docs/PINOCCHIO_GUIDE.md) | Practical Pinocchio notes for solana-clawd developers and agents. |
| [`docs/AGENT_WORKFLOWS.md`](./docs/AGENT_WORKFLOWS.md) | MCP and agent workflows for p-token exploration and template use. |
| [`templates/vault/`](./templates/vault/) | Minimal Pinocchio vault starter. |
| [`templates/escrow/`](./templates/escrow/) | Make/take/refund escrow starter. |
| [`templates/p-token-launcher/`](./templates/p-token-launcher/) | p-token launch checklist and config shape for site/MCP workflows. |

## Development Rules

- Treat p-token and Pinocchio programs as native Solana programs, not Anchor programs.
- Keep account validation in `TryFrom` implementations so instruction `process()` methods stay focused.
- Prefer field-by-field byte parsing unless you have measured and documented a safe zero-copy layout.
- Use `pinocchio-token`, `pinocchio-system`, and `pinocchio-associated-token-account` for CPIs where available.
- Add Mollusk or SBF tests before deploying or wiring real value.
- Assume generated templates are unaudited until a human review and test suite say otherwise.

## MCP Integration

The repo MCP server exposes these p-token and Pinocchio tools:

- `pinocchio_templates`
- `pinocchio_read_template`
- `ptoken_registry_list`
- `ptoken_inspect`
- `ptoken_registry_add`

It also exposes resources for this README, the guide, and the p-token registry so agents can discover the support surface without scraping the filesystem.

