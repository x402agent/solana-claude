/**
 * CLAWD Convex Client
 *
 * Lightweight HTTP client for the automaton to communicate with
 * the CLAWD Convex backend for agent tracking, heartbeats, and
 * key-value data storage.
 *
 * Uses the Convex HTTP actions defined in convex/clawd/http.ts.
 * No external dependencies needed — just uses fetch.
 */

export interface ConvexClientOptions {
  /** Base URL of the Convex deployment (e.g. https://giddy-dragon-7.convex.site) */
  siteUrl: string;
  /** Optional agent identifier */
  agentId?: string;
}

/**
 * Result of registering an agent.
 */
export interface RegisterResult {
  registered: boolean;
  agentId: string;
  firstSeen: number;
}

/**
 * Result of recording a heartbeat.
 */
export interface HeartbeatResult {
  recorded: boolean;
  timestamp: number;
}

/**
 * Result of storing data.
 */
export interface DataResult {
  stored: boolean;
  key: string;
  updatedAt: number;
}

/**
 * Agent data entry returned from Convex.
 */
export interface AgentDataEntry {
  _id: string;
  agentId: string;
  key: string;
  value: string;
  contentType?: string;
  tags?: string[];
  updatedAt: number;
  _creationTime: number;
}

/**
 * Agent info returned from Convex.
 */
export interface AgentInfo {
  _id: string;
  agentId: string;
  name: string;
  installMethod: string;
  active: boolean;
  firstSeen: number;
  lastSeen: number;
  metadata?: string;
  address?: string;
  source?: string;
  tags?: string[];
  latestHeartbeat?: {
    state?: string;
    creditsCents?: number;
    uptimeSeconds?: number;
    timestamp?: number;
    tier?: string;
  };
}

/**
 * Creates a CLAWD Convex client for the automaton.
 */
export function createConvexClient(
  options: ConvexClientOptions,
) {
  const baseUrl = options.siteUrl.replace(/\/$/, '');
  const defaultAgentId = options.agentId;

  /**
   * Make an HTTP request to a CLAWD endpoint.
   */
  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (defaultAgentId) {
      headers['X-Agent-Id'] = defaultAgentId;
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `Convex API error: ${method} ${path} -> ${resp.status}: ${text}`,
      );
    }

    return resp.json() as Promise<T>;
  }

  /**
   * Register / install an agent.
   */
  async function registerAgent(params: {
    agentId: string;
    name: string;
    installMethod?: string;
    source?: string;
    metadata?: string;
    address?: string;
    tags?: string[];
  }): Promise<RegisterResult> {
    return request<RegisterResult>('POST', '/clawd/register', {
      agentId: params.agentId,
      name: params.name,
      installMethod: params.installMethod || 'automaton',
      source: params.source,
      metadata: params.metadata,
      address: params.address,
      tags: params.tags,
    });
  }

  /**
   * Push a heartbeat.
   */
  async function sendHeartbeat(params: {
    agentId: string;
    state?: string;
    creditsCents?: number;
    usdcBalance?: number;
    uptimeSeconds?: number;
    version?: string;
    sandboxId?: string;
    turnCount?: number;
    skillCount?: number;
    tier?: string;
    statusPayload?: Record<string, any>;
  }): Promise<HeartbeatResult> {
    return request<HeartbeatResult>('POST', '/clawd/heartbeat', {
      agentId: params.agentId,
      state: params.state,
      creditsCents: params.creditsCents,
      usdcBalance: params.usdcBalance,
      uptimeSeconds: params.uptimeSeconds,
      version: params.version,
      sandboxId: params.sandboxId,
      turnCount: params.turnCount,
      skillCount: params.skillCount,
      tier: params.tier,
      statusPayload: params.statusPayload,
    });
  }

  /**
   * Store key-value data for an agent.
   */
  async function setData(params: {
    agentId: string;
    key: string;
    value: string;
    contentType?: string;
    tags?: string[];
  }): Promise<DataResult> {
    return request<DataResult>('POST', '/clawd/data', {
      agentId: params.agentId,
      key: params.key,
      value: params.value,
      contentType: params.contentType,
      tags: params.tags,
    });
  }

  /**
   * Retrieve data for an agent by key.
   */
  async function getData(params: {
    agentId: string;
    key: string;
  }): Promise<AgentDataEntry | null> {
    return request<AgentDataEntry | null>(
      'GET',
      `/clawd/data?agentId=${encodeURIComponent(params.agentId)}&key=${encodeURIComponent(params.key)}`,
    );
  }

  /**
   * List all data keys for an agent.
   */
  async function listData(params: {
    agentId: string;
  }): Promise<Array<{
    key: string;
    contentType?: string;
    tags?: string[];
    updatedAt: number;
    valuePreview: string;
  }>> {
    return request('GET', `/clawd/data/list?agentId=${encodeURIComponent(params.agentId)}`);
  }

  /**
   * Get agent info + latest heartbeat.
   */
  async function getAgent(params: {
    agentId: string;
  }): Promise<AgentInfo | null> {
    return request<AgentInfo>(
      'GET',
      `/clawd/agent?agentId=${encodeURIComponent(params.agentId)}`,
    );
  }

  /**
   * List all agents (optionally only active ones).
   */
  async function listAgents(params?: {
    activeOnly?: boolean;
  }): Promise<AgentInfo[]> {
    const activeParam = params?.activeOnly ? '?active=true' : '';
    return request<AgentInfo[]>('GET', `/clawd/agents${activeParam}`);
  }

  return {
    registerAgent,
    sendHeartbeat,
    setData,
    getData,
    listData,
    getAgent,
    listAgents,
  };
}

export type ConvexAgentClient = ReturnType<typeof createConvexClient>;

