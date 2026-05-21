#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 120_000);

const checks = [
  {
    label: "Node runtime",
    command: "node",
    args: ["--version"],
  },
  {
    label: "Repository check",
    command: "npm",
    args: ["run", "check"],
  },
  {
    label: "Repository build",
    command: "npm",
    args: ["run", "build"],
  },
  {
    label: "MCP build",
    command: "npm",
    args: ["run", "mcp:build"],
    requiredPath: "mcp/package.json",
  },
  {
    label: "Gateway build",
    command: "npm",
    args: ["--prefix", "gateway", "run", "build"],
    requiredPath: "gateway/package.json",
  },
  {
    label: "AMM typecheck",
    command: "npm",
    args: ["run", "amm:typecheck"],
    requiredPath: "amm/package.json",
  },
  {
    label: "AMM math tests",
    command: "npm",
    args: ["run", "amm:test"],
    requiredPath: "amm/package.json",
  },
  {
    label: "AMM build",
    command: "npm",
    args: ["run", "amm:build"],
    requiredPath: "amm/package.json",
  },
  {
    label: "AMM pools CLI",
    command: "node",
    args: ["amm/dist/cli.js", "pools", "SOL-PERP"],
    requiredPath: "amm/dist/cli.js",
  },
  {
    label: "AMM split route CLI",
    command: "node",
    args: ["amm/dist/cli.js", "route-split", "SOL-PERP", "long", "4000"],
    requiredPath: "amm/dist/cli.js",
  },
  {
    label: "TUI build",
    command: "npm",
    args: ["run", "tui:build"],
    requiredPath: "tui/package.json",
  },
];

function hasPath(relPath) {
  return existsSync(path.join(repoRoot, relPath));
}

function runCheck(check) {
  if (check.requiredPath && !hasPath(check.requiredPath)) {
    console.log(`[smoke] SKIP ${check.label}: missing ${check.requiredPath}`);
    return true;
  }

  console.log(`\n[smoke] ${check.label}`);
  console.log(`[smoke] $ ${check.command} ${check.args.join(" ")}`);

  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CI: process.env.CI ?? "1",
      NO_COLOR: process.env.NO_COLOR ?? "1",
    },
    stdio: "inherit",
    timeout: timeoutMs,
  });

  if (result.error) {
    console.error(`[smoke] FAIL ${check.label}: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`[smoke] FAIL ${check.label}: exit ${result.status}`);
    return false;
  }

  console.log(`[smoke] OK ${check.label}`);
  return true;
}

let ok = true;
for (const check of checks) {
  ok = runCheck(check) && ok;
}

if (!ok) {
  process.exit(1);
}

console.log("\n[smoke] README smoke path passed.");
