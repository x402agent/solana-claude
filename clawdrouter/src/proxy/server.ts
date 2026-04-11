/**
 * ClawdRouter — Local Proxy Server
 * OpenAI-compatible API proxy on localhost:8402
 * Routes requests through the 15-dimension scorer, pays via x402
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ClawdRouterConfig,
  ClawdWallet,
  RoutingMeta,
  UsageStats,
} from '../types.js';
import { scoreRequest } from '../router/scorer.js';
import { routeRequest } from '../router/profiles.js';
import { getModel, resolveModelAlias, estimateCostPerRequest } from '../models/registry.js';
import { x402Fetch, PaymentTracker } from '../x402/payment.js';

// ── Proxy Server ────────────────────────────────────────────────────

export class ClawdRouterProxy {
  private server: ReturnType<typeof createServer> | null = null;
  private config: ClawdRouterConfig;
  private wallet: ClawdWallet;
  private tracker: PaymentTracker;
  private stats: UsageStats;

  constructor(config: ClawdRouterConfig, wallet: ClawdWallet) {
    this.config = config;
    this.wallet = wallet;
    this.tracker = new PaymentTracker();
    this.stats = createEmptyStats();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch(err => {
          console.error('  ✗ Request error:', err.message);
          sendJSON(res, 500, { error: { message: err.message, type: 'server_error' } });
        });
      });

      this.server.listen(this.config.port, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  getStats(): UsageStats {
    return { ...this.stats };
  }

  getTracker(): PaymentTracker {
    return this.tracker;
  }

  // ── Request Handler ─────────────────────────────────────────────

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? '/';

    // Route handlers
    if (url === '/' || url === '/health') {
      return this.handleHealth(res);
    }

    if (url === '/v1/models' || url === '/models') {
      return this.handleModels(res);
    }

    if (url === '/v1/chat/completions' || url === '/chat/completions') {
      return this.handleChatCompletion(req, res);
    }

    if (url === '/v1/stats' || url === '/stats') {
      return this.handleStats(res);
    }

    // 404 for everything else
    sendJSON(res, 404, {
      error: {
        message: `Unknown endpoint: ${url}. Use /v1/chat/completions for OpenAI-compatible requests.`,
        type: 'invalid_request',
      },
    });
  }

  // ── Health Check ──────────────────────────────────────────────────

  private handleHealth(res: ServerResponse): void {
    sendJSON(res, 200, {
      status: 'ok',
      service: 'clawdrouter',
      version: '0.1.0',
      wallet: this.wallet.publicKey,
      profile: this.config.profile,
      network: this.config.network,
      uptime: Math.floor((Date.now() - this.stats.sessionStart) / 1000),
      requests: this.stats.totalRequests,
    });
  }

  // ── Model Listing ─────────────────────────────────────────────────

  private handleModels(res: ServerResponse): void {
    const { MODEL_REGISTRY } = require('../models/registry.js');
    const models = MODEL_REGISTRY
      .filter((m: any) => m.enabled)
      .map((m: any) => ({
        id: m.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: m.provider,
        permission: [],
        root: m.id,
        parent: null,
      }));

    // Add the auto model
    models.unshift({
      id: 'clawdrouter/auto',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'clawdrouter',
      permission: [],
      root: 'clawdrouter/auto',
      parent: null,
    });

    sendJSON(res, 200, { object: 'list', data: models });
  }

  // ── Chat Completions ──────────────────────────────────────────────

  private async handleChatCompletion(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { error: { message: 'Method not allowed', type: 'invalid_request' } });
      return;
    }

    // Parse request body
    const body = await readBody(req);
    let request: ChatCompletionRequest;

    try {
      request = JSON.parse(body);
    } catch {
      sendJSON(res, 400, { error: { message: 'Invalid JSON body', type: 'invalid_request' } });
      return;
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      sendJSON(res, 400, { error: { message: 'messages field is required', type: 'invalid_request' } });
      return;
    }

    const startTime = performance.now();

    // ── Step 1: Determine target model ──────────────────────────
    let routedModel: string;
    let routingMeta: RoutingMeta;

    const requestedModel = request.model ?? 'clawdrouter/auto';

    if (requestedModel === 'clawdrouter/auto' || requestedModel === 'blockrun/auto' || requestedModel === 'auto') {
      // Smart routing: score the request and route
      const scored = scoreRequest(request.messages);
      const { model, fallback } = routeRequest(scored, this.config.profile, this.config.excludedModels);
      routedModel = model.id;

      const opusCost = estimateCostPerRequest(getModel('anthropic/claude-opus-4.6')!);
      const modelCost = estimateCostPerRequest(model);

      routingMeta = {
        requestedModel,
        routedModel: model.id,
        tier: scored.tier,
        profile: this.config.profile,
        routingTimeMs: performance.now() - startTime,
        estimatedCost: modelCost,
        savings: opusCost > 0 ? (1 - modelCost / opusCost) : 0,
      };

      if (this.config.debug) {
        console.log(`  🧠 ${scored.reasoning}`);
        console.log(`  → ${model.name} (${model.id})${fallback ? ' [fallback]' : ''}`);
      }
    } else {
      // Direct model selection (or alias resolution)
      const resolved = resolveModelAlias(requestedModel) ?? requestedModel;
      const model = getModel(resolved);
      routedModel = model?.id ?? resolved;

      const modelCost = model ? estimateCostPerRequest(model) : 0;
      const opusCost = estimateCostPerRequest(getModel('anthropic/claude-opus-4.6')!);

      routingMeta = {
        requestedModel,
        routedModel,
        tier: 'MEDIUM',
        profile: this.config.profile,
        routingTimeMs: performance.now() - startTime,
        estimatedCost: modelCost,
        savings: opusCost > 0 ? (1 - modelCost / opusCost) : 0,
      };
    }

    // ── Step 2: Forward to upstream with x402 payment ───────────
    const upstreamUrl = `${this.config.upstreamUrl}/v1/chat/completions`;
    const upstreamBody = {
      ...request,
      model: routedModel,
    };

    try {
      const upstreamResponse = await x402Fetch(
        upstreamUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer x402:${this.wallet.publicKey}`,
            'X-ClawdRouter-Version': '0.1.0',
            'X-ClawdRouter-Profile': this.config.profile,
          },
          body: JSON.stringify(upstreamBody),
        },
        this.wallet,
        this.config,
        this.tracker,
      );

      // ── Step 3: Return response with routing metadata ─────────
      if (request.stream) {
        // Stream response
        res.writeHead(upstreamResponse.status, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-ClawdRouter-Model': routedModel,
          'X-ClawdRouter-Tier': routingMeta.tier,
          'X-ClawdRouter-Savings': `${(routingMeta.savings * 100).toFixed(0)}%`,
        });

        const reader = upstreamResponse.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        }
        res.end();
      } else {
        // Non-streaming response
        const responseBody = await upstreamResponse.text();
        let parsed: any;

        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = { error: { message: 'Invalid upstream response', raw: responseBody } };
        }

        // Inject routing metadata
        parsed.x_clawdrouter = routingMeta;

        // Update stats
        this.updateStats(routingMeta, parsed.usage);

        // Add routing headers
        res.setHeader('X-ClawdRouter-Model', routedModel);
        res.setHeader('X-ClawdRouter-Tier', routingMeta.tier);
        res.setHeader('X-ClawdRouter-Savings', `${(routingMeta.savings * 100).toFixed(0)}%`);
        res.setHeader('X-ClawdRouter-Time', `${routingMeta.routingTimeMs.toFixed(2)}ms`);

        sendJSON(res, upstreamResponse.status, parsed);
      }
    } catch (error: any) {
      console.error(`  ✗ Upstream error: ${error.message}`);

      sendJSON(res, 502, {
        error: {
          message: `Upstream request failed: ${error.message}`,
          type: 'upstream_error',
          x_clawdrouter: routingMeta,
        },
      });
    }
  }

  // ── Stats Endpoint ────────────────────────────────────────────────

  private handleStats(res: ServerResponse): void {
    sendJSON(res, 200, {
      ...this.stats,
      paymentHistory: this.tracker.getByModel(),
      sessionSpent: this.tracker.sessionTotal,
    });
  }

  // ── Stats Update ──────────────────────────────────────────────────

  private updateStats(meta: RoutingMeta, usage?: { prompt_tokens?: number; completion_tokens?: number }): void {
    this.stats.totalRequests++;
    this.stats.totalInputTokens += usage?.prompt_tokens ?? 0;
    this.stats.totalOutputTokens += usage?.completion_tokens ?? 0;
    this.stats.totalCostUSDC += meta.estimatedCost;

    const opusCost = estimateCostPerRequest(getModel('anthropic/claude-opus-4.6')!);
    this.stats.totalSavedUSDC += (opusCost - meta.estimatedCost);

    // Track by model
    if (!this.stats.byModel[meta.routedModel]) {
      this.stats.byModel[meta.routedModel] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUSDC: 0,
      };
    }
    this.stats.byModel[meta.routedModel]!.requests++;
    this.stats.byModel[meta.routedModel]!.inputTokens += usage?.prompt_tokens ?? 0;
    this.stats.byModel[meta.routedModel]!.outputTokens += usage?.completion_tokens ?? 0;
    this.stats.byModel[meta.routedModel]!.costUSDC += meta.estimatedCost;

    // Track by tier
    this.stats.byTier[meta.tier] = (this.stats.byTier[meta.tier] ?? 0) + 1;
  }
}

// ── Helper Functions ────────────────────────────────────────────────

function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function createEmptyStats(): UsageStats {
  return {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSDC: 0,
    totalSavedUSDC: 0,
    byModel: {},
    byTier: { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0, REASONING: 0 },
    sessionStart: Date.now(),
  };
}
