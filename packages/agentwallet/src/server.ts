/**
 * @agentwallet/core — HTTP API Server
 * Express-based REST API for vault operations
 */

import express, { type Request, type Response, type NextFunction } from "express";
import type { Vault } from "./vault.js";
import type { ServerConfig, ChainType } from "./types.js";
import { generateSolanaKeypair, generateEVMKeypair, importSolanaKeypair, importSolanaKeypairFromBytes, importEVMKeypair } from "./keygen.js";

/**
 * Default server configuration.
 */
export function defaultServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.VAULT_PORT ?? "9099", 10),
    host: process.env.VAULT_HOST ?? "0.0.0.0",
    apiToken: process.env.VAULT_API_TOKEN,
    cors: true,
  };
}

/**
 * Create an Express router for the vault API.
 */
export function createVaultRouter(vault: Vault): express.Router {
  const router = express.Router();

  // ── Health ────────────────────────────────────────────────────────

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Wallet CRUD ────────────────────────────────────────────────────

  // List all wallets
  router.get("/wallets", (_req: Request, res: Response) => {
    const wallets = vault.listWallets();
    res.json({ wallets });
  });

  // Get a specific wallet
  router.get("/wallets/:id", (req: Request, res: Response) => {
    const wallet = vault.getWallet(req.params.id);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json({ wallet });
  });

  // Create a new wallet (generate keypair)
  router.post("/wallets", async (req: Request, res: Response) => {
    try {
      const { id, label, chainType, chainId = 0 } = req.body;

      if (!label || !chainType) {
        return res.status(400).json({ error: "Missing required fields: label, chainType" });
      }

      let keypair;
      let address: string;

      if (chainType === "solana") {
        keypair = await generateSolanaKeypair();
        address = keypair.address;
      } else if (chainType === "evm") {
        keypair = await generateEVMKeypair();
        address = keypair.address;
      } else {
        return res.status(400).json({ error: `Unsupported chainType: ${chainType}` });
      }

      const entry = await vault.addWallet(id, label, chainType as ChainType, chainId, address, keypair.privateKey);

      res.status(201).json({
        wallet: {
          id: entry.id,
          label: entry.label,
          chainType: entry.chainType,
          chainId: entry.chainId,
          address: entry.address,
          createdAt: entry.createdAt,
        },
      });
    } catch (err) {
      console.error("[VAULT] Error creating wallet:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Import an existing wallet
  router.post("/wallets/import", async (req: Request, res: Response) => {
    try {
      const { id, label, chainType, chainId = 0, privateKey } = req.body;

      if (!label || !chainType || !privateKey) {
        return res.status(400).json({ error: "Missing required fields: label, chainType, privateKey" });
      }

      let keypair;
      let address: string;

      if (chainType === "solana") {
        // privateKey can be base58 or hex
        if (typeof privateKey === "string") {
          keypair = await (privateKey.startsWith("[")
            ? importSolanaKeypairFromBytes(new Uint8Array(JSON.parse(privateKey)))
            : importSolanaKeypair(privateKey));
        } else {
          keypair = await importSolanaKeypairFromBytes(new Uint8Array(privateKey));
        }
        address = keypair.address;
      } else if (chainType === "evm") {
        keypair = await importEVMKeypair(privateKey);
        address = keypair.address;
      } else {
        return res.status(400).json({ error: `Unsupported chainType: ${chainType}` });
      }

      const entry = await vault.addWallet(id, label, chainType as ChainType, chainId, address, keypair.privateKey);

      res.status(201).json({
        wallet: {
          id: entry.id,
          label: entry.label,
          chainType: entry.chainType,
          chainId: entry.chainId,
          address: entry.address,
          createdAt: entry.createdAt,
        },
      });
    } catch (err) {
      console.error("[VAULT] Error importing wallet:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get private key (requires auth)
  router.get("/wallets/:id/private-key", (req: Request, res: Response) => {
    try {
      const privateKey = vault.getPrivateKey(req.params.id);
      res.json({
        privateKey: Buffer.from(privateKey).toString("hex"),
        id: req.params.id,
      });
    } catch (err) {
      if ((err as Error).message.includes("not found")) {
        return res.status(404).json({ error: (err as Error).message });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Pause wallet
  router.post("/wallets/:id/pause", async (req: Request, res: Response) => {
    try {
      await vault.pauseWallet(req.params.id);
      res.json({ status: "paused", id: req.params.id });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // Unpause wallet
  router.post("/wallets/:id/unpause", async (req: Request, res: Response) => {
    try {
      await vault.unpauseWallet(req.params.id);
      res.json({ status: "unpaused", id: req.params.id });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // Delete wallet
  router.delete("/wallets/:id", async (req: Request, res: Response) => {
    try {
      await vault.deleteWallet(req.params.id);
      res.json({ status: "deleted", id: req.params.id });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // ── Vault Operations ───────────────────────────────────────────────

  // Export vault
  router.get("/vault/export", async (_req: Request, res: Response) => {
    try {
      const data = await vault.exportVault();
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Import vault
  router.post("/vault/import", async (req: Request, res: Response) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: "Missing vault data" });
      }
      const imported = await vault.importVault(data);
      res.json({ status: "imported", count: imported });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

/**
 * Bearer token authentication middleware.
 */
export function authMiddleware(apiToken: string): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = auth.slice(7);
    if (token !== apiToken) {
      return res.status(403).json({ error: "Invalid API token" });
    }
    next();
  };
}

/**
 * CORS middleware.
 */
export function corsMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  };
}

/**
 * Start the vault HTTP server.
 */
export async function startServer(vault: Vault, config?: ServerConfig): Promise<express.Application> {
  const cfg = config ?? defaultServerConfig();
  const app = express();

  // Middleware
  app.use(express.json());
  
  if (cfg.cors) {
    app.use(corsMiddleware());
  }

  if (cfg.apiToken) {
    app.use("/api", authMiddleware(cfg.apiToken));
  }

  // Routes
  const router = createVaultRouter(vault);
  app.use("/api", router);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[VAULT] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return new Promise((resolve) => {
    app.listen(cfg.port, cfg.host, () => {
      console.log(`[VAULT] 🚀 Server listening on http://${cfg.host}:${cfg.port}`);
      resolve(app);
    });
  });
}