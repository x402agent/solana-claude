/**
 * Perps Aggregator Tools — bridges the @openclawdsolana/clawd-perps-aggregator
 * SDK into the solana-clawd MCP orchestrator.
 *
 * The aggregator already defines its full MCP tool surface via `buildTools()`
 * (market data, smart-order routing, AMM pool views, split execution,
 * positions, risk, realtime). Rather than re-declare those here, we adopt
 * them wholesale and re-tag each tool with the orchestrator's `perps`
 * category so the main server can register, meter, and list them alongside
 * its native tools.
 *
 * Single source of truth: the aggregator package. This file is a thin,
 * dependency-injected adapter — when the aggregator gains a tool, the main
 * MCP server gets it for free on the next build.
 *
 * Safety: the aggregator is paper-first by construction. `perps_execute_order`
 * only submits a live order when IMPERIAL_LIVE=true and PERPS_AGG_PAPER!=true,
 * and is bounded by IMPERIAL_MAX_SIZE_USD + IMPERIAL_ALLOWED_SYMS. All other
 * tools are read-only / build-only.
 */

import type { ToolDef, ToolHandler } from "../orchestrator.js";

/**
 * Build the perps tool tuples for the orchestrator. Returns an empty array
 * (and logs to stderr) if the aggregator package is unavailable, so the MCP
 * server always boots even when the aggregator hasn't been built yet.
 */
export async function createPerpsTools(): Promise<Array<[ToolDef, ToolHandler]>> {
  try {
    const mod = await import("@openclawdsolana/clawd-perps-aggregator");
    const agg = new mod.PerpsAggregator();
    const tools = mod.buildTools(agg);

    return tools.map((tool): [ToolDef, ToolHandler] => [
      {
        name: tool.name,
        description: `[Perps] ${tool.description}`,
        inputSchema: {
          type: "object",
          properties: tool.inputSchema.properties ?? {},
          ...(tool.inputSchema.required ? { required: tool.inputSchema.required } : {}),
        },
        category: "perps",
      },
      tool.handler,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[perps] aggregator tools unavailable (build packages/clawd-perps-aggregator): ${msg}\n`,
    );
    return [];
  }
}
