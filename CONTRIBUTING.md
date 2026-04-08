# Contributing to solana-clawd

Welcome to **solana-clawd** -- the open-source Solana agentic engine with 31 MCP tools, blockchain buddies, and unicode animations. We appreciate contributions of all kinds: new tools, new buddy species, spinner art, bug fixes, documentation, and more.

- **GitHub**: [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd)
- **Issues**: [github.com/x402agent/solana-clawd/issues](https://github.com/x402agent/solana-clawd/issues)
- **Hub**: [seeker.solanaos.net](https://seeker.solanaos.net)

---

## Getting Started

### Prerequisites

- **Node.js 20+** (see `engines` field in `package.json`)
- **npm** (ships with Node) or **Bun** (a `bun.lock` is included)
- A code editor with TypeScript support (VS Code, Cursor, etc.)
- Git

### Clone and Setup

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm install        # or: bun install
```

There is also a setup script that configures environment files and dependencies:

```bash
npm run setup      # runs scripts/setup.sh
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run build:watch` | Compile in watch mode |
| `npm run dev` | Alias for `build:watch` |
| `npm run typecheck` | Type-check without emitting |
| `npm run mcp:build` | Build the MCP server (`mcp-server/`) |
| `npm run mcp:start` | Start the MCP server (stdio transport) |
| `npm run mcp:http` | Start the MCP server (HTTP/SSE transport) |
| `npm run demo` | Run the demo entry point |
| `npm run birth` | Run the buddy birth entry point |
| `npm run spinners` | Preview all $CLAWD spinners |

### Running Tests

If a test suite is present, run it with:

```bash
npm test
```

At the time of writing, the project focuses on manual testing via the `demo`, `birth`, and `spinners` scripts. Contributions adding automated tests are very welcome.

---

## Project Structure

```
solana-clawd/
├── src/
│   ├── animations/     # $CLAWD unicode spinners (braille grid art)
│   ├── buddy/          # Blockchain Buddy companion system
│   ├── agents/         # Built-in agent definitions
│   ├── engine/         # Query engine, permission engine, tool executor
│   ├── state/          # AppState store
│   ├── memory/         # 3-tier memory extraction (KNOWN / LEARNED / INFERRED)
│   ├── helius/         # Helius RPC client + WebSocket listener
│   ├── pump/           # Pump.fun scanner
│   ├── gateway/        # SSE transport
│   ├── skills/         # Skill registry
│   ├── metaplex/       # Metaplex agent minting
│   ├── entrypoints/    # CLI entry points (clawd.js)
│   └── ...             # Additional modules (tools, commands, coordinator, etc.)
├── tailclawd/          # TailClawd web UI
├── web/                # Next.js web app
├── mcp-server/         # MCP server (31 tools)
├── skills/             # SKILL.md files for operator workflows
├── scripts/            # Build and setup scripts
├── docs/               # Documentation
├── examples/           # Example code
├── biome.json          # Biome linter/formatter config
├── tsconfig.json       # TypeScript config
└── package.json
```

---

## How to Contribute

Here are some high-impact areas where we welcome contributions:

### New MCP Tools

The MCP server lives in `mcp-server/`. Each tool follows a standard pattern: define a Zod schema for inputs, implement the handler, and register it. See existing tools for examples.

### New Buddy Species

Blockchain Buddies are pixel-art companions with trading personalities. Adding a new species involves sprites, trading config, and catchphrases. See the step-by-step walkthrough below.

### New $CLAWD Spinners

Spinners are braille-grid unicode animations displayed in the CLI. Each spinner is an array of string frames. See the walkthrough below.

### New Skills

Skills are `SKILL.md` files that define multi-step operator workflows. Drop a new skill file into `skills/` and register it in the skill registry.

### Bug Fixes

Check the [issue tracker](https://github.com/x402agent/solana-clawd/issues) for open bugs. When fixing a bug, include a clear description of the root cause in your PR.

---

## Code Style

- **TypeScript** -- strict-ish configuration. `noImplicitAny` is off for now, but please add types where reasonable.
- **Biome** for linting and formatting. Run before committing:
  ```bash
  npx @biomejs/biome check --apply .
  ```
- **Formatter settings** (from `biome.json`):
  - Indent style: tabs
  - Indent width: 2
  - Line width: 100
  - Quote style: single quotes
  - Semicolons: as needed (omit where possible)
- **ESM modules** -- use `.js` extensions in import paths (TypeScript resolves `.ts` files from `.js` imports).
- **Import organization** -- Biome auto-organizes imports. Unused imports trigger warnings.
- `noExplicitAny` is off, but `noNonNullAssertion` is also off -- use judgment.

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes.** Keep commits focused and atomic.

3. **Run the build** to make sure nothing is broken:
   ```bash
   npm run build
   npm run typecheck
   ```

4. **Lint your code:**
   ```bash
   npx @biomejs/biome check --apply .
   ```

5. **Open a Pull Request** against `main` with a clear description:

   ```
   ## What

   Brief summary of what changed.

   ## Why

   Motivation or issue number.

   ## How

   Implementation approach (if non-obvious).

   ## Testing

   How you verified the change works.
   ```

6. **Review** -- a maintainer will review your PR. Address any feedback and keep the conversation in the PR thread.

---

## Adding a New Buddy Species

Blockchain Buddies live in `src/buddy/`. Follow these steps to add a new species:

### Step 1: Add to `BLOCKCHAIN_SPECIES` in `blockchain-types.ts`

Open `src/buddy/blockchain-types.ts` and add your species to the `BLOCKCHAIN_SPECIES` array or type. Each species has an identifier string (e.g., `"phoenix"`, `"crab"`).

### Step 2: Add sprite frames in `blockchain-sprites.ts`

Open `src/buddy/blockchain-sprites.ts` and add a set of sprite frames for your species. Sprites are multi-line string arrays representing the buddy's idle, happy, trading, and other animation states. Follow the existing format.

### Step 3: Add trading config in `blockchain-types.ts`

Each species has a trading personality: risk tolerance, preferred token types, reaction thresholds, etc. Add a config block for your species following the existing pattern.

### Step 4: Add display name and catchphrases

Give your buddy a display name (shown in the UI) and a set of catchphrases it says during trades, wins, losses, and idle states.

### Step 5: Add to `web/lib/buddies.ts` for browser compatibility

The web app has its own buddy definitions for browser rendering. Mirror your new species in `web/lib/buddies.ts` so it appears in the Next.js web app and TailClawd UI.

### Step 6: Test it

```bash
npm run build
npm run birth    # verify your buddy hatches correctly
npm run demo     # verify it appears in the demo
```

---

## Adding a New Spinner

$CLAWD spinners are braille-grid unicode animations. Follow these steps to add one:

### Step 1: Define frames in `src/animations/clawd-frames.ts`

Open `src/animations/clawd-frames.ts` and add your spinner as a named export. A spinner is an array of strings, where each string is one frame of the animation. Frames typically use braille unicode characters (U+2800 to U+28FF) to create pixel-art effects.

```typescript
export const mySpinner: string[] = [
	'frame 1 content',
	'frame 2 content',
	'frame 3 content',
	// ...
]
```

### Step 2: Export from `index.ts`

Make sure your spinner is exported from `src/animations/index.ts` so it is available as part of the public API.

### Step 3: Add to `web/lib/clawd-spinners.ts` for browser compatibility

Mirror your spinner definition in `web/lib/clawd-spinners.ts` so the web app can render it.

### Step 4: Preview it

```bash
npm run build
npm run spinners   # preview all spinners including yours
```

---

## License

solana-clawd is released under the [MIT License](./LICENSE). By contributing, you agree that your contributions will be licensed under the same terms.
