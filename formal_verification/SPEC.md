# 128-bit Perpetual DEX Risk Engine Verification Spec v1.0

The 128-bit Perpetual DEX Risk Engine serves as a robust risk management layer for a single quote-token vault, utilizing native 128-bit Base-10 scaling. Its design implements protected principal, junior profit claims, live premium-based funding, and lazy A/K Side Indices to perform unencumbered-flat deposit sweeps and bounded insolvency handling.

## 0. Security Goals
1. **Protected Principal:** An account with effective position 0 MUST NOT have its protected principal directly reduced by another account's insolvency.
2. **Explicit ADL Eligibility:** Accounts with open positions MAY be subject to deterministic protocol ADL if they are on the eligible opposing side of a bankrupt liquidation. ADL MUST operate through explicit protocol state, not hidden execution.
3. **Oracle Manipulation Safety:** Profits created by short-lived oracle distortion MUST NOT immediately dilute the live haircut denominator, immediately become withdrawable principal, or immediately satisfy initial-margin / withdrawal checks.
4. **Profit-First Haircuts:** When the system is undercollateralized, haircuts MUST apply to junior matured profit claims before any protected principal.
5. **Conservation:** The engine MUST NOT create withdrawable claims exceeding vault tokens.
6. **Liveness:** The engine MUST NOT require OI == 0, manual admin recovery, a global scan, or reconciliation of an unrelated prefix of accounts before a user can safely settle, deposit, withdraw, trade, or liquidate.

## 1. State Model

```lean
-- Scaled amounts
def POS_SCALE : Nat := 1_000_000
def ADL_ONE : Nat := 1_000_000

structure AccountState where
  protectedPrincipal : Nat
  realizedPnL : Int
  liability : Int
  feeCredit : Int
  position : Int
  aSideMaturity : Nat
  kSideMaturity : Int

structure VaultState where
  totalTokens : Nat
  fundPxLast : Nat
  rateLast : Int
  lastUpdateTime : Nat
  globalASide : Nat
  globalKSide : Int
```

## 2. Operations

### 2.1 Calculate Funding Term
**Signers**: None (Internal engine logic validation)
**Preconditions**: None
**Effects**:
1. Compute raw numerator `fundPx0 * rateLast * dtSub`.
2. Apply division by `10_000` with conservative integer floor semantics based on `rateLast` sign.
**Postconditions**: The evaluated term MUST be bounded cleanly and strictly preserve conservation (floor negative infinity).

### 2.2 Reevaluate ADL Eligibility
**Signers**: Keepers
**Preconditions**: Target account must have `position ≠ 0`.
**Effects**:
1. Verify K-space liability opposing sign.
**Postconditions**: The account is flagged for ADL explicitly if liability > 0 and globalKSide < 0.

## 3. Formal Properties

### 3.1 Account Isolation (Protected Principal)
**prop_protected_principal**: For all accounts `A` with `A.position = 0`, if `liquidate(B)` occurs resulting in a haircut on vault totals, then `A.protectedPrincipal_post = A.protectedPrincipal_pre`.

### 3.2 Global Conservation
**prop_conservation**: For all valid Engine states where `Engine.totalTokens = V` and account sum claims `= C_tot`, any valid transition `t` implies `V_post >= C_tot_post`.

## 4. Trust Boundary
- The provided oracle price (`fundPx0`) is axiomatic and explicitly sourced securely at the start-of-call interval. Engine wrappers hold the responsibility for oracle bounds checks.

## 5. Verification Results

| Property | Status | Proof |
|---|---|---|
| prop_protected_principal | **Open** | |
| prop_conservation | **Open** | |
