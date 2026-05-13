import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  DynamicContextProvider,
  DynamicWidget,
  useDynamicContext
} from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import "./wallet.css";

const DYNAMIC_ENVIRONMENT_ID =
  import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "76e0eab2-2432-4489-ba9c-b82291cb23b9";

const trackedTokens = [
  { symbol: "SOL", mint: "So11111111111111111111111111111111111111112" },
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3B263RQAcVAMiRqtpPb9SizpSSP" },
  { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLjmN7Gf8hPP" }
];

function shortenAddress(address?: string) {
  if (!address) return "No wallet connected";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function ClawdWallet() {
  const { primaryWallet, user } = useDynamicContext();
  const walletAddress = primaryWallet?.address;
  const walletLabel = useMemo(() => shortenAddress(walletAddress), [walletAddress]);

  return (
    <main className="wallet-shell">
      <section className="wallet-panel">
        <div className="brand-row">
          <div className="claw-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">Solana Mainnet</p>
            <h1>Clawd Wallet</h1>
          </div>
        </div>

        <div className="wallet-action">
          <DynamicWidget />
        </div>

        <div className="wallet-card">
          <span>Active wallet</span>
          <strong>{walletLabel}</strong>
          {user?.email && <small>{user.email}</small>}
        </div>

        <div className="token-strip" aria-label="Tracked Solana tokens">
          {trackedTokens.map((token) => (
            <a
              key={token.mint}
              href={`https://birdeye.so/token/${token.mint}?chain=solana`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{token.symbol}</span>
              <small>{token.mint.slice(0, 4)}...{token.mint.slice(-4)}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [SolanaWalletConnectors]
      }}
    >
      <ClawdWallet />
    </DynamicContextProvider>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
