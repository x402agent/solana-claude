import Lake
open Lake DSL

package attestationProofs

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git" @ "v4.15.0"

@[default_target]
lean_lib AttestationProofs where
  roots := #[`AttestationProofs]
