# Solana Attestation Service

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/solana-foundation/solana-attestation-service)

A Solana program that enables creating, managing, and verifying digital attestations on the blockchain. The system provides a framework for issuers to create schemas and issue attestations that can optionally be tokenized as SPL Token-2022 NFTs.

## Integration with OpenClawd

This service is integrated into this repository for formally verified skills, agents, and plugins:

- **SAS Skill**: [`../agents/skills/solana-attestation-skill/`](../agents/skills/solana-attestation-skill/) - Agent skill for attestation operations
- **Attested Agent Template**: [`../agents/agent-template-attested.json`](../agents/agent-template-attested.json) - Agent with vault integration
- **Attested Plugin Template**: [`../plugin.delivery/plugin-template-attested.json`](../plugin.delivery/plugin-template-attested.json) - Plugin with SAS verification

## Program Addresses

| Component | Address |
| --- | --- |
| SAS Program ID | `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` |
| Token Program (Token-2022) | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Event Authority PDA | `DzSpKpST2TSyrxokMXchFz3G2yn5WEGoxzpGEUDjCX4g` |

## OpenClawd Attestation Schemas

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

## QEDGen Integration

Formal verification via QEDGen produces Lean 4 proofs that are stored as `proof_hash` in attestations:

```
1. Agent requests formal verification via QEDGen
2. QEDGen generates Lean 4 proofs for skill capabilities
3. Proof compilation produces proof_hash
4. Agent creates attestation with proof_hash
5. Attestation stored on-chain via SAS program
6. Attestation verified by any party trustlessly
```

## Running Tests

Run integration tests with the following script

```
cargo-build-sbf && SBF_OUT_DIR=$(pwd)/target/sbpf-solana-solana/release cargo test
```

## Generating IDL

This repository uses Shank for IDL generation.

Install the Shank CLI

```
cargo install shank-cli
```

Generate IDL

```
shank idl -r program -o idl
// OR
pnpm run generate-idl
```

## Generating Clients

_Ensure the IDL has been created or updated using the above IDL generation steps._

Install dependencies

```
pnpm install
```

Run client generation script

```
pnpm run generate-clients
```
