#!/usr/bin/env node
// clawd-kit — design, validate, register, install, and animate Solana Clawd agents.
// (Complements `clawd-agent` from @openclawdsolana/clawd-tui, which does the
//  on-chain Metaplex mint via `clawd-agent mint` / `mint-free`.)
//
//   clawd-kit list [--category X] [--json] [--remote]
//   clawd-kit show <id>
//   clawd-kit new <id> [--title T] [--description D] [--category C] [--avatar A]
//   clawd-kit validate <id|--all>
//   clawd-kit register <id> --target metaplex|google [--out FILE] [--host URL]
//   clawd-kit birth [--name N] [--avatar A] [--auto]    # name your clawd
//   clawd-kit agents [--category C]                     # animated catalog
//   clawd-kit install <id> [--autonomous]               # install into workspace
//   clawd-kit mine [--detach] [--dry-run]               # install + run ore-miner
//   clawd-kit perps [--detach]                          # install + run perps agent
//   clawd-kit home                                      # show identity + installed

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { argv, cwd, env, exit, stderr, stdout } from "node:process";
import {
  createGoogleAgentCard,
  createRegistrationDocument,
} from "@solana-clawd/agent-registry";
import { SolanaClawdAgentKit } from "./index.js";
import type { SolanaClawdAgent } from "./index.js";
import {
  ansi,
  clawdBanner,
  convergence,
  drawBox,
  oreBoardDance,
  paint,
  progressBar,
  pulse,
  setAnimate,
  sleep,
  spinner,
  typewriter,
  writeln,
} from "./animate.js";
import {
  birthClawd,
  readIdentity,
  identityPath,
  workspaceDir,
  type ClawdIdentity,
} from "./birth.js";
import {
  installAgent,
  launchAutonomous,
  listInstalled,
  readInstallManifest,
} from "./installer.js";

const DEFAULT_HOST = "https://x402.wtf";

interface Flags {
  _: string[];
  [key: string]: string | boolean | string[];
}

function parseArgs(args: string[]): Flags {
  const flags: Flags = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      (flags._ as string[]).push(arg);
    }
  }
  return flags;
}

function findAgentsDir(override?: string): string {
  if (override) return resolve(override);
  if (env.SOLANA_CLAWD_AGENTS_DIR) return resolve(env.SOLANA_CLAWD_AGENTS_DIR);
  // Walk up from cwd looking for an agents/ dir with a catalog.
  let dir = cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "agents");
    if (existsSync(join(candidate, "agents-catalog.json"))) return candidate;
    if (existsSync(join(dir, "agents-catalog.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: the repo layout relative to this package.
  return resolve(new URL("../../../../agents", import.meta.url).pathname);
}

function log(line = ""): void {
  stdout.write(`${line}\n`);
}

function fail(message: string): never {
  stderr.write(`clawd-kit: ${message}\n`);
  exit(1);
}

function kitFor(flags: Flags): SolanaClawdAgentKit {
  return new SolanaClawdAgentKit({
    agentsDir: findAgentsDir(flags["agents-dir"] as string | undefined),
  });
}

function toRegistryInputs(kit: SolanaClawdAgentKit, agent: SolanaClawdAgent) {
  const entry = kit.toCatalogEntry(agent);
  return {
    agent: {
      identifier: agent.identifier,
      meta: agent.meta,
      createdAt: agent.createdAt,
    },
    catalogEntry: {
      title: entry.title,
      description: entry.description,
      tags: entry.tags,
      category: entry.category,
    },
  };
}

async function fetchRemoteCatalog(host: string): Promise<unknown> {
  const url = `${host.replace(/\/$/, "")}/api/agents/agents-catalog.json`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) fail(`remote catalog fetch failed: ${res.status}`);
  return res.json();
}

async function cmdList(flags: Flags): Promise<void> {
  const category = flags.category as string | undefined;
  let agents: Array<{ identifier: string; meta?: any; title?: string; category?: string }>;

  if (flags.remote) {
    const host = (flags.host as string) ?? DEFAULT_HOST;
    const catalog = (await fetchRemoteCatalog(host)) as { agents?: any[] };
    agents = (catalog.agents ?? []).map((a) => ({
      identifier: a.identifier,
      title: a.title,
      category: a.category,
    }));
  } else {
    agents = kitFor(flags)
      .listAgents()
      .map((a) => ({
        identifier: a.identifier,
        title: a.meta.title,
        category: a.meta.category,
      }));
  }

  if (category) agents = agents.filter((a) => a.category === category);

  if (flags.json) {
    log(JSON.stringify(agents, null, 2));
    return;
  }
  log(`Solana Clawd agents (${agents.length})`);
  for (const a of agents) {
    log(`  ${a.identifier.padEnd(34)} ${a.category ?? ""}  ${a.title ?? ""}`);
  }
}

function cmdShow(flags: Flags): void {
  const id = (flags._ as string[])[1];
  if (!id) fail("usage: clawd-kit show <id>");
  const kit = kitFor(flags);
  const agent = kit.loadAgent(id);
  const entry = kit.toCatalogEntry(agent);
  log(`${agent.meta.avatar ?? "🤖"}  ${entry.title}  (${entry.identifier})`);
  log(`author:   ${entry.author}`);
  log(`category: ${entry.category}`);
  log(`tags:     ${entry.tags.join(", ")}`);
  log(`\n${entry.description}\n`);
  log("endpoints:");
  for (const [k, v] of Object.entries(entry.deploy)) log(`  ${k.padEnd(13)} ${v}`);
}

function cmdNew(flags: Flags): void {
  const id = (flags._ as string[])[1];
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    fail("usage: clawd-kit new <kebab-id>  (lowercase letters, digits, dashes)");
  }
  const kit = kitFor(flags);
  const target = join(kit.srcDir, `${id}.json`);
  if (existsSync(target)) fail(`agent already exists: ${target}`);

  const title = (flags.title as string) ?? id.replace(/-/g, " ");
  const description = (flags.description as string) ?? `Solana Clawd ${title} agent`;
  const category = (flags.category as string) ?? "defi";
  const avatar = (flags.avatar as string) ?? "🦞";

  const agent: SolanaClawdAgent = {
    author: "solana-clawd",
    identifier: id,
    schemaVersion: 1,
    createdAt: new Date().toISOString().slice(0, 10),
    homepage: `https://solanaclawd.com/agents/${id}`,
    meta: {
      title,
      description,
      avatar,
      category,
      tags: ["clawd", "solana-clawd", "solana", category],
    },
    config: {
      systemRole:
        `You are ${title}, a specialist inside Solana Clawd — a Solana-native AI agent stack served at https://x402.wtf/agents.\n\n` +
        "Edit this systemRole to define the agent's expertise, workflow, and output contract. " +
        "Stay Solana-native, deny-first on signatures, and never give financial advice without a risk disclaimer.",
      openingMessage: `${avatar} ${title} — how can I help?`,
      openingQuestions: [],
    },
  };

  writeFileSync(target, `${JSON.stringify(agent, null, 2)}\n`, "utf8");
  kit.assertSolanaClawdAgent(agent);
  log(`Created ${target}`);
  log("Next: edit config.systemRole, then `clawd-kit validate " + id + "`");
}

function cmdValidate(flags: Flags): void {
  const kit = kitFor(flags);
  const ids = flags.all
    ? kit.listAgents().map((a) => a.identifier)
    : [(flags._ as string[])[1]].filter(Boolean) as string[];
  if (ids.length === 0) fail("usage: clawd-kit validate <id> | --all");

  let ok = 0;
  for (const id of ids) {
    try {
      const agent = kit.loadAgent(id);
      kit.assertSolanaClawdAgent(agent);
      ok++;
      if (!flags.all) log(`OK  ${id} is a valid Solana Clawd agent`);
    } catch (error) {
      fail(`${id}: ${(error as Error).message}`);
    }
  }
  if (flags.all) log(`OK  ${ok} agents validated`);
}

function cmdRegister(flags: Flags): void {
  const id = (flags._ as string[])[1];
  const target = flags.target as string | undefined;
  if (!id || (target !== "metaplex" && target !== "google")) {
    fail("usage: clawd-kit register <id> --target metaplex|google [--out FILE] [--host URL]");
  }
  const kit = kitFor(flags);
  const agent = kit.loadAgent(id);
  const { agent: regAgent, catalogEntry } = toRegistryInputs(kit, agent);
  const host = (flags.host as string) ?? DEFAULT_HOST;

  const doc =
    target === "metaplex"
      ? createRegistrationDocument(regAgent, catalogEntry, { host })
      : createGoogleAgentCard(regAgent, catalogEntry, { host });

  const json = JSON.stringify(doc, null, 2);
  if (flags.out) {
    writeFileSync(flags.out as string, `${json}\n`, "utf8");
    log(`Wrote ${target} registration for ${id} -> ${flags.out}`);
  } else {
    log(json);
  }
}

async function cmdBirth(flags: Flags): Promise<void> {
  const identity = await birthClawd({
    name: (flags.name as string) ?? undefined,
    avatar: (flags.avatar as string) ?? undefined,
    pronoun: (flags.pronoun as ClawdIdentity["pronoun"]) ?? undefined,
    shellColor: (flags["shell-color"] as string) ?? undefined,
    auto: Boolean(flags.auto),
    rename: Boolean(flags.rename),
    autoMine: Boolean(flags["auto-mine"]),
    perpsEnabled: Boolean(flags["with-perps"]),
  });
  if (flags.json) {
    log(JSON.stringify(identity, null, 2));
  }
}

async function cmdAgentsCatalog(flags: Flags): Promise<void> {
  const kit = kitFor(flags);
  const agents = kit.listAgents();
  const category = flags.category as string | undefined;

  await clawdBanner();
  writeln("");
  await typewriter(
    `  /agents catalog — ${agents.length} Solana Clawd agents ready to install`,
    { color: "cyan", delayMs: 10 },
  );
  writeln("");

  const filtered = category
    ? agents.filter((a) => a.meta.category === category)
    : agents;

  const featured = ["ore-miner", "solana-perpetuals-trader", "solana-vulcan-clawd-autonomous-perps", "imperial-perps-trader"];
  const featuredAgents = filtered.filter((a) => featured.includes(a.identifier));
  const rest = filtered.filter((a) => !featured.includes(a.identifier));

  if (featuredAgents.length > 0) {
    writeln(`  ${paint("bold", "★ FEATURED — install at birth")}`);
    for (const agent of featuredAgents) {
      const avatar = agent.meta.avatar ?? "🤖";
      const title = agent.meta.title ?? agent.identifier;
      const desc = agent.meta.description ?? "";
      writeln(
        `    ${avatar}  ${paint("green", agent.identifier.padEnd(40))} ${paint("purple", title)}`,
      );
      if (desc) writeln(`        ${paint("gray", desc.slice(0, 96))}`);
      if (!flags.fast) await sleep(40);
    }
    writeln("");
  }

  writeln(`  ${paint("bold", "/agents catalog")}  ${paint("gray", `(${rest.length})`)}`);
  for (const agent of rest) {
    const avatar = agent.meta.avatar ?? "🤖";
    const id = agent.identifier;
    const cat = agent.meta.category ?? "defi";
    const title = agent.meta.title ?? id;
    writeln(
      `    ${avatar}  ${id.padEnd(40)} ${paint("gray", cat.padEnd(12))} ${title}`,
    );
  }

  writeln("");
  writeln(`  ${paint("cyan", "▸")} install one: ${paint("green", "clawd-kit install <id>")}`);
  writeln(`  ${paint("cyan", "▸")} mine now:    ${paint("green", "clawd-kit mine")}`);
  writeln(`  ${paint("cyan", "▸")} perps now:   ${paint("green", "clawd-kit perps")}`);
}

async function cmdInstall(flags: Flags): Promise<void> {
  const id = (flags._ as string[])[1];
  if (!id) fail("usage: clawd-kit install <id> [--autonomous]");
  const kit = kitFor(flags);
  await installAgent({
    identifier: id,
    agentsDir: kit.agentsDir,
    autonomous: Boolean(flags.autonomous),
  });
  if (flags.autonomous) {
    await launchAutonomous({
      identifier: id,
      detach: !flags.attach,
    });
  }
}

async function cmdMine(flags: Flags): Promise<void> {
  const id = "ore-miner";
  const kit = kitFor(flags);
  const identity = readIdentity();

  await clawdBanner(identity?.name);
  writeln("");
  await typewriter(
    `  ⛏  ${identity ? identity.name : "Clawd"} is heading to the ORE motherlode.`,
    { color: "purple", delayMs: 14 },
  );
  writeln("");

  await installAgent({
    identifier: id,
    agentsDir: kit.agentsDir,
    autonomous: true,
  });
  await oreBoardDance(1600);
  const result = await launchAutonomous({
    identifier: id,
    detach: !flags.attach,
    extraEnv: flags["dry-run"] ? { DRY_RUN: "true" } : {},
  });
  writeln("");
  writeln(`  ${paint("green", "▸")} ${paint("bold", "mine command:")} ${paint("cyan", result.command)}`);
  if (result.attached) {
    writeln(`  ${paint("gray", "(running attached — Ctrl+C to stop)")}`);
  }
}

async function cmdPerps(flags: Flags): Promise<void> {
  const candidates = [
    "solana-vulcan-clawd-autonomous-perps",
    "imperial-perps-trader",
    "solana-perpetuals-trader",
  ];
  const kit = kitFor(flags);
  const available = candidates.find((id) =>
    existsSync(join(kit.srcDir, `${id}.json`)),
  );
  if (!available) fail("no perps agent found in catalog");

  const identity = readIdentity();
  await clawdBanner(identity?.name);
  writeln("");
  await typewriter(
    `  📊  ${identity ? identity.name : "Clawd"} entering Phoenix perps mode.`,
    { color: "magenta", delayMs: 14 },
  );
  writeln("");
  await installAgent({
    identifier: available,
    agentsDir: kit.agentsDir,
    autonomous: true,
  });
  await launchAutonomous({
    identifier: available,
    detach: !flags.attach,
  });
}

function cmdHome(flags: Flags): void {
  const identity = readIdentity();
  const manifest = readInstallManifest();
  const installed = listInstalled();

  if (!identity) {
    log(`${paint("yellow", "!")} no Clawd identity yet — run \`clawd-kit birth\` to name yours.`);
    return;
  }

  drawBox(`Clawd home — ${identity.name}`, [
    `${paint("gray", "avatar    :")} ${identity.avatar}`,
    `${paint("gray", "generation:")} ${paint("cyan", String(identity.generation))}`,
    `${paint("gray", "born      :")} ${identity.bornAt}`,
    `${paint("gray", "shell     :")} ${paint("purple", identity.shellColor)}`,
    `${paint("gray", "workspace :")} ${identity.workspace}`,
    `${paint("gray", "identity  :")} ${identityPath()}`,
    `${paint("gray", "auto-mine :")} ${identity.autoMine ? paint("green", "on") : paint("gray", "off")}`,
    `${paint("gray", "perps     :")} ${identity.perpsEnabled ? paint("green", "on") : paint("gray", "off")}`,
  ]);

  writeln("");
  writeln(`  ${paint("bold", "installed agents")} ${paint("gray", `(${installed.length})`)}`);
  if (installed.length === 0) {
    writeln(`    ${paint("gray", "none yet — try `clawd-kit install ore-miner`")}`);
    return;
  }
  for (const record of installed) {
    const runtime = record.runtime
      ? paint("green", "runtime")
      : paint("gray", "metadata-only");
    writeln(
      `    ${record.avatar}  ${paint("cyan", record.identifier.padEnd(40))} ${runtime}  ${paint("gray", record.installedAt)}`,
    );
  }
  void flags;
  void manifest;
}

function usage(): void {
  log("clawd-kit — design, validate, install, mine, register Solana Clawd agents\n");
  log("Catalog:");
  log("  agents [--category X]                  animated /agents catalog");
  log("  list [--category X] [--json] [--remote] [--host URL]");
  log("  show <id>");
  log("");
  log("Authoring:");
  log("  new <id> [--title T] [--description D] [--category C] [--avatar A]");
  log("  validate <id> | --all");
  log("  register <id> --target metaplex|google [--out FILE] [--host URL]");
  log("");
  log("Lifecycle:");
  log("  birth [--name N] [--avatar A] [--auto]   name your Clawd at birth");
  log("  install <id> [--autonomous] [--attach]   install agent from /agents");
  log("  mine   [--dry-run] [--attach]            install + run ore-miner");
  log("  perps  [--attach]                        install + run perps agent");
  log("  home                                     show identity + installed agents");
  log("");
  log("Global: --agents-dir DIR  (or SOLANA_CLAWD_AGENTS_DIR)  --no-animate");
  log("On-chain mint: `clawd-agent mint` / `clawd-agent mint-free` (clawd-tui)");
  log("Docs: https://x402.wtf/agents/mint");
}

async function main(): Promise<void> {
  const flags = parseArgs(argv.slice(2));
  if (flags["no-animate"] || env.CLAWD_NO_ANIMATE === "1") setAnimate(false);
  const command = (flags._ as string[])[0];
  switch (command) {
    case "list":
      await cmdList(flags);
      break;
    case "show":
      cmdShow(flags);
      break;
    case "new":
      cmdNew(flags);
      break;
    case "validate":
      cmdValidate(flags);
      break;
    case "register":
      cmdRegister(flags);
      break;
    case "birth":
      await cmdBirth(flags);
      break;
    case "agents":
    case "catalog":
      await cmdAgentsCatalog(flags);
      break;
    case "install":
      await cmdInstall(flags);
      break;
    case "mine":
      await cmdMine(flags);
      break;
    case "perps":
      await cmdPerps(flags);
      break;
    case "home":
    case "whoami":
      cmdHome(flags);
      break;
    case undefined:
    case "help":
    case "--help":
      usage();
      break;
    default:
      fail(`unknown command: ${command} (try \`clawd-kit help\`)`);
  }
}

main().catch((error) => fail((error as Error).message));
