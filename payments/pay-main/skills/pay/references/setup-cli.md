# Setup, CLI, And Provider Authoring

## MCP Setup

Add Pay to your MCP config to give AI agents direct access to paid APIs:

```json
{
  "mcpServers": {
    "pay": {
      "command": "pay",
      "args": ["mcp"]
    }
  }
}
```

Or launch OpenClawd / Claude Code / Codex with Pay injected into the agent session:

```sh
pay clawd "buy some water with pay"
pay claude
pay codex
```

If `pay` is not installed, use `npx @solana/pay`.

## CLI Usage

```sh
brew install pay                    # normal local install
pay --version                       # verify binary
pay setup                         # create a wallet
pay setup --update                  # refresh MCP config and skills only
pay clawd "buy some water with pay" # launch OpenClawd with pay
pay claude                        # launch Claude Code with pay
pay codex                         # launch Codex with pay
pay curl <url>                    # HTTP request with user-authorized 402 handling
pay --sandbox curl <url>          # use an ephemeral devnet wallet
pay skills list                   # browse the API registry
pay skills endpoints <provider>   # list provider endpoints
pay account list                  # list accounts
pay topup                         # fund account
pay server start                  # run a payment gateway for your API
```

## Notes

- URLs from results are complete gateway URLs; use them as-is.
- Metered endpoints return 402 first; `curl` prepares the payment, gets local
  signing approval, then retries with the payment proof.
- Free endpoints pass through without payment.
- Prefer `--sandbox` for tests. Do not create, replace, export, or remove a
  mainnet account unless the user explicitly asked for account setup.
- Use `pay setup --update` when Pay is already installed and agent MCP config
  needs refreshing.
- Use `create_skill` only when creating or reviewing a pay-skills provider file.
- For developer/operator workflows that monetize an API, write `pay server`
  YAML, publish a provider listing, or submit to
  `https://github.com/solana-foundation/pay-skills`, read
  `references/monetize-api.md`.
