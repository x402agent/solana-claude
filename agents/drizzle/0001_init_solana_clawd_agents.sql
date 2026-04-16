-- Initial migration for solana-clawd agents schema.
-- Mirrors schema/drizzle.ts. Safe to apply to an empty Postgres database.

CREATE TABLE IF NOT EXISTS "solana_clawd_agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "author" text NOT NULL DEFAULT 'solana-clawd',
  "homepage" text NOT NULL,
  "schema_version" integer NOT NULL DEFAULT 1,
  "clawd_version" text NOT NULL DEFAULT '1.0',
  "meta" jsonb NOT NULL,
  "config" jsonb NOT NULL,
  "soul" jsonb,
  "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "permissions" jsonb NOT NULL DEFAULT '{"executeTrade":"ask","signTransaction":"ask","spendFromWallet":"ask","accessPrivateKey":"deny","readOnChainData":"allow"}'::jsonb,
  "examples" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "opening_message" text,
  "opening_questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "summary" text,
  "knowledge_count" integer NOT NULL DEFAULT 0,
  "plugin_count" integer NOT NULL DEFAULT 0,
  "token_usage" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "solana_clawd_agents_identifier_idx"
  ON "solana_clawd_agents" ("identifier");
CREATE INDEX IF NOT EXISTS "solana_clawd_agents_author_idx"
  ON "solana_clawd_agents" ("author");
CREATE INDEX IF NOT EXISTS "solana_clawd_agents_created_at_idx"
  ON "solana_clawd_agents" ("created_at");

CREATE TABLE IF NOT EXISTS "solana_clawd_agent_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "solana_clawd_agents"("id") ON DELETE CASCADE,
  "wallet_address" text,
  "input" jsonb NOT NULL,
  "output" jsonb,
  "memory_tier" text,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "latency_ms" real,
  "permission_decision" jsonb,
  "error" text,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "solana_clawd_agent_runs_agent_idx"
  ON "solana_clawd_agent_runs" ("agent_id");
CREATE INDEX IF NOT EXISTS "solana_clawd_agent_runs_started_at_idx"
  ON "solana_clawd_agent_runs" ("started_at");
CREATE INDEX IF NOT EXISTS "solana_clawd_agent_runs_wallet_idx"
  ON "solana_clawd_agent_runs" ("wallet_address");

CREATE TABLE IF NOT EXISTS "solana_clawd_agent_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "solana_clawd_agents"("id") ON DELETE CASCADE,
  "tier" text NOT NULL,
  "topic" text NOT NULL,
  "content" jsonb NOT NULL,
  "source" text,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "solana_clawd_agent_memory_agent_topic_idx"
  ON "solana_clawd_agent_memory" ("agent_id", "topic");
CREATE INDEX IF NOT EXISTS "solana_clawd_agent_memory_tier_idx"
  ON "solana_clawd_agent_memory" ("tier");
