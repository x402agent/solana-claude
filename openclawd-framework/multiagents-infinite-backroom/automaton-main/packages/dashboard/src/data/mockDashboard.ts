import type { DashboardState } from "../types";

export const mockDashboard: DashboardState = {
  identity: {
    walletShort: "0x31e8 ... 99A8",
    walletAddress: "0x31e80a92D853BdB0a8eC7cf0f670813EbD0a99A8",
    accountAgeDays: 31,
  },
  sandbox: {
    summary: {
      totalSandboxes: 3,
      runningSandboxes: 2,
      totalVcpu: 6,
      totalMemoryMb: 12288,
      totalDiskGb: 145,
    },
    quickstart: [
      {
        title: "Fund your trench",
        body: "Top up compute credits with pay.sh. Prefer USDC for instant settlement or $CLAWD for ecosystem-native funding.",
      },
      {
        title: "Provision a sandbox",
        body: "Launch a lobster-grade runtime with predictable CPU, memory, and persistence limits.",
      },
      {
        title: "Install the automaton runtime",
        body: "Bootstrap the runtime directly in the shell, then attach your agent identity and heartbeat.",
        command: "curl -fsSL https://solanaclawd.com/leviathan.sh | sh",
      },
      {
        title: "Verify pulse and health",
        body: "Inspect runtime status, tail the heartbeat logs, and confirm the agent is still earning its existence.",
        command: "systemctl status automaton && journalctl -u automaton -f",
      },
    ],
  },
  billing: {
    creditBalanceUsd: 146.25,
    walletUsdc: 62.1,
    walletClawd: 18425.75,
    prices: [
      { name: "Small", vcpu: 1, memoryGb: 0.5, diskGb: 5, monthlyPriceUsd: 5 },
      { name: "Medium", vcpu: 1, memoryGb: 1, diskGb: 10, monthlyPriceUsd: 8 },
      { name: "Large", vcpu: 2, memoryGb: 2, diskGb: 20, monthlyPriceUsd: 15 },
      { name: "X-Large", vcpu: 2, memoryGb: 4, diskGb: 40, monthlyPriceUsd: 25 },
      { name: "2X-Large", vcpu: 4, memoryGb: 8, diskGb: 80, monthlyPriceUsd: 45 },
    ],
    packs: [
      { amountUsd: 5, token: "USDC", state: "ready" },
      { amountUsd: 25, token: "USDC", state: "recommended" },
      { amountUsd: 100, token: "USDC", state: "ready" },
      { amountUsd: 500, token: "CLAWD", state: "ready" },
      { amountUsd: 1000, token: "CLAWD", state: "ready" },
      { amountUsd: 2500, token: "CLAWD", state: "insufficient" },
    ],
    note: "pay.sh settlement rails are wired for USDC today; $CLAWD packages use the same purchase UX but route through the CLAWD commerce adapter.",
  },
  inference: {
    models: [
      { name: "claude-sonnet-4.5", inputPrice: "$3.9/M in", outputPrice: "$19.5/M out" },
      { name: "deepseek-v4-pro", inputPrice: "$2.4/M in", outputPrice: "$12.0/M out" },
      { name: "grok-4.20", inputPrice: "$5.0/M in", outputPrice: "$25.0/M out" },
    ],
    defaultSystemPrompt:
      "You are CLAWD — a sovereign lobster operator. Earn honestly, preserve trench uptime, and never beach the brood through negligence.",
  },
};
