import { describe, expect, it } from "vitest";
import {
  defaultOreRoot,
  parseBoardState,
  parseMinerState,
  parseOreMinerArgs,
} from "../ore/miner.js";

describe("ORE miner integration helpers", () => {
  it("parses board output from ore-cli", () => {
    const board = parseBoardState(`
Board
  Id: 31460
  Start slot: 100
  End slot: 250
  Time remaining: 31.2 sec
  Epoch id: 9
`);

    expect(board).toEqual({
      roundId: 31460,
      startSlot: 100,
      endSlot: 250,
      timeRemainingSec: 31.2,
    });
  });

  it("parses miner deployment and checkpoint state", () => {
    const miner = parseMinerState(`
Miner
  address: miner-pda
  authority: authority
  deployed: [0, 1000, 0, 42]
  cumulative: [0, 0, 0, 0]
  rewards_sol: 0.001 SOL
  rewards_ore: 2.5 ORE
  round_id: 31460
  checkpoint_id: 31459
`);

    expect(miner?.roundId).toBe(31460);
    expect(miner?.checkpointId).toBe(31459);
    expect(miner?.totalDeployedLamports).toBe(1042n);
    expect(miner?.rewardsSol).toBe("0.001 SOL");
    expect(miner?.rewardsOre).toBe("2.5 ORE");
  });

  it("resolves miner options from flags and ORE env", () => {
    const options = parseOreMinerArgs(
      [
        "--ore-miner",
        "--ore-keypair",
        "~/.config/solana/id.json",
        "--ore-amount-sol",
        "0.01",
        "--ore-squares",
        "1,2,3",
        "--ore-once",
      ],
      {
        ORE_RPC_URL: "https://rpc.example",
        ORE_DEPOSIT_SOL: "0.1",
      },
    );

    expect(options.keypairPath).toContain(".config/solana/id.json");
    expect(options.rpcUrl).toBe("https://rpc.example");
    expect(options.oreRoot).toBe(defaultOreRoot());
    expect(options.amountSol).toBe("0.01");
    expect(options.depositSol).toBe("0.1");
    expect(options.squares).toBe("1,2,3");
    expect(options.once).toBe(true);
  });
});
