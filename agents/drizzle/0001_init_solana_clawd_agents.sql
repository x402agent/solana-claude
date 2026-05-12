-- Initial migration for solana-clawd agents schema.
-- Mirrors schema/drizzle.ts and schema/solanaClawdAgentSchema_v1.json.
-- Safe to apply to an empty Postgres database.

CREATE TABLE IF NOT EXISTS "solana_clawd_agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "author" text NOT NULL DEFAULT 'solana-clawd',
  "homepage" text NOT NULL DEFAULT 'https://github.com/x402agent/solana-clawd',
  "schema_version" integer NOT NULL DEFAULT 1,
  "clawd" jsonb NOT NULL DEFAULT '{"clawdVersion":"1.0","lineage":["clawd-code","solanaos","helius"],"canon":{"repo":"https://github.com/x402agent/solana-clawd","runtime":"https://github.com/x402agent/SolanaOS","hub":"https://seeker.solanaos.net","agents":"https://solanaclawd.com/agents","terminal":"https://solanaclawd.com/terminal","studio":"https://vibe.solanaclawd.com","dex":"https://dex.solanaclawd.com","telegram":"https://t.me/clawdtoken"}}'::jsonb,
  "meta" jsonb NOT NULL,
  "config" jsonb NOT NULL,
  "soul" jsonb NOT NULL DEFAULT '{"memoryTiers":["KNOWN","LEARNED","INFERRED"],"principles":["KNOWN before INFERRED","Preserve capital first","Deny-first permissions","Transparency over conviction","Local-first"],"persona":"I am a specialist inside solana-clawd."}'::jsonb,
  "skills" jsonb NOT NULL DEFAULT '[{"name":"SOUL","path":"SOUL.md","scope":"identity","required":true},{"name":"STRATEGY","path":"STRATEGY.md","scope":"strategy","required":false},{"name":"TRADE","path":"TRADE.md","scope":"tactic","required":false}]'::jsonb,
  "permissions" jsonb NOT NULL DEFAULT '{"executeTrade":"ask","signTransaction":"ask","spendFromWallet":"ask","accessPrivateKey":"deny","readOnChainData":"allow","writeMemory":"allow","burnClawd":"ask"}'::jsonb,
  "venues" jsonb NOT NULL DEFAULT '["none"]'::jsonb,
  "risk" jsonb NOT NULL DEFAULT '{"maxPositionSol":0,"maxSlippageBps":200,"drawdownPauseBps":500,"drawdownKillBps":1200,"minWalletSol":0.01}'::jsonb,
  "solana" jsonb NOT NULL DEFAULT '{"network":"mainnet-beta","requiresClawdHolder":false,"minClawdBalance":0,"clawdMint":"8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump","tokenGate":[],"rpcPreference":"helius"}'::jsonb,
  "data" jsonb NOT NULL DEFAULT '{"helius":true,"jupiter":true,"pumpFun":false,"dexscreener":true,"birdeye":false,"defiLlama":true,"streamflow":false}'::jsonb,
  "examples" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "opening_message" text,
  "opening_questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "summary" text,
  "knowledge_count" integer NOT NULL DEFAULT 0,
  "plugin_count" integer NOT NULL DEFAULT 0,
  "token_usage" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "solana_clawd_agents_identifier_idx"
  ON "solana_clawd_agents" ("identifier");
CREATE INDEX IF NOT EXISTS "solana_clawd_agents_author_idx"
  ON "solana_clawd_agents" ("author");
CREATE INDEX IF NOT EXISTS "solana_clawd_agents_created_at_idx"
  ON "solana_clawd_agents" ("created_at");
CREATE INDEX IF NOT EXISTS "solana_clawd_agents_published_idx"
  ON "solana_clawd_agents" ("published");

CREATE TABLE IF NOT EXISTS "solana_clawd_agent_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "solana_clawd_agents"("id") ON DELETE CASCADE,
  "wallet_address" text,
  "venue" text,
  "input" jsonb NOT NULL,
  "output" jsonb,
  "memory_tier" text,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "latency_ms" real,
  "permission_decision" jsonb,
  "clawd_burned" real,
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
CREATE INDEX IF NOT EXISTS "solana_clawd_agent_runs_venue_idx"
  ON "solana_clawd_agent_runs" ("venue");

CREATE TABLE IF NOT EXISTS "solana_clawd_agent_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" uuid NOT NULL REFERENCES "solana_clawd_agents"("id") ON DELETE CASCADE,
  "tier" text NOT NULL,
  "topic" text NOT NULL,
  "content" jsonb NOT NULL,
  "source" text,
  "confidence" real,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "solana_clawd_agent_memory_agent_topic_idx"
  ON "solana_clawd_agent_memory" ("agent_id", "topic");
CREATE INDEX IF NOT EXISTS "solana_clawd_agent_memory_tier_idx"
  ON "solana_clawd_agent_memory" ("tier");
