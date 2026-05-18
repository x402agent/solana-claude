# Solana Attestation Service Verification Spec v1.0

The Solana Attestation Service (SAS) manages issuer credentials, schemas, and
attestations on Solana. It MUST ensure that only authorized principals can
create or mutate verification records, and that closed attestations are
terminal.

## 0. Security Goals

1. **Credential authority control**: Only the credential authority MUST be able
   to mutate schema metadata or authorized signer sets associated with that
   credential.
2. **Authorized attestation issuance**: An attestation MUST only be created by
   a signer that is authorized by the credential policy.
3. **Terminal closure**: Once an attestation is closed, it MUST be terminal in
   the model and MUST NOT become open again.
4. **No silent admin bypass**: Any modeled privileged transition MUST reject an
   unauthorized caller.

## 1. State Model

```text
CredentialState {
  authority : Pubkey
  authorizedSigners : List Pubkey
}

SchemaState {
  authority : Pubkey
  paused : Bool
  version : Nat
}

AttestationLifecycle = open | closed

AttestationState {
  authority : Pubkey
  lifecycle : AttestationLifecycle
}
```

## 2. Operations

### 2.1 Change Authorized Signers

**Signers**: `authority` MUST sign

**Preconditions**:
- caller MUST equal `credential.authority`

**Effects**:
1. Replace the credential signer set with the supplied list

**Postconditions**:
- `credential.authorizedSigners_post = newSigners`

### 2.2 Change Schema Status

**Signers**: `authority` MUST sign

**Preconditions**:
- caller MUST equal `schema.authority`

**Effects**:
1. Set the schema pause flag

**Postconditions**:
- `schema.paused_post = isPaused`

### 2.3 Create Attestation

**Signers**: `authority` MUST sign

**Preconditions**:
- caller MUST be a member of `credential.authorizedSigners`

**Effects**:
1. Create an open attestation bound to the signing authority

**Postconditions**:
- `attestation.lifecycle = open`

### 2.4 Close Attestation

**Signers**: `authority` MUST sign

**Preconditions**:
- caller MUST equal `attestation.authority`
- attestation MUST be open

**Effects**:
1. Mark the attestation closed in the abstract model

**Postconditions**:
- `attestation.lifecycle_post = closed`

## 3. Formal Properties

### 3.1 Access Control

**prop_change_authorized_signers_access**:
For all credential states `c`, callers `p`, and signer lists `s`,
if `changeAuthorizedSigners c p s ≠ none`, then `p = c.authority`.

**prop_change_schema_status_access**:
For all schema states `s`, callers `p`, and pause flags `b`,
if `changeSchemaStatus s p b ≠ none`, then `p = s.authority`.

**prop_create_attestation_access**:
For all credential states `c`, callers `p`,
if `createAttestation c p ≠ none`, then `p ∈ c.authorizedSigners`.

### 3.2 State Machine Safety

**prop_close_attestation_closes**:
For all attestation states `a`, callers `p`, and post-states `a'`,
if `closeAttestation a p = some a'`, then `a'.lifecycle = closed`.

**prop_closed_is_terminal**:
For all attestation states `a` and callers `p`,
if `a.lifecycle = closed`, then `closeAttestation a p = none`.

## 4. Trust Boundary

The following are axiomatic and out of scope for these proofs:

- Solana runtime account ownership and rent semantics
- PDA derivation correctness
- SPL Token / Token-2022 internals
- serialization/deserialization correctness
- CPI target program internals

The proofs focus on the SAS program's local authorization and lifecycle logic.

## 5. Verification Results

| Property | Status | Proof |
|---|---|---|
| prop_change_authorized_signers_access | **Verified** | `ChangeAuthorizedSignersAccess.change_authorized_signers_access` |
| prop_change_schema_status_access | **Verified** | `ChangeSchemaStatusAccess.change_schema_status_access` |
| prop_create_attestation_access | **Verified** | `CreateAttestationAccess.create_attestation_access` |
| prop_close_attestation_closes | **Verified** | `CloseAttestationStateMachine.close_attestation_closes` |
| prop_closed_is_terminal | **Verified** | `CloseAttestationStateMachine.closed_is_terminal` |
