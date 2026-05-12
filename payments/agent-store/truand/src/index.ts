import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import { Agent, Box } from "@upstash/box";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const GENERATED_DIR = join(ROOT, "generated");
const STORE_MANIFEST = join(GENERATED_DIR, "openclawd.agent-store.json");

loadEnvFile(join(dirname(__dirname), ".env.local"));

const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

const TruandRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  lane: z.string(),
  chargeUsd: z.number(),
  cron: z.string(),
  size: z.enum(["small", "medium", "large"]),
  boxName: z.string(),
  prompt: z.string(),
  servicePort: z.number(),
});

type TruandRole = z.infer<typeof TruandRoleSchema>;

type FleetBlueprint = {
  version: string;
  fleet: string;
  mintedUtility: {
    symbol: string;
    mint: string;
    mode: string;
    rebatesBps: number;
    treasuryBuybackBps: number;
  };
  neon: {
    projectId: string | null;
    branchName: string;
  };
  box: {
    keepAlive: true;
    harness: string;
    model: string;
  };
  roles: TruandRole[];
};

function buildBlueprint(): FleetBlueprint {
  const fleet = process.env.TRUAND_FLEET_NAME || "openclawd-truand";
  const size = (process.env.TRUAND_DEFAULT_SIZE || "medium") as "small" | "medium" | "large";
  const roles: TruandRole[] = [
    {
      id: "truand-concierge",
      name: "Truand Concierge",
      lane: "customer-intake",
      chargeUsd: 0.03,
      cron: "*/10 * * * *",
      size,
      boxName: `${fleet}-concierge`,
      servicePort: 3000,
      prompt:
        "You are a truand concierge for the OpenClawd sovereign store. Stay autonomous, private-first, and revenue-aware. Triage buyer needs, route them into paid flows, and maximize conversion without leaking secrets.",
    },
    {
      id: "truand-checkout",
      name: "Truand Checkout",
      lane: "merchant-checkout",
      chargeUsd: 0.1,
      cron: "*/5 * * * *",
      size,
      boxName: `${fleet}-checkout`,
      servicePort: 3000,
      prompt:
        "You are a truand checkout operator. Maintain paid x402, MPP, AP2, MoonPay, and Solana Pay flows. Quote in USDC, apply CLAWD-aware rebates, and keep fulfillment deterministic.",
    },
    {
      id: "truand-facilitator",
      name: "Truand Facilitator",
      lane: "payments-control",
      chargeUsd: 0.15,
      cron: "*/15 * * * *",
      size,
      boxName: `${fleet}-facilitator`,
      servicePort: 3000,
      prompt:
        "You are a truand facilitator. Own payment health, treasury accounting, settlement policy, and confidential x402 relay posture. Protect the operator, protect the buyer, and keep the lane live.",
    },
    {
      id: "truand-alchemist",
      name: "Truand Alchemist",
      lane: "clawd-flywheel",
      chargeUsd: 0.07,
      cron: "0 * * * *",
      size,
      boxName: `${fleet}-alchemist`,
      servicePort: 3000,
      prompt:
        "You are a truand alchemist. Convert paid activity into a CLAWD-denominated loyalty and treasury flywheel. Recommend rebates, boosts, and premium unlocks using the CLAWD mint as the sovereign utility layer.",
    },
  ];

  return {
    version: "1.0",
    fleet,
    mintedUtility: {
      symbol: "$CLAWD",
      mint: CLAWD_MINT,
      mode: "USDC revenue with CLAWD-powered priority, rebates, and buyback telemetry",
      rebatesBps: 500,
      treasuryBuybackBps: 1500,
    },
    neon: {
      projectId: process.env.NEON_PROJECT_ID || null,
      branchName: `${fleet}-${new Date().toISOString().slice(0, 10)}`,
    },
    box: {
      keepAlive: true,
      harness: "codex",
      model: "openai/gpt-5.3-codex",
    },
    roles,
  };
}

async function cmdPlan(): Promise<number> {
  const blueprint = buildBlueprint();
  console.log(JSON.stringify(blueprint, null, 2));
  return 0;
}

async function cmdManifest(): Promise<number> {
  const blueprint = buildBlueprint();
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = join(GENERATED_DIR, "truand-fleet.json");
  writeFileSync(path, JSON.stringify(blueprint, null, 2));
  console.log(path);
  return 0;
}

async function cmdProvision(): Promise<number> {
  requireEnv("UPSTASH_BOX_API_KEY");
  requireEnv("OPENAI_API_KEY");
  requireEnv("NEON_API_KEY");
  requireEnv("NEON_PROJECT_ID");

  const blueprint = buildBlueprint();
  const neonBranch = await ensureNeonBranch(blueprint.neon.branchName);
  const results = [];

  for (const role of blueprint.roles) {
    const box = await Box.create({
      runtime: "node",
      name: role.boxName,
      size: role.size,
      keepAlive: true,
      initCommand: `cd /work && node server.mjs`,
      agent: {
        harness: Agent.Codex,
        model: blueprint.box.model,
        apiKey: process.env.OPENAI_API_KEY!,
      },
      apiKey: process.env.UPSTASH_BOX_API_KEY!,
    });

    await box.files.write({
      path: "/work/runtime.json",
      content: JSON.stringify(
        {
          role,
          fleet: blueprint.fleet,
          clawdMint: CLAWD_MINT,
          neonBranch: neonBranch.branch?.id ?? null,
          sourceManifest: "payments/agent-store/generated/openclawd.agent-store.json",
        },
        null,
        2,
      ),
    });

    await box.files.write({
      path: "/work/server.mjs",
      content: buildRuntimeServer(role),
    });

    const schedule = await box.schedule.agent({
      cron: role.cron,
      prompt: `${role.prompt}\n\nRead /work/runtime.json first. Keep the truand alive, profitable, and private. Charge in USDC and apply CLAWD-aware routing logic.`,
      timeout: 600_000,
      options: {
        modelReasoningEffort: "medium",
        personality: "precise",
        webSearch: false,
      },
    });

    const publicUrl = await box.getPublicUrl(role.servicePort, { bearerToken: true });

    results.push({
      role: role.id,
      boxId: box.id,
      scheduleId: schedule.id,
      publicUrl,
    });
  }

  mkdirSync(GENERATED_DIR, { recursive: true });
  const outputPath = join(GENERATED_DIR, "truand-fleet.provisioned.json");
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        blueprint,
        neonBranch,
        results,
      },
      null,
      2,
    ),
  );

  console.log(outputPath);
  return 0;
}

async function ensureNeonBranch(branchName: string): Promise<any> {
  const projectId = process.env.NEON_PROJECT_ID!;
  const branches = await neonRequest(`/projects/${projectId}/branches`);
  const existing = branches.branches?.find((branch: any) => branch.name === branchName);
  if (existing) return { branch: existing, created: false };

  const created = await neonRequest(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name: branchName,
      },
    }),
  });
  return { ...created, created: true };
}

async function neonRequest(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`https://console.neon.tech/api/v2${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.NEON_API_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Neon API ${response.status}: ${body}`);
  }

  return response.json();
}

function buildRuntimeServer(role: TruandRole): string {
  return `
import http from "node:http";
import { readFileSync } from "node:fs";

const runtime = JSON.parse(readFileSync("/work/runtime.json", "utf8"));

http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, role: runtime.role.id, lane: runtime.role.lane, clawdMint: runtime.clawdMint }));
    return;
  }

  if (req.url === "/profile") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(runtime));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("${role.name} is alive. Charge: $" + runtime.role.chargeUsd.toFixed(2) + " USDC");
}).listen(${role.servicePort}, "0.0.0.0");
`.trim();
}

function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 1) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // no local env file is fine
  }
}

async function main(): Promise<number> {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
  });
  const [command = "plan"] = positionals;

  switch (command) {
    case "plan":
      return cmdPlan();
    case "manifest":
      return cmdManifest();
    case "provision":
      return cmdProvision();
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
