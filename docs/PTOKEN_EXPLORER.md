# p-token Explorer

Solana Clawd includes a small p-token registry and explorer CLI for SPL-compatible mints. It can inspect a mint over Solana JSON-RPC, classify it as SPL or p-token when `P_TOKEN_PROGRAM_ID` is configured, and add it to `data/ptokens.json`.

```bash
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
npm run ptoken:list
npm run ptoken:show -- --mint PFOO
```

The explorer records supply, decimals, mint/freeze authority, owner program, and Solana Explorer/Solscan links. It uses `SOLANA_RPC_URL` or `HELIUS_RPC_URL` when present, otherwise it falls back to public mainnet RPC.

For x402, p-token support is opt-in. Set `P_TOKEN_PROGRAM_ID` in the worker environment to advertise `extra.tokenProgram = "p-token"` and verify p-token `transferChecked` or batch payments. When the variable is unset, payments stay on classic SPL Token.
