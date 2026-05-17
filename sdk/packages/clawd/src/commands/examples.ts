/**
 * packages/clawd/src/commands/examples.ts
 *
 * `clawd examples` subcommand — list and run the 9 OpenClawd demo examples.
 *
 * Usage:
 *   clawd examples list
 *   clawd examples run <id>
 *   clawd examples run ooda
 *   clawd examples run lobtrader
 */

import { Command } from "commander";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Example registry ────────────────────────────────────────────────────────

interface ExampleSpec {
  id: string;
  file: string;
  title: string;
  category: "agents" | "wallet" | "trading" | "payments" | "research" | "infra";
  desc: string;
  envRequired?: string[];
  note?: string;
}

const EXAMPLES: ExampleSpec[] = [
  {
    id: "buddies",
    file: "blockchain-buddies-demo.ts",
    title: "Blockchain Buddies",
    category: "agents",
    desc: "Solana-native trading companions with unique wallets + personalities",
  },
  {
    id: "listen",
    file: "listen-wallet.ts",
    title: "Listen Wallet",
    category: "wallet",
    desc: "Real-time wallet monitor via Helius WebSocket",
    envRequired: ["HELIUS_API_KEY"],
    note: "Pass wallet address as argument: clawd examples run listen <WALLET_ADDRESS>",
  },
  {
    id: "wallet",
    file: "clawd-wallet-demo.ts",
    title: "Clawd Wallet SDK",
    category: "wallet",
    desc: "@openclawd/wallet: Privy + AgenticWallet (Grok) + Jupiter swaps",
  },
  {
    id: "ooda",
    file: "ooda-loop.ts",
    title: "OODA Loop",
    category: "trading",
    desc: "Observe → Orient → Decide → Act → Learn cycle (no private key needed)",
  },
  {
    id: "lobtrader",
    file: "lobster-trader.ts",
    title: "Lobster Trader",
    category: "trading",
    desc: "pump.fun bonding-curve math, graduation odds, trade simulation",
  },
  {
    id: "x402sol",
    file: "x402-solana.ts",
    title: "x402 Solana",
    category: "payments",
    desc: "USDC micropayments — full 402 → pay → forward flow",
    note: 'Run server first: clawd examples run x402sol -- --server',
  },
  {
    id: "x402pay",
    file: "x402-payment-demo.ts",
    title: "x402 Agent Pay",
    category: "payments",
    desc: "@openclawd/agents-x402 — agent-to-agent USDC micropayments",
  },
  {
    id: "research",
    file: "auto-research-client.ts",
    title: "AutoResearch",
    category: "research",
    desc: "Karpathy-style self-improving research client",
    note: "Requires AutoResearch Wiki running at http://localhost:8000",
  },
  {
    id: "orch",
    file: "orchestrator-client.ts",
    title: "Orchestrator",
    category: "infra",
    desc: "Wallet creation, agent launches, MCP tools, Metaplex Core assets",
    note: "Requires orchestrator running at http://localhost:8787",
  },
];

// ── Path resolution ─────────────────────────────────────────────────────────

function findExamplesDir(): string | null {
  const candidates = [
    resolve(HERE, "..", "..", "..", "..", "examples"),
    resolve(HERE, "..", "..", "..", "examples"),
    resolve(HERE, "..", "..", "examples"),
    resolve(process.cwd(), "examples"),
  ];
  for (const c of candidates) {
    if (existsSync(resolve(c, "ooda-loop.ts"))) return c;
  }
  return null;
}

// ── Display helpers ─────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  agents: "🤖",
  wallet: "👛",
  trading: "📊",
  payments: "💸",
  research: "🔬",
  infra: "🛠️",
};

function formatTable(examples: ExampleSpec[]): string {
  const byCategory: Record<string, ExampleSpec[]> = {};
  for (const e of examples) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }

  const lines: string[] = [
    "",
    "  🦞 OpenClawd Examples — 9 runnable demos",
    "  ─────────────────────────────────────────────────────────────",
    "",
  ];

  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`  ${CATEGORY_ICONS[cat] ?? "📦"} ${cat.toUpperCase()}`);
    for (const e of items) {
      const env = e.envRequired?.length
        ? ` (requires: ${e.envRequired.join(", ")})`
        : "";
      lines.push(`    ${e.id.padEnd(12)} ${e.title.padEnd(22)} ${e.desc}${env}`);
    }
    lines.push("");
  }

  lines.push(
    "  Run:   clawd examples run <id>",
    "  Run:   npx tsx examples/<file>.ts",
    "",
    "  curl -fsSL https://solanaclawd.com/install.sh | bash  — one-shot install",
    "",
  );

  return lines.join("\n");
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function runExample(
  spec: ExampleSpec,
  examplesDir: string,
  extraArgs: string[],
): Promise<void> {
  const target = resolve(examplesDir, spec.file);

  if (!existsSync(target)) {
    console.error(`\n❌  Example file not found: ${target}`);
    console.error(`   Make sure you are running from the openclawd-framework repo.\n`);
    process.exit(1);
  }

  // Warn about missing env vars
  for (const envKey of spec.envRequired ?? []) {
    if (!process.env[envKey]) {
      console.warn(`\n⚠️  ${envKey} is not set — some features may not work.`);
      console.warn(`   Set it in ~/.clawd/.env or export it before running.\n`);
    }
  }

  if (spec.note) {
    console.log(`\nℹ️  Note: ${spec.note}\n`);
  }

  console.log(`\n🦞 Running: ${spec.title} (${spec.file})\n`);

  const args = ["tsx", target, ...extraArgs];
  const child = spawn("npx", args, {
    stdio: "inherit",
    env: { ...process.env },
  });

  await new Promise<void>((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`Example exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

// ── Command factory ─────────────────────────────────────────────────────────

export function createExamplesCommand(): Command {
  const cmd = new Command("examples").description(
    "List and run OpenClawd demo examples",
  );

  // `clawd examples list`
  cmd
    .command("list")
    .description("List all available examples")
    .action(() => {
      console.log(formatTable(EXAMPLES));
    });

  // `clawd examples run <id> [args...]`
  cmd
    .command("run <id> [args...]")
    .description(
      "Run an example by ID (buddies, listen, wallet, ooda, lobtrader, x402sol, x402pay, research, orch)",
    )
    .action(async (id: string, extraArgs: string[]) => {
      const spec = EXAMPLES.find(
        (e) =>
          e.id === id ||
          e.file.startsWith(id) ||
          e.title.toLowerCase().replace(/\s+/g, "") ===
            id.toLowerCase().replace(/\s+/g, ""),
      );

      if (!spec) {
        console.error(`\n❌  Unknown example: "${id}"`);
        console.error(
          `   Available IDs: ${EXAMPLES.map((e) => e.id).join(", ")}\n`,
        );
        process.exit(1);
      }

      const examplesDir = findExamplesDir();
      if (!examplesDir) {
        console.error(
          "\n❌  Cannot find examples/ directory. " +
            "Run from the openclawd-framework repo or set OPENCLAWD_EXAMPLES_DIR.\n",
        );
        process.exit(1);
      }

      try {
        await runExample(spec, examplesDir, extraArgs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\n❌  ${msg}\n`);
        process.exit(1);
      }
    });

  // Default: `clawd examples` without subcommand → show list
  cmd.action(() => {
    console.log(formatTable(EXAMPLES));
  });

  return cmd;
}
