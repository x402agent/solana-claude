# Clawd TUI

[![npm version](https://img.shields.io/npm/v/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](https://www.npmjs.com/package/@openclawdsolana/clawd-tui)
[![node](https://img.shields.io/node/v/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/@openclawdsolana/clawd-tui.svg?style=for-the-badge)](./LICENSE)

Clawd TUI is a Solana-aware agent terminal for operators who need market data, wallet context, on-chain lookup, and code execution in one fast shell.

Paste a mint, wallet, or asset address. Clawd resolves Birdeye and Helius context before the agent spends a token. Ask it to work. It streams tool calls, preserves sessions, and requires approval before destructive local actions.

## Why It Spreads

- **Instant Solana context**: address paste detection with Birdeye and Helius fan-out.
- **Operator-grade terminal UX**: slash commands, streaming tools, persistent sessions, and compact cards built for repeated use.
- **Safe by default**: shell, file writes, and file edits require approval.
- **OpenRouter-native**: OAuth onboarding or direct `OPENROUTER_API_KEY` configuration.
- **Composable inside DarkDefi**: pairs with the release gate, automaton runtime, Cloudflare agent API, and staking reference program.

No profit, signal, or safety guarantee is implied. Clawd surfaces context; users remain responsible for decisions and wallet actions.

## Install

Run without installing:

```bash
npx -y @openclawdsolana/clawd-tui
```

Install globally:

```bash
npm install -g @openclawdsolana/clawd-tui
clawd
```

Both `clawd` and `clawd-tui` are exposed as binaries.

On first run, Clawd opens OpenRouter OAuth and stores the key at:

```text
~/.config/openclawd/openrouter-key
```

You can also provide a key directly:

```bash
export OPENROUTER_API_KEY=sk-or-v1-REDACTED
clawd
```

## Core Commands

```text
/model <id>         switch OpenRouter model
/new                start a fresh session
/session            show session metadata and token usage
/help               list commands
exit | quit         leave Clawd
```

## Solana Commands

Birdeye market data, requiring `BIRDEYE_API_KEY`:

```text
/trending [n]       trending Solana tokens
/search <query>     token search by symbol or name
/wallet <address>   top USD wallet holdings
/portfolio <addr>   full wallet token portfolio
/networth <addr>    total wallet net worth and top weights
```

Helius DAS and RPC, requiring `HELIUS_API_KEY`:

```text
/asset <id>         single DAS asset lookup
/assets <addr>      owner assets, tokens, NFTs, and SOL
/nfts <addr>        non-fungible assets
/holders <mint>     supply and top holder concentration
/sigs <id>          recent asset signatures
/balance <addr>     native SOL balance
```

DeepSeek direct commands, requiring `DEEPSEEK_API_KEY`:

```text
/deepseek <prompt>      direct chat
/deepseek-fim <p> -- <s> fill-in-the-middle completion
/deepseek-balance       account balance
/deepseek-models        model list
```

## Configuration

Use environment variables or an `agent.config.json` in your working directory.

```json
{
  "model": "anthropic/claude-opus-4.7",
  "maxSteps": 20,
  "maxCost": 1,
  "display": {
    "inputStyle": "block",
    "toolDisplay": "grouped"
  },
  "showBanner": true,
  "requireApproval": ["shell", "file_write", "file_edit"]
}
```

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Agent backend key; OAuth can create this automatically. |
| `AGENT_MODEL` | Default OpenRouter model id. |
| `AGENT_MAX_STEPS` | Per-turn step cap. |
| `AGENT_MAX_COST` | Per-turn USD cap. |
| `BIRDEYE_API_KEY` | Market data and paste analysis. |
| `HELIUS_API_KEY` | DAS, RPC, and paste analysis. |
| `HELIUS_RPC_URL` | Optional RPC override. |
| `DEEPSEEK_API_KEY` | Direct DeepSeek commands. |
| `DEEPSEEK_BASE_URL` | Optional DeepSeek base URL override. |
| `DEEPSEEK_MODEL` | Default DeepSeek model id. |

## Development

```bash
cd clawd-tui
npm ci
npm run typecheck
npm run build
npm pack --pack-destination ../artifacts/packages
```

## Publish Checklist

```bash
npm ci
npm run typecheck
npm run build
npm pack --dry-run
npm publish --access public
```

Only `dist`, `README.md`, `LICENSE`, and `package.json` should be published.

## Related Docs

- [v0.2 Solana-aware terminal](./docs/v0.2-solana-aware-terminal.md)
- [One-shot OpenClawd bootstrap](./docs/one-shot-openclawd-bootstrap.md)
- [Root DarkDefi README](../README.md)
- [DarkDefi interoperability contract](../docs/INTEROPERABILITY.md)

## License

MIT. See [LICENSE](./LICENSE).
