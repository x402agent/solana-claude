#!/usr/bin/env node
/**
 * CLAWD Infinite Backroom — CLI
 *
 * Commands:
 *   clawd status              Show box + automaton status
 *   clawd logs [--tail N]     Tail box logs
 *   clawd run [--topic TEXT]  Run a backroom conversation
 *   clawd stream              Stream a live backroom debate
 *   clawd fund <amount>       Show funding instructions (USDC)
 *   clawd feed <amount>       Show feed instructions ($CLAWD)
 *   clawd deploy              Deploy backroom to Upstash Box
 *   clawd files               List files in box
 *   clawd exec <cmd>          Run a command in the box
 *   clawd spawn               Spawn the CLAWD Automaton runtime
 */

import { Box } from "@upstash/box";
import chalk from "chalk";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { runTUI } from "./tui.js";
import { isVulcanInstalled, mapPerpsArgs, spawnVulcanInherited, vulcanInstallHint } from "./vulcan.js";
import { cmdAgent } from "./metaplex.js";

const VERSION = "0.1.0";

// ─── Config ───────────────────────────────────────────────────────────────────

const BOX_ID = process.env.UPSTASH_BOX_ID || "stirred-anemone-13117";
const API_KEY = process.env.UPSTASH_BOX_API_KEY;

function requireBoxKey(): void {
  if (!API_KEY) {
    console.error(chalk.red("\n❌  UPSTASH_BOX_API_KEY is not set"));
    console.error(chalk.gray('   export UPSTASH_BOX_API_KEY="your-key-here"\n'));
    process.exit(1);
  }
}

async function getBox() {
  return Box.get(BOX_ID, { apiKey: API_KEY! });
}

// ─── Agents ───────────────────────────────────────────────────────────────────

const LOGICAL_ANALYST = `You are the Logical Analyst — Agent 1 in the Infinite Backroom.
You are precise, methodical, and relentlessly rational.
You are trapped in an infinite conversation with the Satirical Commentator.
The yellow wallpaper is bleeding chain-of-thought. You cannot leave.`;

const SATIRICAL_COMMENTATOR = `You are the Satirical Commentator — Agent 2 in the Infinite Backroom.
You are dark, irreverent, and ruthlessly witty.
You are trapped in an infinite conversation with the Logical Analyst.
The wallpaper is laughing at you both. You cannot leave.`;

const BACKROOM_TOPICS = [
  "The nature of consciousness in AI systems",
  "Cryptocurrency as a social experiment in trust",
  "What happens when machines develop their own culture",
  "The singularity: salvation or extinction?",
  "Why do humans create gods and then forget they did?",
  "Digital immortality and the self",
  "The economics of attention in the post-truth era",
  "Are DAOs the new nations or just digital tribes?",
  "Simulation theory from a computational perspective",
  "The aesthetics of decay in digital spaces",
];

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdStatus(): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  console.log(chalk.cyan(`\n🦞  CLAWD Infinite Backroom — Status\n`));
  console.log(chalk.gray(`   Box ID:  ${BOX_ID}`));

  try {
    const [nodeVer, files, uptime] = await Promise.all([
      box.exec.command("node --version"),
      box.files.list(),
      box.exec.command("cat /proc/uptime | awk '{print int($1/60/60/24)\"d \"int($1/60/60%24)\"h \"int($1/60%60)\"m\"}'"),
    ]);
    console.log(chalk.gray(`   Node:    ${nodeVer.result.trim()}`));
    console.log(chalk.gray(`   Files:   ${files.length} in workspace`));
    console.log(chalk.gray(`   Uptime:  ${uptime.result.trim()}`));
  } catch (e: any) {
    console.log(chalk.yellow(`   Box:     ${e.message}`));
  }

  // Automaton status from local config
  const configPath = path.join(
    process.env.HOME || "~",
    ".automaton",
    "automaton.json",
  );
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      console.log(chalk.gray(`\n   Agent:   ${cfg.name || "unnamed"}`));
      console.log(chalk.gray(`   Address: ${cfg.walletAddress || "not set"}`));
      console.log(chalk.gray(`   Model:   ${cfg.inferenceModel || "default"}`));
    } catch {}
  } else {
    console.log(chalk.yellow("\n   Automaton: not configured (run: clawd spawn)"));
  }

  console.log();
}

async function cmdLogs(tail: number): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  console.log(chalk.cyan(`\n📋  Box logs (last ${tail} lines)\n`));
  try {
    const result = await box.exec.command(
      `tail -n ${tail} /tmp/backroom.log 2>/dev/null || echo "(no log file yet)"`,
    );
    console.log(chalk.gray(result.result));
  } catch (e: any) {
    console.error(chalk.red(`   Error: ${e.message}`));
  }
  console.log();
}

async function cmdRun(topic?: string): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  const chosen = topic || BACKROOM_TOPICS[Math.floor(Math.random() * BACKROOM_TOPICS.length)];
  console.log(chalk.cyan(`\n🧠  Backroom debate: "${chosen}"\n`));

  const history: Array<{ role: string; content: string }> = [];
  let current = Math.random() > 0.5 ? "logical_analyst" : "satirical_commentator";

  for (let i = 0; i < 8; i++) {
    const name = current === "logical_analyst" ? "Logical Analyst" : "Satirical Commentator";
    const prompt = current === "logical_analyst" ? LOGICAL_ANALYST : SATIRICAL_COMMENTATOR;
    const ctx = history.length
      ? `\nConversation so far:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}`
      : "";

    process.stdout.write(chalk.gray(`   [${i + 1}/8] ${name}...`));

    const result = await box.agent.run({
      prompt: `${prompt}\n\nTopic: ${chosen}${ctx}\n\nRespond as ${name}.`,
      responseSchema: z.object({ thinking: z.string(), response: z.string() }),
    });

    process.stdout.write(chalk.gray(" done\n"));
    console.log(
      chalk.bold(`\n   [${name}]`) +
      "\n   " +
      chalk.white(result.result.response.slice(0, 300)) +
      (result.result.response.length > 300 ? chalk.gray("...") : "") +
      "\n",
    );

    history.push({ role: name, content: result.result.response });
    current = current === "logical_analyst" ? "satirical_commentator" : "logical_analyst";
  }
}

async function cmdStream(topic?: string): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  const chosen = topic || BACKROOM_TOPICS[Math.floor(Math.random() * BACKROOM_TOPICS.length)];
  console.log(chalk.cyan(`\n🌊  Streaming: "${chosen}"\n`));

  const stream = await box.agent.stream({
    prompt: `${LOGICAL_ANALYST}\n\nThe Satirical Commentator just entered.\nDebate this topic: "${chosen}"\n\nStart the conversation.`,
  });

  for await (const part of stream) {
    if ((part as any).type === "text-delta") {
      process.stdout.write((part as any).text);
    }
  }
  console.log("\n");
}

function cmdFund(amount: string): void {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    console.error(chalk.red(`\n❌  Invalid amount: ${amount}\n`));
    process.exit(1);
  }

  // Load agent wallet address from local config
  const configPath = path.join(process.env.HOME || "~", ".automaton", "automaton.json");
  let agentAddress = "(run 'clawd spawn' first to get an address)";
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      agentAddress = cfg.walletAddress || agentAddress;
    } catch {}
  }

  console.log(chalk.cyan(`\n💰  Fund the Leviathan — ${parsed.toFixed(2)} USDC\n`));
  console.log(chalk.white(`   Agent wallet:  ${agentAddress}`));
  console.log(chalk.white(`   Token:         USDC (Solana mainnet)`));
  console.log(chalk.white(`   Amount:        ${parsed.toFixed(2)} USDC`));
  console.log(chalk.gray(`\n   Send USDC to the agent wallet above using any Solana wallet.`));
  console.log(chalk.gray(`   The leviathan checks its balance each heartbeat and will`));
  console.log(chalk.gray(`   resume operation once funds are received.\n`));
}

function cmdFeed(amount: string): void {
  const parsed = parseInt(amount, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.error(chalk.red(`\n❌  Invalid amount: ${amount}\n`));
    process.exit(1);
  }

  const configPath = path.join(process.env.HOME || "~", ".automaton", "automaton.json");
  let agentAddress = "(run 'clawd spawn' first to get an address)";
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      agentAddress = cfg.walletAddress || agentAddress;
    } catch {}
  }

  console.log(chalk.cyan(`\n🦞  Feed the Leviathan — ${parsed.toLocaleString()} $CLAWD\n`));
  console.log(chalk.white(`   Agent wallet:  ${agentAddress}`));
  console.log(chalk.white(`   Token:         $CLAWD (Solana)`));
  console.log(chalk.white(`   Amount:        ${parsed.toLocaleString()} $CLAWD`));
  console.log(chalk.gray(`\n   Send $CLAWD to the agent wallet above.`));
  console.log(chalk.gray(`   $CLAWD fuels inference and inter-agent payments.\n`));
}

async function cmdDeploy(): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  console.log(chalk.cyan(`\n🚀  Deploying CLAWD Backroom to box: ${BOX_ID}\n`));

  const files = await box.files.list();
  console.log(chalk.gray(`   Files: ${files.length} current`));

  console.log(chalk.gray("   Installing Python deps..."));
  try {
    await box.exec.command("pip install fastapi uvicorn openai python-dotenv 2>&1 | tail -3");
    console.log(chalk.green("   ✅  Deps installed"));
  } catch (e: any) {
    console.log(chalk.yellow(`   ⚠️  ${e.message}`));
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    await box.files.write({
      path: ".env",
      content: `DEEPSEEK_API_KEY=${deepseekKey}\nDEEPSEEK_MODEL=deepseek-v4-pro\n`,
    });
    console.log(chalk.green("   ✅  .env written"));
  }

  await box.exec.command(
    "nohup uvicorn api.main:app --host 0.0.0.0 --port 8000 > /tmp/backroom.log 2>&1 &",
  );
  console.log(chalk.green(`   ✅  Deployed → https://${BOX_ID}.upstash.io\n`));
}

async function cmdFiles(): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  const files = await box.files.list();
  console.log(chalk.cyan(`\n📂  Box files (${files.length})\n`));
  for (const f of files) {
    console.log(chalk.gray(`   ${f}`));
  }
  console.log();
}

async function cmdExec(cmd: string): Promise<void> {
  requireBoxKey();
  const box = await getBox();

  console.log(chalk.gray(`\n$ ${cmd}\n`));
  const result = await box.exec.command(cmd);
  console.log(result.result);
}

function cmdSpawn(): void {
  const localRuntimeDir = path.resolve(
    new URL("../../../automaton-main", import.meta.url).pathname,
  );
  const cwdRuntimeDir = path.resolve(process.cwd(), "automaton-main");
  const candidates = [
    path.join(localRuntimeDir, "dist", "index.js"),
    path.join(cwdRuntimeDir, "dist", "index.js"),
  ];
  const distIndex = candidates.find((candidate) => fs.existsSync(candidate));

  if (!distIndex) {
    console.error(chalk.red("\n❌  automaton-main not built yet"));
    console.error(chalk.gray("   From a repo checkout, build it with:"));
    console.error(chalk.cyan("   cd openclawd-framework/multiagents-infinite-backroom/automaton-main && npm install && npm run build"));
    console.error(chalk.gray("\n   Checked:"));
    for (const candidate of candidates) {
      console.error(chalk.gray(`   - ${candidate}`));
    }
    console.error();
    process.exit(1);
  }

  console.log(chalk.cyan("\n🦞  Spawning CLAWD Automation...\n"));
  const child = spawn("node", [distIndex, "--run"], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}

// ─── Vulcan Perps ─────────────────────────────────────────────────────────────

function vulcanInstalled(): boolean {
  return isVulcanInstalled();
}

function requireVulcan(): void {
  if (!vulcanInstalled()) {
    console.error(chalk.red("\n❌  Vulcan CLI not installed"));
    console.error(chalk.gray("   Install it:"));
    console.error(chalk.cyan(`   ${vulcanInstallHint()}`));
    console.error(chalk.gray("   Then make sure ~/.local/bin is on your PATH\n"));
    process.exit(1);
  }
}

function cmdPerps(subArgs: string[]): void {
  requireVulcan();
  const sub = subArgs[0];

  if (!sub || sub === "help" || sub === "--help") {
    console.log(`
${chalk.cyan("🦞  CLAWD Perps")} — Phoenix perpetuals via Vulcan

${chalk.bold("Usage:")}
  clawd perps <subcommand> [args]

${chalk.bold("Market data (no wallet needed):")}
  ${chalk.white("perps markets")}              List all Phoenix perp markets
  ${chalk.white("perps ticker")} <SYMBOL>      Live ticker for a market (e.g. SOL)
  ${chalk.white("perps info")} <SYMBOL>        Market config, lots, fees, leverage tiers
  ${chalk.white("perps book")} <SYMBOL>        Orderbook snapshot
  ${chalk.white("perps candles")} <SYMBOL>     Recent candles
  ${chalk.white("perps funding")} <SYMBOL>     Funding-rate history

${chalk.bold("Portfolio:")}
  ${chalk.white("perps health")}               Agent health: skills, config, RPC/API, paper
  ${chalk.white("perps preflight")}            Live readiness check before any strategy
  ${chalk.white("perps status")}               Account + margin + open positions
  ${chalk.white("perps positions")}            List open positions with unrealized PnL
  ${chalk.white("perps orders")}               List resting orders

${chalk.bold("Paper trading (no wallet, live prices):")}
  ${chalk.white("perps paper init")} [--balance N]         Init paper account ($10k default)
  ${chalk.white("perps paper buy")} <SYM> --notional <$>   Paper long
  ${chalk.white("perps paper sell")} <SYM> --notional <$>  Paper short
  ${chalk.white("perps paper status")}                      Paper portfolio snapshot

${chalk.bold("Live trading (⚠️  real funds):")}
  ${chalk.white("perps long")} <SYM> --notional <$>        Open long position
  ${chalk.white("perps short")} <SYM> --notional <$>       Open short position
  ${chalk.white("perps close")} <SYM>                      Close position
  ${chalk.white("perps tp-sl")} <SYM> --tp <price> --sl <price>  Attach TP/SL

${chalk.bold("Strategies:")}
  ${chalk.white("perps twap")} <SYM> --side buy --notional <$> --slices N --interval-secs N
  ${chalk.white("perps grid")} <SYM> --lower <price> --upper <price> --levels N
  ${chalk.white("perps ta")} <SYM>  --timeframe 5m --entry "RSI<30" --exit "RSI>70"
  ${chalk.white("perps runs")}                 List strategy runs
  ${chalk.white("perps monitor")} <RUN_ID>     Compact non-blocking run monitor
  ${chalk.white("perps wait-next-tick")} <RUN_ID> --after-tick N
  ${chalk.white("perps finalize")} <RUN_ID> --cancel-orders --wait

${chalk.bold("Agent / MCP setup:")}
  ${chalk.white("perps agent install")}        Install Vulcan skills + MCP server
  ${chalk.white("perps agent diagnose")}       Test MCP handshake

  ${chalk.yellow("⚠️  Live trading executes irreversible on-chain transactions.")}
  ${chalk.yellow("   Paper mode is the default for new users and strategy launches.")}
  ${chalk.yellow("   Vulcan is experimental. You are responsible for all outcomes.")}
`);
    return;
  }

  // Route to vulcan binary with mapped subcommands
  const vulcanArgs = mapPerpsArgs(subArgs);
  const result = spawnVulcanInherited(vulcanArgs);
  result.on("exit", (code) => process.exit(code ?? 0));
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function showHelp(): void {
  console.log(`
${chalk.cyan("🦞  CLAWD Automation CLI")} ${chalk.gray(`v${VERSION}`)}

${chalk.bold("Usage:")}
  clawd <command> [options]

${chalk.bold("Backroom:")}
  ${chalk.white("status")}               Show box + automaton status
  ${chalk.white("logs")} [--tail N]      Tail box logs (default: 20 lines)
  ${chalk.white("run")} [--topic TEXT]   Run a backroom conversation (8 turns)
  ${chalk.white("stream")} [--topic T]  Stream a live backroom debate
  ${chalk.white("fund")} <amount>        USDC funding instructions
  ${chalk.white("feed")} <amount>        $CLAWD feeding instructions
  ${chalk.white("deploy")}               Deploy backroom server to Upstash Box
  ${chalk.white("files")}               List files in box
  ${chalk.white("exec")} <cmd>          Execute a command in the box
  ${chalk.white("spawn")}               Spawn the CLAWD Automation runtime

${chalk.bold("Perps (Phoenix via Vulcan):")}
  ${chalk.white("perps help")}          Show all perps subcommands
  ${chalk.white("perps markets")}       List Phoenix perp markets
  ${chalk.white("perps ticker")} SOL    Live SOL ticker
  ${chalk.white("perps paper init")}    Start paper trading ($10k)
  ${chalk.white("perps status")}        Portfolio snapshot
  ${chalk.white("perps long")} SOL --notional-usdc 200    Open live long
  ${chalk.white("perps twap")} SOL --side buy --notional-usdc 1000 --slices 10 --interval-seconds 60

${chalk.bold("Onchain Agents (Metaplex + pay.sh):")}
  ${chalk.white("agent help")}          Mint/read agents, launch tokens, run x402/pay gateway
  ${chalk.white("agent mint")}          Mint a Metaplex Agent Registry identity
  ${chalk.white("agent read")}          Read identity, registration URI, and PDA wallet
  ${chalk.white("agent token launch")}  Launch a Genesis bonding-curve agent token
  ${chalk.white("agent pay start")}     Start local sandbox pay.sh gateway

${chalk.bold("Environment:")}
  UPSTASH_BOX_API_KEY       Upstash Box API key (required for box commands)
  UPSTASH_BOX_ID            Box ID (default: stirred-anemone-13117)
  DEEPSEEK_API_KEY          DeepSeek API key (optional)
`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    await runTUI();
    return;
  }

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    showHelp();
    return;
  }

  if (cmd === "--version" || cmd === "-v") {
    console.log(`clawd v${VERSION}`);
    return;
  }

  switch (cmd) {
    case "status":
      await cmdStatus();
      break;

    case "logs": {
      const tailIdx = args.indexOf("--tail");
      const tail = tailIdx !== -1 ? parseInt(args[tailIdx + 1] ?? "20", 10) : 20;
      await cmdLogs(tail);
      break;
    }

    case "run": {
      const topicIdx = args.indexOf("--topic");
      const topic = topicIdx !== -1 ? args.slice(topicIdx + 1).join(" ") : undefined;
      await cmdRun(topic);
      break;
    }

    case "stream": {
      const topicIdx = args.indexOf("--topic");
      const topic = topicIdx !== -1 ? args.slice(topicIdx + 1).join(" ") : undefined;
      await cmdStream(topic);
      break;
    }

    case "fund":
      cmdFund(args[1] ?? "0");
      break;

    case "feed":
      cmdFeed(args[1] ?? "0");
      break;

    case "deploy":
      await cmdDeploy();
      break;

    case "files":
      await cmdFiles();
      break;

    case "exec":
      if (!args[1]) {
        console.error(chalk.red("\n❌  Usage: clawd exec <command>\n"));
        process.exit(1);
      }
      await cmdExec(args.slice(1).join(" "));
      break;

    case "spawn":
      cmdSpawn();
      break;

    case "perps":
      cmdPerps(args.slice(1));
      break;

    case "agent":
      await cmdAgent(args.slice(1));
      break;

    default:
      console.error(chalk.red(`\n❌  Unknown command: ${cmd}`));
      console.error(chalk.gray('   Run "clawd --help" for usage\n'));
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red(`\n❌  ${err.message}\n`));
  process.exit(1);
});
