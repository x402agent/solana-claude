# Task 30: Pump SDK Integration Tests

## Objective

Write comprehensive integration tests for the Pump SDK modules integrated into `nano-core/src/claw/pump/sdk/`.

## Acceptance Criteria

- [ ] Unit tests for all bonding curve math functions
  - `getBuyTokenAmountFromSolAmount` — edge cases: zero, max supply, graduated curve
  - `getSellSolAmountFromTokenAmount` — edge cases: sell all, sell more than balance
  - `bondingCurveMarketCap` — various supply levels
  - `newBondingCurve` — verify initial state matches on-chain defaults
- [ ] Unit tests for analytics functions
  - `calculateBuyPriceImpact` — small and large trades
  - `calculateSellPriceImpact` — high slippage scenarios
  - `getGraduationProgress` — 0%, 50%, 100% cases
  - `getTokenPrice` — buy/sell price calculation
- [ ] Unit tests for fee calculation
  - `getFee` — all fee tiers
  - `computeFeesBps` — various market cap ranges
  - `calculateFeeTier` — boundary conditions
- [ ] Unit tests for error handling
  - `NoShareholdersError`, `TooManyShareholdersError`, etc.
  - Verify error messages and codes
- [ ] PDA derivation tests
  - `bondingCurvePda`, `creatorVaultPda`, `canonicalPumpPoolPda`
  - Verify against known on-chain PDAs
- [ ] All tests pass with `npm test`
- [ ] Tests use vitest (consistent with project)

## Technical Notes

- Use `BN` for all numeric assertions
- Mock RPC responses for OnlinePumpSdk tests
- Reference `pump-fun-sdk-main/tests/` for existing test patterns
- Test file location: `nano-core/src/claw/pump/sdk/__tests__/`

## Dependencies

- Pump SDK integration (completed)
- vitest configured (completed)
