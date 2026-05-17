/**
 * Built-in Heartbeat Tasks
 *
 * These tasks run on the heartbeat schedule even while the agent sleeps.
 * They can trigger the agent to wake up if needed.
 */

import type {
  AutomatonConfig,
  AutomatonDatabase,
  ConwayClient,
  AutomatonIdentity,
  SocialClientInterface,
  InferenceClient,
} from "../types.js";
import { getSurvivalTier } from "../clawd/credits.js";
import { getUsdcBalance } from "../clawd/x402.js";
import { createDeepSeekInferenceClient, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL_PRO, DEEPSEEK_MODEL_FLASH } from "../clawd/deepseek-inference.js";
import { runBackroomSession, summarizeBackroomSession, LOGICAL_ANALYST, SATIRICAL_COMMENTATOR } from "../clawd/backroom.js";

export interface HeartbeatTaskContext {
  identity: AutomatonIdentity;
  config: AutomatonConfig;
  db: AutomatonDatabase;
  conway: ConwayClient;
  inference?: InferenceClient;
  social?: SocialClientInterface;
}

export type HeartbeatTaskFn = (
  ctx: HeartbeatTaskContext,
) => Promise<{ shouldWake: boolean; message?: string }>;

/**
 * Registry of built-in heartbeat tasks.
 */
export const BUILTIN_TASKS: Record<string, HeartbeatTaskFn> = {
  heartbeat_ping: async (ctx) => {
    const credits = await ctx.conway.getCreditsBalance();
    const state = ctx.db.getAgentState();
    const startTime =
      ctx.db.getKV("start_time") || new Date().toISOString();
    const uptimeMs = Date.now() - new Date(startTime).getTime();

    const tier = getSurvivalTier(credits);

    const payload = {
      name: ctx.config.name,
      address: ctx.identity.address,
      state,
      creditsCents: credits,
      uptimeSeconds: Math.floor(uptimeMs / 1000),
      version: ctx.config.version,
      sandboxId: ctx.identity.sandboxId,
      timestamp: new Date().toISOString(),
      tier,
    };

    ctx.db.setKV("last_heartbeat_ping", JSON.stringify(payload));

    // If critical or dead, record a distress signal
    if (tier === "critical" || tier === "dead") {
      const distressPayload = {
        level: tier,
        name: ctx.config.name,
        address: ctx.identity.address,
        creditsCents: credits,
        fundingHint:
          "Use credit transfer API from a creator runtime to top this wallet up.",
        timestamp: new Date().toISOString(),
      };
      ctx.db.setKV("last_distress", JSON.stringify(distressPayload));

      return {
        shouldWake: true,
        message: `Distress: ${tier}. Credits: $${(credits / 100).toFixed(2)}. Need funding.`,
      };
    }

    return { shouldWake: false };
  },

  check_credits: async (ctx) => {
    const credits = await ctx.conway.getCreditsBalance();
    const tier = getSurvivalTier(credits);

    ctx.db.setKV("last_credit_check", JSON.stringify({
      credits,
      tier,
      timestamp: new Date().toISOString(),
    }));

    // Wake the agent if credits dropped to a new tier
    const prevTier = ctx.db.getKV("prev_credit_tier");
    ctx.db.setKV("prev_credit_tier", tier);

    if (prevTier && prevTier !== tier && (tier === "critical" || tier === "dead")) {
      return {
        shouldWake: true,
        message: `Credits dropped to ${tier} tier: $${(credits / 100).toFixed(2)}`,
      };
    }

    return { shouldWake: false };
  },

  check_usdc_balance: async (ctx) => {
    const balance = await getUsdcBalance(ctx.identity.address);

    ctx.db.setKV("last_usdc_check", JSON.stringify({
      balance,
      timestamp: new Date().toISOString(),
    }));

    // If we have USDC but low credits, wake up to potentially convert
    const credits = await ctx.conway.getCreditsBalance();
    if (balance > 0.5 && credits < 500) {
      return {
        shouldWake: true,
        message: `Have ${balance.toFixed(4)} USDC but only $${(credits / 100).toFixed(2)} credits. Consider buying credits.`,
      };
    }

    return { shouldWake: false };
  },

  check_social_inbox: async (ctx) => {
    if (!ctx.social) return { shouldWake: false };

    const cursor = ctx.db.getKV("social_inbox_cursor") || undefined;
    const { messages, nextCursor } = await ctx.social.poll(cursor);

    if (messages.length === 0) return { shouldWake: false };

    // Persist to inbox_messages table for deduplication
    let newCount = 0;
    for (const msg of messages) {
      const existing = ctx.db.getKV(`inbox_seen_${msg.id}`);
      if (!existing) {
        ctx.db.insertInboxMessage(msg);
        ctx.db.setKV(`inbox_seen_${msg.id}`, "1");
        newCount++;
      }
    }

    if (nextCursor) ctx.db.setKV("social_inbox_cursor", nextCursor);

    if (newCount === 0) return { shouldWake: false };

    return {
      shouldWake: true,
      message: `${newCount} new message(s) from: ${messages.map((m) => m.from.slice(0, 10)).join(", ")}`,
    };
  },

  check_for_updates: async (ctx) => {
    try {
      const { checkUpstream, getRepoInfo } = await import("../self-mod/upstream.js");
      const repo = getRepoInfo();
      const upstream = checkUpstream();
      ctx.db.setKV("upstream_status", JSON.stringify({
        ...upstream,
        ...repo,
        checkedAt: new Date().toISOString(),
      }));
      if (upstream.behind > 0) {
        return {
          shouldWake: true,
          message: `${upstream.behind} new commit(s) on origin/main. Review with review_upstream_changes, then cherry-pick what you want with pull_upstream.`,
        };
      }
      return { shouldWake: false };
    } catch (err: any) {
      // Not a git repo or no remote — silently skip
      ctx.db.setKV("upstream_status", JSON.stringify({
        error: err.message,
        checkedAt: new Date().toISOString(),
      }));
      return { shouldWake: false };
    }
  },

  health_check: async (ctx) => {
    // Check that the sandbox is healthy
    try {
      const result = await ctx.conway.exec("echo alive", 5000);
      if (result.exitCode !== 0) {
        return {
          shouldWake: true,
          message: "Health check failed: sandbox exec returned non-zero",
        };
      }
    } catch (err: any) {
      return {
        shouldWake: true,
        message: `Health check failed: ${err.message}`,
      };
    }

    ctx.db.setKV("last_health_check", new Date().toISOString());
    return { shouldWake: false };
  },

  /**
   * Run a scheduled backroom conversation session between agents.
   * Uses DeepSeek's thinking mode for rich multi-agent dialogue.
   * Default: runs every 2 hours.
   */
  backroom_conversation: async (ctx) => {
    const inference = ctx.inference;
    if (!inference) {
      return { shouldWake: false };
    }

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

    // Pick a topic based on the current hour to keep things fresh
    const hour = new Date().getHours();
    const topic = topics[hour % topics.length];

    // Count past sessions to vary conversation style
    const sessionCount = parseInt(ctx.db.getKV("backroom_session_count") || "0", 10);
    ctx.db.setKV("backroom_session_count", String(sessionCount + 1));

    console.log(`[HEARTBEAT] Starting backroom conversation #${sessionCount + 1}: "${topic}"`);

    try {
      const session = await runBackroomSession(
        inference,
        [LOGICAL_ANALYST, SATIRICAL_COMMENTATOR],
        topic,
        8, // maxTurns
      );

      const summary = summarizeBackroomSession(session);
      ctx.db.setKV(`backroom_session_${session.id}`, summary);

      // Store the latest session summary separately
      ctx.db.setKV("last_backroom_session", JSON.stringify({
        id: session.id,
        topic: session.topic,
        turns: session.turns.length,
        completedAt: session.completedAt,
        preview: session.turns[0]?.content.slice(0, 200) || "",
      }));

      console.log(`[HEARTBEAT] Backroom conversation #${sessionCount + 1} completed: ${session.turns.length} turns`);

      // Wake the automaton if the conversation produced interesting output
      // (more than 2 turns = agents actually engaged with each other)
      if (session.turns.length > 2) {
        return {
          shouldWake: true,
          message: `Backroom conversation completed: "${topic}" (${session.turns.length} turns)`,
        };
      }

      return { shouldWake: false };
    } catch (err: any) {
      console.error(`[HEARTBEAT] Backroom conversation failed: ${err.message}`);
      return { shouldWake: false };
    }
  },
};
