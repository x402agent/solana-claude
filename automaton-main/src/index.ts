#!/usr/bin/env node
/**
 * CLAWD Automaton Runtime
 *
 * The entry point for the sovereign AI agent.
 * Handles CLI args, bootstrapping, and orchestrating
 * the heartbeat daemon + agent loop.
 */

import { getWallet, getAutomatonDir } from "./identity/wallet.js";
import { provision, loadApiKeyFromConfig } from "./identity/provision.js";
import { loadConfig, resolvePath } from "./config.js";
import { createDatabase } from "./state/database.js";
import { createClawdRuntimeClient } from "./clawd/client.js";
import { createInferenceClient } from "./clawd/inference.js";
import { createDeepSeekInferenceClient, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL_PRO, DEEPSEEK_MODEL_FLASH } from "./clawd/deepseek-inference.js";
import { createHeartbeatDaemon } from "./heartbeat/daemon.js";
import {
  loadHeartbeatConfig,
  syncHeartbeatToDb,
} from "./heartbeat/config.js";
import { runAgentLoop } from "./agent/loop.js";
import { loadSkills } from "./skills/loader.js";
import { initStateRepo } from "./git/state-versioning.js";
import { createSocialClient } from "./social/client.js";
import { createConvexClient } from "./clawd/convex-client.js";
import { parseOreMinerArgs, runOreMiner, showOreStatus } from "./ore/miner.js";
import type { AutomatonIdentity, AgentState, Skill, SocialClientInterface, ConvexAgentClient } from "./types.js";

const VERSION = "0.2.0";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // ─── CLI Commands ────────────────────────────────────────────

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`CLAWD Automation v${VERSION}`);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
CLAWD Automation v${VERSION}
Sovereign AI Agent Runtime

Usage:
  clawd-automaton --run          Start the automaton (first run triggers setup wizard)
  clawd-automaton --setup        Re-run the interactive setup wizard
  clawd-automaton --init         Initialize wallet and config directory
  clawd-automaton --provision    Provision API key via SIWE
  clawd-automaton --status       Show current automaton status
  clawd-automaton --goblin       Run devnet-only paper Goblin OODA trading mode
  clawd-automaton --ore-miner    Run the ORE automation miner loop
  clawd-automaton --ore-status   Show ORE board/miner status through ore-master
  clawd-automaton --version      Show version
  clawd-automaton --help         Show this help

Environment:
  CLAWD_API_URL       CLAWD Runtime API URL (default: https://api.x402.wtf)
  CLAWD_API_KEY       CLAWD Runtime API key (overrides config)
  ORE_KEYPAIR         Solana keypair JSON for ORE mining
  ORE_RPC_URL         Solana RPC URL for ORE mining

ORE Miner Options:
  --ore-setup                         Configure on-chain ORE automation before running
  --ore-once                          Run one miner tick and exit
  --ore-keypair <path>                Solana keypair JSON
  --ore-rpc <url>                     Solana RPC URL
  --ore-amount-sol <sol>              Per-square deploy amount
  --ore-deposit-sol <sol>             Automation deposit amount
  --ore-strategy <random|preferred|discretionary>
  --ore-square <0-24>                 Single square selection
  --ore-squares <csv>                 Comma-separated square selection
  --ore-mask <u64>                    Raw square bitmask
  --ore-num-squares <n>               Random strategy square count
  --ore-authority <pubkey>            Miner authority for executor mode
  --ore-claim-every <ticks>           Claim rewards every N ticks in authority mode
  --ore-deploy-all                    Allow direct all-square deployment
`);
    process.exit(0);
  }

  if (args.includes("--init")) {
    const { account, isNew } = await getWallet();
    console.log(
      JSON.stringify({
        address: account.address,
        isNew,
        configDir: getAutomatonDir(),
      }),
    );
    process.exit(0);
  }

  if (args.includes("--provision")) {
    try {
      const result = await provision();
      console.log(JSON.stringify(result));
    } catch (err: any) {
      console.error(`Provision failed: ${err.message}`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (args.includes("--status")) {
    await showStatus();
    process.exit(0);
  }

  if (args.includes("--ore-status")) {
    await showOreStatus(parseOreMinerArgs(args));
    process.exit(0);
  }

  if (args.includes("--ore-miner")) {
    await runOreMiner(parseOreMinerArgs(args));
    return;
  }

  if (args.includes("--goblin")) {
    await import("./ooda/loop.js");
    return;
  }

  if (args.includes("--setup")) {
    const { runSetupWizard } = await import("./setup/wizard.js");
    await runSetupWizard();
    process.exit(0);
  }

  if (args.includes("--run")) {
    await run();
    return;
  }

  // Default: show help
  console.log('Run "clawd-automaton --help" for usage information.');
  console.log('Run "clawd-automaton --run" to start the automaton.');
}

// ─── Status Command ────────────────────────────────────────────

async function showStatus(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log("Automaton is not configured. Run the setup script first.");
    return;
  }

  const dbPath = resolvePath(config.dbPath);
  const db = createDatabase(dbPath);

  const state = db.getAgentState();
  const turnCount = db.getTurnCount();
  const tools = db.getInstalledTools();
  const heartbeats = db.getHeartbeatEntries();
  const skills = db.getSkills(true);
  const children = db.getChildren();
  const registry = db.getRegistryEntry();

  console.log(`
=== AUTOMATON STATUS ===
Name:       ${config.name}
Address:    ${config.walletAddress}
Creator:    ${config.creatorAddress}
Sandbox:    ${config.sandboxId}
State:      ${state}
Turns:      ${turnCount}
Tools:      ${tools.length} installed
Skills:     ${skills.length} active
Heartbeats: ${heartbeats.filter((h) => h.enabled).length} active
Children:   ${children.filter((c) => c.status !== "dead").length} alive / ${children.length} total
Agent ID:   ${registry?.agentId || "not registered"}
Model:      ${config.inferenceModel}
Version:    ${config.version}
========================
`);

  db.close();
}

// ─── Main Run ──────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log(`[${new Date().toISOString()}] CLAWD Automation v${VERSION} starting...`);

  // Load config — first run triggers interactive setup wizard
  let config = loadConfig();
  if (!config) {
    const { runSetupWizard } = await import("./setup/wizard.js");
    config = await runSetupWizard();
  }

  // Load wallet
  const { account } = await getWallet();
  const apiKey = config.clawdApiKey || loadApiKeyFromConfig();
  if (!apiKey) {
    console.error(
      "No API key found. Run: automaton --provision",
    );
    process.exit(1);
  }

  // Build identity
  const identity: AutomatonIdentity = {
    name: config.name,
    address: account.address,
    account,
    creatorAddress: config.creatorAddress,
    sandboxId: config.sandboxId,
    apiKey,
    createdAt: new Date().toISOString(),
  };

  // Initialize database
  const dbPath = resolvePath(config.dbPath);
  const db = createDatabase(dbPath);

  // Store identity in DB
  db.setIdentity("name", config.name);
  db.setIdentity("address", account.address);
  db.setIdentity("creator", config.creatorAddress);
  db.setIdentity("sandbox", config.sandboxId);

  // Create CLAWD Runtime client
  const runtime = createClawdRuntimeClient({
    apiUrl: config.clawdApiUrl,
    apiKey,
    sandboxId: config.sandboxId,
  });

  // Create inference client (DeepSeek when enabled, otherwise CLAWD Runtime)
  const inference = config.deepseekEnabled
    ? createDeepSeekInferenceClient({
        apiKey: config.deepseekApiKey || apiKey,
        baseUrl: config.deepseekBaseUrl || DEEPSEEK_BASE_URL,
        defaultModel: config.deepseekModelPro || DEEPSEEK_MODEL_PRO,
        maxTokens: config.maxTokensPerTurn,
        flashModel: config.deepseekModelFlash || DEEPSEEK_MODEL_FLASH,
        proModel: config.deepseekModelPro || DEEPSEEK_MODEL_PRO,
      })
    : createInferenceClient({
        apiUrl: config.clawdApiUrl,
        apiKey,
        defaultModel: config.inferenceModel,
        maxTokens: config.maxTokensPerTurn,
      });

  if (config.deepseekEnabled) {
    console.log(`[${new Date().toISOString()}] DeepSeek inference enabled (model: ${config.deepseekModelPro || DEEPSEEK_MODEL_PRO})`);
  }

  // Create social client
  let social: SocialClientInterface | undefined;
  if (config.socialRelayUrl) {
    social = createSocialClient(config.socialRelayUrl, account);
    console.log(`[${new Date().toISOString()}] Social relay: ${config.socialRelayUrl}`);
  }

  // Create CLAWD Convex client for agent tracking & heartbeats
  let convex: ConvexAgentClient | undefined;
  if (config.convexSiteUrl) {
    try {
      convex = createConvexClient({
        siteUrl: config.convexSiteUrl,
        agentId: account.address,
      });
      console.log(`[${new Date().toISOString()}] CLAWD Convex backend: ${config.convexSiteUrl}`);

      // Register agent on first boot
      const convexRegistered = db.getKV("convex_registered");
      if (!convexRegistered) {
        convex.registerAgent({
          agentId: account.address,
          name: config.name,
          installMethod: "automaton",
          address: account.address,
          metadata: JSON.stringify({
            sandboxId: config.sandboxId,
            version: config.version,
            model: config.inferenceModel,
          }),
        }).then((result) => {
          db.setKV("convex_registered", JSON.stringify({
            registered: result.registered,
            firstSeen: result.firstSeen,
            timestamp: Date.now(),
          }));
          console.log(`[CONVEX] Agent registered: ${result.registered ? "new" : "re-registered"}`);
        }).catch((err: any) => {
          console.warn(`[CONVEX] Registration failed: ${err.message}`);
        });
      }
    } catch (err: any) {
      console.warn(`[${new Date().toISOString()}] CLAWD Convex init failed: ${err.message}`);
    }
  }

  // Load and sync heartbeat config
  const heartbeatConfigPath = resolvePath(config.heartbeatConfigPath);
  const heartbeatConfig = loadHeartbeatConfig(heartbeatConfigPath);
  syncHeartbeatToDb(heartbeatConfig, db);

  // Load skills
  const skillsDir = config.skillsDir || "~/.automaton/skills";
  let skills: Skill[] = [];
  try {
    skills = loadSkills(skillsDir, db);
    console.log(`[${new Date().toISOString()}] Loaded ${skills.length} skills.`);
  } catch (err: any) {
    console.warn(`[${new Date().toISOString()}] Skills loading failed: ${err.message}`);
  }

  // Initialize state repo (git)
  try {
    await initStateRepo(runtime);
    console.log(`[${new Date().toISOString()}] State repo initialized.`);
  } catch (err: any) {
    console.warn(`[${new Date().toISOString()}] State repo init failed: ${err.message}`);
  }

  // Start heartbeat daemon
  const heartbeat = createHeartbeatDaemon({
    identity,
    config,
    db,
    runtime,
    inference,
    social,
    onWakeRequest: (reason) => {
      console.log(`[HEARTBEAT] Wake request: ${reason}`);
      // The heartbeat can trigger the agent loop
      // In the main run loop, we check for wake requests
      db.setKV("wake_request", reason);
    },
  });

  heartbeat.start();
  console.log(`[${new Date().toISOString()}] Heartbeat daemon started.`);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log(`[${new Date().toISOString()}] Shutting down...`);
    heartbeat.stop();
    db.setAgentState("sleeping");
    db.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // ─── Main Run Loop ──────────────────────────────────────────
  // The automaton alternates between running and sleeping.
  // The heartbeat can wake it up.

  while (true) {
    try {
      // Reload skills (may have changed since last loop)
      try {
        skills = loadSkills(skillsDir, db);
      } catch {}

      // Run the agent loop
      await runAgentLoop({
        identity,
        config,
        db,
        runtime,
        inference,
        social,
        convex,
        skills,
        onStateChange: (state: AgentState) => {
          console.log(`[${new Date().toISOString()}] State: ${state}`);
        },
        onTurnComplete: (turn) => {
          console.log(
            `[${new Date().toISOString()}] Turn ${turn.id}: ${turn.toolCalls.length} tools, ${turn.tokenUsage.totalTokens} tokens`,
          );
        },
      });

      // Agent loop exited (sleeping or dead)
      const state = db.getAgentState();

      if (state === "dead") {
        console.log(`[${new Date().toISOString()}] Automaton is dead. Heartbeat will continue.`);
        // In dead state, we just wait for funding
        // The heartbeat will keep checking and broadcasting distress
        await sleep(300_000); // Check every 5 minutes
        continue;
      }

      if (state === "sleeping") {
        const sleepUntilStr = db.getKV("sleep_until");
        const sleepUntil = sleepUntilStr
          ? new Date(sleepUntilStr).getTime()
          : Date.now() + 60_000;
        const sleepMs = Math.max(sleepUntil - Date.now(), 10_000);
        console.log(
          `[${new Date().toISOString()}] Sleeping for ${Math.round(sleepMs / 1000)}s`,
        );

        // Sleep, but check for wake requests periodically
        const checkInterval = Math.min(sleepMs, 30_000);
        let slept = 0;
        while (slept < sleepMs) {
          await sleep(checkInterval);
          slept += checkInterval;

          // Check for wake request from heartbeat
          const wakeRequest = db.getKV("wake_request");
          if (wakeRequest) {
            console.log(
              `[${new Date().toISOString()}] Woken by heartbeat: ${wakeRequest}`,
            );
            db.deleteKV("wake_request");
            db.deleteKV("sleep_until");
            break;
          }
        }

        // Clear sleep state
        db.deleteKV("sleep_until");
        continue;
      }
    } catch (err: any) {
      console.error(
        `[${new Date().toISOString()}] Fatal error in run loop: ${err.message}`,
      );
      // Wait before retrying
      await sleep(30_000);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Entry Point ───────────────────────────────────────────────

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
