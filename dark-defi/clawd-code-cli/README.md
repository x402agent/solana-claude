# Clawd Code CLI Integration Slot

This directory is reserved for the Clawd Code CLI source package inside DarkDefi.

The original checkout was not vendored because it contained generated output, dependency folders, and nested Git metadata instead of a clean source distribution. Keeping this slot explicit prevents accidental publication of generated files while preserving the intended integration boundary.

## Intended Role

Clawd Code CLI should be the installable operator CLI for:

- local agent-assisted code workflows
- DarkDefi repository operations
- Solana-aware terminal handoff into `clawd-tui`
- safe setup commands for developers and operators
- future release-gate and deployment automation

## Source Policy

A clean source import should include:

- `package.json`
- `src/`
- `README.md`
- `LICENSE`
- lockfile
- tests or verification commands

It should not include:

- `node_modules/`
- build-only `dist/` without source
- nested `.git/`
- local secrets
- generated logs or runtime state

## Public Reference

```text
https://github.com/x402agent/clawd-code-cli.git
```

## Readiness Checklist

Before vendoring or publishing this package:

```bash
npm ci
npm run typecheck --if-present
npm test --if-present
npm run build --if-present
npm pack --dry-run
```

The package should read as a product, not a dump: clear install command, clear value proposition, minimal package contents, no local machine paths, and explicit safety boundaries around shell, file, wallet, and deploy actions.
