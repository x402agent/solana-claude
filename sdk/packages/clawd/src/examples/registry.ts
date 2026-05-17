export interface ExampleSpec {
  id: string;
  file: string;
  title: string;
  category: 'agents' | 'wallet' | 'trading' | 'payments' | 'research' | 'infra';
  desc: string;
}

export const EXAMPLES: ExampleSpec[] = [
  { id: 'buddies',   file: 'blockchain-buddies-demo.ts', title: 'Blockchain Buddies', category: 'agents',   desc: 'Solana-native trading companions with wallets + personalities' },
  { id: 'listen',    file: 'listen-wallet.ts',           title: 'Listen Wallet',      category: 'wallet',   desc: 'Real-time wallet monitor via Helius' },
  { id: 'ooda',      file: 'ooda-loop.ts',               title: 'OODA Loop',          category: 'trading',  desc: 'One Observe → Orient → Decide → Act → Learn cycle' },
  { id: 'x402sol',   file: 'x402-solana.ts',             title: 'x402 Solana',        category: 'payments', desc: 'USDC micropayments — full 402 → pay → forward' },
  { id: 'research',  file: 'auto-research-client.ts',    title: 'AutoResearch',       category: 'research', desc: 'Karpathy-style self-improving research client' },
  { id: 'lobtrader', file: 'lobster-trader.ts',          title: 'Lobster Trader',     category: 'trading',  desc: 'pump.fun bonding-curve math, graduation odds' },
  { id: 'orch',      file: 'orchestrator-client.ts',     title: 'Orchestrator',       category: 'infra',    desc: 'Wallet, agent launches, MCP, Metaplex Core' },
  { id: 'wallet',    file: 'clawd-wallet-demo.ts',       title: 'Clawd Wallet SDK',   category: 'wallet',   desc: 'Privy + AgenticWallet (Grok 4.20) + SwapService' },
  { id: 'x402pay',   file: 'x402-payment-demo.ts',       title: 'x402 Agent Pay',     category: 'payments', desc: '@openclawd/agents-x402 — agent-to-agent USDC' },
];

export function findExample(query: string): ExampleSpec | undefined {
  const q = query.toLowerCase();
  return EXAMPLES.find((e) => e.id === q || e.file.startsWith(q) || e.title.toLowerCase().includes(q));
}
