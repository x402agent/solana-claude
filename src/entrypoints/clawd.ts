#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distRoot = path.resolve(__dirname, "..");
const packageRoot = path.resolve(distRoot, "..");

type CommandTarget = {
  label: string;
  file: string;
  args?: string[];
};

const COMMANDS: Record<string, CommandTarget> = {
  tui: {
    label: "OpenClawd HERMES terminal",
    file: path.join(packageRoot, "tui", "dist", "index.js"),
  },
  hermes: {
    label: "OpenClawd HERMES terminal",
    file: path.join(packageRoot, "tui", "dist", "index.js"),
  },
  terminal: {
    label: "OpenClawd HERMES terminal",
    file: path.join(packageRoot, "tui", "dist", "index.js"),
  },
  mcp: {
    label: "solana-clawd MCP stdio server",
    file: path.join(packageRoot, "mcp", "dist", "index.js"),
  },
  "mcp:http": {
    label: "solana-clawd MCP HTTP server",
    file: path.join(packageRoot, "mcp", "dist", "http.js"),
  },
};

function printHelp(): void {
  console.log(`
solana-clawd

Usage:
  clawd                 Start the HERMES terminal
  clawd tui             Start the HERMES terminal
  clawd mcp             Start the MCP stdio server
  clawd mcp:http        Start the MCP HTTP server
  clawd doctor          Verify local install assets
  clawd help            Show this help

Install:
  curl -fsSL https://install.solanaclawd.com | bash
  npm install -g solana-clawd
`);
}

function printDoctor(): number {
  const checks = [
    ["Root CLI", path.join(packageRoot, "dist", "entrypoints", "clawd.js")],
    ["TUI bundle", path.join(packageRoot, "tui", "dist", "index.js")],
    ["MCP stdio bundle", path.join(packageRoot, "mcp", "dist", "index.js")],
    ["MCP HTTP bundle", path.join(packageRoot, "mcp", "dist", "http.js")],
  ] as const;

  let failed = false;
  for (const [label, file] of checks) {
    const ok = existsSync(file);
    console.log(`${ok ? "OK" : "MISSING"}  ${label}: ${file}`);
    if (!ok) failed = true;
  }
  return failed ? 1 : 0;
}

async function runTarget(target: CommandTarget, passthroughArgs: string[]): Promise<number> {
  if (!existsSync(target.file)) {
    console.error(`Missing ${target.label} bundle at ${target.file}`);
    console.error("Reinstall the package or run `npm run build` from the repository root.");
    return 1;
  }

  const child = spawn(process.execPath, [target.file, ...(target.args ?? []), ...passthroughArgs], {
    stdio: "inherit",
    env: process.env,
  });

  return await new Promise<number>((resolve) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

async function main(): Promise<void> {
  const [command = "tui", ...rest] = process.argv.slice(2);

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "doctor") {
    process.exitCode = printDoctor();
    return;
  }

  const target = COMMANDS[command];
  if (!target) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  process.exitCode = await runTarget(target, rest);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
