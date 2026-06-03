# Dark Ralph Project Bundle

This directory collects the Dark Ralph / Clawd development stack into one
publishable bundle. Local `.env` files, dependency installs, build outputs,
and generated targets are intentionally ignored before pushing to GitHub.

## Components

| Path | Role |
| --- | --- |
| `src/` | Dark Ralph TUI source: MAWD market view, agent loop, Solana services, and terminal UI. |
| `docs/` | Public docs, integration notes, and X article drafts. |
| `automaton-main/` | Autonomous heartbeat, identity, replication, and state loop experiments. |
| `clawd-tui/` | OpenClawd terminal development surface with approval-gated file and shell tools. |
| `clawd-code-cli/` | Clawd code-agent command-line workbench. Keep local env files out of git. |
| `mpl-corenft-staking/` | Solana/Anchor staking program source. `target/` stays ignored. |
| `mpp/` | Market/project publishing surface and generated app assets. |
| `node_modules/` | Local dependency install. Never commit. |

## Push Safety

Before pushing:

```bash
find dark-ralph -name '.env' -type f -print
git status --short --untracked-files=all dark-ralph
```

Expected result:

- no `.env` files are printed
- `.env.example` templates may remain
- `node_modules/`, `target/`, `dist/`, `.wrangler/`, and runtime session
  files do not appear in `git status`

## Public Narrative

Use `docs/X_ARTICLE.md` for the X article draft that ties together Ralph,
Geoff Huntley's OODA harness pattern, Clawd, MAWD bot commit context, Solana,
and x402.
