import Mathlib.Data.List.Basic
import Mathlib.Tactic

abbrev Pubkey := Nat

structure CredentialState where
  authority : Pubkey
  authorizedSigners : List Pubkey

structure SchemaState where
  authority : Pubkey
  paused : Bool
  version : Nat

inductive AttestationLifecycle where
  | open
  | closed
deriving DecidableEq, Repr

structure AttestationState where
  authority : Pubkey
  lifecycle : AttestationLifecycle

namespace ChangeAuthorizedSignersAccess

def changeAuthorizedSigners
    (credential : CredentialState)
    (caller : Pubkey)
    (newSigners : List Pubkey) : Option CredentialState :=
  if caller = credential.authority then
    some { credential with authorizedSigners := newSigners }
  else
    none

theorem change_authorized_signers_access
    (credential : CredentialState)
    (caller : Pubkey)
    (newSigners : List Pubkey)
    (h : changeAuthorizedSigners credential caller newSigners ≠ none) :
    caller = credential.authority := by
  unfold changeAuthorizedSigners at h
  split_ifs at h with hEq
  · exact hEq
  · contradiction

end ChangeAuthorizedSignersAccess

namespace ChangeSchemaStatusAccess

def changeSchemaStatus
    (schema : SchemaState)
    (caller : Pubkey)
    (isPaused : Bool) : Option SchemaState :=
  if caller = schema.authority then
    some { schema with paused := isPaused }
  else
    none

theorem change_schema_status_access
    (schema : SchemaState)
    (caller : Pubkey)
    (isPaused : Bool)
    (h : changeSchemaStatus schema caller isPaused ≠ none) :
    caller = schema.authority := by
  unfold changeSchemaStatus at h
  split_ifs at h with hEq
  · exact hEq
  · contradiction

end ChangeSchemaStatusAccess

namespace CreateAttestationAccess

def createAttestation
    (credential : CredentialState)
    (caller : Pubkey) : Option AttestationState :=
  if caller ∈ credential.authorizedSigners then
    some { authority := caller, lifecycle := AttestationLifecycle.open }
  else
    none

theorem create_attestation_access
    (credential : CredentialState)
    (caller : Pubkey)
    (h : createAttestation credential caller ≠ none) :
    caller ∈ credential.authorizedSigners := by
  unfold createAttestation at h
  split_ifs at h with hMem
  · exact hMem
  · contradiction

end CreateAttestationAccess

namespace CloseAttestationStateMachine

def closeAttestation
    (attestation : AttestationState)
    (caller : Pubkey) : Option AttestationState :=
  if caller = attestation.authority then
    if attestation.lifecycle = AttestationLifecycle.open then
      some { attestation with lifecycle := AttestationLifecycle.closed }
    else
      none
  else
    none

theorem close_attestation_closes
    (attestation prePost : AttestationState)
    (caller : Pubkey)
    (h : closeAttestation attestation caller = some prePost) :
    prePost.lifecycle = AttestationLifecycle.closed := by
  unfold closeAttestation at h
  split_ifs at h with hAuth hOpen
  · cases h
    rfl
  · contradiction
  · contradiction

theorem closed_is_terminal
    (attestation : AttestationState)
    (caller : Pubkey)
    (hClosed : attestation.lifecycle = AttestationLifecycle.closed) :
    closeAttestation attestation caller = none := by
  unfold closeAttestation
  split_ifs with hAuth
  · simp [hClosed]
  · rfl

end CloseAttestationStateMachine
