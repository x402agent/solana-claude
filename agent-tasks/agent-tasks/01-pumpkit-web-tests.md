# Task 01: Write React Component & Hook Tests for @pumpkit/web

## Context

You are working in the `pump-fun-sdk` repository. The `pumpkit/packages/web/` package is a React + Vite + Tailwind dashboard UI at version 0.1.0. It currently has **zero tests** — no `.test.tsx` or `.spec.tsx` files anywhere in the package.

## Objective

Write comprehensive test suites for all React components, hooks, and library modules in `pumpkit/packages/web/src/`.

## Files to Test

### Components (`pumpkit/packages/web/src/components/`)
- `EventCard.tsx` — Displays claim/launch/graduation/whale/CTO/feeDist events
- `Layout.tsx` — Main page wrapper with header + sidebar
- `MarkdownChat.tsx` — Markdown documentation renderer
- `SolAmount.tsx` — SOL amount formatter with icons
- `StatsBar.tsx` — Real-time stats display bar
- `StatusDot.tsx` — Connection status indicator (green/yellow/red)
- `TimeAgo.tsx` — Relative timestamp rendering
- `TokenBadge.tsx` — Token CA + symbol badge
- `WalletAddress.tsx` — Wallet address with truncation
- `WatchForm.tsx` — Add wallet watch form
- `WatchList.tsx` — Sidebar watches list

### Hooks (`pumpkit/packages/web/src/hooks/`)
- `useEventStream.ts` — SSE stream connection hook
- `useHealth.ts` — Health check hook
- `useWatches.ts` — Watch management hook

### Lib (`pumpkit/packages/web/src/lib/`)
- `api.ts` — HTTP client + SSE functions
- `content.ts` — Content loaders (docs/tutorials)
- `types.ts` — TypeScript interfaces

## Instructions

1. **Read** each source file before writing its tests
2. **Read** `pumpkit/packages/web/UI_SPEC.md` for design intent
3. **Read** `pumpkit/packages/web/src/types.ts` and `pumpkit/packages/web/src/lib/types.ts` for type definitions
4. **Install** testing dependencies if not present:
   - `vitest` (already likely in monorepo)
   - `@testing-library/react`
   - `@testing-library/jest-dom`
   - `@testing-library/user-event`
   - `jsdom`
5. **Create** test files adjacent to source:
   - `pumpkit/packages/web/src/components/__tests__/EventCard.test.tsx`
   - `pumpkit/packages/web/src/components/__tests__/Layout.test.tsx`
   - etc.
6. **Add** a `test` script to `pumpkit/packages/web/package.json`: `"test": "vitest run"`
7. **Add** a `vitest.config.ts` if not present, with jsdom environment
8. **Run** tests to verify they pass

## Test Coverage Expectations

- Each component: render test, prop variations, user interactions
- Each hook: initial state, state updates, cleanup
- API module: mock fetch, error handling
- Content module: mock data loading
- Aim for 80%+ coverage

## Constraints

- Use Vitest (not Jest) — pumpkit uses Vitest
- Use `@testing-library/react` for component tests
- Mock SSE/fetch with `vi.fn()` — don't make real network calls
- Follow existing test patterns in `pumpkit/packages/core/src/__tests__/`

## Verification

Run `cd pumpkit && npx turbo test --filter=@pumpkit/web` and confirm all tests pass.
