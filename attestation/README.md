<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--   CLAWD PRIVATE AI — blockchain-confirmed inference layer          -->
<!-- ═══════════════════════════════════════════════════════════════════ -->
<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=270&section=header&text=CLAWD%20PRIVATE%20AI&fontSize=54&fontColor=14F195&animation=fadeIn&desc=Blockchain-Confirmed%20Inference%20%C2%B7%20TEE%20Terminal%20%C2%B7%20Solana%20Agent%20Router&descSize=20&descAlignY=65&fontAlign=50" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=18&duration=1900&pause=750&color=14F195&center=true&vCenter=true&width=980&lines=%F0%9F%94%90+TEE+TERMINAL+%E2%80%94+X25519+ECDH+%2B+AES-256-GCM+encrypted+sessions;%F0%9F%A7%A0+PRIVATE+INFERENCE+%E2%80%94+SHA-256+commitment+on+Solana%2C+prompt+stays+yours;%F0%9F%94%97+AGENT+ROUTER+%E2%80%94+route+by+on-chain+capability+attestation;%F0%9F%A6%9E+CLAWD+%E2%80%94+prove+your+AI+ran+without+revealing+what+you+asked" alt="CLAWD Private AI" />

<br/>

[![Private AI](https://img.shields.io/badge/Private_AI-Blockchain_Confirmed-14F195?style=for-the-badge&logo=solana&logoColor=black)](.)
[![Encryption](https://img.shields.io/badge/AES--256--GCM-E2E_Encrypted-9945FF?style=for-the-badge&logoColor=white)](.)
[![Key Exchange](https://img.shields.io/badge/X25519-ECDH_Session_Keys-03E1FF?style=for-the-badge&logoColor=white)](.)
[![Privacy](https://img.shields.io/badge/SHA--256-Prompt_Commitment-F9CF4D?style=for-the-badge&logoColor=black)](.)

</div>

> **🚀 NEW — Private AI Attestation Layer:**  
> TEE terminal (X25519 ECDH → AES-256-GCM encrypted), private AI inference (SHA-256 prompt hash on Solana — plaintext never stored), and Solana agent router (capability-based attestation discovery).
>
> ```bash
> cp attestation/.env.example attestation/.env  # add ANTHROPIC_API_KEY
> npm run tee:server     # encrypted TEE terminal server  →  ws://localhost:8443
> npm run tee:cli        # connect — session attested on Solana on handshake
> npm run inference:demo "your prompt"  # private inference, hash on-chain
> ```

---

<div align="center">

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/solana-foundation/solana-attestation-service)

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=2200&pause=650&color=14F195&center=true&vCenter=true&width=1080&lines=%F0%9F%A6%9E+ATTEST+%E2%86%92+VERIFY+%E2%86%92+REGISTER+%E2%86%92+SPAWN;%F0%9F%94%90+FORMALLY+VERIFIED+SKILLS+%C2%B7+AGENTS+%C2%B7+PLUGINS+%C2%B7+MCP+SERVERS;SAS+ON+SOLANA+%C2%B7+LOBSTER-SIGNED+IDENTITY+LAYER;The+shell+molts.+The+proof+remains." alt="animated header" />

# Solana Attestation Service

**The lobster-signed verification layer for OpenClawd.**

Formally verified skills, agents, plugins, and MCP servers anchored on Solana through the **Solana Attestation Service**.

```text
╔══════════════════════════════════════════════════════════════════════╗
║  🦞  OPENCLAWD VERIFICATION LAYER                                  ║
║  Skills → proofs → attestations → registry → live operator trust   ║
╚══════════════════════════════════════════════════════════════════════╝
```

</div>

---

## What this is

This workspace vendors the upstream **Solana Attestation Service** and maps it directly onto the OpenClawd runtime. It gives the repo a canonical place to:

- define on-chain schemas for **skills**, **agents**, **plugins**, and **MCP servers**
- bind Lean / proof-carrying verification outputs to live runtime surfaces
- mint and verify machine-readable attestations on Solana
- bridge local operator state into public registry trust

In OpenClawd terms, this is the point where a lobster stops being just a prompt or local folder and becomes a **provable, signed system component**.

---

## OpenClawd Integration

This verification layer is wired into the rest of the repo through the following surfaces:

| Surface | File | Purpose |
| ------ | ---- | ------- |
| SAS skill | [`../agents/skills/solana-attestation-skill/`](../agents/skills/solana-attestation-skill/) | Operator-facing skill for attestation flows |
| Attested agent template | [`../agents/agent-template-attested.json`](../agents/agent-template-attested.json) | Agent identity template with vault-aware attestation path |
| Attested plugin template | [`../plugin.delivery/plugin-template-attested.json`](../plugin.delivery/plugin-template-attested.json) | Plugin surface with SAS-backed verification metadata |
| Attestation agent template | [`../agents/templates/solana-attestation-agent.template.json`](../agents/templates/solana-attestation-agent.template.json) | Spawn notary for credential/schema setup and issuance |
| Formal skill schema | [`../agents/skills/skill-schema.v1.json`](../agents/skills/skill-schema.v1.json) | Shared schema for verified skill metadata |

The verification layer is intended to graduate local assets from:

1. human-readable skill or agent definitions
2. generated catalog entries
3. formal verification artifacts
4. on-chain attestation receipts
5. live registry trust

---

## Verification Targets

OpenClawd uses this layer to attest more than just agent identities.

### Formally Verified Skills

Skills can carry a verification receipt proving that a capability, policy, or algorithm was checked before surfacing in the formal hub. The canonical example is a Lean-backed proof hash stored against a `skill_id`.

### Attested Agents

Agents can be born with a Solana identity record linking:

- `agent_id`
- operator wallet
- skill attestation reference
- vault address
- initialization state

This is the path used by spawn-time notaries and registry-aware runtime surfaces.

### Verified Plugins

Plugins can carry an audit proof hash and publication metadata so the delivery layer can distinguish between:

- local experimental plugins
- reviewed plugins
- formally attested plugins

### Verified MCP Servers

MCP servers are first-class infrastructure in OpenClawd. This layer is also designed to attest server identities, tool surfaces, and audit receipts so public tool endpoints can eventually advertise:

- server identity
- authority
- proof or audit reference
- active/inactive status
- compatibility with the skill hub and agent registry

---

## Program Addresses

| Component | Address |
| --- | --- |
| SAS Program ID | `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` |
| Token Program (Token-2022) | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Event Authority PDA | `DzSpKpST2TSyrxokMXchFz3G2yn5WEGoxzpGEUDjCX4g` |

---

## OpenClawd Schemas

### Skill Attestation Schema

Layout: `[12, 32, 12, 8, 1]` (String, Pubkey, String, U64, Bool)

```typescript
{
  skill_id: string,
  verifier_pubkey: Pubkey,
  proof_hash: string,         // SHA-256 of Lean 4 proof
  verification_timestamp: u64,
  is_formally_verified: bool
}
```

### Agent Identity Schema

Layout: `[12, 32, 12, 32, 1]` (String, Pubkey, String, Pubkey, Bool)

```typescript
{
  agent_id: string,
  wallet_pubkey: Pubkey,
  skill_attestation: string,
  vault_address: Pubkey,
  is_vault_initialized: bool
}
```

### Plugin Attestation Schema

Layout: `[12, 32, 12, 34, 8, 1]` (String, Pubkey, String, ProofHash, U64, Bool)

```typescript
{
  plugin_id: string,
  author_pubkey: Pubkey,
  attestation_ref: string,
  audit_proof_hash: ProofHash,
  timestamp: u64,
  is_audited: bool
}
```

### MCP Server Attestation Shape

The MCP-server path is repo-defined rather than upstream-standardized, but the intended OpenClawd shape is:

```typescript
{
  server_id: string,
  authority_pubkey: Pubkey,
  tool_surface_hash: string,
  audit_proof_hash: ProofHash,
  timestamp: u64,
  is_verified: bool
}
```

This keeps the attestation model aligned across skills, plugins, servers, and agents.

---

## Schema Data Types

| Value | Type | Description |
| --- | --- | --- |
| 0 | U8 | Unsigned 8-bit integer |
| 1 | U16 | Unsigned 16-bit integer |
| 2 | U32 | Unsigned 32-bit integer |
| 3 | U64 | Unsigned 64-bit integer |
| 4 | U128 | Unsigned 128-bit integer |
| 5-9 | I* | Signed integers |
| 10 | Bool | Boolean value |
| 11 | Char | Single character |
| 12 | String | Variable-length string |
| 13-25 | Vec_* | Vector types |
| 32 | Pubkey | 32-byte Solana pubkey |
| 34 | ProofHash | 32-byte SHA-256 proof hash |

---

## QEDGen + Lean Flow

Formal verification via QEDGen produces Lean 4 proofs that are stored as `proof_hash` in attestations.

```text
1. A skill, plugin, MCP server, or agent requests formal verification
2. QEDGen generates Lean 4 proofs for the target capability or invariant
3. Proof compilation emits a stable proof_hash
4. OpenClawd issues an attestation carrying that proof_hash
5. SAS stores the receipt on-chain via the attestation program
6. Any downstream operator, registry, or client verifies it trustlessly
```

That is the entire point of this layer: the runtime can still move fast, but the parts that matter can be **proved, signed, and surfaced**.

### SAS Program Proof Workspace

This repo now includes a concrete QEDGen-oriented proof workspace for the SAS
program itself:

- [`formal_verification/README.md`](./formal_verification/README.md)
- [`formal_verification/SPEC.md`](./formal_verification/SPEC.md)
- [`formal_verification/AttestationProofs.lean`](./formal_verification/AttestationProofs.lean)

Build it from the repo root:

```bash
npm run attestation:qedgen:build
```

The proof scope currently focuses on:

- authority-gated schema and credential mutations
- authorized attestation issuance
- terminal attestation closure semantics

### Agent Handoff Artifact

The repo verification gate now exports a machine-readable proof manifest for
agent and skill attestation flows:

```bash
npx tsx formal_verification/gate.ts verify --path agents/agent-template-attested.json
```

That produces:

```text
formal_verification/proof-manifest-<name>-<hash>.json
```

The manifest includes:

- `proof_hash`
- `spec_hash`
- proof file list
- inferred SAS attestation payload stub for skills or agents

This is the handoff contract between:

1. Lean / QEDGen proof artifacts
2. the repo verification gate
3. the Solana attestation notary / agent birth flow

---

## Repo Layout

| Path | Purpose |
| ---- | ------- |
| `program/` | on-chain SAS program |
| `idl/` | generated IDL |
| `clients/typescript/` | generated TypeScript client |
| `clients/rust/` | generated Rust client |
| `integration_tests/` | end-to-end test harness |
| `scripts/generate-clients.js` | client generation entrypoint |

---

## Commands

### Run Integration Tests

```bash
cargo-build-sbf && SBF_OUT_DIR=$(pwd)/target/sbpf-solana-solana/release cargo test
```

### Generate IDL

Install Shank:

```bash
cargo install shank-cli
```

Generate:

```bash
shank idl -r program -o idl
# OR
npm run generate-idl
```

### Generate Clients

Install dependencies:

```bash
npm install
```

Generate:

```bash
npm run generate-clients
```

From the repo root, the same flow is exposed as:

```bash
npm run attestation:install
npm run attestation:generate-idl
npm run attestation:generate-clients
```

---

## Where this shows up

This layer is meant to feed directly into:

- [`../agents/README.md`](../agents/README.md) — public agent hub, templates, skill hub
- [`../automaton-main/README.md`](../automaton-main/README.md) — runtime + vault + registry-aware automation
- [`../operator/README.md`](../operator/README.md) — iterative operator loop and attestation-aware orchestration

The long-term OpenClawd shape is simple:

**skills get verified, agents get born, plugins get audited, MCP servers get attested, and the lobster keeps moving.**
