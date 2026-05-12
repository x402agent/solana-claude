/**
 * @agentwallet/core — CLI Entry Point
 * Command-line interface for vault management
 */

import { program } from "commander";
import { config } from "dotenv";
import { Vault, defaultVaultConfig } from "./vault.js";
import { startServer, defaultServerConfig } from "./server.js";
import { generateSolanaKeypair, generateEVMKeypair } from "./keygen.js";
import { deployToE2B } from "./deploy/e2b.js";
import { deployToCloudflare } from "./deploy/cloudflare.js";

// Load .env file
config();

program
  .name("agentwallet")
  .description("Agentic wallet vault — encrypted Solana + EVM keypair management")
  .version("0.1.0");

// ── Server Commands ──────────────────────────────────────────────────

program
  .command("serve")
  .description("Start the vault HTTP server")
  .option("-p, --port <port>", "Port to listen on", "9099")
  .option("-h, --host <host>", "Host to bind", "0.0.0.0")
  .option("--token <token>", "API bearer token for authentication")
  .action(async (options) => {
    try {
      const vault = await Vault.create();
      await startServer(vault, {
        port: parseInt(options.port, 10),
        host: options.host,
        apiToken: options.token ?? process.env.VAULT_API_TOKEN,
        cors: true,
      });
    } catch (err) {
      console.error("[VAULT] Failed to start server:", err);
      process.exit(1);
    }
  });

// ── Wallet Commands ──────────────────────────────────────────────────

const walletCmd = program.command("wallet").description("Wallet management commands");

walletCmd
  .command("list")
  .description("List all wallets in the vault")
  .action(async () => {
    try {
      const vault = await Vault.create();
      const wallets = vault.listWallets();
      console.log("\n📋 Wallets:\n");
      for (const w of wallets) {
        console.log(`  ${w.id} | ${w.label} | ${w.chainType} | ${w.address} ${w.paused ? "⏸️" : "✅"}`);
      }
      if (wallets.length === 0) {
        console.log("  No wallets found.");
      }
      console.log();
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("create <label>")
  .description("Create a new wallet")
  .option("-c, --chain <type>", "Chain type (solana|evm)", "solana")
  .option("--chain-id <id>", "Chain ID for EVM chains", "0")
  .action(async (label, options) => {
    try {
      const vault = await Vault.create();
      const chainType = options.chain as "solana" | "evm";
      const chainId = parseInt(options.chainId, 10);

      let keypair;
      if (chainType === "solana") {
        keypair = await generateSolanaKeypair();
      } else {
        keypair = await generateEVMKeypair();
      }

      const entry = await vault.addWallet(undefined, label, chainType, chainId, keypair.address, keypair.privateKey);
      console.log(`\n✅ Wallet created:\n`);
      console.log(`  ID:      ${entry.id}`);
      console.log(`  Label:   ${entry.label}`);
      console.log(`  Chain:   ${entry.chainType}`);
      console.log(`  Address: ${entry.address}\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("import <label> <privateKey>")
  .description("Import an existing wallet")
  .option("-c, --chain <type>", "Chain type (solana|evm)", "solana")
  .option("--chain-id <id>", "Chain ID for EVM chains", "0")
  .action(async (label, privateKey, options) => {
    try {
      const vault = await Vault.create();
      const chainType = options.chain as "solana" | "evm";
      const chainId = parseInt(options.chainId, 10);

      let keypair;
      if (chainType === "solana") {
        const { importSolanaKeypair } = await import("./keygen.js");
        keypair = await importSolanaKeypair(privateKey);
      } else {
        const { importEVMKeypair } = await import("./keygen.js");
        keypair = await importEVMKeypair(privateKey);
      }

      const entry = await vault.addWallet(undefined, label, chainType, chainId, keypair.address, keypair.privateKey);
      console.log(`\n✅ Wallet imported:\n`);
      console.log(`  ID:      ${entry.id}`);
      console.log(`  Label:   ${entry.label}`);
      console.log(`  Chain:   ${entry.chainType}`);
      console.log(`  Address: ${entry.address}\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("show <id>")
  .description("Show wallet details")
  .action(async (id) => {
    try {
      const vault = await Vault.create();
      const wallet = vault.getWallet(id);
      if (!wallet) {
        console.error(`Wallet ${id} not found`);
        process.exit(1);
      }
      console.log(`\n📋 Wallet ${id}:\n`);
      console.log(`  Label:    ${wallet.label}`);
      console.log(`  Chain:    ${wallet.chainType}`);
      console.log(`  Chain ID: ${wallet.chainId}`);
      console.log(`  Address:  ${wallet.address}`);
      console.log(`  Status:   ${wallet.paused ? "⏸️ Paused" : "✅ Active"}`);
      console.log(`  Created:  ${wallet.createdAt}\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("pause <id>")
  .description("Pause a wallet")
  .action(async (id) => {
    try {
      const vault = await Vault.create();
      await vault.pauseWallet(id);
      console.log(`\n⏸️  Wallet ${id} paused.\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("unpause <id>")
  .description("Unpause a wallet")
  .action(async (id) => {
    try {
      const vault = await Vault.create();
      await vault.unpauseWallet(id);
      console.log(`\n✅ Wallet ${id} unpaused.\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

walletCmd
  .command("delete <id>")
  .description("Delete a wallet")
  .action(async (id) => {
    try {
      const vault = await Vault.create();
      await vault.deleteWallet(id);
      console.log(`\n🗑️  Wallet ${id} deleted.\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

// ── Vault Commands ──────────────────────────────────────────────────

const vaultCmd = program.command("vault").description("Vault management commands");

vaultCmd
  .command("export")
  .description("Export vault data (encrypted)")
  .action(async () => {
    try {
      const vault = await Vault.create();
      const data = await vault.exportVault();
      console.log(data);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

vaultCmd
  .command("import <data>")
  .description("Import vault data from encrypted export")
  .action(async (data) => {
    try {
      const vault = await Vault.create();
      const imported = await vault.importVault(data);
      console.log(`\n✅ Imported ${imported} wallets.\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

// ── Deploy Commands ──────────────────────────────────────────────────

const deployCmd = program.command("deploy").description("Deployment commands");

deployCmd
  .command("e2b")
  .description("Deploy to E2B sandbox")
  .option("--api-key <key>", "E2B API key (or E2B_API_KEY env)")
  .option("--passphrase <pass>", "Vault passphrase")
  .option("--timeout <seconds>", "Sandbox timeout", "300")
  .action(async (options) => {
    try {
      const apiKey = options.apiKey ?? process.env.E2B_API_KEY;
      if (!apiKey) {
        console.error("E2B API key required. Set E2B_API_KEY or use --api-key");
        process.exit(1);
      }

      const instance = await deployToE2B({
        apiKey,
        vaultPassphrase: options.passphrase ?? process.env.VAULT_PASSPHRASE,
        timeout: parseInt(options.timeout, 10),
      });

      console.log(`\n🚀 E2B Sandbox deployed:\n`);
      console.log(`  ID:  ${instance.id}`);
      console.log(`  URL: ${instance.url}\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

deployCmd
  .command("cloudflare")
  .description("Deploy to Cloudflare Workers")
  .option("--api-token <token>", "Cloudflare API token (or CLOUDFLARE_API_TOKEN env)")
  .option("--account-id <id>", "Cloudflare account ID (or CLOUDFLARE_ACCOUNT_ID env)")
  .option("--passphrase <pass>", "Vault passphrase")
  .option("--name <name>", "Worker name", "agentwallet-vault")
  .action(async (options) => {
    try {
      const apiToken = options.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;
      const accountId = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;

      if (!apiToken || !accountId) {
        console.error("Cloudflare API token and account ID required.");
        console.error("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID or use options.");
        process.exit(1);
      }

      const instance = await deployToCloudflare({
        apiToken,
        accountId,
        vaultPassphrase: options.passphrase ?? process.env.VAULT_PASSPHRASE,
        workerName: options.name,
      });

      console.log(`\n🚀 Cloudflare Worker deployed:\n`);
      console.log(`  Name: ${instance.id}`);
      console.log(`  URL:  ${instance.url}\n`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

// Parse and run
program.parse();