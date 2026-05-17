# Repo Cleanup Audit

Generated on the current checkout with:

```sh
node scripts/repo-cleanup-audit.mjs
du -sh <top-level-folders>
find . -name node_modules -o -name target -o -name dist -o -name .wrangler
```

No source folders should be deleted directly without a second review. Most disk usage is generated dependencies/build output inside active source trees.

## Safe To Delete Now

These are regenerable and not source of truth:

```sh
rm -rf .wrangler
rm -rf node_modules
rm -rf automaton-main/automation/node_modules automaton-main/automation/dist
rm -rf MCP/node_modules MCP/dist
rm -rf sdk/node_modules sdk/dist
rm -rf gateway/node_modules gateway/dist
rm -rf leviathan/node_modules leviathan/dist
rm -rf tui/dist
rm -rf beepboop/worker/node_modules beepboop/worker/.wrangler
rm -rf beepboop/convex/node_modules
rm -rf beepboop/site/node_modules beepboop/site/dist
rm -rf x402/worker/node_modules
```

Expected recovery:

```sh
npm install
npm run doctor
```

## Biggest Cleanup Wins

These are large generated/vendor build artifacts. Delete only if you are not actively building those subprojects right now.

| Path | Size Observed | Why It Is Safe/Regenerable |
| --- | ---: | --- |
| `openclawd-framework/clawd-terminal/node_modules` | 3.3G | dependency install cache |
| `llm_oracle/upstream/percolator-prog/target` | 3.0G | Rust build output |
| `llm_oracle/target` | 2.0G | Rust build output |
| `openclawd-framework/clawd-terminal/programs/target` | 1.8G | Rust build output |
| `programs/target` | 1.5G | Rust build output |
| `openclawd-framework/Solanapolis-tmp.tar.gz` | 1.1G | archive blob, not referenced by package scripts |
| `openclawd-framework/clawd-terminal/mpl-corenft-staking/target` | 995M | Rust build output |
| `openclawd/third_party` | 945M | vendored copy; review before deletion |
| `beepboop/site/node_modules` | 755M | dependency install cache |
| `node_modules` | 751M | root dependency install cache |
| `programs/mpl-token-metadata-main/programs/token-metadata/target` | 679M | Rust build output |
| `openclawd/third_party/openclawd-typescript/extensions/zalouser/node_modules` | 584M | dependency install cache |
| `vulcan-cli-master/target` | 549M | Rust build output |

High-yield cleanup command:

```sh
rm -rf \
  openclawd-framework/clawd-terminal/node_modules \
  llm_oracle/upstream/percolator-prog/target \
  llm_oracle/target \
  openclawd-framework/clawd-terminal/programs/target \
  programs/target \
  openclawd-framework/Solanapolis-tmp.tar.gz \
  openclawd-framework/clawd-terminal/mpl-corenft-staking/target \
  beepboop/site/node_modules \
  programs/mpl-token-metadata-main/programs/token-metadata/target \
  openclawd/third_party/openclawd-typescript/extensions/zalouser/node_modules \
  vulcan-cli-master/target
```

## Keep Active

These are referenced by root scripts, repo-doctor, builds, lint, docs, or recent integration work:

| Folder | Evidence |
| --- | --- |
| `automaton-main/automation` | root scripts `automation:*`; build/test passed |
| `beepboop` | required by `scripts/repo-doctor.mjs`; Convex/Worker verification |
| `clawdrouter` | root typecheck/lint target |
| `docs` | repo map and current audit docs |
| `gateway` | root typecheck/lint target |
| `leviathan` | root `leviathan:*` scripts and typecheck target |
| `MCP` | root `mcp:*` scripts and typecheck target |
| `scripts` | repo doctor, setup, launch planners |
| `sdk` | root typecheck/lint target |
| `skills` | installed agent skills and Vulcan/commerce skills |
| `tui` | root `tui:*`, perps integration |
| `x402` | payment rail docs/code and README references |

## Keep Source, Clean Generated

Do not delete these folders wholesale. They contain active source, submodules, or current integrations, but they also contain large generated outputs:

| Folder | Action |
| --- | --- |
| `openclawd-framework` | Keep. Delete nested `node_modules`, `target`, `dist`, and `Solanapolis-tmp.tar.gz` when space is needed. |
| `llm_oracle` | Keep. Delete `target` folders when not actively building Rust. |
| `programs` | Keep. Delete `target` and nested `node_modules` when not actively building Solana programs. |
| `openclawd` | Keep as submodule/source mirror. Review `third_party` before deleting; it is large and may duplicate local folders. |
| `vulcan-cli-master` | Keep while perps integration depends on the Vulcan CLI and skills. Delete only `target` if rebuilding is acceptable. |

## Review Before Deleting

These are smaller or source-heavy but not in the core build gate. They can be archived if the product direction no longer needs them:

`agents`, `apps`, `chess`, `chrome-extension`, `clawd-cloud-os`, `clawdcli`, `data`, `deep-clawd`, `email-worker`, `examples`, `formal_verification`, `llm-wiki-tang`, `MemeBRain`, `moltbook-agent`, `ooda`, `openShell`, `packages`, `pinocchio`, `plugin.delivery`, `pump-fun`, `solana-mcp-official-main`, `solana-python-agent`, `tailclawd`.

Practical rule:

- Archive first: `mkdir -p archive && git mv <folder> archive/<folder>`.
- Run `npm run doctor`.
- If the doctor passes and no docs/scripts break, delete from archive in a separate cleanup commit.

## Submodule Notes

Configured submodules:

- `llm_oracle/upstream/percolator`
- `llm_oracle/upstream/percolator-match`
- `llm_oracle/upstream/percolator-prog`
- `openclawd`
- `openclawd-framework/pay`

Current `git submodule status --recursive` reported a stale nested mapping under `openclawd` for `archive/openclawd-stack-publish`. Treat nested submodule cleanup as a separate task; do not delete `openclawd` until that mapping is understood.
