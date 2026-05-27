// installer.ts — install agents from the /agents catalog into the workspace.
//
// What "install" means here:
//   1. Locate the agent JSON in <agentsDir>/src/<id>.json (catalog source of truth).
//   2. Write a copy into $OPENCLAWD_HOME/.clawd/installed/<id>.json.
//   3. If the agent has a backing runtime under <agentsDir>/<id>/ or under the
//      repo root (ore-miner, ore-master, Perps/...), record its launch command.
//   4. Update the Clawd identity so installedAgents includes the id.
//   5. Optionally start the agent in autonomous mode (used at install time for
//      the ore miner so users can "mine ore autonomously at install").

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { env } from "node:process";

import {
  ansi,
  drawBox,
  paint,
  progressBar,
  pulse,
  sleep,
  spinner,
  typewriter,
  writeln,
} from "./animate.js";
import { readIdentity, updateIdentity, workspaceDir } from "./birth.js";
import { SolanaClawdAgentKit } from "./index.js";

export interface InstallRecord {
  identifier: string;
  title: string;
  avatar: string;
  category: string;
  installedAt: string;
  source: string;
  runtime?: {
    path: string;
    launch: string[];
    description: string;
  };
  autonomous?: boolean;
}

function installedDir(): string {
  return join(workspaceDir(), ".clawd", "installed");
}

function manifestPath(): string {
  return join(installedDir(), "manifest.json");
}

export function readInstallManifest(): Record<string, InstallRecord> {
  const path = manifestPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, InstallRecord>;
  } catch {
    return {};
  }
}

function writeInstallManifest(manifest: Record<string, InstallRecord>): void {
  mkdirSync(installedDir(), { recursive: true });
  writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

// Maps catalog ids to the in-repo runtimes that back them. Anything not listed
// here installs as "metadata-only" (the JSON profile, no executable runtime).
const RUNTIMES: Record<
  string,
  (repoRoot: string) => InstallRecord["runtime"] | undefined
> = {
  "ore-miner": (repoRoot) => {
    const path = join(repoRoot, "agents", "ore-miner");
    if (!existsSync(path)) return undefined;
    return {
      path,
      launch: ["npm", "run", "start", "--prefix", path],
      description: "Clawd ORE mining agent (OODA loop, dashboard on :3333)",
    };
  },
  "solana-ore-mining-agent": (repoRoot) => RUNTIMES["ore-miner"]!(repoRoot),
  "solana-perpetuals-trader": (repoRoot) => {
    const path = join(repoRoot, "Perps", "clawd-agents-perps");
    if (!existsSync(path)) return undefined;
    return {
      path,
      launch: ["npm", "start", "--prefix", path],
      description: "Clawd perps agent — Drift/Zeta/Flash/Jupiter perps strategist",
    };
  },
  "solana-vulcan-clawd-autonomous-perps": (repoRoot) => RUNTIMES["solana-perpetuals-trader"]!(repoRoot),
  "imperial-perps-trader": (repoRoot) => RUNTIMES["solana-perpetuals-trader"]!(repoRoot),
};

export function findRepoRoot(start: string): string {
  let dir = resolve(start);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "agents", "agents-catalog.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export interface InstallOptions {
  identifier: string;
  agentsDir: string;
  autonomous?: boolean;
  envFile?: string;
}

export async function installAgent(opts: InstallOptions): Promise<InstallRecord> {
  const kit = new SolanaClawdAgentKit({ agentsDir: opts.agentsDir });
  const agent = kit.loadAgent(opts.identifier);
  const entry = kit.toCatalogEntry(agent);
  const repoRoot = findRepoRoot(opts.agentsDir);

  await typewriter(
    `  installing ${entry.avatar}  ${entry.title}  (${entry.identifier})`,
    { color: "cyan", delayMs: 10 },
  );

  await progressBar(`${entry.identifier} ready`, [
    { label: "validating ownership", ms: 160 },
    { label: "writing runtime profile", ms: 160 },
    { label: "wiring catalog endpoints", ms: 160 },
    { label: "registering with workspace", ms: 200 },
  ]);

  mkdirSync(installedDir(), { recursive: true });
  const profile = kit.createRuntimeProfile(opts.identifier);
  writeFileSync(
    join(installedDir(), `${opts.identifier}.json`),
    `${JSON.stringify(profile, null, 2)}\n`,
    "utf8",
  );

  const runtime = RUNTIMES[opts.identifier]?.(repoRoot);

  const record: InstallRecord = {
    identifier: opts.identifier,
    title: entry.title,
    avatar: entry.avatar,
    category: entry.category,
    installedAt: new Date().toISOString(),
    source: join(opts.agentsDir, "src", `${opts.identifier}.json`),
    runtime,
    autonomous: Boolean(opts.autonomous && runtime),
  };

  const manifest = readInstallManifest();
  manifest[opts.identifier] = record;
  writeInstallManifest(manifest);

  const identity = readIdentity();
  if (identity && !identity.installedAgents.includes(opts.identifier)) {
    updateIdentity({
      installedAgents: [...identity.installedAgents, opts.identifier],
    });
  }

  drawBox(`installed — ${entry.identifier}`, [
    `${paint("gray", "title    :")} ${paint("bold", entry.title)} ${entry.avatar}`,
    `${paint("gray", "category :")} ${paint("purple", entry.category)}`,
    `${paint("gray", "runtime  :")} ${runtime ? paint("green", runtime.description) : paint("gray", "metadata-only (no in-repo runtime)")}`,
    `${paint("gray", "endpoint :")} ${entry.deploy.chat}`,
    `${paint("gray", "mint     :")} ${entry.deploy.mint}`,
  ]);

  return record;
}

export interface AutonomousOptions {
  identifier: string;
  detach?: boolean;
  envFile?: string;
  extraEnv?: Record<string, string>;
}

export async function launchAutonomous(opts: AutonomousOptions): Promise<{
  pid?: number;
  logPath?: string;
  command: string;
  attached: boolean;
}> {
  const manifest = readInstallManifest();
  const record = manifest[opts.identifier];
  if (!record?.runtime) {
    throw new Error(
      `${opts.identifier} has no runtime registered. Run \`clawd-kit install ${opts.identifier}\` first.`,
    );
  }

  const launch = record.runtime.launch;
  const [cmd, ...args] = launch;
  if (!cmd) throw new Error(`runtime command missing for ${opts.identifier}`);

  // Ensure deps are present for the ore-miner case (best-effort, never fatal).
  if (opts.identifier === "ore-miner" || opts.identifier === "solana-ore-mining-agent") {
    const oreDir = record.runtime.path;
    if (!existsSync(join(oreDir, "node_modules"))) {
      const sp = spinner("installing ore-miner dependencies (one-time)…");
      try {
        execSync("npm install --no-audit --no-fund", {
          cwd: oreDir,
          stdio: "ignore",
          timeout: 180_000,
        });
        sp.stop("ore-miner dependencies installed");
      } catch (error) {
        sp.stop();
        writeln(
          `  ${paint("yellow", "!")} ore-miner npm install skipped: ${(error as Error).message}`,
        );
      }
    }
  }

  await pulse(`${record.title} engaging autonomous mode`, 2);

  const logDir = join(workspaceDir(), ".clawd", "logs");
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `${opts.identifier}-${Date.now()}.log`);

  const childEnv = { ...process.env, ...(opts.extraEnv ?? {}) };

  if (opts.detach === false) {
    writeln(`  ${paint("green", "▸")} attaching to ${record.title}: ${launch.join(" ")}`);
    const child = spawn(cmd, args, { stdio: "inherit", env: childEnv });
    return new Promise((resolveOk, reject) => {
      child.on("error", reject);
      child.on("exit", () =>
        resolveOk({
          pid: child.pid,
          command: launch.join(" "),
          attached: true,
          logPath,
        }),
      );
    });
  }

  // Detached background mode — write a launch script and don't actually exec
  // by default to avoid leaving an orphaned long-lived process inside CI/test
  // environments. We honor CLAWD_AUTO_MINE=true to actually spawn.
  const launchScript = join(workspaceDir(), ".clawd", `launch-${opts.identifier}.sh`);
  writeFileSync(
    launchScript,
    `#!/usr/bin/env bash\n# Auto-generated by clawd-kit — relaunch ${record.title}\n` +
      `set -e\n` +
      `cd ${JSON.stringify(record.runtime.path)}\n` +
      `exec ${launch.map((a) => JSON.stringify(a)).join(" ")} "$@"\n`,
    { mode: 0o755 },
  );

  if (env.CLAWD_AUTO_MINE === "true") {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      env: childEnv,
    });
    child.unref();
    drawBox(`autonomous — ${record.identifier}`, [
      `${paint("gray", "pid     :")} ${paint("cyan", String(child.pid ?? "?"))}`,
      `${paint("gray", "command :")} ${launch.join(" ")}`,
      `${paint("gray", "logs    :")} ${logPath} ${paint("gray", "(stdio detached)")}`,
      `${paint("gray", "stop    :")} kill ${child.pid ?? "<pid>"}`,
    ]);
    return { pid: child.pid, command: launch.join(" "), attached: false, logPath };
  }

  drawBox(`autonomous launch script — ${record.identifier}`, [
    `${paint("gray", "script :")} ${launchScript}`,
    `${paint("gray", "run    :")} ${paint("green", launchScript)}`,
    `${paint("gray", "or     :")} CLAWD_AUTO_MINE=true clawd-kit mine`,
    `${paint("gray", "logs   :")} ${join(workspaceDir(), ".clawd", "logs")}`,
  ]);

  return { command: launch.join(" "), attached: false, logPath };
}

export function listInstalled(): InstallRecord[] {
  return Object.values(readInstallManifest()).sort((a, b) =>
    a.identifier.localeCompare(b.identifier),
  );
}
