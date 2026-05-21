# Task 02: Add ESLint + Lint Scripts to All PumpKit Packages

## Context

You are working in the `pump-fun-sdk` repository. The `pumpkit/` monorepo uses Turborepo and defines a `lint` task in `pumpkit/turbo.json`, but **no packages have lint scripts or ESLint configs**. Running `turbo lint` currently does nothing.

## Objective

Add ESLint configuration and lint scripts to every pumpkit package so that `cd pumpkit && npx turbo lint` runs successfully across the entire monorepo.

## Packages to Configure

1. `pumpkit/packages/core/` — TypeScript library (Node.js)
2. `pumpkit/packages/monitor/` — TypeScript bot (Node.js)
3. `pumpkit/packages/channel/` — TypeScript bot (Node.js)
4. `pumpkit/packages/claim/` — TypeScript bot (Node.js)
5. `pumpkit/packages/tracker/` — TypeScript bot (Node.js)
6. `pumpkit/packages/web/` — React + Vite (Browser)

## Instructions

1. **Read** the root `eslint.config.js` to understand the project-wide ESLint style
2. **Read** `pumpkit/turbo.json` to see how the lint task is configured
3. **Read** each package's `package.json` to understand its dependencies and scripts
4. **Create** a shared ESLint config approach:
   - Option A: Shared config at `pumpkit/eslint.config.js` that packages extend
   - Option B: Per-package `eslint.config.js` files (simpler, less DRY)
   - Choose whichever is simpler given the existing setup
5. **For Node.js packages** (core, monitor, channel, claim, tracker):
   - Add `eslint.config.js` with TypeScript support
   - Rules: `@typescript-eslint/recommended`, no unused vars, no explicit any
   - Add `"lint": "eslint src/"` to package.json scripts
6. **For the web package**:
   - Add `eslint.config.js` with TypeScript + React + React Hooks support
   - Include `eslint-plugin-react`, `eslint-plugin-react-hooks`
   - Add `"lint": "eslint src/"` to package.json scripts
7. **Install** required devDependencies in each package (or at workspace root):
   - `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
   - For web: `eslint-plugin-react`, `eslint-plugin-react-hooks`
8. **Fix** any lint errors that appear (or add `// eslint-disable` for known issues)
9. **Run** `cd pumpkit && npx turbo lint` and verify all packages pass

## Constraints

- Use ESLint flat config format (`eslint.config.js`) — not legacy `.eslintrc`
- Match the style of the root `eslint.config.js` as closely as possible
- Don't be overly strict — the goal is basic quality gates, not perfection
- Don't modify source code beyond fixing genuine lint errors

## Verification

```bash
cd pumpkit
npx turbo lint
```

All 6 packages should report clean or have reasonable lint output.
