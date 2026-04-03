/**
 * @agentwallet/core — E2B Sandbox Deployment
 * Deploy vault server into E2B sandbox for remote agent access
 */

import type { E2BSandboxConfig, SandboxInstance } from "../types.js";

/**
 * E2B sandbox deployment manager.
 */
export class E2BDeployer {
  private config: E2BSandboxConfig;

  constructor(config: E2BSandboxConfig) {
    this.config = {
      timeout: 300,
      port: 9099,
      ...config,
    };
  }

  /**
   * Deploy the vault server to an E2B sandbox.
   * Returns the sandbox instance with connection URL.
   */
  async deploy(): Promise<SandboxInstance> {
    try {
      // Dynamic import for optional dependency
      const { Sandbox } = await import("e2b");

      // E2B API: Sandbox.create(template, opts)
      const template = this.config.templateId ?? "base";
      const sandbox = await Sandbox.create(template, {
        apiKey: this.config.apiKey,
        timeoutMs: (this.config.timeout ?? 300) * 1000,
      });

      // Set environment variables using process
      const envVars: Record<string, string> = {
        ...this.config.envVars,
      };
      
      if (this.config.vaultPassphrase) {
        envVars.VAULT_PASSPHRASE = this.config.vaultPassphrase;
      }

      // Install dependencies and start server
      const port = this.config.port ?? 9099;
      
      // Run commands in sandbox
      const envString = Object.entries(envVars)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      
      await sandbox.commands.run(`npm install -g @agentwallet/core`);
      await sandbox.commands.run(`${envString} VAULT_PORT=${port} agentwallet serve &`);

      // Get the sandbox URL
      const sandboxUrl = `https://${sandbox.sandboxId}-${port}.e2b.dev`;

      console.log(`[E2B] 🚀 Sandbox deployed: ${sandboxUrl}`);

      return {
        provider: "e2b",
        id: sandbox.sandboxId,
        url: sandboxUrl,
        status: "running",
        createdAt: new Date().toISOString(),
        metadata: {
          port,
          timeout: this.config.timeout,
        },
      };
    } catch (err) {
      console.error("[E2B] Deployment failed:", err);
      throw new Error(`E2B deployment failed: ${(err as Error).message}`);
    }
  }

  /**
   * Connect to an existing E2B sandbox.
   */
  async connect(sandboxId: string): Promise<SandboxInstance> {
    try {
      const { Sandbox } = await import("e2b");

      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: this.config.apiKey,
      });

      const port = this.config.port ?? 9099;
      const sandboxUrl = `https://${sandbox.sandboxId}-${port}.e2b.dev`;

      return {
        provider: "e2b",
        id: sandbox.sandboxId,
        url: sandboxUrl,
        status: "running",
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new Error(`Failed to connect to sandbox: ${(err as Error).message}`);
    }
  }

  /**
   * Stop an E2B sandbox.
   */
  async stop(sandboxId: string): Promise<void> {
    try {
      const { Sandbox } = await import("e2b");

      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: this.config.apiKey,
      });

      // E2B sandbox will timeout automatically
      console.log(`[E2B] Sandbox will timeout: ${sandboxId}`);
    } catch (err) {
      console.warn(`[E2B] Failed to stop sandbox: ${(err as Error).message}`);
    }
  }
}

/**
 * Deploy to E2B sandbox (convenience function).
 */
export async function deployToE2B(config: E2BSandboxConfig): Promise<SandboxInstance> {
  const deployer = new E2BDeployer(config);
  return deployer.deploy();
}