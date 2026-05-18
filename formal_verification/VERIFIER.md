# Clawd Formal Verification Gate

Every agent, skill, plugin, and Solana program injected into this codebase
runs through three checks before it can operate. A component that fails any
check is blocked from the Leviathan runtime and the gateway.

---

## Three-Layer Verification

```
Component submitted for injection
         │
         ▼
┌────────────────────────────────────┐
│  1. STRIDE + SIREN Analysis        │  (always runs, static)
│     stride.ts                      │
│     Critical/≥3 High → BLOCKED    │
└─────────────────┬──────────────────┘
                  │ pass
                  ▼
┌────────────────────────────────────┐
│  2. Kani Model Checking            │  (Rust source only)
│     kani/risk_engine_harness.rs    │
│     Proof failure → BLOCKED        │
└─────────────────┬──────────────────┘
                  │ pass
                  ▼
┌────────────────────────────────────┐
│  3. SAS On-Chain Attestation       │  (warning if unconfigured)
│     SAS program:                   │
│     22zoJMtdu4tQc2PzL74ZUT7Fr...   │
│     Schema: clawd-component-v1     │
└─────────────────┬──────────────────┘
                  │
                  ▼
         verified-registry.json
         report-<name>-<hash>.json
```

---

## STRIDE Framework

| Letter | Category | What it checks |
|--------|----------|----------------|
| **S** | Spoofing | Hardcoded keys, missing signer verification, auth bypasses |
| **T** | Tampering | Dynamic code execution, unsafe blocks, unchecked arithmetic |
| **R** | Repudiation | Missing audit logs, silent error catches |
| **I** | Information Disclosure | Secrets in logs, stack traces in responses, env var leaks |
| **D** | Denial of Service | Infinite loops, large allocations, missing compute budgets |
| **E** | Elevation of Privilege | Path traversal, over-permissioned grants, missing PDA validation |

---

## SIREN Standards

Based on [Solana Ecosystem Security](https://solana.com/news/solana-ecosystem-security):

| SIREN ID | Standard | What it checks |
|----------|----------|----------------|
| SIREN-001 | Supply Chain | Pinned deps, lockfiles present |
| SIREN-002 | Key Management | No hardcoded secrets, env-var isolation |
| SIREN-003 | Upgrade Safety | No open upgrade authorities |
| SIREN-004 | Input Validation | All external inputs validated before use |
| SIREN-005 | Privilege Separation | Least-privilege principals, PDA owner checks |

---

## Kani Verification

Kani is a Rust model checker that proves safety properties by exhaustive
symbolic execution. Harnesses live in `formal_verification/kani/`.

### Properties Verified

| Harness | Property | SPEC.md ref |
|---------|----------|-------------|
| `verify_protected_principal` | Zero-position accounts never lose protected principal | §3.1 |
| `verify_conservation` | vault.total_tokens ≥ sum of all claims after any transition | §3.2 |
| `verify_oracle_manipulation_safety` | Spike-price profits not immediately withdrawable | §0, goal 3 |
| `verify_profit_first_haircuts` | Junior claims fully consumed before principal touched | §0, goal 4 |
| `verify_liveness` | User ops never blocked by global OI state | §0, goal 6 |
| `verify_adl_determinism` | ADL eligibility is a pure function of explicit state | §2.2 |
| `verify_funding_term_bounded` | Funding term computation cannot overflow | §2.1 |

### Running Kani

```bash
# Install Kani
cargo install --locked kani-verifier
cargo kani setup

# Run all harnesses on the risk engine
cd formal_verification
cargo kani --harness verify_protected_principal
cargo kani --harness verify_conservation
cargo kani  # runs all harnesses

# Or via the gate (auto-runs Kani when Rust source is present)
npx tsx formal_verification/gate.ts verify --path programs/risk-engine
```

---

## SAS Attestation

The Solana Attestation Service (SAS) creates permanent on-chain records.

| Field | Value |
|-------|-------|
| Program ID | `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` |
| Schema | `clawd-component-verification-v1` |
| Authority | `SAS_AUTHORITY_KEY` env var |

### Attestation Fields

```json
{
  "component_name": "my-skill",
  "component_kind": "skill",
  "component_hash": "a1b2c3d4e5f6...",
  "stride_score": "87",
  "kani_verified": "true",
  "verified_at": "2026-05-18T00:00:00Z",
  "verifier": "clawd-gate-v1",
  "lineage": "backrooms-v2.1.0"
}
```

---

## Running the Gate

```bash
# Verify a new skill
npx tsx formal_verification/gate.ts verify --path skills/my-skill

# Verify a new agent JSON
npx tsx formal_verification/gate.ts verify --path agents/my-agent.json

# Verify a Solana program (triggers Kani)
npx tsx formal_verification/gate.ts verify --path programs/my-program

# Check attestation status
npx tsx formal_verification/gate.ts status --path skills/my-skill

# List all verified components
npx tsx formal_verification/gate.ts list
```

---

## Environment Variables

```bash
SAS_AUTHORITY_KEY=<base58 or JSON-array>   # signs SAS attestations
HELIUS_RPC_URL=https://...                  # used for SAS tx submission
KANI_BINARY_PATH=kani                       # path to kani binary (default: kani)
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed, attestation recorded |
| `1` | STRIDE violations found — injection BLOCKED |
| `2` | Kani proof failure — injection BLOCKED |
| `3` | SAS attestation failed (warning, not blocked) |
| `4` | Invalid path or unknown component type |

---

## Integration with CI

Add to `.github/workflows/verify.yml`:

```yaml
- name: Formal Verification Gate
  run: |
    for dir in skills/*/; do
      npx tsx formal_verification/gate.ts verify --path "$dir" || exit 1
    done
    for file in agents/*.json; do
      npx tsx formal_verification/gate.ts verify --path "$file" || exit 1
    done
```

---

## SPEC.md Status

The DEX Risk Engine formal properties (`formal_verification/SPEC.md`) are
now backed by Kani harnesses. Previous status was **Open** for all properties.

| Property | Previous Status | Current Status |
|----------|----------------|----------------|
| prop_protected_principal | Open | Kani harness written |
| prop_conservation | Open | Kani harness written |
| Oracle manipulation safety | Open | Kani harness written |
| Profit-first haircuts | Open | Kani harness written |
| Liveness | Open | Kani harness written |
| ADL determinism | Open | Kani harness written |
| Funding term bounded | Open | Kani harness written |

Run `cargo kani` in `formal_verification/` to execute all proofs.

---

## QEDGen Integration

The repo also carries a Lean 4 / QEDGen verification path for Solana programs
that need stronger proof artifacts than the repo-wide gate provides.

### Current Program Workspace

The Solana Attestation Service is wired here:

- [`attestation/formal_verification/README.md`](../attestation/formal_verification/README.md)
- [`attestation/formal_verification/SPEC.md`](../attestation/formal_verification/SPEC.md)
- [`attestation/formal_verification/AttestationProofs.lean`](../attestation/formal_verification/AttestationProofs.lean)

### Commands

```bash
# Build the SAS Lean proofs
npm run attestation:qedgen:build

# Show the canonical SAS QEDGen target
npm run attestation:qedgen:spec

# Verify the attested agent template and export a proof manifest
npm run attestation:verify:agent-template
```

### Positioning

Use the repo-root gate when you want:

- STRIDE/SIREN triage
- Kani model checking
- SAS receipt issuance

Use the QEDGen workspace when you want:

- Lean 4 proof artifacts
- instruction-level authorization and lifecycle proofs
- proof hashes suitable for attestation metadata

The gate now exports `formal_verification/proof-manifest-*.json` files that can
be consumed by SAS issuance flows for skills and agents.
