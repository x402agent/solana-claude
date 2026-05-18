# Solana Attestation Service QEDGen Proofs

This directory is the QEDGen-oriented formal verification workspace for the
`attestation/program` Solana program.

It is intentionally separate from the repo-root `formal_verification/`
directory:

- `formal_verification/` contains the repo-wide gate, STRIDE/SIREN checks, and
  Kani harnesses.
- `attestation/formal_verification/` contains Lean 4 proofs for the SAS program
  itself, using the QEDGen workflow.

## Scope

The current proof set verifies a sound subset of the attestation program's
security-critical behavior:

- authority-gated admin mutations
- signer requirements for attestation creation
- terminal closure semantics for attestations
- immutability of closed attestations in the model

This workspace is designed to expand toward full instruction-by-instruction
proof coverage.

## Files

- `SPEC.md`: normative verification target for the SAS program
- `AttestationProofs.lean`: executable model and theorems
- `lakefile.lean`: Lean project definition
- `lean-toolchain`: Lean toolchain pin

## Build

From this directory:

```bash
lake build
```

From the repo root:

```bash
npm run attestation:qedgen:build
```

## QEDGen Workflow

Generate/refine the spec from the SAS IDL:

```bash
npm run attestation:qedgen:spec
```

When the local `qedgen` binary is available, the intended full loop is:

```bash
qedgen verify \
  --idl attestation/idl/solana_attestation_service.json \
  --validate
```

The repo vendors the QEDGen skill and support library under:

`skills/solana-formal-verification/`

That bundle remains the canonical source for the full proof-generation toolchain.
