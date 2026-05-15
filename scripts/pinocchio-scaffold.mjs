#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const templatesRoot = resolve(repoRoot, "pinocchio/templates");
const args = parseArgs(process.argv.slice(2));

const command = process.argv[2]?.startsWith("--") ? "scaffold" : process.argv[2] ?? "help";

if (command === "list" || args.list) {
  for (const name of listTemplates()) console.log(name);
  process.exit(0);
}

if (command === "help" || args.help) {
  printHelp();
  process.exit(0);
}

const template = String(args.template ?? command);
const projectName = String(args.name ?? template);
const out = args.out ? resolve(String(args.out)) : resolve(process.cwd(), projectName);
const templatePath = resolve(templatesRoot, template);

if (!safePath(templatesRoot, templatePath) || !existsSync(templatePath)) {
  throw new Error(`unknown template: ${template}. Available: ${listTemplates().join(", ")}`);
}

if (existsSync(out) && !args.force) {
  throw new Error(`output already exists: ${out}. Use --force to overwrite files in place.`);
}

copyTemplate(templatePath, out, {
  project_name: projectName,
  crate_name: toCrateName(projectName),
});

console.log(`scaffolded ${template} -> ${relative(repoRoot, out) || out}`);

function copyTemplate(src, dest, replacements) {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyTemplate(join(src, entry), join(dest, entry), replacements);
    }
    return;
  }
  let text = readFileSync(src, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, text);
}

function listTemplates() {
  return readdirSync(templatesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = values[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function safePath(root, target) {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}/`);
}

function toCrateName(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "pinocchio_program";
}

function printHelp() {
  console.log(`Pinocchio scaffold

Usage:
  node scripts/pinocchio-scaffold.mjs list
  node scripts/pinocchio-scaffold.mjs --template vault --name my-vault --out ./programs/my-vault
  node scripts/pinocchio-scaffold.mjs escrow --name my-escrow --out ./programs/my-escrow

Options:
  --template  Template name: ${listTemplates().join(", ")}
  --name      Project name used in README and Cargo.toml
  --out       Output directory
  --force     Allow writing into an existing output directory
`);
}

