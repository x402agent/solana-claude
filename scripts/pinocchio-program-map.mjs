#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MAP_PATH = path.join(ROOT, "data", "pinocchio-programs.json");

function loadMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
}

function usage() {
  return `Pinocchio program map

Usage:
  node scripts/pinocchio-program-map.mjs list
  node scripts/pinocchio-program-map.mjs show token
  node scripts/pinocchio-program-map.mjs json
`;
}

function list(map) {
  const rows = map.programs.map((program) => ({
    slug: program.slug,
    crate: program.crate,
    kind: program.kind,
    status: program.status,
    instructions: program.primaryInstructions.length,
  }));
  console.table(rows);
}

function show(map, slug) {
  const program = map.programs.find((item) => item.slug === slug || item.crate === slug);
  if (!program) throw new Error(`Unknown Pinocchio program: ${slug}`);
  console.log(JSON.stringify(program, null, 2));
}

try {
  const map = loadMap();
  const [command = "list", slug] = process.argv.slice(2);
  if (command === "list") list(map);
  else if (command === "show") show(map, slug);
  else if (command === "json") console.log(JSON.stringify(map, null, 2));
  else if (command === "help" || command === "--help") console.log(usage());
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(usage());
  process.exit(1);
}
