// Thin client for the OpenClawd AutoResearch API (llm-wiki-tang).
// Powers /research and /autoloop slash commands. Uses RESEARCH_API_URL or
// defaults to http://localhost:8000.

const DEFAULT_BASE = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 60_000;

export interface ResearchClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
  tier?: string;
}

export class ResearchError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export interface ResearchResponse {
  id: string;
  agent: string;
  query: string;
  results: Record<string, unknown>;
  confidence: number;
  sources: string[];
  cost: { sol: number; clawd: number; tier: string };
  metadata: Record<string, unknown>;
}

export class ResearchClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly tier?: string;
  private readonly apiKey?: string;

  constructor(opts: ResearchClientOptions = {}) {
    this.base = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, '');
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.tier = opts.tier;
    this.apiKey = opts.apiKey;
  }

  private async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.tier) headers['x-tier'] = this.tier;
    if (this.apiKey) headers['authorization'] = `Bearer ${this.apiKey}`;
    try {
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers,
        signal: ctl.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new ResearchError(`${res.status} ${res.statusText} ${txt.slice(0, 200)}`, res.status);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }

  chain(payload: ChainResearchPayload): Promise<ResearchResponse> {
    return this.request('POST', '/api/v1/research/chain', payload);
  }

  defi(payload: DefiResearchPayload): Promise<ResearchResponse> {
    return this.request('POST', '/api/v1/research/defi', payload);
  }

  market(payload: MarketResearchPayload): Promise<ResearchResponse> {
    return this.request('POST', '/api/v1/research/market', payload);
  }

  startAutoloop(): Promise<{ running: boolean; newly_started: boolean; interval_seconds: number }> {
    return this.request('POST', '/api/v1/research/autoloop/start');
  }

  stopAutoloop(): Promise<{ running: boolean }> {
    return this.request('POST', '/api/v1/research/autoloop/stop');
  }

  autoloopStatus(): Promise<AutoloopStatus> {
    return this.request('GET', '/api/v1/research/autoloop/status');
  }

  addMandate(mandate: AutoloopMandate): Promise<unknown> {
    return this.request('POST', '/api/v1/research/autoloop/mandates', mandate);
  }

  listMandates(): Promise<{ mandates: AutoloopMandate[] }> {
    return this.request('GET', '/api/v1/research/autoloop/mandates');
  }

  removeMandate(name: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/research/autoloop/mandates/${encodeURIComponent(name)}`);
  }

  listRuns(kind?: string, limit = 20): Promise<{ runs: ResearchRun[] }> {
    const q = new URLSearchParams();
    if (kind) q.set('kind', kind);
    q.set('limit', String(limit));
    return this.request('GET', `/api/v1/research/runs?${q.toString()}`);
  }
}

export interface ChainResearchPayload {
  query: string;
  focus?: ('pump_fun' | 'tokens' | 'protocols' | 'nfts' | 'wallets' | 'graduation')[];
  timeframe?: string;
  limit?: number;
  mint?: string;
  wallet?: string;
}

export interface DefiResearchPayload {
  action: 'yield_scan' | 'lp_analysis' | 'arbitrage' | 'protocol_research' | 'swap_route';
  protocols?: string[];
  assets?: string[];
  focus?: string[];
  amount?: number;
  risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface MarketResearchPayload {
  focus: 'sentiment' | 'trends' | 'alpha' | 'narratives' | 'whale_moves';
  tokens?: string[];
  sources?: string[];
  timeframe?: string;
  include_social?: boolean;
}

export interface AutoloopMandate {
  name: string;
  kind: 'chain' | 'defi' | 'market';
  payload: Record<string, unknown>;
  enabled?: boolean;
  interval_seconds?: number;
}

export interface AutoloopStatus {
  running: boolean;
  last_tick: string | null;
  tick_count: number;
  mandates: AutoloopMandate[];
  interval_seconds: number;
  max_concurrent: number;
  recent_errors: string[];
}

export interface ResearchRun {
  id: string;
  kind: string;
  agent: string;
  query: string;
  sources: string[];
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
}
