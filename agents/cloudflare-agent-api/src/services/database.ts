// ═══════════════════════════════════════════════════════════════
// DATABASE SERVICE - PostgreSQL (Neon) connection & helpers
// Provides a consistent interface for all database operations,
// compatible with both Cloudflare D1 (SQLite) and Neon PostgreSQL.
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  api_key_hash: string;
  api_key_prefix: string;
  wallet_address: string | null;
  chain: 'solana' | 'solana-devnet';
  status: 'active' | 'suspended' | 'pending';
  permissions: unknown;
  requests_per_minute: number;
  requests_per_day: number;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface Session {
  id: string;
  agent_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string;
}

export interface AgentActivity {
  id: number;
  agent_id: string;
  action: string;
  details: unknown;
  ip_address: string | null;
  status: 'success' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  agent_id: string;
  type: 'transfer' | 'swap' | 'fund';
  from_address: string | null;
  to_address: string | null;
  token: string | null;
  amount: string | null;
  chain: string;
  tx_hash: string | null;
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SmartWallet {
  id: string;
  agent_id: string;
  wallet_type: 'smart' | 'mpc' | 'custodial';
  address: string;
  chain: string;
  admin_signer_address: string | null;
  delegated_signer_id: string | null;
  delegated_signer_status: 'pending' | 'active' | 'rejected' | null;
  locator: string | null;
  linked_user: string | null;
  alias: string | null;
  is_primary: boolean;
  status: 'active' | 'suspended' | 'pending';
  metadata: unknown;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface AgentDeployment {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'error';
  wallet_address: string | null;
  chain: string;
  public_key: string | null;
  delegated_signer_id: string | null;
  delegated_signer_status: 'pending' | 'active' | 'rejected' | null;
  configuration: unknown;
  capabilities: unknown;
  created_at: string;
  deployed_at: string | null;
  last_active_at: string | null;
  metadata: unknown;
}

// ─────────────────────────────────────────────────
// DATABASE CLASS - Abstracts PostgreSQL connection
// ─────────────────────────────────────────────────

export class Database {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Execute a query and return all results as array
   */
  async all<T = Record<string, unknown>>(
    sql: string,
    ...bindings: unknown[]
  ): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...bindings).all<T>();
    return result.results;
  }

  /**
   * Execute a query and return the first result
   */
  async first<T = Record<string, unknown>>(
    sql: string,
    ...bindings: unknown[]
  ): Promise<T | null> {
    const result = await this.db.prepare(sql).bind(...bindings).first<T>();
    return result || null;
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    ...bindings: unknown[]
  ): Promise<{ success: boolean; meta?: Record<string, unknown> }> {
    const result = await this.db.prepare(sql).bind(...bindings).run();
    return { success: true, meta: result.meta };
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(
    statements: Array<{ sql: string; bindings: unknown[] }>
  ): Promise<Array<{ success: boolean }>> {
    const results: Array<{ success: boolean }> = [];
    for (const stmt of statements) {
      try {
        await this.db.prepare(stmt.sql).bind(...stmt.bindings).run();
        results.push({ success: true });
      } catch {
        results.push({ success: false });
      }
    }
    return results;
  }

  // ═══════════════════════════════════════════════════
  // AGENT OPERATIONS
  // ═══════════════════════════════════════════════════

  async createAgent(agent: {
    id: string;
    name: string;
    description?: string;
    api_key_hash: string;
    api_key_prefix: string;
    chain?: string;
    permissions: string;
    metadata?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO agents (id, name, description, api_key_hash, api_key_prefix, chain, permissions, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      agent.id,
      agent.name,
      agent.description || null,
      agent.api_key_hash,
      agent.api_key_prefix,
      agent.chain || 'solana-devnet',
      agent.permissions,
      agent.metadata || null
    );
  }

  async getAgentById(id: string): Promise<Agent | null> {
    return this.first<Agent>(
      'SELECT * FROM agents WHERE id = ?',
      id
    );
  }

  async getAgentByApiKeyHash(apiKeyHash: string): Promise<Agent | null> {
    return this.first<Agent>(
      "SELECT * FROM agents WHERE api_key_hash = ? AND status = 'active'",
      apiKeyHash
    );
  }

  async updateAgentWallet(agentId: string, walletAddress: string): Promise<void> {
    await this.execute(
      'UPDATE agents SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      walletAddress,
      agentId
    );
  }

  async updateAgentApiKey(
    agentId: string,
    apiKeyHash: string,
    apiKeyPrefix: string
  ): Promise<void> {
    await this.execute(
      'UPDATE agents SET api_key_hash = ?, api_key_prefix = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      apiKeyHash,
      apiKeyPrefix,
      agentId
    );
  }

  async updateAgentLastActive(agentId: string): Promise<void> {
    await this.execute(
      'UPDATE agents SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
      agentId
    );
  }

  // ═══════════════════════════════════════════════════
  // SESSION OPERATIONS
  // ═══════════════════════════════════════════════════

  async createSession(session: {
    id: string;
    agent_id: string;
    token_hash: string;
    ip_address?: string;
    user_agent?: string;
    expires_at: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO sessions (id, agent_id, token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      session.id,
      session.agent_id,
      session.token_hash,
      session.ip_address || null,
      session.user_agent || null,
      session.expires_at
    );
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.first<Session>(
      "SELECT * FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP",
      tokenHash
    );
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.execute(
      'DELETE FROM sessions WHERE token_hash = ?',
      tokenHash
    );
  }

  async deleteSessionsByAgentId(agentId: string): Promise<void> {
    await this.execute(
      'DELETE FROM sessions WHERE agent_id = ?',
      agentId
    );
  }

  async updateSessionLastUsed(tokenHash: string): Promise<void> {
    await this.execute(
      'UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = ?',
      tokenHash
    );
  }

  // ═══════════════════════════════════════════════════
  // ACTIVITY LOGGING
  // ═══════════════════════════════════════════════════

  async logActivity(activity: {
    agent_id: string;
    action: string;
    details?: string;
    ip_address?: string;
    status?: string;
    error_message?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO agent_activity (agent_id, action, details, ip_address, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      activity.agent_id,
      activity.action,
      activity.details || null,
      activity.ip_address || null,
      activity.status || 'success',
      activity.error_message || null
    );
  }

  async getAgentActivity(
    agentId: string,
    limit: number = 50
  ): Promise<AgentActivity[]> {
    return this.all<AgentActivity>(
      'SELECT * FROM agent_activity WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
      agentId,
      limit
    );
  }

  // ═══════════════════════════════════════════════════
  // TRANSACTION OPERATIONS
  // ═══════════════════════════════════════════════════

  async createTransaction(tx: {
    id: string;
    agent_id: string;
    type: string;
    from_address?: string;
    to_address?: string;
    token?: string;
    amount?: string;
    chain?: string;
    tx_hash?: string;
    status?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO transactions (id, agent_id, type, from_address, to_address, token, amount, chain, tx_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tx.id,
      tx.agent_id,
      tx.type,
      tx.from_address || null,
      tx.to_address || null,
      tx.token || null,
      tx.amount || null,
      tx.chain || 'solana-devnet',
      tx.tx_hash || null,
      tx.status || 'pending'
    );
  }

  async updateTransactionStatus(
    txId: string,
    status: string,
    errorMessage?: string,
    txHash?: string
  ): Promise<void> {
    const sets = ['status = ?'];
    const bindings: unknown[] = [status];

    if (status === 'success' || status === 'failed') {
      sets.push('completed_at = CURRENT_TIMESTAMP');
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      bindings.push(errorMessage);
    }
    if (txHash) {
      sets.push('tx_hash = ?');
      bindings.push(txHash);
    }

    bindings.push(txId);
    await this.execute(
      `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`,
      ...bindings
    );
  }

  async getAgentTransactions(
    agentId: string,
    limit: number = 20
  ): Promise<Transaction[]> {
    return this.all<Transaction>(
      'SELECT * FROM transactions WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
      agentId,
      limit
    );
  }

  // ═══════════════════════════════════════════════════
  // API KEY HISTORY
  // ═══════════════════════════════════════════════════

  async addApiKeyHistory(entry: {
    agent_id: string;
    api_key_prefix: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO api_key_history (agent_id, api_key_prefix) VALUES (?, ?)`,
      entry.agent_id,
      entry.api_key_prefix
    );
  }

  async revokePreviousApiKeys(
    agentId: string,
    reason: string = 'regenerated'
  ): Promise<void> {
    await this.execute(
      `UPDATE api_key_history
       SET revoked_at = CURRENT_TIMESTAMP, revoke_reason = ?
       WHERE agent_id = ? AND revoked_at IS NULL`,
      reason,
      agentId
    );
  }

  // ═══════════════════════════════════════════════════
  // SMART WALLET OPERATIONS
  // ═══════════════════════════════════════════════════

  async createSmartWallet(wallet: {
    id: string;
    agent_id: string;
    wallet_type: string;
    address: string;
    chain?: string;
    admin_signer_address?: string;
    locator?: string;
    linked_user?: string;
    alias?: string;
    is_primary?: boolean;
    metadata?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO smart_wallets
       (id, agent_id, wallet_type, address, chain, admin_signer_address, locator, linked_user, alias, is_primary, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      wallet.id,
      wallet.agent_id,
      wallet.wallet_type,
      wallet.address,
      wallet.chain || 'solana-devnet',
      wallet.admin_signer_address || null,
      wallet.locator || null,
      wallet.linked_user || null,
      wallet.alias || null,
      wallet.is_primary ? 1 : 0,
      wallet.metadata || null
    );
  }

  async getSmartWalletByAddress(address: string): Promise<SmartWallet | null> {
    return this.first<SmartWallet>(
      'SELECT * FROM smart_wallets WHERE address = ?',
      address
    );
  }

  async getAgentSmartWallets(agentId: string): Promise<SmartWallet[]> {
    return this.all<SmartWallet>(
      'SELECT * FROM smart_wallets WHERE agent_id = ? ORDER BY created_at DESC',
      agentId
    );
  }

  // ═══════════════════════════════════════════════════
  // DEPLOYMENT OPERATIONS
  // ═══════════════════════════════════════════════════

  async createDeployment(deployment: {
    id: string;
    agent_id: string;
    name: string;
    description?: string;
    status?: string;
    wallet_address?: string;
    chain?: string;
    configuration?: string;
    capabilities?: string;
    metadata?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO agent_deployments
       (id, agent_id, name, description, status, wallet_address, chain, configuration, capabilities, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      deployment.id,
      deployment.agent_id,
      deployment.name,
      deployment.description || null,
      deployment.status || 'pending',
      deployment.wallet_address || null,
      deployment.chain || 'solana-devnet',
      deployment.configuration || '{}',
      deployment.capabilities || '[]',
      deployment.metadata || null
    );
  }

  async getDeploymentsByAgentId(agentId: string): Promise<AgentDeployment[]> {
    return this.all<AgentDeployment>(
      'SELECT * FROM agent_deployments WHERE agent_id = ? ORDER BY created_at DESC',
      agentId
    );
  }

  async getDeploymentById(deploymentId: string): Promise<AgentDeployment | null> {
    return this.first<AgentDeployment>(
      'SELECT * FROM agent_deployments WHERE id = ?',
      deploymentId
    );
  }

  async updateDeploymentStatus(
    deploymentId: string,
    status: string
  ): Promise<void> {
    const sets = ['status = ?'];
    const bindings: unknown[] = [status];

    if (status === 'running') {
      sets.push('deployed_at = CURRENT_TIMESTAMP');
    }
    bindings.push(deploymentId);

    await this.execute(
      `UPDATE agent_deployments SET ${sets.join(', ')} WHERE id = ?`,
      ...bindings
    );
  }

  async updateDeploymentDelegatedSigner(
    deploymentId: string,
    signerId: string,
    signerStatus: string
  ): Promise<void> {
    await this.execute(
      'UPDATE agent_deployments SET delegated_signer_id = ?, delegated_signer_status = ? WHERE id = ?',
      signerId,
      signerStatus,
      deploymentId
    );
  }

  // ═══════════════════════════════════════════════════
  // WALLET BALANCES CACHE
  // ═══════════════════════════════════════════════════

  async upsertWalletBalance(walletBalance: {
    wallet_address: string;
    chain: string;
    token: string;
    symbol?: string;
    amount: string;
    decimals?: number;
    usd_value?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO wallet_balances_cache (wallet_address, chain, token, symbol, amount, decimals, usd_value, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (wallet_address, chain, token)
       DO UPDATE SET amount = ?, usd_value = ?, updated_at = CURRENT_TIMESTAMP`,
      // INSERT values
      walletBalance.wallet_address,
      walletBalance.chain,
      walletBalance.token,
      walletBalance.symbol || null,
      walletBalance.amount,
      walletBalance.decimals || 9,
      walletBalance.usd_value || null,
      // UPDATE values
      walletBalance.amount,
      walletBalance.usd_value || null
    );
  }

  async getCachedBalance(
    walletAddress: string,
    chain: string,
    token: string
  ): Promise<{
    wallet_address: string;
    amount: string;
    usd_value: string | null;
    updated_at: string;
  } | null> {
    return this.first(
      'SELECT wallet_address, amount, usd_value, updated_at FROM wallet_balances_cache WHERE wallet_address = ? AND chain = ? AND token = ?',
      walletAddress,
      chain,
      token
    );
  }

  // ═══════════════════════════════════════════════════
  // CLEANUP & UTILITY
  // ═══════════════════════════════════════════════════

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.execute(
      'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return (result.meta?.changes as number) || 0;
  }

  async getAgentCount(): Promise<number> {
    const result = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM agents'
    );
    return result?.count || 0;
  }

  async getActiveSessionCount(): Promise<number> {
    const result = await this.first<{ count: number }>(
      "SELECT COUNT(*) as count FROM sessions WHERE expires_at > CURRENT_TIMESTAMP"
    );
    return result?.count || 0;
  }
}
