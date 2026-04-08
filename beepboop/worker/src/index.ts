/**
 * Beep Boop Clawd Gateway Worker
 *
 * The lobster claw proxy. Routes requests to Claude (the brain),
 * ElevenLabs (the voice), AssemblyAI (the ears), and Solana RPC
 * (the blockchain). API keys are stored as Cloudflare secrets so
 * nothing sensitive ships in the app binary.
 *
 * Routes:
 *   POST /chat             -> Anthropic Messages API (streaming)
 *   POST /tts              -> ElevenLabs TTS API (lobster voice)
 *   POST /transcribe-token -> AssemblyAI websocket token
 *   POST /solana/rpc       -> Solana JSON-RPC proxy (mainnet/devnet)
 *   POST /solana/balance    -> Quick SOL balance lookup
 *   POST /solana/tokens     -> Token accounts for a wallet
 *   GET  /health            -> Clawd health check
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;
  ASSEMBLYAI_API_KEY: string;
  SOLANA_RPC_URL: string;
  SOLANA_NETWORK: string;
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

    // Health check — GET allowed
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed. The claw only accepts POST.", { status: 405 });
    }

    try {
      // Claude AI chat (the brain)
      if (url.pathname === "/chat") {
        return await handleChat(request, env);
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

// ── Health Check ─────────────────────────────────────────────────────

function handleHealth(env: Env): Response {
  const network = env.SOLANA_NETWORK || "mainnet-beta";
  return new Response(
    JSON.stringify({
      status: "clawing",
      name: "beepboop-clawd-gateway",
      network,
      routes: ["/chat", "/tts", "/transcribe-token", "/solana/rpc", "/solana/balance", "/solana/tokens"],
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } }
  );
}

// ── Claude Chat (The Brain) ──────────────────────────────────────────

async function handleChat(request: Request, env: Env): Promise<Response> {
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

// ── AssemblyAI Transcription Token (The Ears) ────────────────────────

async function handleTranscribeToken(env: Env): Promise<Response> {
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
  if (env.SOLANA_RPC_URL) {
    return env.SOLANA_RPC_URL;
  }
  const network = env.SOLANA_NETWORK || "mainnet-beta";
  return `https://api.${network}.solana.com`;
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
