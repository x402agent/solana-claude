// This is the client - it makes calls to data-worker and compute-worker
// In this usecase it can be thought of as an orchestrator
// but there is no requirement from iii for a central orchestrator.

import { registerWorker, Logger } from "iii-sdk";
const iii = registerWorker(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134",
);
const logger = new Logger();

// In iii all workers behave as a single application so it is
// possible to set scoped state in one worker and retrieve it in another.
const WORKER_VERSION = 1;
await iii.trigger({
  function_id: "state::set",
  payload: { scope: "shared", key: "WORKER_VERSION", data: WORKER_VERSION },
});

// registerFunction is used to declare functionality to the iii engine.
// Once registered any other process connected to the engine can trigger this function.
// registerFunction uses registerTrigger internally to make a function callable.
const health = iii.registerFunction({ id: "client::health" }, async () => {
  logger.info("Health check OK");
  return { status: 200, body: { healthy: true, timestamp: Date.now() } };
});

// registerTrigger can also be used independently to create other kinds
// of callables such as an http endpoint, or a cron job.
iii.registerTrigger({
  type: "http",
  function_id: health.id, // This is just the string from registerFunction, ie. "client::health"
  config: { api_path: "/health", http_method: "GET" },
});

iii.registerTrigger({
  type: "cron",
  function_id: health.id,
  config: { expression: "*/30 * * * * * *" }, // Cron jobs in iii support seconds, this executes every 30 seconds
});

// The advantage of this structure is that this code can directly trigger
// functions that live in other workers and even that use other languages.
const orchestrate = iii.registerFunction(
  { id: "client::orchestrate" },
  async (payload) => {
    logger.info("Handling request", { payload: JSON.stringify(payload) });

    const results: { client: string; errors: any[]; [key: string]: unknown } = {
      client: "ok",
      errors: [],
    };

    // Handle both direct function triggering and HTTP API calls
    const body = payload.body ?? payload;
    const data = body.data ?? body;

    // This is an async trigger to a Python worker.
    const dataRequest = iii.trigger({
      function_id: "data-worker::transform",
      payload: { data },
    });
    // This is an async trigger to a Rust worker.
    const computeRequest = iii.trigger({
      function_id: "compute-worker::compute",
      payload: { n: body.n },
    });

    // Results behave like native functions, here Promises are returned.
    const [dataResult, computeResult] = await Promise.allSettled([
      dataRequest,
      computeRequest,
    ]);

    if (dataResult.status === "fulfilled") {
      results.dataWorker = dataResult.value;
    } else {
      logger.error("data-worker error", dataResult.reason);
      results.errors.push(dataResult.reason);
    }

    if (computeResult.status === "fulfilled") {
      results.computeWorker = computeResult.value;
    } else {
      logger.error("compute-worker error", computeResult.reason);
      results.errors.push(computeResult.reason);
    }

    // This is a trigger to an external worker.
    try {
      results.externalWorker = await iii.trigger({
        function_id: "payment-worker::record",
        payload: { charge: 0.0001 },
      });
    } catch (error) {
      logger.error("payment-worker error", error);
      results.errors.push(error);
    }

    results.success =
      "Success! Open workers/client/src/worker.ts and ./iii-config.yaml to see how this all worked or visit https://iii.dev/docs/concepts to learn more about the concepts powering iii";

    return { status: results.errors.length > 0 ? 500 : 200, body: results };
  },
);

// And now this is creating a callable http endpoint.
iii.registerTrigger({
  type: "http",
  function_id: orchestrate.id,
  config: { api_path: "/orchestrate", http_method: "POST" },
});

console.log("Client started - listening for calls");
