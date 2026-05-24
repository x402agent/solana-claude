export type NavKey = "sandboxes" | "ore" | "inference" | "billing" | "spawn" | "keys";

export interface SidebarItem {
  key: NavKey;
  label: string;
}

export interface MetricCardData {
  label: string;
  value: string;
  sublabel: string;
}

export interface SandboxSummary {
  totalSandboxes: number;
  runningSandboxes: number;
  totalVcpu: number;
  totalMemoryMb: number;
  totalDiskGb: number;
}

export interface SandboxQuickstartStep {
  title: string;
  body: string;
  command?: string;
}

export interface BillingPack {
  amountUsd: number;
  token: "USDC" | "CLAWD";
  state: "ready" | "insufficient" | "recommended";
}

export interface PricingTier {
  name: string;
  vcpu: number;
  memoryGb: number;
  diskGb: number;
  monthlyPriceUsd: number;
}

export interface InferenceModel {
  name: string;
  inputPrice: string;
  outputPrice: string;
}

export interface OreSquare {
  id: number;
  lamports: number;
  miners: number;
  selected: boolean;
}

export interface OreStatus {
  rpcLabel: string;
  programId: string;
  boardRound: number;
  timeRemainingSec: number;
  minerStatus: "not_found" | "ready" | "deployed";
  automationStatus: "not_configured" | "configured";
  authorityShort: string;
  amountSol: string;
  depositSol: string;
  strategy: "random" | "preferred" | "discretionary";
  numSquares: number;
  squares: OreSquare[];
  commands: {
    status: string;
    setupOnce: string;
    minerLoop: string;
  };
}

export interface DashboardState {
  identity: {
    walletShort: string;
    walletAddress: string;
    accountAgeDays: number;
  };
  sandbox: {
    summary: SandboxSummary;
    quickstart: SandboxQuickstartStep[];
  };
  billing: {
    creditBalanceUsd: number;
    walletUsdc: number;
    walletClawd: number;
    prices: PricingTier[];
    packs: BillingPack[];
    note: string;
  };
  inference: {
    models: InferenceModel[];
    defaultSystemPrompt: string;
  };
  ore: OreStatus;
}
