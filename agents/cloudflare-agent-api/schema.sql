-- ═══════════════════════════════════════════════════════════════
-- AI AGENT DATABASE SCHEMA
-- Cloudflare D1 (SQLite)
-- ═══════════════════════════════════════════════════════════════

-- Drop existing tables (for fresh migration)
DROP TABLE IF EXISTS wallet_balances_cache;
DROP TABLE IF EXISTS goat_tool_calls;
DROP TABLE IF EXISTS smart_wallets;
DROP TABLE IF EXISTS api_key_history;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS agent_activity;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS agents;

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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now')),

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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'login', 'wallet_create', 'transfer', 'fund', etc.
    details TEXT,  -- JSON with action-specific data
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);

-- ─────────────────────────────────────────────────
-- API KEYS TABLE (for tracking regenerations)
-- ─────────────────────────────────────────────────
CREATE TABLE api_key_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
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
    is_primary BOOLEAN NOT NULL DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending')),

    -- Metadata
    metadata TEXT,  -- JSON for additional wallet metadata

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT,

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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    wallet_id TEXT,  -- References smart_wallets.id
    wallet_address TEXT,
    tool_name TEXT NOT NULL,  -- 'getBalance', 'transfer', 'getTokenPrice', 'getSwapQuote'
    params TEXT,     -- JSON of tool parameters
    result TEXT,     -- JSON of tool result
    status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'solana-devnet',
    token TEXT NOT NULL,  -- 'SOL', 'USDC', or mint address
    symbol TEXT,
    amount TEXT NOT NULL DEFAULT '0',
    decimals INTEGER NOT NULL DEFAULT 9,
    usd_value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(wallet_address, chain, token)
);

CREATE INDEX idx_wallet_balances_address ON wallet_balances_cache(wallet_address);
CREATE INDEX idx_wallet_balances_updated ON wallet_balances_cache(updated_at);
