/**
 * CLAWD HTTP Endpoints
 *
 * Provides a simple HTTP API for curl-based agents and external tools
 * to interact with the CLAWD Convex backend without needing the Convex client SDK.
 *
 * Routes:
 *   POST /clawd/register  - Register/install an agent
 *   POST /clawd/heartbeat - Push a heartbeat
 *   POST /clawd/data      - Store data for an agent
 *   GET  /clawd/data      - Retrieve data for an agent
 *   GET  /clawd/agent     - Get agent info + latest heartbeat
 *   GET  /clawd/agents    - List all agents
 *
 * Authentication:
 *   Agents identify via ?agentId= query param or X-Agent-Id header.
 */
import { httpAction } from '../_generated/server';
import { api } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';

/**
 * Safely parse JSON body from request, returning null on failure.
 */
async function parseBody(request: Request): Promise<Record<string, any> | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract agentId from request (header or query param).
 */
function getAgentId(request: Request): string | null {
  const fromHeader = request.headers.get('X-Agent-Id');
  if (fromHeader) return fromHeader;
  const url = new URL(request.url);
  return url.searchParams.get('agentId');
}

/**
 * POST /clawd/register
 *
 * Register an agent. For curl installs:
 *   curl -X POST https://giddy-dragon-7.convex.site/clawd/register \
 *     -H "Content-Type: application/json" \
 *     -d '{"agentId":"my-agent-1","name":"My Agent","installMethod":"curl"}'
 */
export const registerHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await parseBody(request);
  if (!body || !body.agentId || !body.name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: agentId, name' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = await ctx.runMutation(api.clawd.agents.registerAgent, {
    agentId: body.agentId,
    name: body.name,
    installMethod: body.installMethod || 'curl',
    source: body.source,
    metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
    address: body.address,
    tags: body.tags,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * POST /clawd/heartbeat
 *
 * Push a heartbeat. For automaton or curl agents:
 *   curl -X POST https://giddy-dragon-7.convex.site/clawd/heartbeat \
 *     -H "Content-Type: application/json" \
 *     -d '{"agentId":"my-agent-1","state":"running","uptimeSeconds":3600}'
 */
export const heartbeatHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await parseBody(request);
  const agentId = body?.agentId || getAgentId(request);

  if (!agentId) {
    return new Response(
      JSON.stringify({ error: 'Missing agentId in body, header, or query param' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Auto-register if the agent doesn't exist yet
  const agent = await ctx.runQuery(api.clawd.agents.getAgent, { agentId });
  if (!agent) {
    await ctx.runMutation(api.clawd.agents.registerAgent, {
      agentId,
      name: body?.name || `agent-${agentId.slice(0, 8)}`,
      installMethod: 'curl',
      metadata: body?.metadata ? JSON.stringify(body.metadata) : undefined,
    });
  }

  const result = await ctx.runMutation(api.clawd.heartbeats.recordHeartbeat, {
    agentId,
    state: body?.state,
    creditsCents: body?.creditsCents,
    usdcBalance: body?.usdcBalance,
    uptimeSeconds: body?.uptimeSeconds,
    version: body?.version,
    sandboxId: body?.sandboxId,
    turnCount: body?.turnCount,
    skillCount: body?.skillCount,
    tier: body?.tier,
    statusPayload: body?.statusPayload ? JSON.stringify(body.statusPayload) : undefined,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * POST /clawd/data
 *
 * Store data for an agent (key-value):
 *   curl -X POST https://giddy-dragon-7.convex.site/clawd/data \
 *     -H "Content-Type: application/json" \
 *     -d '{"agentId":"my-agent-1","key":"my-state","value":"{\"foo\":\"bar\"}","contentType":"application/json"}'
 */
export const setDataHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await parseBody(request);
  const agentId = body?.agentId || getAgentId(request);

  if (!agentId || !body?.key || body?.value === undefined) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: agentId, key, value' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = await ctx.runMutation(api.clawd.data.setData, {
    agentId,
    key: body.key,
    value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
    contentType: body.contentType,
    tags: body.tags,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * GET /clawd/data?agentId=xxx&key=yyy
 *
 * Retrieve data for an agent by key.
 *   curl "https://giddy-dragon-7.convex.site/clawd/data?agentId=my-agent-1&key=my-state"
 */
export const getDataHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const agentId = getAgentId(request);
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!agentId || !key) {
    return new Response(
      JSON.stringify({ error: 'Missing required query params: agentId, key' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = await ctx.runQuery(api.clawd.data.getData, { agentId, key });
  if (!result) {
    return new Response(
      JSON.stringify({ error: `Key '${key}' not found for agent '${agentId}'` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * GET /clawd/data/list?agentId=xxx
 *
 * List all data keys for an agent.
 *   curl "https://giddy-dragon-7.convex.site/clawd/data/list?agentId=my-agent-1"
 */
export const listDataHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const agentId = getAgentId(request);
  if (!agentId) {
    return new Response(
      JSON.stringify({ error: 'Missing agentId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = await ctx.runQuery(api.clawd.data.listData, { agentId });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * GET /clawd/agent?agentId=xxx
 *
 * Get agent info + latest heartbeat.
 *   curl "https://giddy-dragon-7.convex.site/clawd/agent?agentId=my-agent-1"
 */
export const getAgentHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  const agentId = getAgentId(request);
  if (!agentId) {
    return new Response(
      JSON.stringify({ error: 'Missing agentId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const agent = await ctx.runQuery(api.clawd.agents.getAgent, { agentId });
  if (!agent) {
    return new Response(
      JSON.stringify({ error: `Agent '${agentId}' not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify(agent), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * GET /clawd/agents
 *
 * List all agents.
 *   curl "https://giddy-dragon-7.convex.site/clawd/agents"
 *   curl "https://giddy-dragon-7.convex.site/clawd/agents?active=true"
 */
export const listAgentsHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active') === 'true';

  const agents = activeOnly
    ? await ctx.runQuery(api.clawd.agents.listActiveAgents)
    : await ctx.runQuery(api.clawd.agents.listAllAgents);

  return new Response(JSON.stringify(agents), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * GET /clawd/activity?agentId=xxx&limit=50
 *
 * Get activity log for an agent.
 *   curl "https://giddy-dragon-7.convex.site/clawd/activity?agentId=my-agent-1&limit=20"
 */
export const getActivityHandler = httpAction(async (ctx: ActionCtx, request: Request) => {
  const agentId = getAgentId(request);
  if (!agentId) {
    return new Response(
      JSON.stringify({ error: 'Missing agentId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const activity = await ctx.runQuery(api.clawd.activity.getActivity, { agentId, limit });
  return new Response(JSON.stringify(activity), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

