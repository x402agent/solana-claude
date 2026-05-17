import {
  PUMP_PROGRAM_ID,
  PUMP_AMM_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  MAX_SHAREHOLDERS,
} from "@nirholas/pump-sdk";
import { PublicKey } from "@solana/web3.js";
import type { ResourceResult, ServerState } from "../types.js";
import { readKeypairResource, listKeypairResources } from "./keypair.js";

export const RESOURCES = [
  {
    uri: "solana://programs",
    name: "Pump Protocol Programs",
    description: "On-chain program IDs for Pump, PumpAMM, and PumpFees",
    mimeType: "application/json",
  },
  {
    uri: "solana://config",
    name: "SDK Configuration",
    description: "Current SDK version and configuration",
    mimeType: "application/json",
  },
];

export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "solana://keypair/{id}",
    name: "Generated Keypair",
    description:
      "A keypair generated during this session (public key only — private key never exposed)",
    mimeType: "application/json",
  },
  {
    uriTemplate: "solana://address/{pubkey}",
    name: "Address Info",
    description: "Validate and inspect a Solana address",
    mimeType: "application/json",
  },
];

export { listKeypairResources };

export function handleReadResource(
  uri: string,
  state: ServerState,
): ResourceResult {
  // solana://keypair/{id}
  const keypairMatch = uri.match(/^solana:\/\/keypair\/(.+)$/);
  if (keypairMatch) {
    return readKeypairResource(keypairMatch[1]!, state);
  }

  // solana://address/{pubkey}
  const addressMatch = uri.match(/^solana:\/\/address\/(.+)$/);
  if (addressMatch) {
    const address = addressMatch[1]!;
    try {
      const pubkey = new PublicKey(address);
      const isOnCurve = PublicKey.isOnCurve(pubkey.toBytes());
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                address: pubkey.toBase58(),
                valid: true,
                isOnCurve,
                type: isOnCurve
                  ? "standard_keypair"
                  : "program_derived_address",
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ address, valid: false }, null, 2),
          },
        ],
      };
    }
  }

  switch (uri) {
    case "solana://programs":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                pump: PUMP_PROGRAM_ID,
                pumpAmm: PUMP_AMM_PROGRAM_ID,
                pumpFees: PUMP_FEE_PROGRAM_ID,
              },
              null,
              2,
            ),
          },
        ],
      };

    case "solana://config":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                sdkVersion: "1.30.0",
                maxShareholders: MAX_SHAREHOLDERS,
                totalBps: 10000,
                tokenDecimals: 6,
                programs: {
                  pump: PUMP_PROGRAM_ID,
                  pumpAmm: PUMP_AMM_PROGRAM_ID,
                  pumpFees: PUMP_FEE_PROGRAM_ID,
                },
              },
              null,
              2,
            ),
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
