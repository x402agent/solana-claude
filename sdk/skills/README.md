# SDK Skills Snapshot

This directory is the SDK-facing skill bundle. It contains:

- `catalog.json` and `index.json`: complete Skill Hub snapshots from the repo-level `skills/` registry.
- Curated local skill directories used at runtime birth: MagicBlock, Imperial, DFlow/Phantom, Phantom wallet, Solana Clawd commerce, Oracle, sherpa offline TTS, and skill authoring.
- `percolator-bounty`: executable SDK-local keeper/oracle skill.

The canonical source of truth remains the repo-level `skills/` directory. Refresh this snapshot with:

```bash
npm --prefix sdk run skills:sync
```

No private keys, RPC secrets, wallet files, `.env` files, or local user skill directories belong here.
