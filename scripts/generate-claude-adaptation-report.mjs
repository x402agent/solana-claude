import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const upstreamRoot = path.join(repoRoot, "claude-code-main 2", "src");
const targetRoot = path.join(repoRoot, "src");
const docsDir = path.join(repoRoot, "docs");
const reportMdPath = path.join(docsDir, "claude-code-adaptation-report.md");
const reportJsonPath = path.join(docsDir, "claude-code-adaptation-report.json");

const phaseByKey = {
  assistant: "P1 Runtime Core",
  bootstrap: "P1 Runtime Core",
  bridge: "P1 Runtime Core",
  cli: "P2 Operator Surfaces",
  commands: "P2 Operator Surfaces",
  components: "P2 Operator Surfaces",
  constants: "P1 Runtime Core",
  context: "P1 Runtime Core",
  coordinator: "P3 Agent Orchestration",
  entrypoints: "P2 Operator Surfaces",
  hooks: "P2 Operator Surfaces",
  ink: "P2 Operator Surfaces",
  keybindings: "P2 Operator Surfaces",
  memdir: "P1 Runtime Core",
  migrations: "P1 Runtime Core",
  moreright: "P1 Runtime Core",
  "native-ts": "P1 Runtime Core",
  outputStyles: "P2 Operator Surfaces",
  plugins: "P3 Agent Orchestration",
  query: "P1 Runtime Core",
  remote: "P4 Privacy + Local/Cloud",
  schemas: "P1 Runtime Core",
  screens: "P2 Operator Surfaces",
  server: "P4 Privacy + Local/Cloud",
  services: "P3 Agent Orchestration",
  shims: "P1 Runtime Core",
  skills: "P3 Agent Orchestration",
  state: "P1 Runtime Core",
  tasks: "P3 Agent Orchestration",
  tools: "P3 Agent Orchestration",
  types: "P1 Runtime Core",
  upstreamproxy: "P4 Privacy + Local/Cloud",
  utils: "P1 Runtime Core",
  vim: "P2 Operator Surfaces",
  voice: "P4 Privacy + Local/Cloud",
  "commands.ts": "P2 Operator Surfaces",
  "context.ts": "P1 Runtime Core",
  "cost-tracker.ts": "P1 Runtime Core",
  "costHook.ts": "P1 Runtime Core",
  "dialogLaunchers.tsx": "P2 Operator Surfaces",
  "history.ts": "P1 Runtime Core",
  "ink.ts": "P2 Operator Surfaces",
  "interactiveHelpers.tsx": "P2 Operator Surfaces",
  "main.tsx": "P2 Operator Surfaces",
  "projectOnboardingState.ts": "P2 Operator Surfaces",
  "query.ts": "P1 Runtime Core",
  "QueryEngine.ts": "P1 Runtime Core",
  "replLauncher.tsx": "P2 Operator Surfaces",
  "setup.ts": "P1 Runtime Core",
  "Task.ts": "P3 Agent Orchestration",
  "tasks.ts": "P3 Agent Orchestration",
  "Tool.ts": "P3 Agent Orchestration",
  "tools.ts": "P3 Agent Orchestration",
};

const explicitMappings = {
  assistant: {
    targetPaths: ["src/assistant"],
    rationale: "Session and assistant state can stay close to upstream while remaining local-first.",
  },
  bootstrap: {
    targetPaths: ["src/bootstrap"],
    rationale: "Boot flow should stay compatible, then layer Solana services during initialization.",
  },
  bridge: {
    targetPaths: ["src/bridge", "src/gateway"],
    rationale: "Split generic remote bridge concerns from Solana-clawd gateway transports and event routing.",
  },
  buddy: {
    targetPaths: ["src/buddy"],
    rationale: "Buddy layer is already blockchain-native and should remain a Solana specialization rather than an upstream clone.",
  },
  coordinator: {
    targetPaths: ["src/coordinator", "src/agents"],
    rationale: "Coordinator behavior maps to upstream, while `src/agents` is the Solana-clawd specialization for role policy.",
  },
  query: {
    targetPaths: ["src/query", "src/engine"],
    rationale: "Generic query helpers stay in `src/query`; provider execution and permission/risk loops live in `src/engine`.",
  },
  remote: {
    targetPaths: ["src/remote", "src/server", "src/gateway"],
    rationale: "Privacy-first local/cloud mode requires remote transport to stay opt-in and separable from local execution.",
  },
  server: {
    targetPaths: ["src/server", "src/gateway"],
    rationale: "Server layer is preserved, with gateway additions for MCP, web, and Solana operator surfaces.",
  },
  services: {
    targetPaths: ["src/services", "src/memory", "src/monitor"],
    rationale: "Most services port directly; memory extraction and monitoring are split into Solana-specific subsystems.",
  },
  tasks: {
    targetPaths: ["src/tasks"],
    rationale: "Background task model is shared and should stay close to upstream interfaces.",
  },
  tools: {
    targetPaths: ["src/tools", "src/engine"],
    rationale: "Tool inventory ports directly; execution policy stays in Solana-clawd permission and risk layers.",
  },
  voice: {
    targetPaths: ["src/voice", "web/app/voice"],
    rationale: "Voice core remains local/cloud capable, with Solana-clawd surfacing it in both CLI and web.",
  },
  "QueryEngine.ts": {
    targetPaths: ["src/QueryEngine.ts", "src/engine/query-engine.ts"],
    rationale: "Keep compatibility shim plus runtime engine implementation for staged adaptation.",
  },
  "Tool.ts": {
    targetPaths: ["src/Tool.ts", "src/engine/tool-base.ts"],
    rationale: "Preserve upstream tool typing while enforcing Solana-clawd permission levels and schemas.",
  },
  "Task.ts": {
    targetPaths: ["src/Task.ts", "src/tasks"],
    rationale: "Retain task contracts while extending runtime task kinds for monitors and local workflows.",
  },
};

const solanaOnlyModules = [
  {
    key: "agents",
    targetPaths: ["src/agents"],
    rationale: "Built-in Solana research, OODA, scanner, monitor, and minting agents.",
  },
  {
    key: "engine",
    targetPaths: ["src/engine"],
    rationale: "Solana-clawd execution core: multi-LLM routing, permission engine, and risk engine.",
  },
  {
    key: "gateway",
    targetPaths: ["src/gateway"],
    rationale: "Privacy-preserving local/cloud transport bridge beyond upstream bridge abstractions.",
  },
  {
    key: "helius",
    targetPaths: ["src/helius"],
    rationale: "Helius RPC, DAS, webhooks, and streaming integrations.",
  },
  {
    key: "memory",
    targetPaths: ["src/memory"],
    rationale: "KNOWN / LEARNED / INFERRED extraction and consolidation.",
  },
  {
    key: "metaplex",
    targetPaths: ["src/metaplex"],
    rationale: "On-chain agent identity, minting, and wallet delegation.",
  },
  {
    key: "monitor",
    targetPaths: ["src/monitor"],
    rationale: "Solana market and wallet monitoring services.",
  },
  {
    key: "pump",
    targetPaths: ["src/pump"],
    rationale: "Pump.fun market scanner and bonding curve logic.",
  },
  {
    key: "shared",
    targetPaths: ["src/shared"],
    rationale: "Shared Solana-clawd message, model, and policy contracts.",
  },
  {
    key: "telegram",
    targetPaths: ["src/telegram"],
    rationale: "Telegram operator terminal for Solana trading and monitoring workflows.",
  },
];

function listTopLevel(root) {
  const dirents = fs.readdirSync(root, { withFileTypes: true });
  return {
    dirs: dirents
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
    files: dirents
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort(),
  };
}

function countTree(root) {
  let dirCount = 0;
  let fileCount = 0;

  function walk(current) {
    dirCount += 1;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        fileCount += 1;
      }
    }
  }

  walk(root);
  return { dirCount, fileCount };
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function existsRelative(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function buildUpstreamRows(topLevel) {
  const upstreamKeys = [...topLevel.dirs, ...topLevel.files];
  return upstreamKeys.map((key) => {
    const isDir = topLevel.dirs.includes(key);
    const directTarget = `src/${key}`;
    const mapping = explicitMappings[key];
    const targetPaths = mapping?.targetPaths ?? (existsRelative(directTarget) ? [directTarget] : []);
    const status =
      targetPaths.length === 0
        ? "missing"
        : targetPaths.length === 1 && targetPaths[0] === directTarget
          ? "present"
          : "adapted";

    return {
      key,
      kind: isDir ? "dir" : "file",
      phase: phaseByKey[key] ?? "P5 Review",
      status,
      targetPaths,
      rationale:
        mapping?.rationale ??
        (status === "present"
          ? "Top-level structure already exists in Solana-clawd."
          : "Needs a deliberate mapping before adaptation."),
    };
  });
}

function buildSummary(rows) {
  const counts = {
    present: 0,
    adapted: 0,
    missing: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}

function renderMarkdown({ upstreamStats, targetStats, rows, summary }) {
  const generatedAt = new Date().toISOString();
  const rowLines = rows
    .map((row) => {
      const targets = row.targetPaths.length > 0 ? row.targetPaths.map((value) => `\`${value}\``).join(", ") : "—";
      return `| \`${row.key}\` | ${row.kind} | ${row.status} | ${row.phase} | ${targets} | ${row.rationale} |`;
    })
    .join("\n");

  const solanaLines = solanaOnlyModules
    .map(
      (row) =>
        `| \`${row.key}\` | ${row.targetPaths.map((value) => `\`${value}\``).join(", ")} | ${row.rationale} |`,
    )
    .join("\n");

  return `# Claude Code -> Solana-Clawd Adaptation Report

Generated: ${generatedAt}

This report inventories the local upstream tree at \`claude-code-main 2/src\` and maps it onto the active Solana-clawd runtime in \`src/\`. The objective is not a blind fork. The objective is a privacy-first, Solana-native adaptation that preserves the mature Claude Code operator surface while routing blockchain, wallet, and agent execution through Solana-clawd subsystems.

## Inventory

| Tree | Top-level dirs | Top-level files | Total dirs | Total files |
| --- | ---: | ---: | ---: | ---: |
| Upstream Claude Code | ${rows.filter((row) => row.kind === "dir").length} | ${rows.filter((row) => row.kind === "file").length} | ${upstreamStats.dirCount} | ${upstreamStats.fileCount} |
| Solana-clawd runtime | — | — | ${targetStats.dirCount} | ${targetStats.fileCount} |

## Status Summary

- Present: ${summary.present}
- Adapted: ${summary.adapted}
- Missing: ${summary.missing}

## Upstream Mapping

| Upstream | Kind | Status | Phase | Solana-clawd target | Notes |
| --- | --- | --- | --- | --- | --- |
${rowLines}

## Solana-Only Runtime Modules

These modules have no direct upstream equivalent and should remain first-class Solana-clawd surfaces during adaptation.

| Module | Target path | Why it exists |
| --- | --- | --- |
${solanaLines}

## Recommended Execution Order

1. P1 Runtime Core
   Stabilize \`QueryEngine\`, state, context, memory, schemas, constants, and bootstrap behavior so upstream-compatible internals can land without destabilizing Solana services.
2. P2 Operator Surfaces
   Reconcile CLI, commands, Ink UI, components, output styles, and onboarding while preserving Solana-clawd branding and operator workflows.
3. P3 Agent Orchestration
   Port task, tool, service, plugin, and skill behaviors behind existing Solana-clawd permission and orchestration layers.
4. P4 Privacy + Local/Cloud
   Keep remote, bridge, server, voice, and upstream proxy behavior optional and privacy-first, with local execution as the default.
5. P5 Review
   Audit anything still marked missing before any broad copy-forward work.
`;
}

if (!fs.existsSync(upstreamRoot)) {
  throw new Error(`Missing upstream source tree: ${toPosixPath(path.relative(repoRoot, upstreamRoot))}`);
}

if (!fs.existsSync(targetRoot)) {
  throw new Error(`Missing target source tree: ${toPosixPath(path.relative(repoRoot, targetRoot))}`);
}

const upstreamTopLevel = listTopLevel(upstreamRoot);
const upstreamStats = countTree(upstreamRoot);
const targetStats = countTree(targetRoot);
const rows = buildUpstreamRows(upstreamTopLevel);
const summary = buildSummary(rows);

const markdown = renderMarkdown({ upstreamStats, targetStats, rows, summary });
const json = {
  generatedAt: new Date().toISOString(),
  upstreamRoot: "claude-code-main 2/src",
  targetRoot: "src",
  upstreamStats,
  targetStats,
  summary,
  rows,
  solanaOnlyModules,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(reportMdPath, markdown);
fs.writeFileSync(reportJsonPath, `${JSON.stringify(json, null, 2)}\n`);

console.log(`Wrote ${toPosixPath(path.relative(repoRoot, reportMdPath))}`);
console.log(`Wrote ${toPosixPath(path.relative(repoRoot, reportJsonPath))}`);
console.log(`Summary: ${summary.present} present, ${summary.adapted} adapted, ${summary.missing} missing`);
