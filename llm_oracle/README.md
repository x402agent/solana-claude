# LLM Oracle

`llm_oracle` is the Clawd adapter for an on-chain Solana LLM oracle. It watches oracle interaction accounts, loads a Clawd character profile, sends the prompt history to an LLM provider, and writes the response back through the oracle program callback instruction.

This package is source-integrated into the main repo through top-level npm scripts:

```bash
npm run oracle:check
npm run oracle:build
npm run oracle:run
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/` | Rust oracle runner, LLM clients, character loader, and in-memory interaction history |
| `Cargo.toml` | Rust crate definition for the oracle runner |
| `../agents/solana-gpt-oracle/` | Local Anchor ABI crate used by the runner to decode accounts and build callback instructions |
| `percolator-cli-master/` | TypeScript Percolator CLI and operational scripts for market, keeper, oracle, and risk checks |
| `upstream/` | Source snapshots for Percolator engine/program/matcher references |
| `target/` | Local Rust build output, ignored by git |

## Runtime

Required environment for a live oracle:

```bash
RPC_URL=https://api.devnet.solana.com
WEBSOCKET_URL=wss://api.devnet.solana.com
ORACLE_PROGRAM_ID=<deployed-solana-gpt-oracle-program>
IDENTITY=<base58-encoded-keypair>
LLM_PROVIDER=clawd
ANTHROPIC_API_KEY=<key>
CHARACTER=clawd
```

`LLM_PROVIDER` accepts `clawd`, `claude`, `anthropic`, `openai`, `gpt`, or `chatgpt`. For OpenAI-compatible runs, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.

`CHARACTER` can be a repo character name or a direct JSON path. The loader checks common `agents/characters` and `characters` locations.

## Percolator CLI

The bundled Percolator CLI is available through top-level scripts:

```bash
npm run percolator:install
npm run percolator:build
npm run percolator:test
```

The CLI and upstream references are experimental operational tooling. Review configs and wallet paths before sending transactions, and do not use imported market scripts with real funds unless you have audited the target program, market state, and authority model.

## Notes

- `ORACLE_PROGRAM_ID` should be set for every real deployment. The local `agents/solana-gpt-oracle` crate is an ABI/interface crate and uses a placeholder id by default.
- `target/`, upstream `target/`, nested `.git/`, and Percolator CLI build output are ignored to keep generated artifacts out of version control.
- The oracle stores only short in-memory interaction history. Restarting the process clears that memory.
