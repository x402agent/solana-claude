// Drizzle ORM schema for solana-clawd agents.
// Mirrors schema/solanaClawdAgentSchema_v1.json. Pair with drizzle-kit against a
// Postgres database (Neon, Supabase, or local). Matches Postgres types used
// elsewhere in the solana-clawd stack.

import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------- JSON-shape types (aligned with solanaClawdAgentSchema_v1.json) ----------

export type MemoryTier = 'KNOWN' | 'LEARNED' | 'INFERRED';

export type PermissionMode = 'allow' | 'deny' | 'ask';

export interface AgentSoul {
  memoryTiers: MemoryTier[];
  principles: string[];
  canon?: { repo: string; runtime?: string; hub?: string };
}

export interface AgentSkill {
  name: string;
  path: string;
  scope: 'strategy' | 'tactic' | 'identity' | 'reference';
}

export interface AgentPermissions {
  executeTrade?: PermissionMode;
  signTransaction?: PermissionMode;
  spendFromWallet?: PermissionMode;
  accessPrivateKey?: PermissionMode;
  readOnChainData?: PermissionMode;
}

export interface AgentMeta {
  avatar: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  backgroundColor?: string;
}

export interface AgentFewShot {
  role: 'user' | 'system' | 'assistant' | 'function';
  content: string;
}

export interface AgentConfig {
  systemRole: string;
  model?: string;
  displayMode?: 'chat' | 'docs';
  openingMessage?: string;
  openingQuestions?: string[];
  inputTemplate?: string;
  historyCount?: number;
  enableHistoryCount?: boolean;
  enableMaxTokens?: boolean;
  enableCompressThreshold?: boolean;
  compressThreshold?: number;
  params?: {
    frequency_penalty?: number;
    presence_penalty?: number;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
  fewShots?: AgentFewShot[];
  plugins?: string[];
}

// ---------- Table: agents ----------

export const agents = pgTable(
  'solana_clawd_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    author: text('author').notNull().default('solana-clawd'),
    homepage: text('homepage').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    clawdVersion: text('clawd_version').notNull().default('1.0'),

    meta: jsonb('meta').$type<AgentMeta>().notNull(),
    config: jsonb('config').$type<AgentConfig>().notNull(),
    soul: jsonb('soul').$type<AgentSoul>(),
    skills: jsonb('skills').$type<AgentSkill[]>().default([]).notNull(),
    permissions: jsonb('permissions').$type<AgentPermissions>().default({
      executeTrade: 'ask',
      signTransaction: 'ask',
      spendFromWallet: 'ask',
      accessPrivateKey: 'deny',
      readOnChainData: 'allow',
    }).notNull(),

    examples: jsonb('examples').$type<AgentFewShot[]>().default([]).notNull(),
    openingMessage: text('opening_message'),
    openingQuestions: jsonb('opening_questions').$type<string[]>().default([]).notNull(),
    summary: text('summary'),

    knowledgeCount: integer('knowledge_count').notNull().default(0),
    pluginCount: integer('plugin_count').notNull().default(0),
    tokenUsage: integer('token_usage').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: uniqueIndex('solana_clawd_agents_identifier_idx').on(t.identifier),
    authorIdx: index('solana_clawd_agents_author_idx').on(t.author),
    createdAtIdx: index('solana_clawd_agents_created_at_idx').on(t.createdAt),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// ---------- Table: agent_runs (execution audit log) ----------

export const agentRuns = pgTable(
  'solana_clawd_agent_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    walletAddress: text('wallet_address'),

    input: jsonb('input').notNull(),
    output: jsonb('output'),
    memoryTier: text('memory_tier').$type<MemoryTier>(),

    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    latencyMs: real('latency_ms'),

    permissionDecision: jsonb('permission_decision').$type<{
      action: string;
      decision: PermissionMode;
      reason?: string;
    }>(),

    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    agentIdx: index('solana_clawd_agent_runs_agent_idx').on(t.agentId),
    startedAtIdx: index('solana_clawd_agent_runs_started_at_idx').on(t.startedAt),
    walletIdx: index('solana_clawd_agent_runs_wallet_idx').on(t.walletAddress),
  }),
);

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

// ---------- Table: agent_memory (persistent KNOWN/LEARNED/INFERRED store) ----------

export const agentMemory = pgTable(
  'solana_clawd_agent_memory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    tier: text('tier').$type<MemoryTier>().notNull(),
    topic: text('topic').notNull(),
    content: jsonb('content').notNull(),
    source: text('source'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentTopicIdx: index('solana_clawd_agent_memory_agent_topic_idx').on(t.agentId, t.topic),
    tierIdx: index('solana_clawd_agent_memory_tier_idx').on(t.tier),
  }),
);

export type AgentMemoryRow = typeof agentMemory.$inferSelect;
export type NewAgentMemoryRow = typeof agentMemory.$inferInsert;
