-- ═══════════════════════════════════════════════════════════════
-- AGENT DEPLOYMENTS TABLE - Extended schema for agent deployment
-- Run this migration: wrangler d1 execute agent-db --file=./schema-deployments.sql
-- ═══════════════════════════════════════════════════════════════

-- Agent deployments table
CREATE TABLE IF NOT EXISTS agent_deployments (
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
  created_at TEXT DEFAULT (datetime('now')),
  deployed_at TEXT,
  last_active_at TEXT,
  metadata TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON agent_deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_wallet ON agent_deployments(wallet_address);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT,
  output TEXT,
  status TEXT DEFAULT 'success',
  error TEXT,
  tokens_used INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id)
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_deployment ON agent_execution_logs(deployment_id);

-- ─────────────────────────────────────────────────
-- DEPLOYMENT WALLETS TABLE (Link deployments to smart wallets)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_wallets (
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

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES smart_wallets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deployment_wallets_deployment ON deployment_wallets(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_wallets_wallet ON deployment_wallets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_deployment_wallets_address ON deployment_wallets(wallet_address);

-- ─────────────────────────────────────────────────
-- GOAT TOOL DEFINITIONS (Available GOAT SDK tools)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goat_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'wallet', 'defi', 'nft', 'data')),
  schema TEXT NOT NULL,  -- JSON Schema for parameters
  requires_wallet BOOLEAN DEFAULT 1,
  requires_signing BOOLEAN DEFAULT 0,
  enabled BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default GOAT tools
INSERT OR IGNORE INTO goat_tools (id, name, description, category, schema, requires_wallet, requires_signing) VALUES
  ('tool_get_balance', 'getBalance', 'Get wallet balance for SOL or any token', 'wallet', '{"type":"object","properties":{"address":{"type":"string"},"token":{"type":"string"}},"required":["address"]}', 1, 0),
  ('tool_transfer', 'transfer', 'Transfer tokens between wallets', 'wallet', '{"type":"object","properties":{"toAddress":{"type":"string"},"token":{"type":"string"},"amount":{"type":"string"}},"required":["toAddress","token","amount"]}', 1, 1),
  ('tool_get_token_price', 'getTokenPrice', 'Get current token price from CoinGecko', 'data', '{"type":"object","properties":{"token":{"type":"string"},"currency":{"type":"string","default":"usd"}},"required":["token"]}', 0, 0),
  ('tool_get_swap_quote', 'getSwapQuote', 'Get swap quote from Jupiter aggregator', 'defi', '{"type":"object","properties":{"inputToken":{"type":"string"},"outputToken":{"type":"string"},"amount":{"type":"string"},"slippageBps":{"type":"number"}},"required":["inputToken","outputToken","amount"]}', 0, 0),
  ('tool_execute_swap', 'executeSwap', 'Execute a token swap via Jupiter', 'defi', '{"type":"object","properties":{"inputToken":{"type":"string"},"outputToken":{"type":"string"},"amount":{"type":"string"},"slippageBps":{"type":"number"}},"required":["inputToken","outputToken","amount"]}', 1, 1),
  ('tool_airdrop_devnet', 'airdropDevnet', 'Request devnet SOL airdrop', 'wallet', '{"type":"object","properties":{"address":{"type":"string"},"amount":{"type":"number","default":1}},"required":["address"]}', 1, 0);

-- ─────────────────────────────────────────────────
-- DEPLOYMENT TOOL PERMISSIONS (Which tools a deployment can use)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_tool_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  max_daily_calls INTEGER DEFAULT 1000,
  calls_today INTEGER DEFAULT 0,
  last_reset_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (deployment_id) REFERENCES agent_deployments(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES goat_tools(id) ON DELETE CASCADE,
  UNIQUE(deployment_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_deployment_tool_perms_deployment ON deployment_tool_permissions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_tool_perms_tool ON deployment_tool_permissions(tool_id);
