// ═══════════════════════════════════════════════════════════════
// AGENT SERVICE - Database operations and business logic
// ═══════════════════════════════════════════════════════════════

import type { Env, Agent, AgentPermissions } from '../index';

// ─────────────────────────────────────────────────
// CRYPTO HELPERS
// ─────────────────────────────────────────────────

async function generateApiKey(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `agent_${hex}`;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId(prefix: string): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

// ─────────────────────────────────────────────────
// AGENT SERVICE CLASS
// ─────────────────────────────────────────────────

export class AgentService {
  private db: D1Database;
  private sessions: KVNamespace;
  private rateLimits: KVNamespace;
  private sessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private env: Env) {
    this.db = env.DB;
    this.sessions = env.SESSIONS;
    this.rateLimits = env.RATE_LIMITS;
  }

  // ═══════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════

  async register(params: {
    name: string;
    description?: string;
    chain?: 'solana' | 'solana-devnet';
    metadata?: Record<string, unknown>;
  }): Promise<{ agent: Agent; apiKey: string }> {
    const id = generateId('agt');
    const apiKey = await generateApiKey();
    const apiKeyHash = await hashString(apiKey);
    const apiKeyPrefix = apiKey.slice(0, 12) + '...';

    const defaultPermissions: AgentPermissions = {
      canCreateWallet: true,
      canTransfer: true,
      canSwap: true,
      maxTransferAmount: 100,
      maxDailyVolume: 1000,
    };

    await this.db.prepare(`
      INSERT INTO agents (id, name, description, api_key_hash, api_key_prefix, chain, permissions, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.name,
      params.description || null,
      apiKeyHash,
      apiKeyPrefix,
      params.chain || 'solana-devnet',
      JSON.stringify(defaultPermissions),
      params.metadata ? JSON.stringify(params.metadata) : null
    ).run();

    // Record API key history
    await this.db.prepare(`
      INSERT INTO api_key_history (agent_id, api_key_prefix)
      VALUES (?, ?)
    `).bind(id, apiKeyPrefix).run();

    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error('Failed to create agent');
    }

    return { agent, apiKey };
  }

  // ═══════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════

  async login(
    apiKey: string,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<{ agent: Agent; sessionToken: string; expiresAt: string } | null> {
    const apiKeyHash = await hashString(apiKey);

    const result = await this.db.prepare(`
      SELECT * FROM agents WHERE api_key_hash = ? AND status = 'active'
    `).bind(apiKeyHash).first<Agent>();

    if (!result) {
      return null;
    }

    // Parse permissions JSON
    const agent = this.parseAgentRow(result);

    // Create session
    const sessionId = generateId('ses');
    const sessionToken = await generateApiKey(); // Reuse for random token
    const tokenHash = await hashString(sessionToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionDurationMs);

    // Store session in D1
    await this.db.prepare(`
      INSERT INTO sessions (id, agent_id, token_hash, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      agent.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt.toISOString()
    ).run();

    // Also store in KV for fast lookup
    await this.sessions.put(tokenHash, JSON.stringify({
      agentId: agent.id,
      expiresAt: expiresAt.toISOString(),
    }), { expirationTtl: Math.floor(this.sessionDurationMs / 1000) });

    // Update last active
    await this.db.prepare(`
      UPDATE agents SET last_active_at = datetime('now') WHERE id = ?
    `).bind(agent.id).run();

    return {
      agent,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async validateApiKey(apiKey: string): Promise<Agent | null> {
    const apiKeyHash = await hashString(apiKey);

    const result = await this.db.prepare(`
      SELECT * FROM agents WHERE api_key_hash = ? AND status = 'active'
    `).bind(apiKeyHash).first<Agent>();

    if (!result) {
      return null;
    }

    // Update last active
    await this.db.prepare(`
      UPDATE agents SET last_active_at = datetime('now') WHERE id = ?
    `).bind(result.id).run();

    return this.parseAgentRow(result);
  }

  async validateSession(sessionToken: string): Promise<Agent | null> {
    const tokenHash = await hashString(sessionToken);

    // Check KV first (faster)
    const kvSession = await this.sessions.get(tokenHash);
    if (kvSession) {
      const { agentId, expiresAt } = JSON.parse(kvSession);

      if (new Date() > new Date(expiresAt)) {
        await this.sessions.delete(tokenHash);
        return null;
      }

      const agent = await this.getAgentById(agentId);
      if (agent && agent.status === 'active') {
        // Update last active
        await this.db.prepare(`
          UPDATE agents SET last_active_at = datetime('now') WHERE id = ?
        `).bind(agentId).run();

        // Update session last used
        await this.db.prepare(`
          UPDATE sessions SET last_used_at = datetime('now') WHERE token_hash = ?
        `).bind(tokenHash).run();

        return agent;
      }
    }

    // Fallback to D1
    const session = await this.db.prepare(`
      SELECT * FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')
    `).bind(tokenHash).first();

    if (!session) {
      return null;
    }

    const agent = await this.getAgentById(session.agent_id as string);
    if (!agent || agent.status !== 'active') {
      return null;
    }

    // Update last active
    await this.db.prepare(`
      UPDATE agents SET last_active_at = datetime('now') WHERE id = ?
    `).bind(agent.id).run();

    return agent;
  }

  async invalidateSession(sessionToken: string): Promise<void> {
    const tokenHash = await hashString(sessionToken);

    await this.sessions.delete(tokenHash);
    await this.db.prepare(`
      DELETE FROM sessions WHERE token_hash = ?
    `).bind(tokenHash).run();
  }

  // ═══════════════════════════════════════════════════
  // AGENT MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getAgentById(id: string): Promise<Agent | null> {
    const result = await this.db.prepare(`
      SELECT * FROM agents WHERE id = ?
    `).bind(id).first<Agent>();

    return result ? this.parseAgentRow(result) : null;
  }

  async updateWallet(agentId: string, walletAddress: string): Promise<void> {
    await this.db.prepare(`
      UPDATE agents SET wallet_address = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(walletAddress, agentId).run();
  }

  async regenerateApiKey(agentId: string): Promise<string> {
    const newApiKey = await generateApiKey();
    const newApiKeyHash = await hashString(newApiKey);
    const newApiKeyPrefix = newApiKey.slice(0, 12) + '...';

    // Get old key prefix for history
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Update old key history as revoked
    await this.db.prepare(`
      UPDATE api_key_history
      SET revoked_at = datetime('now'), revoke_reason = 'regenerated'
      WHERE agent_id = ? AND revoked_at IS NULL
    `).bind(agentId).run();

    // Update agent with new key
    await this.db.prepare(`
      UPDATE agents
      SET api_key_hash = ?, api_key_prefix = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newApiKeyHash, newApiKeyPrefix, agentId).run();

    // Add new key to history
    await this.db.prepare(`
      INSERT INTO api_key_history (agent_id, api_key_prefix)
      VALUES (?, ?)
    `).bind(agentId, newApiKeyPrefix).run();

    // Invalidate all sessions for this agent
    await this.db.prepare(`
      DELETE FROM sessions WHERE agent_id = ?
    `).bind(agentId).run();

    return newApiKey;
  }

  // ═══════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════

  async checkRateLimit(agentId: string): Promise<{
    allowed: boolean;
    remaining: { minute: number; day: number };
  }> {
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const now = Date.now();
    const minuteKey = `rate:${agentId}:minute:${Math.floor(now / 60000)}`;
    const dayKey = `rate:${agentId}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, dayCount] = await Promise.all([
      this.rateLimits.get(minuteKey).then(v => parseInt(v || '0', 10)),
      this.rateLimits.get(dayKey).then(v => parseInt(v || '0', 10)),
    ]);

    const allowed =
      minuteCount < agent.requests_per_minute &&
      dayCount < agent.requests_per_day;

    return {
      allowed,
      remaining: {
        minute: Math.max(0, agent.requests_per_minute - minuteCount),
        day: Math.max(0, agent.requests_per_day - dayCount),
      },
    };
  }

  async recordRequest(agentId: string): Promise<void> {
    const now = Date.now();
    const minuteKey = `rate:${agentId}:minute:${Math.floor(now / 60000)}`;
    const dayKey = `rate:${agentId}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, dayCount] = await Promise.all([
      this.rateLimits.get(minuteKey).then(v => parseInt(v || '0', 10)),
      this.rateLimits.get(dayKey).then(v => parseInt(v || '0', 10)),
    ]);

    await Promise.all([
      this.rateLimits.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
      this.rateLimits.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 }),
    ]);
  }

  // ═══════════════════════════════════════════════════
  // ACTIVITY LOGGING
  // ═══════════════════════════════════════════════════

  async logActivity(
    agentId: string,
    action: string,
    details: Record<string, unknown>,
    ipAddress: string | null,
    status: 'success' | 'failed' | 'pending' = 'success',
    errorMessage?: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO agent_activity (agent_id, action, details, ip_address, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      agentId,
      action,
      JSON.stringify(details),
      ipAddress,
      status,
      errorMessage || null
    ).run();
  }

  // ─────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────

  private parseAgentRow(row: Agent): Agent {
    return {
      ...row,
      permissions: typeof row.permissions === 'string'
        ? JSON.parse(row.permissions)
        : row.permissions,
      metadata: row.metadata && typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata,
    };
  }
}
