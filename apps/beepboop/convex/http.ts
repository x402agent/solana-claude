import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

/** POST /install — called by the Cloudflare worker to record installs */
http.route({
  path: "/install",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as {
      source: string;
      os: string;
      arch: string;
      nodeVersion?: string;
      status: string;
      sessionId: string;
      message?: string;
      ip?: string;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      undefined;

    const id = await ctx.runMutation(api.installs.track, {
      source: body.source ?? "unknown",
      os: body.os ?? "unknown",
      arch: body.arch ?? "unknown",
      nodeVersion: body.nodeVersion,
      status: body.status ?? "unknown",
      sessionId: body.sessionId ?? `anon-${Date.now()}`,
      message: body.message,
      ip,
    });

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
    });
  }),
});

/** GET /stats — public install stats for the hub */
http.route({
  path: "/stats",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const stats = await ctx.runQuery(api.installs.stats, {});
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
    });
  }),
});

/** GET /recent — recent installs list (operator only, no auth for now) */
http.route({
  path: "/recent",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const installs = await ctx.runQuery(api.installs.listRecent, { limit: 50 });
    return new Response(JSON.stringify(installs), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
    });
  }),
});

/** POST /link-wallet — associate a wallet with a session after Dynamic login */
http.route({
  path: "/link-wallet",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { sessionId, walletAddress } = (await request.json()) as {
      sessionId: string;
      walletAddress: string;
    };

    if (!sessionId || !walletAddress) {
      return new Response(JSON.stringify({ error: "sessionId and walletAddress required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS },
      });
    }

    await ctx.runMutation(api.installs.linkWallet, { sessionId, walletAddress });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS },
    });
  }),
});

// OPTIONS preflight for all routes
for (const path of ["/install", "/stats", "/recent", "/link-wallet"]) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
  });
}

export default http;
