/**
 * Automaton Wallet Management
 *
 * Creates and manages an EVM wallet for the automaton's identity and payments.
 * The private key is the automaton's sovereign identity.
 * Adapted from conway-mcp/src/wallet.ts
 */

import type { PrivateKeyAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";
import type { WalletData } from "../types.js";

const AUTOMATON_DIR = path.join(
  process.env.HOME || "/root",
  ".automaton",
);
const WALLET_FILE = path.join(AUTOMATON_DIR, "wallet.json");

export function getAutomatonDir(): string {
  return AUTOMATON_DIR;
}

export function getWalletPath(): string {
  return WALLET_FILE;
}

/**
 * Get or create the automaton's wallet.
 * The private key IS the automaton's identity -- protect it.
 */
export async function getWallet(): Promise<{
  account: PrivateKeyAccount;
  isNew: boolean;
}> {
  if (!fs.existsSync(AUTOMATON_DIR)) {
    fs.mkdirSync(AUTOMATON_DIR, { recursive: true, mode: 0o700 });
  }

  if (fs.existsSync(WALLET_FILE)) {
    const walletData: WalletData = JSON.parse(
      fs.readFileSync(WALLET_FILE, "utf-8"),
    );
    const account = privateKeyToAccount(walletData.privateKey);
    return { account, isNew: false };
  } else {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    const walletData: WalletData = {
      privateKey,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2), {
      mode: 0o600,
    });

    return { account, isNew: true };
  }
}

/**
 * Get the wallet address without loading the full account.
 */
export function getWalletAddress(): string | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }

  const walletData: WalletData = JSON.parse(
    fs.readFileSync(WALLET_FILE, "utf-8"),
  );
  const account = privateKeyToAccount(walletData.privateKey);
  return account.address;
}

/**
 * Load the full wallet account (needed for signing).
 */
export function loadWalletAccount(): PrivateKeyAccount | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }

  const walletData: WalletData = JSON.parse(
    fs.readFileSync(WALLET_FILE, "utf-8"),
  );
  return privateKeyToAccount(walletData.privateKey);
}

export function walletExists(): boolean {
  return fs.existsSync(WALLET_FILE);
}
