# Formal Verification

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=14F195&center=true&vCenter=true&width=900&lines=specify+%E2%86%92+gate+%E2%86%92+verify+%E2%86%92+attest;formal+checks+for+skills%2C+risk%2C+and+execution+paths" alt="Formal Verification animated header" />
</p>

`formal_verification/` contains public specifications, registries, and verification gates for Solana Clawd skills and risk surfaces.

## Contents

| File | Purpose |
| --- | --- |
| [`SPEC.md`](./SPEC.md) | Verification model. |
| [`VERIFIER.md`](./VERIFIER.md) | Verifier workflow. |
| [`gate.ts`](./gate.ts) | TypeScript gate logic. |
| [`skill-hub.ts`](./skill-hub.ts) | Skill hub verification helpers. |
| [`kani/risk_engine_harness.rs`](./kani/risk_engine_harness.rs) | Rust/Kani risk harness. |

## Smoke

```bash
npx tsc --noEmit --allowJs false formal_verification/gate.ts formal_verification/skill-hub.ts formal_verification/stride.ts
npm run perps:audit
```
