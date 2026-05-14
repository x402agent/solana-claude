#!/usr/bin/env npx tsx
/**
 * Clawd Wallet Demo — @openclawd/wallet Integration
 *
 * Demonstrates the full @openclawd/wallet SDK:
 *   - ClawdWallet: Privy-embedded Solana wallet wrapper
 *   - AgenticWallet: AI-gated trading with Grok 4.20 Beta
 *   - SwapService: Jupiter aggregator integration
 *   - Permission system: deny / ask / allow
 *   - Transaction history & activity summaries
 *
 * Run: npx tsx examples/clawd-wallet-demo.ts
 *
 * Requires: @openclawd/wallet (packages/clawd-wallet)
 * Install:  cd packages/clawd-wallet && npm run build
 */

import {
  ClawdWallet,
  AgenticWallet,
  SwapService,
  DEFAULT_PERMISSIONS,
  type AgentPermissions,
  type AgenticWalletConfig,
  type SwapQuoteParams,
  type AgenticTransaction,
  type PendingTransaction,
  type ClawdWalletInfo,
} from "../packages/clawd-wallet/src/index.js";

// ── Configuration ──────────────────────────────────────────────────

const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111112";

// ── Demo: Wallet Core ──────────────────────────────────────────────

function demoWalletTypes() {
  console.log("\n━━━ 👛 ClawdWallet — Core Types ━━━\n");

  // Show the wallet info structure
  const mockWalletInfo: ClawdWalletInfo = {
    address: "CLAWdWalletDemo11111111111111111111111111111",
    chain: "mainnet",
    ready: true,
    walletClientType: "privy",
    createdAt: new Date().toISOString(),
  };

  console.log("  Wallet Info Structure:");
  console.log(`    Address:   ${mockWalletInfo.address}`);
  console.log(`    Chain:     ${mockWalletInfo.chain}`);
  console.log(`    Ready:     ${mockWalletInfo.ready}`);
  console.log(`    Type:      ${mockWalletInfo.walletClientType}`);
  console.log(`    Created:   ${mockWalletInfo.createdAt}`);

  // Show how to construct a ClawdWallet
  console.log("\n  Construction (from Privy):");
  console.log(`
    import { ClawdWallet } from "@openclawd/wallet";

    // After Privy authentication:
    const wallet = new ClawdWallet(privyConnectedWallet, {
      chain: "mainnet",
      rpcUrl: "https://api.mainnet-beta.solana.com",  // or Helius
    });

    await wallet.ready;           // true once loaded
    console.log(wallet.address);  // base58 Solana pubkey
    console.log(wallet.chain);    // "mainnet" | "devnet" | "testnet"
    console.log(wallet.canSign()); // true if can sign transactions
  `);

  // Show balance methods
  console.log("  Balance Methods:");
  console.log(`
    const lamports = await wallet.getBalance();       // bigint
    const sol      = await wallet.getBalanceInSOL();   // number
    console.log(\`Balance: \${sol} SOL (\${lamports} lamports)\`);
  `);

  // Show transaction methods
  console.log("  Transaction Methods:");
  console.log(`
    // Sign and send a transaction
    const signature = await wallet.signAndSendTransaction(txBytes);
    console.log("Sig:", wallet.explorerUrlForSignature(signature));

    // Wait for confirmation
    const status = await wallet.waitForSignature(signature);
    console.log("Status:", status); // "confirmed" | "failed"
  `);
}

// ── Demo: Agentic Wallet ───────────────────────────────────────────

function demoAgenticWallet() {
  console.log("\n━━━ 🤖 AgenticWallet — AI-Gated Trading ━━━\n");

  // Show default permissions
  console.log("  Default Permissions:");
  console.log(`    maxSwapUsd:                $${DEFAULT_PERMISSIONS.maxSwapUsd}`);
  console.log(`    maxTransferSol:            ${DEFAULT_PERMISSIONS.maxTransferSol} SOL`);
  console.log(`    swap:                      ${DEFAULT_PERMISSIONS.swap}`);
  console.log(`    signMessage:               ${DEFAULT_PERMISSIONS.signMessage}`);
  console.log(`    transfer:                  ${DEFAULT_PERMISSIONS.transfer}`);
  console.log(`    autoConfirmBelowPriceImpact: ${DEFAULT_PERMISSIONS.autoConfirmBelowPriceImpact}%`);

  // Show permission levels
  console.log("\n  Permission Levels:");
  console.log(`
    ┌──────────┬──────────────────────────────────────────────┐
    │ Level    │ Behavior                                     │
    ├──────────┼──────────────────────────────────────────────┤
    │ "deny"   │ Always blocked — agent cannot do this        │
    │ "ask"    │ Grok 4.20 Beta screens, then user confirms   │
    │ "allow"  │ Auto-approved up to max limits               │
    └──────────┴──────────────────────────────────────────────┘
  `);

  // Show custom config
  const degenConfig: AgenticWalletConfig = {
    privyAppId: "your-privy-app-id",
    grokApiKey: process.env.XAI_API_KEY,
    permissions: {
      maxSwapUsd: 200,
      maxTransferSol: 1.0,
      swap: "allow",
      signMessage: "deny",
      transfer: "ask",
      autoConfirmBelowPriceImpact: 2.0,
    },
    onPendingTransaction: async (tx: PendingTransaction) => {
      console.log(`  📋 Pending: ${tx.description}`);
      console.log(`     Type: ${tx.type} | Network: ${tx.network}`);
      return true; // approve
    },
    onTransactionStatus: (tx: AgenticTransaction) => {
      const emoji = tx.status === "confirmed" ? "✅" :
                    tx.status === "rejected" ? "❌" :
                    tx.status === "failed" ? "💀" : "⏳";
      console.log(`  ${emoji} [${tx.status}] ${tx.description}`);
    },
  };

  console.log("  Custom Degen Config:");
  console.log(`    maxSwapUsd: $${degenConfig.permissions.maxSwapUsd}`);
  console.log(`    swap: ${degenConfig.permissions.swap} (auto-approve)`);
  console.log(`    transfer: ${degenConfig.permissions.transfer} (Grok screens first)`);
  console.log(`    Grok API: ${degenConfig.grokApiKey ? "✅ configured" : "⚠️  not set (will always ask)"}`);

  // Show the agent swap flow
  console.log("\n  Agent Swap Flow:");
  console.log(`
    import { AgenticWallet } from "@openclawd/wallet";

    const agent = new AgenticWallet(wallet, {
      privyAppId: process.env.PRIVY_APP_ID!,
      grokApiKey: process.env.XAI_API_KEY,
      permissions: { swap: "ask", ...DEFAULT_PERMISSIONS },
      onPendingTransaction: async (tx) => {
        // Push notification to user's phone
        await notifyUser(tx.description);
        return userResponse.approved;
      },
    });

    // Agent requests a swap — goes through Grok + permission check
    const result = await agent.agentSwap({
      inputToken: "SOL",
      outputToken: "${CLAWD_MINT}",
      amount: "100000000",  // 0.1 SOL in lamports
      slippageBps: 50,      // 0.5% slippage
    });

    console.log("Signature:", result.signature);
    console.log("Explorer:", result.explorerUrl);
  `);

  // Show transaction history
  console.log("  Transaction History:");
  console.log(`
    // Get full history
    const history = agent.getHistory();
    for (const tx of history) {
      console.log(\`[\${tx.status}] \${tx.description}\`);
    }

    // Get AI-readable summary
    const summary = agent.summarizeActivity();
    // "APPROVED] Swap 0.1 SOL → 10000 CLAWD — 4kTzQm..."
  `);
}

// ── Demo: Swap Service ─────────────────────────────────────────────

function demoSwapService() {
  console.log("\n━━━ 🔄 SwapService — Jupiter Aggregator ━━━\n");

  const quoteParams: SwapQuoteParams = {
    inputToken: "SOL",
    outputToken: CLAWD_MINT,
    amount: "100000000", // 0.1 SOL
    slippageBps: 50,
  };

  console.log("  Quote Request:");
  console.log(`    Input:   ${quoteParams.amount} ${quoteParams.inputToken} (${parseInt(quoteParams.amount) / 1e9} SOL)`);
  console.log(`    Output:  ${quoteParams.outputToken.slice(0, 8)}... ($CLAWD)`);
  console.log(`    Slippage: ${quoteParams.slippageBps! / 100}%`);

  console.log("\n  Usage:");
  console.log(`
    import { SwapService } from "@openclawd/wallet";

    const swap = new SwapService({ chain: "mainnet" });

    // Get a quote (no wallet needed)
    const quote = await swap.quote({
      inputToken: "SOL",
      outputToken: "${CLAWD_MINT}",
      amount: "100000000",
      slippageBps: 50,
    });

    console.log("Output:", quote.outAmount, "CLAWD");
    console.log("Price Impact:", quote.priceImpactPct, "%");
    console.log("Min Received:", quote.minimumReceivedAmount);

    // Execute the swap (requires wallet)
    const result = await swap.execute(wallet, quoteParams);
    console.log("Tx:", result.signature);
    console.log("URL:", result.explorerUrl);
  `);

  // Common token pairs
  console.log("  Common Token Pairs:");
  console.log(`    SOL → $CLAWD:  SOL_MINT → ${CLAWD_MINT}`);
  console.log(`    SOL → USDC:    SOL_MINT → ${USDC_MINT}`);
  console.log(`    USDC → $CLAWD: ${USDC_MINT} → ${CLAWD_MINT}`);
}

// ── Demo: React Integration ────────────────────────────────────────

function demoReactIntegration() {
  console.log("\n━━━ ⚛️  React Integration (@openclawd/wallet/react) ━━━\n");

  console.log("  Setup:");
  console.log(`
    // App.tsx
    import { PrivyProvider } from "@privy-io/react-auth";
    import { PRIVY_CONFIG } from "@openclawd/wallet/react";

    function App() {
      return (
        <PrivyProvider appId={process.env.PRIVY_APP_ID!} config={PRIVY_CONFIG}>
          <TradingDashboard />
        </PrivyProvider>
      );
    }
  `);

  console.log("  Wallet Hook:");
  console.log(`
    // useAgentWallet.ts
    import { useWallets } from "@privy-io/react-auth";
    import { ClawdWallet, AgenticWallet } from "@openclawd/wallet";

    function useAgentWallet() {
      const { wallets } = useWallets();

      const wallet = wallets[0]
        ? new ClawdWallet(wallets[0], { chain: "mainnet" })
        : null;

      const agent = wallet
        ? new AgenticWallet(wallet, {
            privyAppId: process.env.PRIVY_APP_ID!,
            grokApiKey: process.env.XAI_API_KEY,
            permissions: { swap: "ask", ...DEFAULT_PERMISSIONS },
          })
        : null;

      return { wallet, agent };
    }
  `);

  console.log("  Trading Component:");
  console.log(`
    // SwapButton.tsx
    function SwapButton() {
      const { agent } = useAgentWallet();
      const [status, setStatus] = useState("idle");

      const handleSwap = async () => {
        setStatus("pending");
        try {
          const result = await agent.agentSwap({
            inputToken: "SOL",
            outputToken: "${CLAWD_MINT}",
            amount: "100000000",
          });
          setStatus("confirmed");
          console.log("Explorer:", result.explorerUrl);
        } catch {
          setStatus("rejected");
        }
      };

      return <button onClick={handleSwap}>Swap SOL → $CLAWD</button>;
    }
  `);
}

// ── Demo: CLI Usage ────────────────────────────────────────────────

function demoCLI() {
  console.log("\n━━━ 🖥️  CLI Usage (clawd-wallet) ━━━\n");

  console.log("  Commands:");
  console.log(`
    # Check wallet balance
    clawd-wallet balance --chain mainnet

    # Get a swap quote
    clawd-wallet quote --input SOL --output ${CLAWD_MINT} --amount 100000000

    # Execute a swap (requires Privy auth)
    clawd-wallet swap --input SOL --output ${CLAWD_MINT} --amount 100000000

    # Show wallet info
    clawd-wallet info

    # Transaction history
    clawd-wallet history

    # JSON output for scripting
    clawd-wallet balance --json | jq '.balance'
  `);
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     🦞 @openclawd/wallet — Full SDK Demo                    ║");
  console.log("║     Privy + Grok 4.20 Beta + Jupiter Aggregator              ║");
  console.log("║     $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  demoWalletTypes();
  demoAgenticWallet();
  demoSwapService();
  demoReactIntegration();
  demoCLI();

  console.log("\n━━━ 📚 Resources ━━━");
  console.log("   Package:     packages/clawd-wallet/");
  console.log("   NPM:         @openclawd/wallet");
  console.log("   Docs:        packages/clawd-wallet/README.md");
  console.log("   One-shot:    curl -fsSL solanaclawd.com/install.sh | bash");
  console.log("   x402 Pay:    packages/agents-x402-solana/");
  console.log("   Tailnet:     tailclawd/");
  console.log("");
}

main().catch(console.error);