// Solana Payment Worker — transaction signing, submission, and SPL transfers
//
// Functions:
//   payment-worker::record             — log a payment event (backwards compat)
//   payment-worker::submit_transaction — sign and submit a serialized tx
//   payment-worker::transfer           — SOL or SPL token transfer
//   payment-worker::airdrop            — devnet SOL airdrop

import { registerWorker, Logger } from "iii-sdk";

const iii = registerWorker(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134",
);
const logger = new Logger();

const SOLANA_RPC =
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Helper: JSON-RPC call to Solana
async function rpcCall(method: string, params: unknown[]) {
  const resp = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return resp.json() as Promise<any>;
}

// ── Record (backwards compat) ────────────────────────────────────────────────

iii.registerFunction(
  { id: "payment-worker::record" },
  async (payload) => {
    const body = payload.body ?? payload;
    logger.info("Payment recorded", {
      charge: body.charge,
      operation: body.operation ?? "unknown",
    });
    return {
      status: 200,
      body: {
        message: "Payment recorded",
        charge: body.charge,
        timestamp: Date.now(),
      },
      source: "payment-worker",
    };
  },
);

// ── Submit transaction ───────────────────────────────────────────────────────

iii.registerFunction(
  { id: "payment-worker::submit_transaction" },
  async (payload) => {
    const body = payload.body ?? payload;
    const { transaction, wallet } = body;

    if (!transaction) {
      return { status: 400, body: { error: "transaction is required" } };
    }

    logger.info("Submitting transaction", { wallet });

    // In production: deserialize, sign with wallet keypair, then submit
    // For now: submit the pre-signed base64 transaction directly
    try {
      const result = await rpcCall("sendTransaction", [
        transaction,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          encoding: "base64",
          maxRetries: 3,
        },
      ]);

      if (result.error) {
        logger.error("Transaction failed", result.error);
        return {
          status: 500,
          body: { error: result.error.message, code: result.error.code },
          source: "payment-worker",
        };
      }

      const signature = result.result;
      logger.info("Transaction confirmed", { signature });

      return {
        status: 200,
        body: { signature, confirmed: true },
        source: "payment-worker",
      };
    } catch (err) {
      return {
        status: 500,
        body: { error: String(err) },
        source: "payment-worker",
      };
    }
  },
);

// ── SOL / SPL transfer ───────────────────────────────────────────────────────

iii.registerFunction(
  { id: "payment-worker::transfer" },
  async (payload) => {
    const body = payload.body ?? payload;
    const { from, to, amount_lamports, mint } = body;

    if (!from || !to || !amount_lamports) {
      return {
        status: 400,
        body: { error: "from, to, amount_lamports required" },
      };
    }

    const isSpl = !!mint;
    logger.info(isSpl ? "SPL transfer" : "SOL transfer", {
      from,
      to,
      amount_lamports,
      mint,
    });

    // In production: build the transfer instruction, sign, and submit
    // This returns the parameters needed by the orchestrator to build via compute-worker
    return {
      status: 200,
      body: {
        type: isSpl ? "spl_transfer" : "sol_transfer",
        from,
        to,
        amount_lamports,
        mint: mint ?? null,
        // The orchestrator should call compute-worker::build_transfer_tx
        // then payment-worker::submit_transaction in sequence
        message:
          "Transfer parameters validated. Build tx via compute-worker, then submit.",
      },
      source: "payment-worker",
    };
  },
);

// ── Devnet airdrop ───────────────────────────────────────────────────────────

iii.registerFunction(
  { id: "payment-worker::airdrop" },
  async (payload) => {
    const body = payload.body ?? payload;
    const address = body.address;
    const lamports = body.lamports ?? 1_000_000_000; // default 1 SOL

    if (!address) {
      return { status: 400, body: { error: "address required" } };
    }

    logger.info("Requesting airdrop", { address, lamports });

    try {
      const result = await fetch("https://api.devnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "requestAirdrop",
          params: [address, lamports],
        }),
      });
      const json = (await result.json()) as any;

      if (json.error) {
        return {
          status: 500,
          body: { error: json.error.message },
          source: "payment-worker",
        };
      }

      return {
        status: 200,
        body: {
          signature: json.result,
          address,
          lamports,
          network: "devnet",
        },
        source: "payment-worker",
      };
    } catch (err) {
      return {
        status: 500,
        body: { error: String(err) },
        source: "payment-worker",
      };
    }
  },
);

console.log(
  "Solana payment worker started — record, submit_transaction, transfer, airdrop",
);
