// Solana Client Orchestrator — $CLAWD worker swarm coordinator
//
// Coordinates cross-language Solana operations via iii:
//   data-worker (Python)   — wallet balances, token analytics, whale detection
//   compute-worker (Rust)  — tx building, priority fees, risk scoring
//   payment-worker (TS)    — SPL transfers, Jupiter swaps, tx submission

import { registerWorker, Logger } from "iii-sdk";

const iii = registerWorker(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134",
);
const logger = new Logger();

// ── Shared Solana config across all workers ──────────────────────────────────

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";

await iii.trigger({
  function_id: "state::set",
  payload: { scope: "shared", key: "SOLANA_RPC_URL", data: SOLANA_RPC },
});
await iii.trigger({
  function_id: "state::set",
  payload: { scope: "shared", key: "HELIUS_API_KEY", data: HELIUS_KEY },
});
await iii.trigger({
  function_id: "state::set",
  payload: { scope: "shared", key: "WORKER_VERSION", data: "1.0.0" },
});

// ── Health ───────────────────────────────────────────────────────────────────

const health = iii.registerFunction({ id: "client::health" }, async () => {
  logger.info("Health check OK");
  return {
    status: 200,
    body: {
      healthy: true,
      service: "solana-clawd-orchestrator",
      rpc: SOLANA_RPC,
      timestamp: Date.now(),
      workers: ["data-worker", "compute-worker", "payment-worker"],
    },
  };
});

iii.registerTrigger({
  type: "http",
  function_id: health.id,
  config: { api_path: "/health", http_method: "GET" },
});

iii.registerTrigger({
  type: "cron",
  function_id: health.id,
  config: { expression: "*/30 * * * * * *" },
});

// ── Wallet info ──────────────────────────────────────────────────────────────

const walletInfo = iii.registerFunction(
  { id: "client::wallet" },
  async (payload) => {
    const body = payload.body ?? payload;
    const address = body.address;
    if (!address) return { status: 400, body: { error: "address required" } };

    logger.info("Fetching wallet", { address });

    const [balRes, tokRes] = await Promise.allSettled([
      iii.trigger({ function_id: "data-worker::wallet_balance", payload: { address } }),
      iii.trigger({ function_id: "data-worker::wallet_tokens", payload: { address } }),
    ]);

    return {
      status: 200,
      body: {
        address,
        balance: balRes.status === "fulfilled" ? balRes.value : { error: String(balRes.reason) },
        tokens: tokRes.status === "fulfilled" ? tokRes.value : { error: String(tokRes.reason) },
      },
    };
  },
);

iii.registerTrigger({
  type: "http",
  function_id: walletInfo.id,
  config: { api_path: "/wallet", http_method: "POST" },
});

// ── Token research ───────────────────────────────────────────────────────────

const research = iii.registerFunction(
  { id: "client::research" },
  async (payload) => {
    const body = payload.body ?? payload;
    const mint = body.mint;
    if (!mint) return { status: 400, body: { error: "mint required" } };

    logger.info("Researching token", { mint });

    const [metaRes, riskRes] = await Promise.allSettled([
      iii.trigger({ function_id: "data-worker::token_analytics", payload: { mint } }),
      iii.trigger({ function_id: "compute-worker::risk_score", payload: { mint } }),
    ]);

    return {
      status: 200,
      body: {
        mint,
        analytics: metaRes.status === "fulfilled" ? metaRes.value : { error: String(metaRes.reason) },
        risk: riskRes.status === "fulfilled" ? riskRes.value : { error: String(riskRes.reason) },
      },
    };
  },
);

iii.registerTrigger({
  type: "http",
  function_id: research.id,
  config: { api_path: "/research", http_method: "POST" },
});

// ── Swap (buy/sell via Jupiter) ──────────────────────────────────────────────

const swap = iii.registerFunction(
  { id: "client::swap" },
  async (payload) => {
    const body = payload.body ?? payload;
    const { input_mint, output_mint, amount_lamports, slippage_bps, wallet } = body;

    if (!input_mint || !output_mint || !amount_lamports || !wallet) {
      return { status: 400, body: { error: "input_mint, output_mint, amount_lamports, wallet required" } };
    }

    logger.info("Swap", { input_mint, output_mint, amount_lamports });

    // 1. compute-worker builds optimized tx
    let txResult: any;
    try {
      txResult = await iii.trigger({
        function_id: "compute-worker::build_swap_tx",
        payload: { input_mint, output_mint, amount_lamports, slippage_bps: slippage_bps ?? 100, wallet },
      });
    } catch (err) {
      return { status: 500, body: { error: "tx build failed", detail: String(err) } };
    }

    // 2. payment-worker signs and submits
    try {
      const submitResult = await iii.trigger({
        function_id: "payment-worker::submit_transaction",
        payload: { transaction: txResult.transaction, wallet },
      }) as any;
      return { status: 200, body: { success: true, signature: submitResult.signature, input_mint, output_mint, amount_lamports } };
    } catch (err) {
      return { status: 500, body: { error: "tx submit failed", detail: String(err) } };
    }
  },
);

iii.registerTrigger({
  type: "http",
  function_id: swap.id,
  config: { api_path: "/swap", http_method: "POST" },
});

// ── Transfer SOL / SPL ──────────────────────────────────────────────────────

const transfer = iii.registerFunction(
  { id: "client::transfer" },
  async (payload) => {
    const body = payload.body ?? payload;
    const { from, to, amount_lamports, mint } = body;
    if (!from || !to || !amount_lamports) {
      return { status: 400, body: { error: "from, to, amount_lamports required" } };
    }

    try {
      const result = await iii.trigger({
        function_id: "payment-worker::transfer",
        payload: { from, to, amount_lamports, mint },
      });
      return { status: 200, body: result };
    } catch (err) {
      return { status: 500, body: { error: "transfer failed", detail: String(err) } };
    }
  },
);

iii.registerTrigger({
  type: "http",
  function_id: transfer.id,
  config: { api_path: "/transfer", http_method: "POST" },
});

// ── Priority fee estimator (cron every 30s) ─────────────────────────────────

async function fetchPriorityFees(): Promise<Record<string, unknown>> {
  const resp = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getRecentPrioritizationFees",
      params: [],
    }),
  });
  const json = (await resp.json()) as { result?: { prioritizationFee: number }[] };
  const values = (json.result ?? [])
    .map((f) => f.prioritizationFee)
    .sort((a, b) => a - b);
  const len = values.length;
  return {
    source: "client",
    samples: len,
    micro_lamports: {
      p25: len > 0 ? values[Math.floor(len / 4)] : 0,
      p50: len > 0 ? values[Math.floor(len / 2)] : 0,
      p75: len > 0 ? values[Math.floor((len * 3) / 4)] : 0,
      p95: len > 0 ? values[Math.floor((len * 95) / 100)] : 0,
    },
  };
}

const feeEstimator = iii.registerFunction(
  { id: "client::estimate_fees" },
  async () => {
    try {
      const fees = await fetchPriorityFees();
      await iii.trigger({
        function_id: "state::set",
        payload: { scope: "shared", key: "LATEST_PRIORITY_FEES", data: fees },
      });
      return { status: 200, body: fees };
    } catch (err) {
      return { status: 500, body: { error: "fee estimation failed" } };
    }
  },
);

iii.registerTrigger({
  type: "http",
  function_id: feeEstimator.id,
  config: { api_path: "/fees", http_method: "GET" },
});

iii.registerTrigger({
  type: "cron",
  function_id: feeEstimator.id,
  config: { expression: "*/30 * * * * * *" },
});

// ── Full orchestration (backwards-compatible + Solana) ──────────────────────

const orchestrate = iii.registerFunction(
  { id: "client::orchestrate" },
  async (payload) => {
    const body = payload.body ?? payload;
    const data = body.data ?? body;
    const results: { errors: any[]; [key: string]: unknown } = { errors: [] };

    const [dataResult, computeResult] = await Promise.allSettled([
      iii.trigger({ function_id: "data-worker::transform", payload: { data } }),
      iii.trigger({ function_id: "compute-worker::compute", payload: { n: body.n ?? 10 } }),
    ]);

    results.dataWorker = dataResult.status === "fulfilled" ? dataResult.value : (() => { results.errors.push(dataResult.reason); return { error: String(dataResult.reason) }; })();
    results.computeWorker = computeResult.status === "fulfilled" ? computeResult.value : (() => { results.errors.push(computeResult.reason); return { error: String(computeResult.reason) }; })();

    try {
      results.paymentWorker = await iii.trigger({
        function_id: "payment-worker::record",
        payload: { charge: 0.0001, operation: "orchestrate" },
      });
    } catch (err) {
      results.errors.push(err);
    }

    return { status: results.errors.length > 0 ? 500 : 200, body: results };
  },
);

iii.registerTrigger({
  type: "http",
  function_id: orchestrate.id,
  config: { api_path: "/orchestrate", http_method: "POST" },
});

console.log("Solana client orchestrator started — /health /wallet /research /swap /transfer /fees /orchestrate");
