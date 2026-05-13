var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-bNGp34/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.ts
var CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type"
};
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (url.pathname === "/" && request.method === "GET") {
      return handleHealth(env);
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env);
    }
    const allowsGetRoute = url.pathname === "/" && request.method === "GET" || url.pathname === "/health" && request.method === "GET" || url.pathname === "/solana/address-transactions" && request.method === "GET" || url.pathname === "/solana/price" && request.method === "GET" || url.pathname === "/solana/wallet-tokens" && request.method === "GET";
    if (request.method !== "POST" && !allowsGetRoute) {
      return new Response("Method not allowed. The claw only accepts POST here.", { status: 405 });
    }
    try {
      if (url.pathname === "/chat") {
        return await handleChat(request, env);
      }
      if (url.pathname === "/openai/responses") {
        return await handleOpenAIResponses(request, env);
      }
      if (url.pathname === "/tts") {
        return await handleTTS(request, env);
      }
      if (url.pathname === "/transcribe-token") {
        return await handleTranscribeToken(env);
      }
      if (url.pathname === "/solana/rpc") {
        return await handleSolanaRPC(request, env);
      }
      if (url.pathname === "/solana/balance") {
        return await handleSolanaBalance(request, env);
      }
      if (url.pathname === "/solana/tokens") {
        return await handleSolanaTokenAccounts(request, env);
      }
      if (url.pathname === "/solana/assets") {
        return await handleHeliusAssets(request, env);
      }
      if (url.pathname === "/solana/address-transactions" && request.method === "GET") {
        return await handleHeliusAddressTransactions(url, env);
      }
      if (url.pathname === "/solana/price" && request.method === "GET") {
        return await handleBirdeyePrice(url, env);
      }
      if (url.pathname === "/solana/wallet-tokens" && request.method === "GET") {
        return await handleBirdeyeWalletTokens(url, env);
      }
    } catch (error) {
      console.error(`[${url.pathname}] Clawd error:`, error);
      return new Response(
        JSON.stringify({ error: String(error), clawd: "the lobster encountered an error" }),
        { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
      );
    }
    return new Response("Not found. The claw doesn't reach there.", { status: 404 });
  }
};
function handleHealth(env) {
  const network = env.SOLANA_NETWORK || "mainnet-beta";
  return new Response(
    JSON.stringify({
      status: "clawing",
      name: "beepboop-clawd-gateway",
      network,
      routes: [
        "/chat",
        "/openai/responses",
        "/tts",
        "/transcribe-token",
        "/solana/rpc",
        "/solana/balance",
        "/solana/tokens",
        "/solana/assets",
        "/solana/address-transactions",
        "/solana/price",
        "/solana/wallet-tokens"
      ],
      providers: {
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
        openai: Boolean(env.OPENAI_API_KEY),
        helius: Boolean(env.HELIUS_RPC_URL || env.HELIUS_API_KEY),
        birdeye: Boolean(env.BIRDEYE_API_KEY),
        solanaWebsocket: Boolean(env.HELIUS_WSS_URL)
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}
__name(handleHealth, "handleHealth");
async function handleChat(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const body = await request.text();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/chat] Anthropic API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-cache",
      ...CORS_HEADERS
    }
  });
}
__name(handleChat, "handleChat");
async function handleOpenAIResponses(request, env) {
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const body = await request.text();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/openai/responses] OpenAI API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
      ...CORS_HEADERS
    }
  });
}
__name(handleOpenAIResponses, "handleOpenAIResponses");
async function handleTranscribeToken(env) {
  if (!env.ASSEMBLYAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ASSEMBLYAI_API_KEY is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const response = await fetch(
    "https://streaming.assemblyai.com/v3/token?expires_in_seconds=480",
    {
      method: "GET",
      headers: {
        authorization: env.ASSEMBLYAI_API_KEY
      }
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/transcribe-token] AssemblyAI token error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
  const data = await response.text();
  return new Response(data, {
    status: 200,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleTranscribeToken, "handleTranscribeToken");
async function handleTTS(request, env) {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID is not configured" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const body = await request.text();
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
        accept: "audio/mpeg"
      },
      body
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/tts] ElevenLabs API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "audio/mpeg",
      ...CORS_HEADERS
    }
  });
}
__name(handleTTS, "handleTTS");
function getSolanaRpcUrl(env) {
  const heliusBaseUrl = env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com";
  if (env.HELIUS_RPC_URL || env.HELIUS_API_KEY) {
    const heliusUrl = new URL(heliusBaseUrl);
    if (env.HELIUS_API_KEY && !heliusUrl.searchParams.has("api-key")) {
      heliusUrl.searchParams.set("api-key", env.HELIUS_API_KEY);
    }
    return heliusUrl.toString();
  }
  if (env.SOLANA_RPC_URL) {
    return env.SOLANA_RPC_URL;
  }
  const network = env.SOLANA_NETWORK || "mainnet-beta";
  return `https://api.${network}.solana.com`;
}
__name(getSolanaRpcUrl, "getSolanaRpcUrl");
function getHeliusRestUrl(env, path, params) {
  if (!env.HELIUS_API_KEY) {
    throw new Error("HELIUS_API_KEY is required for this route");
  }
  const url = new URL(`https://api.helius.xyz${path}`);
  url.searchParams.set("api-key", env.HELIUS_API_KEY);
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
__name(getHeliusRestUrl, "getHeliusRestUrl");
function getBirdeyeHeaders(env) {
  if (!env.BIRDEYE_API_KEY) {
    throw new Error("BIRDEYE_API_KEY is required for this route");
  }
  return {
    "x-api-key": env.BIRDEYE_API_KEY,
    "x-chain": "solana"
  };
}
__name(getBirdeyeHeaders, "getBirdeyeHeaders");
async function handleSolanaRPC(request, env) {
  const body = await request.text();
  const rpcUrl = getSolanaRpcUrl(env);
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/solana/rpc] Solana RPC error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
  const data = await response.text();
  return new Response(data, {
    status: 200,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleSolanaRPC, "handleSolanaRPC");
async function handleSolanaBalance(request, env) {
  const { address } = await request.json();
  if (!address) {
    return new Response(
      JSON.stringify({ error: "address is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const rpcUrl = getSolanaRpcUrl(env);
  const rpcBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address]
  });
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody
  });
  const result = await response.json();
  if (result.error) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const lamports = result.result?.value ?? 0;
  const sol = lamports / 1e9;
  return new Response(
    JSON.stringify({ address, lamports, sol, network: env.SOLANA_NETWORK || "mainnet-beta" }),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}
__name(handleSolanaBalance, "handleSolanaBalance");
async function handleSolanaTokenAccounts(request, env) {
  const { address } = await request.json();
  if (!address) {
    return new Response(
      JSON.stringify({ error: "address is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const rpcUrl = getSolanaRpcUrl(env);
  const rpcBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      address,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" }
    ]
  });
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody
  });
  const result = await response.json();
  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}
__name(handleSolanaTokenAccounts, "handleSolanaTokenAccounts");
async function handleHeliusAssets(request, env) {
  const { ownerAddress, page = 1, limit = 100 } = await request.json();
  if (!ownerAddress) {
    return new Response(
      JSON.stringify({ error: "ownerAddress is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const rpcBody = JSON.stringify({
    jsonrpc: "2.0",
    id: "clawd-assets",
    method: "getAssetsByOwner",
    params: {
      ownerAddress,
      page,
      limit,
      displayOptions: {
        showFungible: true
      }
    }
  });
  const response = await fetch(getSolanaRpcUrl(env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody
  });
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleHeliusAssets, "handleHeliusAssets");
async function handleHeliusAddressTransactions(url, env) {
  const address = url.searchParams.get("address");
  const limit = url.searchParams.get("limit") || "25";
  const before = url.searchParams.get("before");
  if (!address) {
    return new Response(
      JSON.stringify({ error: "address query parameter is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const heliusUrl = getHeliusRestUrl(env, `/v0/addresses/${address}/transactions`, {
    limit,
    ...before ? { before } : {}
  });
  const response = await fetch(heliusUrl, { headers: { accept: "application/json" } });
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleHeliusAddressTransactions, "handleHeliusAddressTransactions");
async function handleBirdeyePrice(url, env) {
  const address = url.searchParams.get("address");
  if (!address) {
    return new Response(
      JSON.stringify({ error: "address query parameter is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const response = await fetch(
    `https://public-api.birdeye.so/defi/price?address=${encodeURIComponent(address)}`,
    {
      headers: {
        accept: "application/json",
        ...getBirdeyeHeaders(env)
      }
    }
  );
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleBirdeyePrice, "handleBirdeyePrice");
async function handleBirdeyeWalletTokens(url, env) {
  const wallet = url.searchParams.get("wallet");
  if (!wallet) {
    return new Response(
      JSON.stringify({ error: "wallet query parameter is required" }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }
  const response = await fetch(
    `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${encodeURIComponent(wallet)}`,
    {
      headers: {
        accept: "application/json",
        ...getBirdeyeHeaders(env)
      }
    }
  );
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
}
__name(handleBirdeyeWalletTokens, "handleBirdeyeWalletTokens");

// ../../../../../../../opt/homebrew/Cellar/cloudflare-wrangler/4.64.0/libexec/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../../opt/homebrew/Cellar/cloudflare-wrangler/4.64.0/libexec/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-bNGp34/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../../../opt/homebrew/Cellar/cloudflare-wrangler/4.64.0/libexec/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-bNGp34/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
