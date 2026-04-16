# Security Policy — solana-clawd

> **solana-clawd** is an open-source Solana AI agent framework. This policy covers the full monorepo: the agent index, plugin gateway, ClawdRouter LLM proxy, CLAWD Cloud OS bootstrap, clawd-cli, Beep Boop macOS companion, the $CLAWD burn treasury, and the Drizzle-backed agent database.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security reports.** Use one of these channels instead:

1. **GitHub Private Vulnerability Advisory** (preferred) — [github.com/x402agent/solana-clawd/security/advisories/new](https://github.com/x402agent/solana-clawd/security/advisories/new)
2. **Email** — `security@solanaos.net` (PGP key available on request)
3. **Signal / Telegram** — coordinate via [t.me/clawdtoken](https://t.me/clawdtoken) DM for sensitive initial contact only; move to encrypted channel before disclosing details.

Please include:

- A clear description of the vulnerability and its impact
- Reproduction steps (proof-of-concept code or transactions if applicable)
- Affected components, versions, or commit SHAs
- Your suggested mitigation, if any
- Whether you want public credit

### Disclosure Timeline

| Step | Target |
| --- | --- |
| Acknowledge report | within **48 hours** |
| Initial assessment + severity | within **5 business days** |
| Patch or mitigation released | within **30 days** for High / Critical; **90 days** for Medium / Low |
| Coordinated public disclosure | after patch ships, typically within **7 days** of release |

We will not pursue legal action against researchers acting in good faith under this policy. See **Safe Harbor** below.

## Severity Classification

We use a pragmatic 4-tier scale rather than CVSS-only:

| Severity | Examples |
| --- | --- |
| **Critical** | Direct wallet theft, signature forgery, treasury drain, RCE on the gateway, leaked signing keys, bypass of the CLAWD permission engine on a live trade. |
| **High** | Auth bypass for API keys (`clawd_sk_*`), plugin gateway schema bypass that forwards unvalidated calls, DoS of the ClawdRouter proxy, bypass of agent memory tier labeling that presents `INFERRED` as `KNOWN`. |
| **Medium** | XSS in agent UI surfaces, CSRF on non-financial endpoints, permission gate that's `ask` when it should be `deny`, IDOR on agent memory reads for another wallet. |
| **Low** | Missing security header, verbose error messages, rate-limit edge cases with no practical impact. |

## Supported Versions

| Component | Supported |
| --- | --- |
| `solana-clawd` (this repo) — `main` + latest tagged release | ✅ |
| `agents/` v1 schema (`solanaClawdAgentSchema_v1.json`) | ✅ |
| `plugin.delivery/` packages — latest `@solana-clawd/*` on npm | ✅ |
| `clawdrouter` — latest npm + Fly.io deployment | ✅ |
| `clawd-cloud-os`, `clawdcli` — latest `main` | ✅ |
| `beepboop` — latest Sparkle auto-update channel | ✅ |
| Forks, archived branches, anything older than the last tagged release | ❌ |

Security fixes are only backported to the latest tagged release. If you run a fork, you are responsible for merging fixes.

## Scope

### In Scope

- The repository `github.com/x402agent/solana-clawd` and all packages published from it.
- Live deployments under `solanaclawd.com`, `vibe.solanaclawd.com`, `dex.solanaclawd.com`, `clawd.click`, `plugin.delivery`, and the ClawdRouter Fly.io service.
- The Beep Boop Cloudflare Worker gateway.
- The $CLAWD burn treasury wallet (`GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4`) and the mint (`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`).
- The on-chain behavior of shipped Anchor / Solana programs, when their source is in this repo.

### Out of Scope

- Third-party services we integrate with (Helius, Jupiter, Pump.fun, Streamflow, Birdeye, DexScreener, OpenRouter, Anthropic, AssemblyAI, ElevenLabs, Cloudflare, Vercel, Fly.io, Neon, Supabase). Report those to their respective vendors.
- Vulnerabilities in npm dependencies we do not vendor or ship compiled. File upstream; we monitor `npm audit` and Dependabot.
- Social-engineering, phishing, SIM-swap, or physical attacks targeting users or maintainers.
- DoS via overwhelming Solana RPC quotas or rate-limits on third-party APIs.
- Issues requiring a malicious user to install a tampered build of the app they wouldn't have otherwise trusted.
- Forks or mirrors we do not publish.

## Component Security Properties

Each component makes specific guarantees. Breaking any of these is in scope.

### Agents — `agents/`

- **Deny-first permissions.** Every agent carries a `permissions` block (see [schema/solanaClawdAgentSchema_v1.json](agents/schema/solanaClawdAgentSchema_v1.json)). `accessPrivateKey` defaults to `deny`; `executeTrade`, `signTransaction`, `spendFromWallet`, `burnClawd` default to `ask`. An agent that executes an irreversible action without an explicit user approval is a Critical bug.
- **Memory tiers are labels, not magic.** An agent that surfaces an `INFERRED` claim as `KNOWN` is a High-severity correctness bug.
- **No private keys in agent configs.** The schema does not permit key material. A plugin that asks an agent for a seed phrase is malicious by definition.

### Plugin Gateway — `plugin.delivery/packages/gateway/`

- **Schema validation before forwarding.** Every request is validated against the plugin manifest's JSON schema via `@cfworker/json-schema` (Edge runtime) or AJV (Node) before it reaches the plugin. Bypassing validation is High.
- **Deny-first gate.** The gateway enforces the agent's `permissions` block before forwarding. Plugin responses cannot re-enter a deny-first action without a fresh user approval.
- **No secret exposure to plugins.** The gateway never forwards the user's wallet, session tokens, or `X-Solana-Clawd-Plugin-Settings` beyond the explicit allowlist in [packages/sdk/request.ts](plugin.delivery/packages/sdk/request.ts).

### ClawdRouter — `clawdrouter/`

- **Ed25519 wallet auth, non-custodial.** USDC never leaves the user wallet until the user's Ed25519 key signs a specific 402 challenge. ClawdRouter never custodies funds. Any path that extracts USDC without an explicit per-request signature is Critical.
- **API keys are hashed at rest.** `clawd_sk_*` keys are SHA-256 hashed before storage; only the prefix is persisted. Any code path that logs, emits, or persists the full key is High.
- **Rate limits + session caps.** `CLAWDROUTER_MAX_PER_REQUEST` and `CLAWDROUTER_MAX_PER_SESSION` are defense-in-depth caps. Bypassing either is High.
- **15-dimension scorer is local.** The scorer never phones home. Prompt content does not leave the proxy during classification.

### Burn + Lock Treasury — `clawdrouter/README.md` §Burn + Lock v2.0

- **Server-derived burn cost.** Sponsored burns derive the CLAWD amount server-side from the selected model/action and live price data. A path that accepts a client-supplied burn amount is Critical.
- **Token-gated caller.** Every sponsored burn re-verifies the caller's CLAWD holding and enforces replay + rate-limit guards before the treasury signs.
- **Treasury key isolation.** `BURN_WALLET_TREASURY_PRIVATE_KEY` lives server-side only. It is never sent to the browser and never logged. Extraction = Critical.
- **Self-burn flow requires user signature.** Manual burns go through the user's wallet adapter; there is no pathway where the server signs on behalf of the user for a self-burn.

### Drizzle / Database — `agents/schema/drizzle.ts`

- **Parameterized queries only.** All access uses Drizzle ORM bindings. Raw `sql.raw()` with user input is not permitted — flag any PR introducing it.
- **JSONB defaults are the security posture.** The `permissions` column default is `accessPrivateKey: 'deny'`. Migrations that change a default to a less-restrictive value require explicit review.
- **No plaintext secrets.** Wallet seed phrases, API keys, and signing material are never stored in the database in any form — hashed, encrypted, or otherwise.

### CLAWD Cloud OS + clawd-cli

- **Root-optional.** The bootstrap never requires `sudo` when `~/.local` is writable. Any new step that silently escalates is High.
- **Deterministic Go tarball.** The Go installer downloads from `go.dev` with checksum-style validation; swapping in a tampered tarball is Critical.
- **Env keys stay local.** Bootstrap writes to `~/src/solana-clawd/.env` only. No telemetry of keys.

### Beep Boop — `beepboop/`

- **All API keys proxied through the Clawd Gateway** (`beepboop/worker/src/index.ts`). Shipping an API key inside the macOS binary is Critical.
- **AssemblyAI tokens are short-lived (480s).** The gateway mints per-session tokens; long-lived tokens committed to the client bundle are High.
- **No audio persisted.** Transcribed audio is streamed and discarded. Server-side retention beyond the live request is out of policy.

## Cryptographic Primitives

We rely on well-studied primitives only:

- **Ed25519** for Solana signatures (via `@solana/web3.js` / `@solana/kit`)
- **SHA-256** for API key hashing
- **HTTPS (TLS 1.2+)** for every network edge we control
- **Argon2id** for any future password hashing (none today — we don't use passwords)

We do **not** roll our own crypto. PRs that implement cryptographic primitives from scratch will be rejected on principle.

## Solana-Specific Safeguards

- **Base58 validation** on every mint address (32–44 chars, strict alphabet) before any on-chain call.
- **PDA derivations** use canonical seeds documented in each program's SDK. We never derive PDAs with user-supplied seeds unless they are domain-separated.
- **Slippage caps** enforced at the agent layer (`risk.maxSlippageBps`, default 200 bps / 2%) and again at the client layer.
- **`VersionedTransaction` with explicit `ComputeBudget`** priority fees. We don't emit legacy transactions.
- **Deny-first on irreversible ops** — burns, transfers, swaps, token-account closures — regardless of agent venue.

## Safe Harbor

We support good-faith security research. You will not be pursued legally or administratively for:

- Testing vulnerabilities against your own wallets and test accounts.
- Accessing only the minimum data necessary to demonstrate the vulnerability.
- Not degrading service for other users (no stress tests, no DDoS).
- Not accessing, modifying, or destroying other users' data.
- Reporting promptly through the channels above and giving us reasonable time to patch before public disclosure.

If in doubt, ask first via the reporting channels.

## Credit

Researchers who report valid vulnerabilities are credited in the patch release notes and in a rolling hall of fame at the bottom of this file, unless they request anonymity. We do not currently run a paid bounty program. For critical findings we may send a discretionary $CLAWD grant on a case-by-case basis.

## Hall of Fame

_(Researchers who have responsibly disclosed vulnerabilities will be listed here.)_

---

**Last updated:** 2026-04-16
**Policy version:** 1.0
