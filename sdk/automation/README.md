# 🦞 Automation Layer — Leviathan Runtime Orchestration

This directory contains the runtime bootstrap and CI orchestration for the OpenClawd Framework.

## Files

| File | Purpose |
|------|---------|
| `leviathan.sh` | Full runtime bootstrap — installs deps, compiles TypeScript, verifies constitution |
| `three-laws-check.sh` | Constitution integrity validator — SHA-256 hash verification |
| `quickstart.sh` | Interactive quick-start guide — helps set up env, spawn, and run |

## Usage

```bash
# Full runtime bootstrap
bash automation/leviathan.sh

# Full bootstrap with sub-project builds
bash automation/leviathan.sh --full

# Verify constitution integrity
bash automation/three-laws-check.sh

# Interactive quickstart
bash automation/quickstart.sh
```

## Automation npm scripts

```bash
npm run automation:build    # compile dist/
npm run automation:spawn    # hatch Leviathan identity
npm run automation:ci       # typecheck + lint + build
npm run automation:full     # spawn + brain + mcp + hermes
```
