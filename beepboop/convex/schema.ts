import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  installs: defineTable({
    source: v.string(),               // "leviathan.sh" | "install.sh" | "npx"
    os: v.string(),                   // "Darwin" | "Linux" | "unknown"
    arch: v.string(),                 // "arm64" | "x86_64" | "unknown"
    nodeVersion: v.optional(v.string()),
    status: v.string(),               // "started" | "complete" | "failed"
    sessionId: v.string(),            // random hex from the install script
    message: v.optional(v.string()),  // error message if failed
    ip: v.optional(v.string()),       // client IP (from CF-Connecting-IP header)
    walletAddress: v.optional(v.string()),
    ts: v.number(),                   // Date.now()
  })
    .index("by_ts", ["ts"])
    .index("by_session", ["sessionId"])
    .index("by_source", ["source"])
    .index("by_status", ["status"]),

  sessions: defineTable({
    sessionId: v.string(),
    walletAddress: v.optional(v.string()),
    createdAt: v.number(),
    lastSeen: v.number(),
    installId: v.optional(v.id("installs")),
  })
    .index("by_session", ["sessionId"])
    .index("by_wallet", ["walletAddress"]),
});
