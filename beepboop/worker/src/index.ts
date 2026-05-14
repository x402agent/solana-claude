/**
 * Beep Boop Clawd Gateway Worker
 *
 * The lobster claw proxy. Routes requests to Claude (the brain),
 * OpenAI (alternate brain), ElevenLabs (the voice), AssemblyAI (the ears),
 * and Solana data providers (the blockchain). API keys are stored as
 * Cloudflare secrets so nothing sensitive ships in the app binary.
 *
 * Routes:
 *   POST /chat                        -> Anthropic Messages API (streaming)
 *   POST /openai/responses            -> OpenAI Responses API
 *   POST /tts                         -> ElevenLabs TTS API (lobster voice)
 *   POST /transcribe-token            -> AssemblyAI websocket token
 *   POST /solana/rpc                  -> Solana / Helius JSON-RPC proxy
 *   POST /solana/balance              -> Quick SOL balance lookup
 *   POST /solana/tokens               -> Token accounts for a wallet
 *   POST /solana/assets               -> Helius DAS getAssetsByOwner
 *   GET  /solana/address-transactions -> Helius enhanced address history
 *   GET  /solana/price                -> Birdeye token price
 *   GET  /solana/wallet-tokens        -> Birdeye wallet token balances
 *   GET  /wallet.html                 -> Dynamic Solana wallet page
 *   GET  /health                      -> Clawd health check
 */

interface Env {
  ASSETS?: Fetcher;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ASSEMBLYAI_API_KEY?: string;
  SOLANA_RPC_URL?: string;
  SOLANA_NETWORK?: string;
  HELIUS_RPC_URL?: string;
  HELIUS_API_KEY?: string;
  HELIUS_WSS_URL?: string;
  BIRDEYE_API_KEY?: string;
  DYNAMIC_API_KEY?: string;
  DYNAMIC_ENVIRONMENT_ID?: string;
  DYNAMIC_ORGANIZATION_ID?: string;
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/site" ||
        url.pathname.startsWith("/site/") ||
        url.pathname === "/wallet.html" ||
        url.pathname.startsWith("/assets/"))
    ) {
      return handleSiteAsset(request, env);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return handleHealth(env);
    }

    // Health check — GET allowed
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env);
    }

    const allowsGetRoute =
      (url.pathname === "/" && request.method === "GET") ||
      (url.pathname === "/health" && request.method === "GET") ||
      (url.pathname === "/solana/address-transactions" && request.method === "GET") ||
      (url.pathname === "/solana/price" && request.method === "GET") ||
      (url.pathname === "/solana/wallet-tokens" && request.method === "GET");

    if (request.method !== "POST" && !allowsGetRoute) {
      return new Response("Method not allowed. The claw only accepts POST here.", { status: 405 });
    }

    try {
      // Claude AI chat (the brain)
      if (url.pathname === "/chat") {
        return await handleChat(request, env);
      }

      if (url.pathname === "/openai/responses") {
        return await handleOpenAIResponses(request, env);
      }

      // ElevenLabs TTS (the lobster voice)
      if (url.pathname === "/tts") {
        return await handleTTS(request, env);
      }

      // AssemblyAI transcription token (the ears)
      if (url.pathname === "/transcribe-token") {
        return await handleTranscribeToken(env);
      }

      // Solana JSON-RPC proxy (the blockchain claw)
      if (url.pathname === "/solana/rpc") {
        return await handleSolanaRPC(request, env);
      }

      // Quick SOL balance lookup
      if (url.pathname === "/solana/balance") {
        return await handleSolanaBalance(request, env);
      }

      // Token accounts for a wallet
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
  },
};

// ── Static Site ─────────────────────────────────────────────────────

function handleSiteAsset(request: Request, env: Env): Response | Promise<Response> {
  if (!env.ASSETS) {
    return new Response("Site assets are not configured for this deployment.", { status: 503 });
  }

  const assetUrl = new URL(request.url);
  if (assetUrl.pathname === "/site") {
    assetUrl.pathname = "/";
  } else if (assetUrl.pathname.startsWith("/site/")) {
    assetUrl.pathname = assetUrl.pathname.slice("/site".length) || "/";
  }

  return env.ASSETS.fetch(new Request(assetUrl, request));
}

// ── Health Check ─────────────────────────────────────────────────────

function handleHealth(env: Env): Response {
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
          "/solana/wallet-tokens",
          "/wallet.html",
        ],
        providers: {
          anthropic: Boolean(env.ANTHROPIC_API_KEY),
          openai: Boolean(env.OPENAI_API_KEY),
          helius: Boolean(env.HELIUS_RPC_URL || env.HELIUS_API_KEY),
          birdeye: Boolean(env.BIRDEYE_API_KEY),
          dynamic: Boolean(env.DYNAMIC_ENVIRONMENT_ID),
          solanaWebsocket: Boolean(env.HELIUS_WSS_URL),
        },
        timestamp: new Date().toISOString(),
      }),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}

// ── Claude Chat (The Brain) ──────────────────────────────────────────

async function handleChat(request: Request, env: Env): Promise<Response> {
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
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/chat] Anthropic API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-cache",
      ...CORS_HEADERS,
    },
  });
}

// ── OpenAI Responses (Alternate Brain) ──────────────────────────────

async function handleOpenAIResponses(request: Request, env: Env): Promise<Response> {
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
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/openai/responses] OpenAI API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
      ...CORS_HEADERS,
    },
  });
}

// ── AssemblyAI Transcription Token (The Ears) ────────────────────────

async function handleTranscribeToken(env: Env): Promise<Response> {
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
        authorization: env.ASSEMBLYAI_API_KEY,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/transcribe-token] AssemblyAI token error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const data = await response.text();
  return new Response(data, {
    status: 200,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

// ── ElevenLabs TTS (The Lobster Voice) ───────────────────────────────

async function handleTTS(request: Request, env: Env): Promise<Response> {
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
        accept: "audio/mpeg",
      },
      body,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/tts] ElevenLabs API error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "audio/mpeg",
      ...CORS_HEADERS,
    },
  });
}

// ── Solana JSON-RPC Proxy (The Blockchain Claw) ─────────────────────

function getSolanaRpcUrl(env: Env): string {
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

function getHeliusRestUrl(env: Env, path: string, params?: Record<string, string>): string {
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

function getBirdeyeHeaders(env: Env): Record<string, string> {
  if (!env.BIRDEYE_API_KEY) {
    throw new Error("BIRDEYE_API_KEY is required for this route");
  }

  return {
    "x-api-key": env.BIRDEYE_API_KEY,
    "x-chain": "solana",
  };
}

async function handleSolanaRPC(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const rpcUrl = getSolanaRpcUrl(env);

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[/solana/rpc] Solana RPC error ${response.status}: ${errorBody}`);
    return new Response(errorBody, {
      status: response.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const data = await response.text();
  return new Response(data, {
    status: 200,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function handleSolanaBalance(request: Request, env: Env): Promise<Response> {
  const { address } = (await request.json()) as { address: string };

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
    params: [address],
  });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody,
  });

  const result = (await response.json()) as { result?: { value: number }; error?: unknown };

  if (result.error) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400, headers: { "content-type": "application/json", ...CORS_HEADERS } }
    );
  }

  const lamports = result.result?.value ?? 0;
  const sol = lamports / 1_000_000_000;

  return new Response(
    JSON.stringify({ address, lamports, sol, network: env.SOLANA_NETWORK || "mainnet-beta" }),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}

async function handleSolanaTokenAccounts(request: Request, env: Env): Promise<Response> {
  const { address } = (await request.json()) as { address: string };

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
      { encoding: "jsonParsed" },
    ],
  });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody,
  });

  const result = await response.json();
  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}

async function handleHeliusAssets(request: Request, env: Env): Promise<Response> {
  const { ownerAddress, page = 1, limit = 100 } = (await request.json()) as {
    ownerAddress?: string;
    page?: number;
    limit?: number;
  };

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
        showFungible: true,
      },
    },
  });

  const response = await fetch(getSolanaRpcUrl(env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rpcBody,
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function handleHeliusAddressTransactions(url: URL, env: Env): Promise<Response> {
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
    ...(before ? { before } : {}),
  });

  const response = await fetch(heliusUrl, { headers: { accept: "application/json" } });
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function handleBirdeyePrice(url: URL, env: Env): Promise<Response> {
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
        ...getBirdeyeHeaders(env),
      },
    }
  );

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function handleBirdeyeWalletTokens(url: URL, env: Env): Promise<Response> {
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
        ...getBirdeyeHeaders(env),
      },
    }
  );

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
