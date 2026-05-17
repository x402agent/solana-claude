#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const repoRoot = resolve(root, "..");
const agentsDir = resolve(
  process.env.SOLANA_CLAWD_AGENTS_DIR ?? join(repoRoot, "agents"),
);
const packagesDir = join(root, "packages");
const requiredAgentFiles = [
  "agent-template.json",
  "agent-template-full.json",
  "agent-template-attested.json",
  "agents-catalog.json",
  "agents-manifest.json",
];

const failures = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`Invalid JSON: ${path} (${error.message})`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const workspacePackage = readJson(join(root, "package.json"));
assert(
  workspacePackage?.name === "@solana-clawd/agent-kit-workspace",
  "Workspace package must be @solana-clawd/agent-kit-workspace.",
);

for (const name of readdirSync(packagesDir)) {
  const packageJsonPath = join(packagesDir, name, "package.json");
  if (!existsSync(packageJsonPath)) continue;
  const pkg = readJson(packageJsonPath);
  assert(
    typeof pkg?.name === "string" && pkg.name.startsWith("@solana-clawd/"),
    `Package ${name} must use the @solana-clawd/* scope.`,
  );
  assert(
    !String(pkg?.name ?? "").includes("solana-agent-kit"),
    `Package ${name} still references upstream solana-agent-kit naming.`,
  );
}

for (const file of requiredAgentFiles) {
  const path = join(agentsDir, file);
  assert(existsSync(path), `Missing agents integration file: ${path}`);
  if (existsSync(path)) readJson(path);
}

const catalog = readJson(join(agentsDir, "agents-catalog.json"));
assert(Array.isArray(catalog?.agents), "agents-catalog.json must contain agents[].");

const srcDir = join(agentsDir, "src");
assert(existsSync(srcDir), `Missing agents source directory: ${srcDir}`);
const sourceAgents = existsSync(srcDir)
  ? readdirSync(srcDir).filter((file) => file.endsWith(".json"))
  : [];
assert(sourceAgents.length > 0, "agents/src must contain Solana Clawd agent JSON files.");

for (const filename of sourceAgents.slice(0, 10)) {
  const agent = readJson(join(srcDir, filename));
  assert(typeof agent?.identifier === "string", `${filename} is missing identifier.`);
  assert(typeof agent?.config?.systemRole === "string", `${filename} is missing config.systemRole.`);
  assert(typeof agent?.meta?.title === "string", `${filename} is missing meta.title.`);
}

const agentsPackage = readJson(join(agentsDir, "package.json"));
assert(
  agentsPackage?.dependencies?.["@solana-clawd/agent-kit"]?.startsWith("file:"),
  "agents/package.json must depend on the local @solana-clawd/agent-kit package.",
);
assert(
  agentsPackage?.dependencies?.["@solana-clawd/agent-registry"]?.startsWith("file:"),
  "agents/package.json must depend on the local @solana-clawd/agent-registry package.",
);

if (failures.length > 0) {
  console.error("Solana Clawd agent-kit validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Solana Clawd agent-kit validation passed.");
console.log(`packages: ${readdirSync(packagesDir).length}`);
console.log(`agents: ${sourceAgents.length}`);
