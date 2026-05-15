# Pinocchio User Guide

This guide is the user-facing map for the Pinocchio work in Solana Clawd. It
explains what Pinocchio is, how to develop with it, and how this repo uses it
for p-token launches, p-agent-token planning, templates, explorer flows, and
agent-visible tooling.

Read this when you want to understand the system before scaffolding code.

## 1. What Pinocchio Is

Pinocchio is a native Solana program library from Anza for writing compact,
low-compute, `no_std` programs.

The usual Solana developer stack often uses framework conveniences like Anchor
or owned account deserialization. Pinocchio goes in the other direction:

- account data is accessed through `AccountInfo` pointers into the transaction
  input buffer;
- token and program state can be viewed by reference instead of copied into
  owned structs;
- programs avoid most framework overhead;
- developers take direct responsibility for instruction parsing, account
  validation, PDA checks, serialization, CPI safety, and tests.

That tradeoff is why Pinocchio matters: it is more manual, but it can be much
cheaper in compute units and smaller in binary size.

Use Pinocchio when:

- compute units are part of the product;
- your instruction hot path is simple and must be fast;
- you need precise account validation;
- you are comfortable writing native Solana Rust;
- you can invest in tests and audits.

Do not use Pinocchio just because it is faster. Use Anchor or another higher
level framework when you need fast iteration, broad team familiarity, generated
IDLs, or framework-managed account validation more than raw CU savings.

## 2. How Pinocchio Differs From Anchor

| Area | Anchor-style development | Pinocchio-style development |
| --- | --- | --- |
| Account validation | Declarative account structs and macros | Explicit validation in Rust |
| Instruction parsing | Framework discriminator and generated code | Usually one-byte or custom discriminators |
| State access | Often deserialized into owned structs | Prefer zero-copy views and byte slices |
| CPI calls | Anchor CPI wrappers | Pinocchio helper crates or manual CPI |
| IDL/client generation | Built in | You define clients or planners separately |
| Safety burden | Shared with framework conventions | Mostly on the developer |
| Best use | General apps and rapid iteration | Low-CU, audited, narrow hot paths |

The practical rule: Pinocchio gives you fewer guardrails and more control.

## 3. Repo Tour

The Pinocchio surface lives under [`pinocchio/`](./):

| Path | Purpose |
| --- | --- |
| [`pinocchio-main/`](./pinocchio-main/) | Vendored upstream Pinocchio workspace and helper program crates. |
| [`pinocchio-main/programs/`](./pinocchio-main/programs/) | Helper crates for System, Token, Token-2022, ATA, and Memo programs. |
| [`templates/vault/`](./templates/vault/) | Minimal Pinocchio vault starter. |
| [`templates/escrow/`](./templates/escrow/) | Make, take, refund escrow starter. |
| [`templates/p-token-launcher/`](./templates/p-token-launcher/) | p-token launch planning workbench and config contract. |
| [`templates/p-agent-token/`](./templates/p-agent-token/) | Agent token starter with identity, p-token mint, curve, and one-way binding shape. |
| [`P_TOKEN.md`](./P_TOKEN.md) | p-token overview and CU comparison notes. |
| [`PROGRAM_MAP.md`](./PROGRAM_MAP.md) | One-by-one map of upstream helper programs and local usage. |
| [`PROGRAMS.md`](./PROGRAMS.md) | Account-owner classification notes for canonical and Pinocchio-related programs. |
| [`AGENT_HELPERS.md`](./AGENT_HELPERS.md) | Agent and explorer helper patterns. |
| [`docs/P_TOKEN_LAUNCHES.md`](./docs/P_TOKEN_LAUNCHES.md) | p-token launch and bonding curve workflow. |
| [`docs/P_AGENT_TOKEN.md`](./docs/P_AGENT_TOKEN.md) | p-agent-token planning and template workflow. |

The root repo adds commands around these files through `package.json` and the
MCP server.

## 4. The Helper Program Map

The vendored upstream helper crates are not new on-chain programs by
themselves. They are CPI and state helper crates for existing Solana programs.

| Helper crate | Canonical program | Local use |
| --- | --- | --- |
| `pinocchio-system` | `11111111111111111111111111111111` | Create accounts, allocate, assign, transfer lamports, fund PDA state. |
| `pinocchio-token` | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | SPL-compatible mint/account flows, fallback token movement, batch references. |
| `pinocchio-token-2022` | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | Token extension references for metadata, transfer fees, guards, pausable tokens. |
| `pinocchio-associated-token-account` | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8bXV` | Create and validate ATAs around launch, escrow, and vault flows. |
| `pinocchio-memo` | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | Transaction notes, launch receipts, and agent-readable trace markers. |

Use:

```sh
npm run programs:map
npm run programs:show -- token
```

## 5. Development Setup

From the repo root:

```sh
npm install
npm run pinocchio:templates
```

For Rust/Solana development you also need the Solana toolchain and Rust target
setup for SBF builds. For early template validation, plain `cargo check` is
still useful:

```sh
cd programs
cargo check
```

When testing a scaffolded Pinocchio program, prefer:

- Rust unit tests for parsers and math;
- Mollusk or SBF tests for account validation and CPI behavior;
- devnet dry runs before any mainnet deployment;
- explicit account-owner checks in every instruction.

## 6. Pinocchio Program Anatomy

The templates use a simple native structure:

```txt
src/
  lib.rs       entrypoint, instruction dispatch, processor calls
  state.rs     account layout and byte parsing helpers
  errors.rs    program-specific error codes
```

Most Pinocchio programs should follow this shape:

1. Parse a small instruction discriminator.
2. Parse instruction data by position and length.
3. Validate every account in a dedicated account context or `TryFrom` block.
4. Check signer, writable, owner, PDA, bump, and duplicate-account rules.
5. Read or write state using explicit byte offsets or a reviewed zero-copy
   layout.
6. Use Pinocchio helper crates for CPIs where available.
7. Return precise errors.

Keep instruction handlers boring. Put the defensive work near parsing and
account validation so each handler is easy to audit.

## 7. Scaffolding Templates

List templates:

```sh
npm run pinocchio:templates
```

Scaffold a vault:

```sh
npm run pinocchio:scaffold -- --template vault --name my-vault --out ./programs/my-vault
```

Scaffold an escrow:

```sh
npm run pinocchio:scaffold -- --template escrow --name my-escrow --out ./programs/my-escrow
```

Scaffold a p-agent-token program:

```sh
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token
```

The generated templates are starting points. They are not audited production
programs. Before deployment, fill in CPI transfers, PDA signer seeds, close
paths, overflow checks, authority handoff, and tests.

## 8. Vault Template

[`templates/vault/`](./templates/vault/) is a minimal program shape for a PDA
vault.

It demonstrates:

- one-byte instruction discriminators;
- account and instruction validation;
- PDA-owned state;
- deposit and withdraw structure;
- explicit safety notes for account data parsing.

Use it when you need a simple native program that owns state or funds behind a
PDA. Extend it carefully:

- define PDA seeds in one place;
- store bumps in state when useful;
- verify rent and lamport movement;
- test invalid signer and invalid owner cases;
- make close behavior explicit.

## 9. Escrow Template

[`templates/escrow/`](./templates/escrow/) is a make, take, refund escrow
starter.

The intended flow is:

1. `Make`: maker defines swap terms and deposits token A.
2. `Take`: taker sends token B to the maker and receives token A.
3. `Refund`: maker cancels and receives token A back.

Before using it with real value, implement and test:

- token CPI transfers;
- ATA policy;
- maker and taker signer checks;
- vault PDA derivation;
- amount and mint matching;
- refund-only-by-maker rules;
- close behavior;
- duplicate account defenses.

## 10. What p-token Is

p-token is a Pinocchio-based replacement for the canonical SPL Token program.
It keeps the token hot path closer to raw account bytes:

- `AccountInfo` points into the transaction input buffer;
- mint/account fields can be read by reference;
- token accounts do not need to be copied into owned structs in hot paths.

Local notes in [`P_TOKEN.md`](./P_TOKEN.md) show the reference CU comparison:

| Operation | SPL Token CU | p-token CU | Reduction |
| --- | ---: | ---: | ---: |
| InitializeMint | 2,906 | 352 | 88% |
| InitializeAccount | 4,527 | 882 | 81% |
| Transfer | 4,736 | 1,188 | 75% |
| MintTo | 4,301 | 849 | 80% |
| Burn | 4,219 | 849 | 80% |
| CloseAccount | 2,708 | 441 | 84% |

Status: treat p-token as active development and unaudited unless your exact
deployment has an independent review.

## 11. p-token Explorer

The explorer inspects SPL-compatible mint accounts over RPC and classifies the
mint owner program.

```sh
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
npm run ptoken:list
npm run ptoken:show -- --mint PFOO
```

It records:

- mint address;
- symbol and name;
- owner program;
- supply and decimals;
- mint and freeze authorities;
- Explorer and Solscan links;
- p-token program id when configured.

Use `P_TOKEN_PROGRAM_ID` to classify a custom deployment:

```sh
export P_TOKEN_PROGRAM_ID=<program-id>
npm run ptoken:inspect -- --mint <mint>
```

## 12. p-token Launcher

The p-token launcher is the human and agent planning path for launching
p-token-style markets.

It has two parts:

1. CLI planner: [`scripts/ptoken-launch-planner.mjs`](../scripts/ptoken-launch-planner.mjs)
2. Workbench template: [`templates/p-token-launcher/`](./templates/p-token-launcher/)

Generate an unsigned launch plan:

```sh
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
```

Simulate a curve quote:

```sh
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
```

Run the local workbench:

```sh
npm run ptoken:launcher
```

Open:

```txt
http://localhost:8787
```

The launcher is intentionally unsigned. It does not create a mint, deploy a
program, move funds, or sign transactions. It produces a launch contract and
review checklist:

- token metadata;
- decimals and supply;
- p-token program id;
- virtual and real reserves;
- fee basis points;
- graduation target;
- mint inspection step;
- registry update step.

The default bonding curve model is constant product:

```txt
x = virtual SOL reserve
y = virtual token reserve
k = x * y
buy tokens out = y - k / (x + net_sol_in)
sell SOL out = x - k / (y + tokens_in)
```

Program code must enforce the parts the planner cannot enforce:

- reserve custody;
- signer and writable checks;
- fee collection;
- overflow handling;
- PDA seed and bump checks;
- graduation state;
- close and refund paths.

## 13. p-agent-token

p-agent-token is the agent-token variant of the p-token launch path.

It combines:

- an agent identity concept compatible with MPL Core and Agent Registry ideas;
- a p-token mint for the agent token;
- a constant-product launch curve;
- optional executive delegation;
- one-way token-to-agent binding.

Plan an agent token:

```sh
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
```

Quote the launch curve:

```sh
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
```

Scaffold the program starter:

```sh
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token
```

The planned instruction shape is:

| Instruction | Purpose |
| --- | --- |
| `initialize_agent` | Create or validate zero-copy agent state. |
| `initialize_agent_mint` | Create or validate the p-token mint and authorities. |
| `bind_agent_token` | Permanently bind the token mint to the agent state. |
| `delegate_executor` | Store an executive wallet allowed to operate the agent. |
| `buy` | Buy from the constant-product launch curve. |
| `sell` | Sell back into the launch curve before graduation. |
| `graduate` | Freeze the launch curve and prepare external AMM migration. |

The important design rule is one-way binding. Once the agent owner finalizes the
token relationship, the program should not allow replacing the mint casually.
That mirrors the irreversible agent-token linking idea from the Metaplex agent
token flow while moving the token hot path to p-token.

## 14. What We Built In This Repo

This repo now has a complete public support surface for Pinocchio and p-token
development:

- a Pinocchio support README and program map;
- a p-token overview with CU notes;
- p-token explorer CLI and local registry;
- p-token launch planner and constant-product quote tool;
- p-token launcher workbench template;
- p-agent-token planner and quote tool;
- p-agent-token Pinocchio scaffold;
- vault and escrow Pinocchio starter templates;
- MCP tools/resources so local agents can inspect templates and produce plans;
- a `/p/` frontend experience in the Beep Boop site showing p-token speed,
  agent launch modes, Dark DeFi signal concepts, confidential-agent payment
  flow, and command generation;
- a public launchpad doc at [`../docs/PTOKEN_LAUNCHPAD.md`](../docs/PTOKEN_LAUNCHPAD.md).

The private payment rail implementation is not part of this public guide.
Public docs describe the interface and user experience without publishing
private source.

## 15. End-to-End p-token Launch Workflow

Use this sequence for a normal p-token launch:

1. Plan the launch.

```sh
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
```

2. Quote early buys and sells.

```sh
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --tokens 1000000
```

3. Scaffold the launcher workbench or program support.

```sh
npm run pinocchio:scaffold -- --template p-token-launcher --name pfoo-launch --out ./programs/pfoo-launch
```

4. Implement the real program or launch transaction path.

At this step you must add the missing production pieces: account validation,
CPI transfers, reserve custody, fee math, PDA signer seeds, graduation, and
tests.

5. Deploy to devnet and inspect the mint.

```sh
npm run ptoken:inspect -- --mint <mint>
```

6. Register the verified mint.

```sh
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
```

7. List and show the registry entry.

```sh
npm run ptoken:list
npm run ptoken:show -- --mint PFOO
```

## 16. End-to-End p-agent-token Workflow

Use this sequence for an agent token:

1. Prepare metadata:

- token metadata JSON;
- agent identity JSON;
- optional MPL Core asset reference;
- owner wallet or multisig;
- optional executive delegate.

2. Generate the unsigned plan.

```sh
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
```

3. Quote the curve.

```sh
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
```

4. Scaffold the Pinocchio starter.

```sh
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token
```

5. Implement and test:

- `initialize_agent`;
- `initialize_agent_mint`;
- `bind_agent_token`;
- `delegate_executor`;
- `buy`;
- `sell`;
- `graduate`.

6. Deploy to devnet and inspect all accounts.

```sh
npm run ptoken:inspect -- --mint <mint>
```

7. Register the verified token.

```sh
npm run ptoken:add -- --mint <mint> --symbol PCLAWD --name "Clawd Agent Token" --p-token-program-id <program>
```

## 17. Frontend Experience

The user-facing demo lives in the Beep Boop site at:

```txt
beepboop/site/p/index.html
```

Run it:

```sh
cd beepboop/site
npm run dev -- --port 5174
```

Open:

```txt
http://localhost:5174/p/
```

The page demonstrates:

- SPL vs p-token CU savings;
- p-agent-token launch modes;
- p-token explorer command generation;
- Dark DeFi signal board concepts;
- confidential-agent payment flow concepts.

It is a frontend explanation and simulator. It does not sign transactions or
publish private implementation files.

## 18. MCP And Agent Workflow

Agents should use stable repo tools instead of scraping random files.

Available tools include:

- `pinocchio_templates`;
- `pinocchio_read_template`;
- `pinocchio_program_map`;
- `pinocchio_program`;
- `ptoken_registry_list`;
- `ptoken_inspect`;
- `ptoken_registry_add`;
- `ptoken_launch_plan`;
- `ptoken_bonding_curve_quote`.

Agent-safe flow:

1. Read this guide and the relevant template README.
2. Generate an unsigned plan.
3. Inspect or scaffold the relevant template.
4. Produce a checklist and test plan.
5. Ask for wallet signing only outside the planning step.

## 19. Security Checklist

Pinocchio programs are powerful because they are explicit. That also means
mistakes are easy to ship. Before deploying:

- validate every account owner;
- validate every signer;
- validate every writable flag;
- validate PDA seeds and bumps;
- reject duplicate accounts where they can break assumptions;
- check instruction data length before reading bytes;
- use checked arithmetic for amount, fee, and curve math;
- separate reserve accounts from fee accounts and agent operating balances;
- make close and refund behavior explicit;
- test invalid mints, invalid token programs, bad bumps, wrong owners, overflow,
  underflow, missing signatures, and duplicate accounts;
- audit all unsafe blocks;
- run devnet tests before mainnet;
- get independent review for real value.

## 20. Glossary

| Term | Meaning |
| --- | --- |
| Pinocchio | Native Solana Rust library focused on low overhead and zero-copy account access. |
| p-token | Pinocchio-based SPL Token replacement under active development. |
| p-token launcher | Unsigned planning and workbench surface for p-token launches and bonding curves. |
| p-agent-token | Agent-token path combining p-token, agent identity, curve launch, and one-way binding. |
| PDA | Program Derived Address controlled by program seeds and bumps. |
| CPI | Cross-program invocation. |
| ATA | Associated token account. |
| Virtual reserves | Curve parameters used to set starting price and slippage. |
| Real reserves | Actual assets custodied by the program or launch route. |
| Graduation | Transition from bonding curve trading to external AMM/DEX liquidity. |
| One-way binding | Finalized relationship between an agent identity and its token mint. |

## 21. Command Cookbook

```sh
# Discover templates
npm run pinocchio:templates

# Scaffold starters
npm run pinocchio:scaffold -- --template vault --name my-vault --out ./programs/my-vault
npm run pinocchio:scaffold -- --template escrow --name my-escrow --out ./programs/my-escrow
npm run pinocchio:scaffold -- --template p-agent-token --name pclawd-agent-token --out ./programs/pclawd-agent-token

# p-token launch planning
npm run ptoken:launch-plan -- --symbol PFOO --name "P Foo"
npm run ptoken:curve-quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1
npm run ptoken:launcher

# p-agent-token planning
npm run pagent:plan -- --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
npm run pagent:quote -- --virtual-sol 30 --virtual-token 1073000000 --sol 1

# Explorer and registry
npm run ptoken:inspect -- --mint <mint>
npm run ptoken:add -- --mint <mint> --symbol PFOO --name "P Foo" --p-token-program-id <program>
npm run ptoken:list
npm run ptoken:show -- --mint PFOO

# Program maps
npm run programs:map
npm run programs:show -- token
```

## 22. Recommended Reading Order

1. This guide: [`USER_GUIDE.md`](./USER_GUIDE.md)
2. Pinocchio support overview: [`README.md`](./README.md)
3. p-token notes: [`P_TOKEN.md`](./P_TOKEN.md)
4. Program map: [`PROGRAM_MAP.md`](./PROGRAM_MAP.md)
5. p-token launches: [`docs/P_TOKEN_LAUNCHES.md`](./docs/P_TOKEN_LAUNCHES.md)
6. p-agent-token: [`docs/P_AGENT_TOKEN.md`](./docs/P_AGENT_TOKEN.md)
7. Launcher template: [`templates/p-token-launcher/README.md`](./templates/p-token-launcher/README.md)
8. Agent token template: [`templates/p-agent-token/README.md`](./templates/p-agent-token/README.md)
9. Public launchpad guide: [`../docs/PTOKEN_LAUNCHPAD.md`](../docs/PTOKEN_LAUNCHPAD.md)
