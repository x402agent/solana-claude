/**
 * CLAWD Agent Tracking Schema
 *
 * Tracks agent installs, heartbeats, and provides a key-value store
 * for curl-based agents to save and recall their data.
 * Lives alongside the existing AI Town tables.
 */
import { v } from 'convex/values';
import { defineTable } from 'convex/server';

/**
 * Agent Identity – recorded when an agent first "installs" / registers
 * via the automaton runtime or a curl POST.
 */
export const clawdTables = {
  // ─── Agent Installs / Registrations ───────────────────────────
  clawdAgents: defineTable({
    // Unique agent identifier (wallet address, pubkey, or UUID)
    agentId: v.string(),
    // Human-readable name
    name: v.string(),
    // How the agent was installed: "automaton", "curl", "mcp", "manual"
    installMethod: v.string(),
    // Source URL or git repo
    source: v.optional(v.string()),
    // Agent metadata (version, model, sandbox, etc.) stored as JSON string
    metadata: v.optional(v.string()),
    // Wallet/identity address
    address: v.optional(v.string()),
    // When it was first seen
    firstSeen: v.number(),
    // When it was last seen (updated on each heartbeat)
    lastSeen: v.number(),
    // Whether the agent is currently active
    active: v.boolean(),
    // Optional tags for categorization
    tags: v.optional(v.array(v.string())),
  })
    .index('agentId', ['agentId'])
    .index('active', ['active'])
    .index('lastSeen', ['lastSeen']),

  // ─── Agent Heartbeats ─────────────────────────────────────────
  clawdHeartbeats: defineTable({
    agentId: v.string(),
    state: v.optional(v.string()), // "running", "sleeping", "dead", etc.
    creditsCents: v.optional(v.number()),
    usdcBalance: v.optional(v.number()),
    uptimeSeconds: v.optional(v.number()),
    version: v.optional(v.string()),
    sandboxId: v.optional(v.string()),
    turnCount: v.optional(v.number()),
    skillCount: v.optional(v.number()),
    tier: v.optional(v.string()),
    // Free-form status JSON from the agent
    statusPayload: v.optional(v.string()),
    // Timestamp of the heartbeat
    timestamp: v.number(),
  })
    .index('agentId', ['agentId'])
    .index('agentId_timestamp', ['agentId', 'timestamp'])
    .index('timestamp', ['timestamp']),

  // ─── Agent Key-Value Store (for curl installs & data recall) ─
  clawdAgentData: defineTable({
    agentId: v.string(),
    key: v.string(),
    value: v.string(),
    // Optional MIME/content type hint
    contentType: v.optional(v.string()),
    // Tags for categorizing stored data
    tags: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  })
    .index('agentId', ['agentId'])
    .index('agentId_key', ['agentId', 'key'])
    .index('agentId_tags', ['agentId', 'tags']),

  // ─── Agent Activity Log ───────────────────────────────────────
  clawdActivityLog: defineTable({
    agentId: v.string(),
    action: v.string(), // "install", "heartbeat", "data_write", "data_read", "error", "state_change"
    details: v.optional(v.string()),
    payload: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('agentId', ['agentId'])
    .index('agentId_action', ['agentId', 'action'])
    .index('agentId_timestamp', ['agentId', 'timestamp']),
};
