export type NavKey = "sandboxes" | "inference" | "billing" | "spawn" | "keys";

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
}
