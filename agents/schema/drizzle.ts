// Drizzle ORM schema for solana-clawd agents.
// Mirrors schema/solanaClawdAgentSchema_v1.json. Pair with drizzle-kit against a
// Postgres database (Neon, Supabase, or local).

import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  boolean,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------- Shared JSON-shape types ----------

export type MemoryTier = 'KNOWN' | 'LEARNED' | 'INFERRED';
export type PermissionMode = 'allow' | 'deny' | 'ask';
export type SkillScope = 'identity' | 'strategy' | 'tactic' | 'reference' | 'runbook';
export type TradingVenue = 'solana-spot' | 'pump-fun' | 'hyperliquid' | 'aster' | 'none';
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';
export type RpcPreference = 'helius' | 'triton' | 'quicknode' | 'public';
export type AgentLineage = 'clawd-code' | 'solanaos' | 'helius' | 'anchor' | 'pumpfun';

export interface AgentSoul {
  memoryTiers: MemoryTier[];
  principles: string[];
  persona?: string;
}

export interface AgentCanon {
  repo: string;
  runtime?: string;
  hub?: string;
  agents?: string;
  terminal?: string;
  studio?: string;
  dex?: string;
  telegram?: string;
}

export interface AgentClawd {
  clawdVersion: string;
  lineage?: AgentLineage[];
  canon?: AgentCanon;
}

export interface AgentSkill {
  name: string;
  path: string;
  scope: SkillScope;
  required?: boolean;
}

export interface AgentPermissions {
  executeTrade?: PermissionMode;
  signTransaction?: PermissionMode;
  spendFromWallet?: PermissionMode;
  accessPrivateKey?: PermissionMode;
  readOnChainData?: PermissionMode;
  writeMemory?: PermissionMode;
  burnClawd?: PermissionMode;
}

export interface AgentRisk {
  maxPositionSol?: number;
  maxSlippageBps?: number;
  drawdownPauseBps?: number;
  drawdownKillBps?: number;
  minWalletSol?: number;
}

export interface AgentTokenGate {
  mint: string;
  minBalance: number;
}

export interface AgentSolana {
  network?: SolanaNetwork;
  requiresClawdHolder?: boolean;
  minClawdBalance?: number;
  clawdMint?: string;
  tokenGate?: AgentTokenGate[];
  rpcPreference?: RpcPreference;
}

export interface AgentDataSources {
  helius?: boolean;
  jupiter?: boolean;
  pumpFun?: boolean;
  dexscreener?: boolean;
  birdeye?: boolean;
  defiLlama?: boolean;
  streamflow?: boolean;
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

const DEFAULT_CANON: AgentCanon = {
  repo: 'https://github.com/x402agent/solana-clawd',
  runtime: 'https://github.com/x402agent/SolanaOS',
  hub: 'https://seeker.solanaos.net',
  agents: 'https://solanaclawd.com/agents',
  terminal: 'https://solanaclawd.com/terminal',
  studio: 'https://vibe.solanaclawd.com',
  dex: 'https://dex.solanaclawd.com',
  telegram: 'https://t.me/clawdtoken',
};

const DEFAULT_PERMISSIONS: AgentPermissions = {
  executeTrade: 'ask',
  signTransaction: 'ask',
  spendFromWallet: 'ask',
  accessPrivateKey: 'deny',
  readOnChainData: 'allow',
  writeMemory: 'allow',
  burnClawd: 'ask',
};

const DEFAULT_RISK: AgentRisk = {
  maxPositionSol: 0,
  maxSlippageBps: 200,
  drawdownPauseBps: 500,
  drawdownKillBps: 1200,
  minWalletSol: 0.01,
};

const DEFAULT_SOLANA: AgentSolana = {
  network: 'mainnet-beta',
  requiresClawdHolder: false,
  minClawdBalance: 0,
  clawdMint: '8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump',
  tokenGate: [],
  rpcPreference: 'helius',
};

const DEFAULT_DATA: AgentDataSources = {
  helius: true,
  jupiter: true,
  pumpFun: false,
  dexscreener: true,
  birdeye: false,
  defiLlama: true,
  streamflow: false,
};

export const agents = pgTable(
  'solana_clawd_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    author: text('author').notNull().default('solana-clawd'),
    homepage: text('homepage').notNull().default('https://github.com/x402agent/solana-clawd'),
    schemaVersion: integer('schema_version').notNull().default(1),

    clawd: jsonb('clawd').$type<AgentClawd>().notNull().default({
      clawdVersion: '1.0',
      lineage: ['clawd-code', 'solanaos', 'helius'],
      canon: DEFAULT_CANON,
    }),

    meta: jsonb('meta').$type<AgentMeta>().notNull(),
    config: jsonb('config').$type<AgentConfig>().notNull(),

    soul: jsonb('soul').$type<AgentSoul>().notNull().default({
      memoryTiers: ['KNOWN', 'LEARNED', 'INFERRED'],
      principles: [
        'KNOWN before INFERRED',
        'Preserve capital first',
        'Deny-first permissions',
        'Transparency over conviction',
        'Local-first',
      ],
      persona: 'I am a specialist inside solana-clawd.',
    }),

    skills: jsonb('skills').$type<AgentSkill[]>().notNull().default([
      { name: 'SOUL', path: 'SOUL.md', scope: 'identity', required: true },
      { name: 'STRATEGY', path: 'STRATEGY.md', scope: 'strategy', required: false },
      { name: 'TRADE', path: 'TRADE.md', scope: 'tactic', required: false },
    ]),

    permissions: jsonb('permissions').$type<AgentPermissions>().notNull().default(DEFAULT_PERMISSIONS),

    venues: jsonb('venues').$type<TradingVenue[]>().notNull().default(['none']),
    risk: jsonb('risk').$type<AgentRisk>().notNull().default(DEFAULT_RISK),
    solana: jsonb('solana').$type<AgentSolana>().notNull().default(DEFAULT_SOLANA),
    data: jsonb('data').$type<AgentDataSources>().notNull().default(DEFAULT_DATA),

    examples: jsonb('examples').$type<AgentFewShot[]>().notNull().default([]),
    openingMessage: text('opening_message'),
    openingQuestions: jsonb('opening_questions').$type<string[]>().notNull().default([]),
    summary: text('summary'),

    knowledgeCount: integer('knowledge_count').notNull().default(0),
    pluginCount: integer('plugin_count').notNull().default(0),
    tokenUsage: integer('token_usage').notNull().default(0),

    published: boolean('published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: uniqueIndex('solana_clawd_agents_identifier_idx').on(t.identifier),
    authorIdx: index('solana_clawd_agents_author_idx').on(t.author),
    createdAtIdx: index('solana_clawd_agents_created_at_idx').on(t.createdAt),
    publishedIdx: index('solana_clawd_agents_published_idx').on(t.published),
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

    venue: text('venue').$type<TradingVenue>(),
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

    clawdBurned: real('clawd_burned'),
    error: text('error'),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    agentIdx: index('solana_clawd_agent_runs_agent_idx').on(t.agentId),
    startedAtIdx: index('solana_clawd_agent_runs_started_at_idx').on(t.startedAt),
    walletIdx: index('solana_clawd_agent_runs_wallet_idx').on(t.walletAddress),
    venueIdx: index('solana_clawd_agent_runs_venue_idx').on(t.venue),
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
    confidence: real('confidence'),
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
