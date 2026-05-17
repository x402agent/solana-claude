-- ═══════════════════════════════════════════════════════════════
-- AI AGENT DATABASE SCHEMA - PostgreSQL (Neon)
-- ═══════════════════════════════════════════════════════════════

-- Drop existing tables (for fresh migration)
DROP TABLE IF EXISTS deployment_tool_permissions CASCADE;
DROP TABLE IF EXISTS goat_tools CASCADE;
DROP TABLE IF EXISTS deployment_wallets CASCADE;
DROP TABLE IF EXISTS agent_execution_logs CASCADE;
DROP TABLE IF EXISTS agent_deployments CASCADE;
DROP TABLE IF EXISTS wallet_balances_cache CASCADE;
DROP TABLE IF EXISTS goat_tool_calls CASCADE;
DROP TABLE IF EXISTS smart_wallets CASCADE;
DROP TABLE IF EXISTS api_key_history CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS agent_activity CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- ─────────────────────────────────────────────────
-- AGENTS TABLE
-- ─────────────────────────────────────────────────
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    api_key_hash TEXT NOT NULL UNIQUE,
    api_key_prefix TEXT NOT NULL,  -- First 12 chars for display
    wallet_address TEXT,
    chain TEXT NOT NULL DEFAULT 'solana-devnet',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending')),

    -- Permissions (JSON)
    permissions TEXT NOT NULL DEFAULT '{"canCreateWallet":true,"canTransfer":true,"canSwap":true,"maxTransferAmount":100,"maxDailyVolume":1000}',

    -- Rate limits
    requests_per_minute INTEGER NOT NULL DEFAULT 30,
    requests_per_day INTEGER NOT NULL DEFAULT 1000,

    -- Metadata
    metadata TEXT,  -- JSON

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for API key lookup
CREATE INDEX idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_wallet ON agents(wallet_address);

-- ─────────────────────────────────────────────────
-- SESSIONS TABLE
-- ─────────────────────────────────────────────────
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Index for session lookup
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_agent ON sessions(agent_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ─────────────────────────────────────────────────
-- AGENT ACTIVITY LOG
-- ─────────────────────────────────────────────────
CREATE TABLE agent_activity (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'login', 'wallet_create', 'transfer', 'fund', etc.
    details TEXT,  -- JSON with action-specific data
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Index for activity queries
CREATE INDEX idx_activity_agent ON agent_activity(agent_id);
CREATE INDEX idx_activity_action ON agent_activity(action);
CREATE INDEX idx_activity_created ON agent_activity(created_at);

-- ─────────────────────────────────────────────────
-- WALLET TRANSACTIONS
-- ─────────────────────────────────────────────────
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('transfer', 'swap', 'fund')),
    from_address TEXT,
    to_address TEXT,
    token TEXT,
    amount TEXT,
    chain TEXT NOT NULL DEFAULT 'solana-devnet',
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);

-- ─────────────────────────────────────────────────
-- API KEYS TABLE (for tracking regenerations)
-- ─────────────────────────────────────────────────
CREATE TABLE api_key_history (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_key_history_agent ON api_key_history(agent_id);

-- ─────────────────────────────────────────────────
-- SMART WALLETS TABLE (Crossmint Smart Wallets)
-- ─────────────────────────────────────────────────
CREATE TABLE smart_wallets (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    wallet_type TEXT NOT NULL DEFAULT 'smart' CHECK(wallet_type IN ('smart', 'mpc', 'custodial')),
    address TEXT NOT NULL UNIQUE,
    chain TEXT NOT NULL DEFAULT 'solana-devnet',

    -- Smart wallet specific fields
    admin_signer_address TEXT,  -- Admin signer for smart wallets
    delegated_signer_id TEXT,   -- Crossmint delegated signer ID
    delegated_signer_status TEXT CHECK(delegated_signer_status IN ('pending', 'active', 'rejected')),

    -- Locator info
    locator TEXT,               -- Crossmint wallet locator
    linked_user TEXT,           -- Linked user identifier (email, userId, etc)

    -- Wallet config
    alias TEXT,                 -- Wallet alias (e.g., "trading", "treasury")
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending')),

    -- Metadata
    metadata TEXT,  -- JSON for additional wallet metadata

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_smart_wallets_agent ON smart_wallets(agent_id);
CREATE INDEX idx_smart_wallets_address ON smart_wallets(address);
CREATE INDEX idx_smart_wallets_type ON smart_wallets(wallet_type);
CREATE INDEX idx_smart_wallets_chain ON smart_wallets(chain);

-- ─────────────────────────────────────────────────
-- GOAT TOOL CALLS TABLE (Track GOAT SDK tool executions)
-- ─────────────────────────────────────────────────
CREATE TABLE goat_tool_calls (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    wallet_id TEXT,  -- References smart_wallets.id
    wallet_address TEXT,
    tool_name TEXT NOT NULL,  -- 'getBalance', 'transfer', 'getTokenPrice', 'getSwapQuote'
    params TEXT,     -- JSON of tool parameters
    result TEXT,     -- JSON of tool result
    status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES smart_wallets(id) ON DELETE SET NULL
);

CREATE INDEX idx_goat_tool_calls_agent ON goat_tool_calls(agent_id);
CREATE INDEX idx_goat_tool_calls_wallet ON goat_tool_calls(wallet_id);
CREATE INDEX idx_goat_tool_calls_tool ON goat_tool_calls(tool_name);
CREATE INDEX idx_goat_tool_calls_created ON goat_tool_calls(created_at);

-- ─────────────────────────────────────────────────
-- WALLET BALANCES CACHE (Optional caching for performance)
-- ─────────────────────────────────────────────────
CREATE TABLE wallet_balances_cache (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'solana-devnet',
    token TEXT NOT NULL,  -- 'SOL', 'USDC', or mint address
    symbol TEXT,
    amount TEXT NOT NULL DEFAULT '0',
    decimals INTEGER NOT NULL DEFAULT 9,
    usd_value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(wallet_address, chain, token)
);

CREATE INDEX idx_wallet_balances_address ON wallet_balances_cache(wallet_address);
CREATE INDEX idx_wallet_balances_updated ON wallet_balances_cache(updated_at);

-- ═══════════════════════════════════════════════════════════════
-- DEPLOYMENT SCHEMA - Extended tables for agent deployment
-- ═══════════════════════════════════════════════════════════════

-- Agent deployments table
CREATE TABLE agent_deployments (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'running', 'stopped', 'error')),
  wallet_address TEXT,
  chain TEXT DEFAULT 'solana-devnet',
  public_key TEXT,
  delegated_signer_id TEXT,
  delegated_signer_status TEXT CHECK (delegated_signer_status IN ('pending', 'active', 'rejected')),
  configuration TEXT DEFAULT '{}',
  capabilities TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  metadata TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Index for faster queries
CREATE INDEX idx_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX idx_deployments_status ON agent_deployments(status);
CREATE INDEX idx_deployments_wallet ON agent_deployments(wallet_address);

-- Agent execution logs
CREATE TABLE agent_execution_logs (
  id SERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT,
  output TEXT,
  status TEXT DEFAULT 'success',
  error TEXT,
  tokens_used INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id)
);

CREATE INDEX idx_execution_logs_deployment ON agent_execution_logs(deployment_id);

-- ─────────────────────────────────────────────────
-- DEPLOYMENT WALLETS TABLE (Link deployments to smart wallets)
-- ─────────────────────────────────────────────────
CREATE TABLE deployment_wallets (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'smart' CHECK (wallet_type IN ('smart', 'mpc', 'custodial')),
  wallet_address TEXT NOT NULL,
  chain TEXT DEFAULT 'solana-devnet',
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'treasury', 'trading', 'gas')),

  -- Signer configuration
  signer_type TEXT DEFAULT 'api-key' CHECK (signer_type IN ('api-key', 'delegated', 'admin')),
  admin_signer_address TEXT,
  delegated_signer_id TEXT,
  delegated_signer_status TEXT CHECK (delegated_signer_status IN ('pending', 'active', 'rejected')),

  -- Permissions for this wallet in deployment
  permissions TEXT DEFAULT '{"canTransfer":true,"canSwap":true,"maxTransferAmount":100}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES smart_wallets(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployment_wallets_deployment ON deployment_wallets(deployment_id);
CREATE INDEX idx_deployment_wallets_wallet ON deployment_wallets(wallet_id);
CREATE INDEX idx_deployment_wallets_address ON deployment_wallets(wallet_address);

-- ─────────────────────────────────────────────────
-- GOAT TOOL DEFINITIONS (Available GOAT SDK tools)
-- ─────────────────────────────────────────────────
CREATE TABLE goat_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'wallet', 'defi', 'nft', 'data')),
  schema_json TEXT NOT NULL,  -- JSON Schema for parameters
  requires_wallet BOOLEAN DEFAULT TRUE,
  requires_signing BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default GOAT tools
INSERT INTO goat_tools (id, name, description, category, schema_json, requires_wallet, requires_signing) VALUES
  ('tool_get_balance', 'getBalance', 'Get wallet balance for SOL or any token', 'wallet', '{"type":"object","properties":{"address":{"type":"string"},"token":{"type":"string"}},"required":["address"]}', TRUE, FALSE),
  ('tool_transfer', 'transfer', 'Transfer tokens between wallets', 'wallet', '{"type":"object","properties":{"toAddress":{"type":"string"},"token":{"type":"string"},"amount":{"type":"string"}},"required":["toAddress","token","amount"]}', TRUE, TRUE),
  ('tool_get_token_price', 'getTokenPrice', 'Get current token price from CoinGecko', 'data', '{"type":"object","properties":{"token":{"type":"string"},"currency":{"type":"string","default":"usd"}},"required":["token"]}', FALSE, FALSE),
  ('tool_get_swap_quote', 'getSwapQuote', 'Get swap quote from Jupiter aggregator', 'defi', '{"type":"object","properties":{"inputToken":{"type":"string"},"outputToken":{"type":"string"},"amount":{"type":"string"},"slippageBps":{"type":"number"}},"required":["inputToken","outputToken","amount"]}', FALSE, FALSE),
  ('tool_execute_swap', 'executeSwap', 'Execute a token swap via Jupiter', 'defi', '{"type":"object","properties":{"inputToken":{"type":"string"},"outputToken":{"type":"string"},"amount":{"type":"string"},"slippageBps":{"type":"number"}},"required":["inputToken","outputToken","amount"]}', TRUE, TRUE),
  ('tool_airdrop_devnet', 'airdropDevnet', 'Request devnet SOL airdrop', 'wallet', '{"type":"object","properties":{"address":{"type":"string"},"amount":{"type":"number","default":1}},"required":["address"]}', TRUE, FALSE);

-- ─────────────────────────────────────────────────
-- DEPLOYMENT TOOL PERMISSIONS (Which tools a deployment can use)
-- ─────────────────────────────────────────────────
CREATE TABLE deployment_tool_permissions (
  id SERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  max_daily_calls INTEGER DEFAULT 1000,
  calls_today INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES goat_tools(id) ON DELETE CASCADE,
  UNIQUE(deployment_id, tool_id)
);

CREATE INDEX idx_deployment_tool_perms_deployment ON deployment_tool_permissions(deployment_id);
CREATE INDEX idx_deployment_tool_perms_tool ON deployment_tool_permissions(tool_id);
