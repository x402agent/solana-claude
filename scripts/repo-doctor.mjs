#!/usr/bin/env node

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const mode = args.has("--build")
  ? "build"
  : args.has("--typecheck")
    ? "typecheck"
    : args.has("--lint")
      ? "lint"
      : "check";

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

function log(message) {
  process.stdout.write(`${message}\n`);
}

function run(label, command, commandArgs, options = {}) {
  log(`\n[repo-doctor] ${label}`);
  execFileSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options,
  });
}

function ensurePath(relPath) {
  if (!existsSync(path.join(repoRoot, relPath))) {
    throw new Error(`Required path missing: ${relPath}`);
  }
}

function hasPath(relPath) {
  return existsSync(path.join(repoRoot, relPath));
}

function ensureInstall(relPath, extraArgs = []) {
  const nodeModules = path.join(repoRoot, relPath, "node_modules");
  if (existsSync(nodeModules)) {
    return;
  }
  run(`install ${relPath}`, "npm", ["install", ...extraArgs], {
    cwd: path.join(repoRoot, relPath),
  });
}

function ensureNodeVersion() {
  if (nodeMajor < 20) {
    throw new Error(`Node 20+ required. Found ${process.version}.`);
  }

  if (nodeMajor > 24) {
    log(`[repo-doctor] warning: ${process.version} is newer than the supported Node 20/22/24 range.`);
  }
}

function runTypechecks(emit = false) {
  const tscArgs = emit ? [] : ["--noEmit"];
  const projects = [
    ["sdk", "sdk/tsconfig.json"],
    ["mcp", "mcp/tsconfig.json"],
    ["clawdrouter", "clawdrouter/tsconfig.json"],
    ["leviathan", "leviathan/tsconfig.json"],
    ["gateway", "gateway/tsconfig.json"],
  ];

  for (const [name, tsconfig] of projects) {
    if (hasPath(path.join(name, "package.json"))) {
      ensureInstall(name, ["--ignore-scripts", "--legacy-peer-deps"]);
    }
    run(`${emit ? "build" : "typecheck"} ${name}`, "npx", ["tsc", "-p", tsconfig, ...tscArgs]);
  }
}

function runWorkerChecks() {
  if (!hasPath("beepboop/worker/src/index.ts") || !hasPath("beepboop/convex/http.ts")) {
    log("\n[repo-doctor] skip BeepBoop worker checks; optional beepboop workspace is not present.");
    return;
  }

  ensureInstall("beepboop/worker", ["--ignore-scripts"]);
  ensureInstall("beepboop/convex");

  run(
    "verify Convex CLI",
    "./node_modules/.bin/convex",
    ["--help"],
    { cwd: path.join(repoRoot, "beepboop/convex") },
  );

  run(
    "verify Cloudflare worker dry-run",
    "./node_modules/.bin/wrangler",
    ["deploy", "--dry-run"],
    { cwd: path.join(repoRoot, "beepboop/worker") },
  );
}

function runRepoLint() {
  run("repo hygiene audit", "bash", ["scripts/repo-hygiene-audit.sh"]);
}

function main() {
  ensureNodeVersion();

  [
    "README.md",
    "STARTHERE.md",
    "SECURITY.md",
    ".env.example",
    "docs/REPO_MAP.md",
  ].forEach(ensurePath);

  if (mode === "lint") {
    runRepoLint();
    return;
  }

  if (mode === "typecheck") {
    runTypechecks(false);
    return;
  }

  if (mode === "build") {
    runTypechecks(true);
    runWorkerChecks();
    return;
  }

  runRepoLint();
  runTypechecks(false);
  runWorkerChecks();
}

main();
