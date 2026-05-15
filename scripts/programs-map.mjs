#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mapPath = resolve("data/programs-map.json");
const map = JSON.parse(readFileSync(mapPath, "utf8"));
const [command = "list", slug] = process.argv.slice(2);

function help() {
  return `Programs map

Usage:
  node scripts/programs-map.mjs list
  node scripts/programs-map.mjs show solana-ai-inference
  node scripts/programs-map.mjs json
`;
}

function list() {
  console.table(map.programs.map((program) => ({
    slug: program.slug,
    kind: program.kind,
    programId: program.programId ?? "N/A",
    status: program.status,
  })));
}

function show(name) {
  const program = map.programs.find((item) => item.slug === name || item.programId === name);
  if (!program) throw new Error(`Unknown program: ${name}`);
  console.log(JSON.stringify(program, null, 2));
}

try {
  if (command === "list") list();
  else if (command === "show") show(slug);
  else if (command === "json") console.log(JSON.stringify(map, null, 2));
  else if (command === "help" || command === "--help") console.log(help());
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(help());
  process.exit(1);
}
