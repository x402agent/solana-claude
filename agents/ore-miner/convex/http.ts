import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';

const http = httpRouter();

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(JSON.stringify({
      ok: true,
      service: 'ore-miner-convex',
      timestamp: Date.now(),
    }), {
      headers: { 'content-type': 'application/json' },
    });
  }),
});

http.route({
  path: '/ore/latest',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const agentSlug = url.searchParams.get('agentSlug') ?? 'ore-miner';
    const snapshot = await ctx.runQuery(api.oreMining.getLatestRunSnapshot, { agentSlug });
    return new Response(JSON.stringify(snapshot), {
      headers: { 'content-type': 'application/json' },
    });
  }),
});

http.route({
  path: '/ore/conversation',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sessionKey = url.searchParams.get('sessionKey');
    if (!sessionKey) {
      return new Response(JSON.stringify({ error: 'sessionKey query param required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const conversation = await ctx.runQuery(api.oreMining.getConversationThread, { sessionKey });
    return new Response(JSON.stringify(conversation), {
      headers: { 'content-type': 'application/json' },
    });
  }),
});

export default http;
