/**
 * examples/x402-solana.ts
 *
 * x402 Protocol Demo — Solana USDC micropayments for AI agent API access.
 *
 * This demonstrates the full x402 payment flow using Solana as the payment rail:
 *   1. Agent makes a request to a paid API endpoint
 *   2. Server returns HTTP 402 with PAYMENT-REQUIRED header
 *   3. x402 client signs a USDC transfer using Solana keypair (@x402/svm)
 *   4. Agent retries with X-Payment header
 *   5. Server verifies payment via facilitator and returns data
 *
 * Requirements for production:
 *   npm install @x402/svm @x402/axios @solana/kit @scure/base
 *
 * Run demo (server mode): npx tsx examples/x402-solana.ts --server
 * Run demo (client mode): X402_SVM_PRIVATE_KEY=<base58> npx tsx examples/x402-solana.ts
 *
 * See also: https://github.com/coinbase/x402
 */

import "dotenv/config";
import * as http from "node:http";
import {
  isX402Enabled,
  getX402Config,
  wrapFetchWithX402,
  parsePaymentRequirement,
  formatX402Cost,
  getX402Summary,
} from "../src/services/x402/index.js";
import {
  USDC_ADDRESSES,
  X402_HEADERS,
  type PaymentRequirement,
} from "../src/services/x402/types.js";

const isServer = process.argv.includes("--server");

// ─── Server mode: mock x402-compatible Solana data API ───────────────────────

if (isServer) {
  const PORT = 4022;

  /** Simulates a premium Solana market data endpoint */
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.url !== "/sol-premium") {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const paymentHeader = req.headers[X402_HEADERS.PAYMENT];

    if (!paymentHeader) {
      // Return 402 with PAYMENT-REQUIRED header
      const requirement: PaymentRequirement = {
        scheme: "exact",
        network: "solana-devnet",
        maxAmountRequired: "100",  // 0.0001 USDC = $0.0001
        resource: `http://localhost:${PORT}/sol-premium`,
        description: "Premium SOL market data with DAS metadata",
        mimeType: "application/json",
        payTo: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // devnet recipient
        maxTimeoutSeconds: 300,
        asset: USDC_ADDRESSES["solana-devnet"],
        extra: { name: "USD Coin", decimals: 6 },
      };

      const requirementsBase64 = Buffer.from(JSON.stringify([requirement])).toString("base64");
      res.writeHead(402, {
        [X402_HEADERS.PAYMENT_REQUIRED]: requirementsBase64,
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({
        error: "Payment required",
        x402: requirement,
      }));
      return;
    }

    // Payment header present — validate (simplified for demo)
    try {
      const decodedPayment = JSON.parse(Buffer.from(paymentHeader as string, "base64").toString());
      console.log(`💰 Payment received: ${decodedPayment.network} — SVM payload present: ${!!decodedPayment.payload?.transaction}`);

      // In production: verify payment with x402 facilitator
      // const verified = await verifyPayment(decodedPayment, requirement);

      // Return premium data
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        premium: true,
        data: {
          sol: {
            price_usd: 142.35 + Math.random() * 5,
            change_24h: 3.2 + Math.random() * 2,
            volume_24h_usd: 2_800_000_000,
            market_cap: 70_000_000_000,
          },
          network: {
            tps: 3847,
            fee_lamports: 5000,
            slot: 315_000_000 + Math.floor(Math.random() * 1000),
          },
          top_tokens_24h: [
            { symbol: "BONK", change: 42.3, volume: 120_000_000 },
            { symbol: "WIF",  change: 18.7, volume: 85_000_000 },
            { symbol: "JUP",  change: 8.2,  volume: 65_000_000 },
          ],
        },
        payment: {
          network: decodedPayment.network,
          amount_usdc: "0.0001",
          verified: true,
        },
      }));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid payment header" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`\n💎 x402 Solana Data Server running at http://localhost:${PORT}`);
    console.log(`📡 Endpoint: GET /sol-premium (requires 0.0001 USDC on Solana Devnet)`);
    console.log(`\nTest with:`);
    console.log(`  X402_SVM_PRIVATE_KEY=<devnet-key> X402_NETWORK=solana-devnet npx tsx examples/x402-solana.ts`);
  });

} else {
  // ─── Client mode: pay with Solana USDC ────────────────────────────────────

  console.log("\n🤖 solana-claude x402 Payment Demo");
  console.log("Protocol: x402 (HTTP 402 + PAYMENT-REQUIRED header)");
  console.log("Payment: Solana USDC via SVM scheme + @x402/svm");
  console.log("=".repeat(50) + "\n");

  const cfg = getX402Config();
  console.log("x402 Config:");
  console.log(`  enabled:     ${cfg.enabled}`);
  console.log(`  network:     ${cfg.primaryNetwork}`);
  console.log(`  max/request: $${cfg.maxPaymentPerRequestUSD}`);
  console.log(`  max/session: $${cfg.maxSessionSpendUSD}`);
  if (cfg.solana?.publicKey) {
    console.log(`  wallet:      ${cfg.solana.publicKey.slice(0, 8)}...${cfg.solana.publicKey.slice(-4)}`);
    console.log(`  usdc mint:   ${cfg.solana.usdcMint.slice(0, 8)}...`);
  } else {
    console.log(`  ⚠️  X402_SVM_PRIVATE_KEY not set — payment will be simulated`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("Making request to paid endpoint...");

  // Wrap fetch with x402 payment handler
  // In production with @x402/axios + @x402/svm, use:
  //   const client = new x402Client();
  //   const svmSigner = await createKeyPairSignerFromBytes(base58Decode(svmKey));
  //   registerExactSvmScheme(client, { signer: svmSigner });
  //   const api = wrapAxiosWithPayment(axios.create({ baseURL }), client);
  const payfetch = wrapFetchWithX402(globalThis.fetch);

  try {
    const res = await payfetch("http://localhost:4022/sol-premium");

    if (res.status === 402) {
      console.log("\n⚠️  Payment required but could not pay automatically.");
      console.log("   Set X402_SVM_PRIVATE_KEY and X402_NETWORK=solana-devnet");
      console.log("   Also make sure the server is running: npx tsx examples/x402-solana.ts --server");
    } else if (res.ok) {
      const data = await res.json();
      console.log("\n✅ Payment accepted! Premium data received:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      const err = await res.text();
      console.log(`\n❌ Error ${res.status}: ${err}`);
    }
  } catch (err) {
    if ((err as Error).message?.includes("ECONNREFUSED")) {
      console.log("\n⚠️  Server not running. Start it first:");
      console.log("   npx tsx examples/x402-solana.ts --server");
    } else {
      console.error("\n❌ Request failed:", err);
    }
  }

  console.log("\n" + "─".repeat(50));
  const summary = getX402Summary();
  console.log(`Session payments: ${summary.session.payments}`);
  console.log(`Session spend:    $${summary.session.totalUSD.toFixed(6)}`);
  if (summary.session.payments > 0) {
    console.log("\n" + formatX402Cost());
  }

  console.log("\n💡 Production integration with @x402/svm:");
  console.log(`
import { x402Client, wrapAxiosWithPayment } from "@x402/axios";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

const client = new x402Client();
const svmSigner = await createKeyPairSignerFromBytes(
  base58.decode(process.env.X402_SVM_PRIVATE_KEY),
);
registerExactSvmScheme(client, { signer: svmSigner });

const api = wrapAxiosWithPayment(axios.create({ baseURL }), client);
const res = await api.get("/premium-endpoint"); // auto-pays on 402
`);
}
