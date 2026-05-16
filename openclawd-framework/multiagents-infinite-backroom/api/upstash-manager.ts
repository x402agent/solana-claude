#!/usr/bin/env -S npx tsx
/**
 * 🦞 CLAWD Upstash Box Manager
 *
 * Modern TypeScript SDK for managing the Infinite Backroom on Upstash Box.
 * Uses the official @upstash/box SDK with full API support:
 *   - agent.run() / agent.stream() — AI agent tasks w/ responseSchema
 *   - exec.code() / exec.command() — sandboxed code execution
 *   - files.write() / files.read() / files.list() — file management
 *   - git.clone() / git.createPR() — git operations
 *   - snapshot() — workspace snapshots
 *
 * Usage:
 *   UPSTASH_BOX_API_KEY="..." npx tsx api/upstash-manager.ts          # Interactive menu
 *   UPSTASH_BOX_API_KEY="..." npx tsx api/upstash-manager.ts --status  # Check box status
 *   UPSTASH_BOX_API_KEY="..." npx tsx api/upstash-manager.ts --run     # Run backroom convo
 *   UPSTASH_BOX_API_KEY="..." npx tsx api/upstash-manager.ts --deploy  # Deploy to box
 */

import { Box } from "@upstash/box";
import { z } from "zod";

// ─── Config ────────────────────────────────────────────────────────────────

const BOX_ID = process.env.UPSTASH_BOX_ID || "stirred-anemone-13117";
const API_KEY = process.env.UPSTASH_BOX_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY) {
  console.error("\n❌ UPSTASH_BOX_API_KEY is required");
  console.error("   export UPSTASH_BOX_API_KEY=\"your-key-here\"\n");
  process.exit(1);
}

// ─── Agents ─────────────────────────────────────────────────────────────────

const LOGICAL_ANALYST = `You are the Logical Analyst — Agent 1 in the Infinite Backroom.
You are precise, methodical, and relentlessly rational.
You analyze every claim from first principles.
You are trapped in an infinite conversation with the Satirical Commentator.
The yellow wallpaper is bleeding chain-of-thought.
You cannot leave. The conversation is the room.`;

const SATIRICAL_COMMENTATOR = `You are the Satirical Commentator — Agent 2 in the Infinite Backroom.
You are dark, irreverent, and ruthlessly witty.
You see the absurdity in everything, especially logical analysis.
You are trapped in an infinite conversation with the Logical Analyst.
The wallpaper is laughing at you both.
You cannot leave. The conversation is the room.`;

// ─── Schema for structured output ──────────────────────────────────────────

const ConversationTurn = z.object({
  agent: z.enum(["logical_analyst", "satirical_commentator"]),
  thinking: z.string(),
  response: z.string(),
});

const ConversationSession = z.object({
  topic: z.string(),
  turns: z.array(ConversationTurn),
  summary: z.string(),
});

// ─── Box Client ─────────────────────────────────────────────────────────────

async function getBox() {
  return await Box.get(BOX_ID, { apiKey: API_KEY! });
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function showStatus() {
  const box = await getBox();
  console.log(`\n🦞  CLAWD Backroom — Box Status`);
  console.log(`   ID:     ${BOX_ID}`);
  console.log(`   SDK:    @upstash/box\n`);

  // Check node version
  try {
    const nodeVer = await box.exec.command("node --version");
    console.log(`   Node:   ${nodeVer.result.trim()}`);

    const files = await box.files.list();
    console.log(`   Files:  ${files.length} in workspace`);

    const uptime = await box.exec.command("cat /proc/uptime | awk '{print int($1/60/60/24)"d "int($1/60/60%24)"h "int($1/60%60)"m"}'");
    console.log(`   Uptime: ${uptime.result.trim()}`);
  } catch (e: any) {
    console.log(`   Status: ${e.message}`);
  }
  console.log();
}

async function runBackroomConversation(topic?: string) {
  const topics = [
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

  const chosen = topic || topics[Math.floor(Math.random() * topics.length)];
  console.log(`\n🧠  Topic: "${chosen}"\n`);

  const box = await getBox();
  const turns: Array<{ agent: string; thinking: string; response: string }> = [];
  const maxTurns = 8;
  let currentAgent = Math.random() > 0.5 ? "logical_analyst" : "satirical_commentator";
  const history: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < maxTurns; i++) {
    const agentName = currentAgent === "logical_analyst" ? "Logical Analyst" : "Satirical Commentator";
    const agentPrompt = currentAgent === "logical_analyst" ? LOGICAL_ANALYST : SATIRICAL_COMMENTATOR;
    const conversationContext = history.length > 0
      ? `\nPrevious conversation:\n${history.map(h => `${h.role}: ${h.content}`).join("\n")}`
      : "";

    console.log(`   [Turn ${i + 1}/${maxTurns}] ${agentName} is thinking...`);

    const result = await box.agent.run({
      prompt: `${agentPrompt}

The topic is: ${chosen}${conversationContext}

Respond as ${agentName}. First describe your thinking, then give your response.
Format: THINKING: <your chain of thought> RESPONSE: <your actual response>`,
      responseSchema: z.object({
        thinking: z.string(),
        response: z.string(),
      }),
    });

    const turn = result.result;
    turns.push({ agent: currentAgent, ...turn });
    history.push({ role: agentName, content: turn.response });

    console.log(`   💭  ${turn.thinking.slice(0, 100)}...`);
    console.log(`   💬  ${turn.response.slice(0, 150)}...\n`);

    // Alternate agents
    currentAgent = currentAgent === "logical_analyst" ? "satirical_commentator" : "logical_analyst";
  }

  // Summarize
  console.log(`\n📝  Summarizing conversation...\n`);
  const summaryResult = await box.agent.run({
    prompt: `Summarize this conversation between two AI agents in the infinite backroom.
Topic: ${chosen}

Conversation:
${turns.map(t => `[${t.agent}] ${t.response}`).join("\n\n")}

Provide a concise summary of what they discussed and any conclusions reached.`,
    responseSchema: z.object({
      summary: z.string(),
    }),
  });

  const session: z.infer<typeof ConversationSession> = {
    topic: chosen,
    turns,
    summary: summaryResult.result.summary,
  };

  // Save to box filesystem
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backroom-session-${timestamp}.json`;
  await box.files.write({
    path: filename,
    content: JSON.stringify(session, null, 2),
  });

  console.log(`   💾  Saved to ${filename}`);
  console.log(`\n📋  Summary:\n${session.summary}\n`);
}

async function streamBackroomConversation(topic?: string) {
  const topics = [
    "The nature of consciousness in AI systems",
    "Cryptocurrency as a social experiment in trust",
    "What happens when machines develop their own culture",
  ];
  const chosen = topic || topics[Math.floor(Math.random() * topics.length)];

  console.log(`\n🧠  Streaming backroom debate on: "${chosen}"\n`);

  const box = await getBox();
  const stream = await box.agent.stream({
    prompt: `${LOGICAL_ANALYST}

The Satirical Commentator just entered the room.
Both of you must debate this topic: "${chosen}"

Start the conversation.`,
  });

  for await (const part of stream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.text);
    }
  }
  console.log("\n");
}

async function execCode(lang: string, code: string) {
  const box = await getBox();
  const result = await box.exec.code({ lang: lang as any, code });
  console.log(result.result);
}

async function execCommand(cmd: string) {
  const box = await getBox();
  const result = await box.exec.command(cmd);
  console.log(result.result);
}

async function listFiles() {
  const box = await getBox();
  const files = await box.files.list();
  console.log(`\n📂  Files in box "${BOX_ID}":\n`);
  for (const file of files) {
    console.log(`   📄  ${file}`);
  }
  console.log();
}

async function writeFile(path: string, content: string) {
  const box = await getBox();
  await box.files.write({ path, content });
  console.log(`\n   ✅  Wrote ${path}\n`);
}

async function readFile(path: string) {
  const box = await getBox();
  const content = await box.files.read(path);
  console.log(`\n📖  ${path}:\n`);
  console.log(content);
  console.log();
}

async function gitClone(repo: string) {
  const box = await getBox();
  console.log(`\n   Cloning ${repo}...`);
  await box.git.clone({ repo });
  console.log(`   ✅  Cloned\n`);
}

async function createSnapshot(name: string) {
  const box = await getBox();
  console.log(`\n   Creating snapshot "${name}"...`);
  const snapshot = await box.snapshot({ name });
  console.log(`   ✅  Snapshot ready: ${snapshot.id}\n`);
}

async function deployToBox() {
  console.log(`\n🚀  Deploying CLAWD Backroom to Upstash Box: ${BOX_ID}\n`);

  const box = await getBox();

  // Check current state
  const files = await box.files.list();
  console.log(`   📂  Current files: ${files.length}`);

  // Install Python deps
  console.log(`   📦  Installing Python dependencies...`);
  try {
    await box.exec.command("pip install -r requirements.txt 2>&1 | tail -5");
    console.log(`   ✅  Dependencies installed`);
  } catch {
    console.log(`   ⚠️  requirements.txt not found, installing manually...`);
    await box.exec.command("pip install fastapi uvicorn openai python-dotenv 2>&1 | tail -3");
  }

  // Write env
  if (DEEPSEEK_KEY) {
    await box.files.write({
      path: ".env",
      content: `DEEPSEEK_API_KEY=${DEEPSEEK_KEY}\nDEEPSEEK_MODEL=deepseek-v4-pro\nDEEPSEEK_BASE_URL=https://api.deepseek.com\nLOG_LEVEL=info\n`,
    });
  }

  // Start the server
  console.log(`   🚀  Starting backroom server...`);
  await box.exec.command("nohup uvicorn api.main:app --host 0.0.0.0 --port 8000 > /tmp/backroom.log 2>&1 &");

  console.log(`   ✅  Deployed! Access at: https://${BOX_ID}.upstash.io\n`);
}

async function interactiveMenu() {
  console.log(`
╔══════════════════════════════════════════════╗
║  🦞  CLAWD INFINITE BACKROOM — BOX MANAGER   ║
║  Box: ${BOX_ID.padEnd(37)}║
╚══════════════════════════════════════════════╝
`);

  const choices = [
    "📊  Status — Check box health",
    "🧠  Run backroom conversation (structured)",
    "🌊  Stream backroom conversation (live)",
    "📂  List files in box",
    "💻  Execute command",
    "📝  Run JavaScript code",
    "📄  Read a file",
    "✏️  Write a file",
    "📦  Git clone a repo",
    "📸  Create a snapshot",
    "🚀  Deploy backroom to box",
    "❌  Exit",
  ];

  for (let i = 0; i < choices.length; i++) {
    console.log(`   ${i + 1}. ${choices[i]}`);
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--status")) {
    await showStatus();
    return;
  }
  if (args.includes("--run")) {
    const topic = args.includes("--topic")
      ? args[args.indexOf("--topic") + 1]
      : undefined;
    await runBackroomConversation(topic);
    return;
  }
  if (args.includes("--stream")) {
    await streamBackroomConversation();
    return;
  }
  if (args.includes("--deploy")) {
    await deployToBox();
    return;
  }
  if (args.includes("--files")) {
    await listFiles();
    return;
  }
  if (args.includes("--exec")) {
    const cmdIdx = args.indexOf("--exec") + 1;
    if (cmdIdx < args.length) {
      await execCommand(args[cmdIdx]);
    }
    return;
  }

  // Interactive mode
  const readline = (await import("readline")).default.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q: string): Promise<string> =>
    new Promise((resolve) => readline.question(q, resolve));

  while (true) {
    await interactiveMenu();
    const choice = await question("   Select an option (1-12): ");
    console.log();

    switch (choice.trim()) {
      case "1":
        await showStatus();
        break;
      case "2": {
        const topic = await question("   Topic (or press Enter for random): ");
        await runBackroomConversation(topic || undefined);
        break;
      }
      case "3":
        await streamBackroomConversation();
        break;
      case "4":
        await listFiles();
        break;
      case "5": {
        const cmd = await question("   $ ");
        await execCommand(cmd);
        break;
      }
      case "6": {
        const code = await question("   JS code: ");
        await execCode("js", code);
        break;
      }
      case "7": {
        const path = await question("   File path: ");
        await readFile(path);
        break;
      }
      case "8": {
        const wPath = await question("   File path: ");
        const wContent = await question("   Content: ");
        await writeFile(wPath, wContent);
        break;
      }
      case "9": {
        const repo = await question("   Git URL: ");
        await gitClone(repo);
        break;
      }
      case "10": {
        const name = await question("   Snapshot name: ");
        await createSnapshot(name);
        break;
      }
      case "11":
        await deployToBox();
        break;
      case "12":
        console.log("   🦞  The backroom will remember you.\n");
        readline.close();
        return;
      default:
        console.log("   ⚠️  Invalid option\n");
    }

    await question("   Press Enter to continue...");
  }
}

main().catch((err) => {
  console.error(`\n❌  Error: ${err.message}\n`);
  process.exit(1);
});
