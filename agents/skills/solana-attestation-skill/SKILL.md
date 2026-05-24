---
name: solana-attestation-skill
description: "Operate the Solana Attestation Service verification layer vendored under /attestation — create credentials, generate schemas, issue attestations for skills/agents/plugins, verify proof hashes, and bridge OpenClawd formal-verification outputs into on-chain attestations."
metadata:
  openclaw:
    homepage: https://github.com/x402agent/solana-clawd/tree/main/attestation
    requires:
      env:
        - SOLANA_RPC_URL
        - SAS_PROGRAM_ID
        - SAS_AUTHORITY_KEY
---

# Solana Attestation Skill

Use this skill when the task involves the vendored [`attestation/`](../../../attestation/) verification layer.

## Canonical Program Addresses

- SAS Program ID: `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG`
- Token-2022 Program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- Event Authority PDA: `DzSpKpST2TSyrxokMXchFz3G2yn5WEGoxzpGEUDjCX4g`

## What This Skill Covers

- Create and manage attestation credentials
- Generate or update attestation schemas
- Issue skill attestations for formal verification proofs
- Issue agent identity attestations with vault linkage
- Issue plugin attestations with audit proof hashes
- Verify existing attestations and surface verifier URLs
- Regenerate SAS IDL and clients from the vendored program

## OpenClawd Schemas

### Skill Attestation

Layout: `[12, 32, 12, 8, 1]`

```json
{
  "skill_id": "string",
  "verifier_pubkey": "Pubkey",
  "proof_hash": "string",
  "verification_timestamp": "u64",
  "is_formally_verified": "bool"
}
```

### Agent Identity

Layout: `[12, 32, 12, 32, 1]`

```json
{
  "agent_id": "string",
  "wallet_pubkey": "Pubkey",
  "skill_attestation": "string",
  "vault_address": "Pubkey",
  "is_vault_initialized": "bool"
}
```

### Plugin Attestation

Layout: `[12, 32, 12, 34, 8, 1]`

```json
{
  "plugin_id": "string",
  "author_pubkey": "Pubkey",
  "attestation_ref": "string",
  "audit_proof_hash": "ProofHash",
  "timestamp": "u64",
  "is_audited": "bool"
}
```

## Local Source of Truth

- Program: [`attestation/program`](../../../attestation/program)
- Core library: [`attestation/core`](../../../attestation/core)
- Rust client: [`attestation/clients/rust`](../../../attestation/clients/rust)
- TypeScript client: [`attestation/clients/typescript`](../../../attestation/clients/typescript)
- IDL: [`attestation/idl/solana_attestation_service.json`](../../../attestation/idl/solana_attestation_service.json)
- Integration tests: [`attestation/integration_tests`](../../../attestation/integration_tests)

## Standard Commands

```bash
cd attestation
cargo-build-sbf && SBF_OUT_DIR=$(pwd)/target/sbpf-solana-solana/release cargo test
```

```bash
cd attestation
pnpm install
pnpm run generate-idl
pnpm run generate-clients
```

## QEDGen Bridge

Use this flow when promoting a locally verified capability into a trustless OpenClawd attestation:

1. Run the formal verification flow to produce a proof artifact.
2. Hash the proof output with SHA-256.
3. Create or confirm the relevant SAS schema.
4. Issue the attestation with the resulting `proof_hash`.
5. Record the attestation address in the skill/agent/plugin registry.

## Safety Rules

- Never invent a proof hash.
- Never claim a component is formally verified without an attestation or source proof artifact.
- Prefer mainnet verification only after devnet rehearsal.
- Keep schema layout bytes aligned with the attested templates and registry docs.
