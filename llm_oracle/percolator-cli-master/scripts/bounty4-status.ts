import { Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  fetchOracleSnapshot,
  fetchSlabSnapshot,
  formatStatus,
  scoreBountyOpportunities,
} from "../src/oracle/three-leg-composite.js";

function readHeliusKey(): string | null {
  try {
    return fs.readFileSync(path.join(os.homedir(), ".helius"), "utf8").trim();
  } catch {
    return null;
  }
}

async function connect(): Promise<{ conn: Connection; label: string }> {
  const envRpc = process.env.SOLANA_RPC_URL;
  if (envRpc) {
    return { conn: new Connection(envRpc, "confirmed"), label: "env" };
  }

  const heliusKey = readHeliusKey();
  if (heliusKey) {
    return {
      conn: new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, "confirmed"),
      label: "helius",
    };
  }

  return {
    conn: new Connection("https://api.mainnet-beta.solana.com", "confirmed"),
    label: "public",
  };
}

async function main(): Promise<void> {
  const { conn, label } = await connect();
  const slab = await fetchSlabSnapshot(conn);
  const oracle = await fetchOracleSnapshot(conn, slab);

  console.log(`RPC: ${label}`);
  console.log(formatStatus(slab, oracle));
  console.log("");
  console.log("Top Non-Destructive Angles:");

  for (const opp of scoreBountyOpportunities(slab, oracle).slice(0, 5)) {
    const ev = `${opp.expectedValueSOL >= 0 ? "+" : ""}${opp.expectedValueSOL.toFixed(6)} SOL`;
    console.log(`- ${opp.strategy} [${opp.findingRef}] ${opp.feasible ? "feasible" : "not-feasible"} ${ev}`);
    console.log(`  ${opp.notes}`);
  }

  console.log("");
  console.log("Safety note: this script is for market-state inspection only. It does not place trades or attempt extraction.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
