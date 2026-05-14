# Agent Workflows

This repository exposes Pinocchio and p-token support through files, npm scripts, and MCP tools. Agents should prefer these stable interfaces over ad hoc filesystem guesses.

## Explore Support

Use MCP resources:

- `solana-clawd://pinocchio`
- `solana-clawd://pinocchio-guide`
- `solana-clawd://ptokens`

Use MCP tools:

- `pinocchio_templates` to list template names.
- `pinocchio_read_template` to inspect a template file.
- `ptoken_registry_list` to read registered p-tokens.
- `ptoken_inspect` to inspect a mint over RPC.
- `ptoken_registry_add` to add or update a p-token registry entry after launch.

## Scaffold a Program

From the repo root:

```bash
npm run pinocchio:scaffold -- --template escrow --name my-escrow --out ./programs/my-escrow
```

After scaffolding, the agent should:

- rename placeholder program IDs;
- add account-specific validation;
- add tests before deployment;
- explain every unsafe block and unchecked account assumption.

## Register a Launched p-token

```bash
npm run ptoken:add -- --mint <mint> --symbol <symbol> --name "<name>" --p-token-program-id <program>
```

Agents must mark live RPC data as `KNOWN` only when it was fetched during the current session. Registry entries without a fresh RPC inspection are local repo state, not live chain truth.

