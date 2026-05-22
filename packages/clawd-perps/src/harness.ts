import { mkdirSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fetchSnapshot, sendRelayFanout, buildImperialRelay } from "./relay-client.js";

type HarnessOptions = {
  symbols: string[];
  relay: boolean;
  model?: string;
  prompt?: string;
  once: boolean;
  intervalMs: number;
  maxIterations: number;
  noModel: boolean;
};

type HarnessEvent = {
  type: string;
  at: string;
  data?: unknown;
};

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[38;2;20;241;149m",
  purple: "\x1b[38;2;153;69;255m",
  amber: "\x1b[38;2;255;209;102m",
  orange: "\x1b[38;2;255;95;31m",
  red: "\x1b[38;2;255;87;87m",
};

function sessionPath(): string {
  const dir = process.env.CLAWD_PERPS_SESSION_DIR || join(homedir(), ".clawd", "perps-sessions");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
}

function logEvent(event: HarnessEvent) {
  appendFileSync(sessionPath(), `${JSON.stringify(event)}\n`);
}

function asText(value: unknown, max = 8000): string {
  return JSON.stringify(value, null, 2).slice(0, max);
}

function defaultPrompt(symbols: string[]): string {
  return [
    "You are the Lobster King perps agent harness.",
    "Analyze Phoenix/Vulcan/Imperial/on-chain market-maker context for an operator.",
    "Return: market read, risk notes, safe paper-first next actions, and one relay message.",
    `Symbols: ${symbols.join(", ")}`,
    "Never recommend live execution without explicit human confirmation and --yes.",
    "For on-chain market making, prefer: clawd-perps perps onchain-mm status, then plan, then build. Run is gated.",
  ].join("\n");
}

async function callOpenRouter(prompt: string, snapshot: unknown, model?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return [
      "OPENROUTER_API_KEY is not set, running deterministic harness mode.",
      "Snapshot was fetched and can be relayed to the Backroom.",
      "Suggested next actions:",
      "- clawd-perps perps tui --relay",
      "- clawd-perps perps vulcan context",
      "- clawd-perps perps onchain-mm status",
      "- clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached",
    ].join("\n");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.CLAWD_PERPS_SITE_URL || "https://solanaclawd.com",
      "X-Title": "clawd-perps harness",
    },
    body: JSON.stringify({
      model: model || process.env.CLAWD_PERPS_MODEL || "anthropic/claude-haiku-4-5",
      messages: [
        {
          role: "system",
          content:
            "You are a perps trading assistant for Phoenix/Vulcan. You are concise, risk-first, and never bypass human approval.",
        },
        {
          role: "user",
          content: `${prompt}\n\nRealtime snapshot:\n${asText(snapshot)}`,
        },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter call failed: ${res.status} ${res.statusText}`);
  }
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content || asText(data, 2000);
}

function printBanner(symbols: string[]) {
  console.log(`${c.orange}${c.bold}🦞👑 LOBSTER KING PERPS AGENT HARNESS${c.reset}`);
  console.log(`${c.amber}Phoenix feed · Vulcan tools · Imperial relay · OpenRouter optional${c.reset}`);
  console.log(`${c.dim}symbols=${symbols.join(",")} session=${sessionPath()}${c.reset}\n`);
}

export async function runPerpsHarness(options: HarnessOptions): Promise<void> {
  printBanner(options.symbols);
  const prompt = options.prompt || defaultPrompt(options.symbols);
  const iterations = options.once ? 1 : Math.max(1, options.maxIterations);

  if (options.relay) {
    const result = await sendRelayFanout({
      name: "clawd-perps-harness",
      content: buildImperialRelay(options.symbols, "agent-harness"),
    });
    console.log(result.ok ? `${c.green}relay sent${c.reset} ${result.url}` : `${c.red}relay failed${c.reset} ${result.error}`);
    logEvent({ type: "relay", at: new Date().toISOString(), data: result });
  }

  for (let i = 0; i < iterations; i++) {
    console.log(`${c.purple}${c.bold}iteration ${i + 1}/${iterations}${c.reset}`);
    let snapshot: unknown;
    try {
      snapshot = await fetchSnapshot(options.symbols);
    } catch (error) {
      snapshot = {
        error: error instanceof Error ? error.message : "snapshot unavailable",
        symbols: options.symbols,
        hint: "Set CLAWD_BACKROOM_TOKEN or CLAWD_PERPS_RELAY_TOKEN if this feed requires auth.",
      };
      console.log(`${c.amber}snapshot unavailable; continuing with deterministic context${c.reset}`);
    }
    logEvent({ type: "snapshot", at: new Date().toISOString(), data: snapshot });

    const text = options.noModel
      ? [
          "Model disabled with --no-model.",
          "Fetched realtime Backroom snapshot and wrote it to the session log.",
          `Symbols: ${options.symbols.join(", ")}`,
        ].join("\n")
      : await callOpenRouter(prompt, snapshot, options.model);

    console.log(`${c.green}${text}${c.reset}\n`);
    logEvent({ type: "analysis", at: new Date().toISOString(), data: { text } });

    if (options.relay) {
      await sendRelayFanout({
        name: "clawd-perps-harness",
        content: `🦞👑 Perps harness analysis\n${text.slice(0, 1700)}`,
      });
    }

    if (i < iterations - 1) {
      await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
    }
  }
}
