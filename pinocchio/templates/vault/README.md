# {{project_name}}

Pinocchio vault starter for native Solana programs.

The template demonstrates:

- one-byte instruction discriminators;
- `TryFrom` account and instruction validation;
- PDA vault state;
- deposit and withdraw instruction structure;
- explicit safety notes for account data parsing.

Before deployment, add Mollusk or SBF tests for signer checks, PDA derivation, rent, close behavior, malformed input, and CPI failure paths.

