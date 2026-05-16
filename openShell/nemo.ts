/**
 * openShell/nemo.ts — NemoClawd CLI integration
 *
 * Wraps the `nemoclawd` binary for LLM querying, embedding generation,
 * and high-level planning within the OpenShell sandbox.
 *
 * NemoClawd is NVIDIA's inference CLI — it provides fast local or cloud
 * inference for the agent stack without requiring API keys to be passed
 * through the LLM context.
 */

import { execa } from 'execa';

const NEMO_TIMEOUT = 30_000;
const NEMO_EMBED_TIMEOUT = 10_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NemoStatus {
  running: boolean;
  model: string;
  version: string;
  mode: 'local' | 'cloud';
  uptime?: number;
}

export interface NemoQueryResult {
  text: string;
  model: string;
  tokens: { prompt: number; completion: number };
  latencyMs: number;
}

export interface NemoEmbedResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface NemoPlanResult {
  goal: string;
  steps: Array<{ index: number; action: string; tool?: string; rationale: string }>;
  constraints: string[];
  confidence: number;
  model: string;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function runCmd(
  args: string[],
  timeoutMs = NEMO_TIMEOUT,
): Promise<{ stdout: string; success: boolean; error?: string }> {
  try {
    const result = await execa('nemoclawd', [...args, '--output=json'], { timeout: timeoutMs });
    return { stdout: result.stdout, success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { stdout: '', success: false, error: msg.slice(0, 300) };
  }
}

function parseOrRaw<T>(stdout: string): T | string {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    return stdout.slice(0, 600);
  }
}

// ─── NemoClient ───────────────────────────────────────────────────────────────

export const NemoClient = {
  /** Get the current nemoclawd daemon status. */
  async status(): Promise<NemoStatus | string> {
    const r = await runCmd(['status'], 5_000);
    if (!r.success) return `nemoclawd status failed: ${r.error}`;
    return parseOrRaw<NemoStatus>(r.stdout);
  },

  /**
   * Send a query to the nemoclawd LLM and return the response text.
   * Optionally supply a context string that is prepended as a system message.
   *
   * The prompt and context are NEVER passed to an external API — nemoclawd
   * routes to local or NVIDIA cloud inference, not OpenAI/Anthropic.
   */
  async query(
    prompt: string,
    context?: string,
    opts?: { maxTokens?: number; temperature?: number },
  ): Promise<NemoQueryResult | string> {
    const args = ['query', '--prompt', prompt];
    if (context) args.push('--context', context);
    if (opts?.maxTokens) args.push('--max-tokens', String(opts.maxTokens));
    if (opts?.temperature !== undefined) args.push('--temperature', String(opts.temperature));

    const r = await runCmd(args, NEMO_TIMEOUT);
    if (!r.success) return `nemoclawd query failed: ${r.error}`;
    return parseOrRaw<NemoQueryResult>(r.stdout);
  },

  /**
   * Generate embeddings for the given text using the nemo embedding model.
   * Returns a float32 vector suitable for semantic search in MemeBRain / mem0.
   */
  async embed(text: string): Promise<NemoEmbedResult | string> {
    const r = await runCmd(['embed', '--text', text], NEMO_EMBED_TIMEOUT);
    if (!r.success) return `nemoclawd embed failed: ${r.error}`;
    return parseOrRaw<NemoEmbedResult>(r.stdout);
  },

  /**
   * High-level planning: given a goal and optional constraints, produce a
   * step-by-step action plan using nemo reasoning.
   *
   * @param goal - Natural language goal for the agent
   * @param constraints - Optional constraint strings (e.g. "max 2 USDC", "devnet only")
   */
  async plan(goal: string, constraints?: string[]): Promise<NemoPlanResult | string> {
    const args = ['plan', '--goal', goal];
    if (constraints && constraints.length > 0) {
      args.push('--constraints', constraints.join('|'));
    }
    const r = await runCmd(args, NEMO_TIMEOUT);
    if (!r.success) return `nemoclawd plan failed: ${r.error}`;
    return parseOrRaw<NemoPlanResult>(r.stdout);
  },

  /** Load a model by name into the nemoclawd daemon. */
  async loadModel(modelName: string): Promise<string> {
    const r = await runCmd(['model', 'load', '--name', modelName], NEMO_TIMEOUT * 2);
    if (!r.success) return `nemoclawd model load failed: ${r.error}`;
    return r.stdout.trim() || `Model ${modelName} loaded`;
  },

  /** List models available in the nemoclawd daemon. */
  async listModels(): Promise<Array<{ name: string; loaded: boolean; size: string }> | string> {
    const r = await runCmd(['model', 'list'], 5_000);
    if (!r.success) return `nemoclawd model list failed: ${r.error}`;
    return parseOrRaw<Array<{ name: string; loaded: boolean; size: string }>>(r.stdout);
  },
};
