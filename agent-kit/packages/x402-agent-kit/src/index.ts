// @solana-clawd/x402-agent-kit — build and consume x402 (HTTP 402) payment
// challenges for Solana Clawd agent endpoints. Dependency-free; pair with
// @solana/web3.js + an x402 facilitator to settle payments on Solana.

export * from "./types.js";
export * from "./constants.js";
export * from "./server.js";
export * from "./client.js";

export const X402_AGENT_KIT_VERSION = "0.1.0";
