// ═══════════════════════════════════════════════════════════════
// AGENT DEPLOYMENT SERVICE - Deploy AI Agents on Cloudflare
// Manages agent deployment lifecycle and delegated signing
// ═══════════════════════════════════════════════════════════════

import type { Env, Agent } from '../index';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface DeployedAgentConfig {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'error';
  walletAddress?: string;
  chain: 'solana' | 'solana-devnet';
  publicKey?: string;
  delegatedSignerId?: string;
  delegatedSignerStatus?: 'pending' | 'active' | 'rejected';
  configuration: {
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
  };
  capabilities: string[];
  createdAt: string;
  deployedAt?: string;
  lastActiveAt?: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentRequest {
  agentId: string;
  walletAddress: string;
  walletSignerType: 'solana-keypair' | 'evm-passkey';
  configuration?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  };
  capabilities?: string[];
}

export interface DelegatedSignerResult {
  id: string;
  message: string;
  targetSignerLocator: string;
  alreadyActive: boolean;
}

// ─────────────────────────────────────────────────
// DEPLOYMENT SERVICE
// ─────────────────────────────────────────────────

export class DeploymentService {
  private crossmintApiKey: string;
  private crossmintBaseUrl: string;

  constructor(private env: Env, private db: D1Database) {
    this.crossmintApiKey = env.CROSSMINT_SERVERSIDE_API_KEY || '';
    // Determine environment from API key
    const isStaging = this.crossmintApiKey.startsWith('sk_staging_');
    this.crossmintBaseUrl = isStaging
      ? 'https://staging.crossmint.com/api/2022-06-09'
      : 'https://www.crossmint.com/api/2022-06-09';
  }

  // ═══════════════════════════════════════════════════
  // DEPLOYMENT OPERATIONS
  // ═══════════════════════════════════════════════════

  async deployAgent(request: DeploymentRequest, agent: Agent): Promise<{
    deployment: DeployedAgentConfig;
    delegatedSigner?: DelegatedSignerResult | null;
  }> {
    // Generate a unique deployment ID
    const deploymentId = `dep_${this.generateId()}`;

    // Create deployment config
    const deployment: DeployedAgentConfig = {
      id: deploymentId,
      agentId: agent.id,
      name: agent.name,
      description: agent.description || undefined,
      status: 'deploying',
      walletAddress: request.walletAddress,
      chain: agent.chain,
      configuration: {
        model: request.configuration?.model || 'gpt-4',
        maxTokens: request.configuration?.maxTokens || 4096,
        temperature: request.configuration?.temperature || 0.7,
        systemPrompt: request.configuration?.systemPrompt,
      },
      capabilities: request.capabilities || ['transfer', 'swap', 'chat'],
      createdAt: new Date().toISOString(),
    };

    // Store deployment in database
    await this.db.prepare(`
      INSERT INTO agent_deployments (
        id, agent_id, name, description, status, wallet_address, chain,
        configuration, capabilities, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deployment.id,
      deployment.agentId,
      deployment.name,
      deployment.description || null,
      deployment.status,
      deployment.walletAddress,
      deployment.chain,
      JSON.stringify(deployment.configuration),
      JSON.stringify(deployment.capabilities),
      deployment.createdAt
    ).run();

    // Get or create delegated signer
    const delegatedSigner = await this.getOrCreateDelegatedSigner(
      request.walletAddress,
      agent.id,
      request.walletSignerType
    );

    // Update deployment with delegated signer info
    if (delegatedSigner) {
      deployment.delegatedSignerId = delegatedSigner.id;
      deployment.delegatedSignerStatus = delegatedSigner.alreadyActive ? 'active' : 'pending';

      await this.db.prepare(`
        UPDATE agent_deployments
        SET delegated_signer_id = ?, delegated_signer_status = ?, status = ?
        WHERE id = ?
      `).bind(
        delegatedSigner.id,
        deployment.delegatedSignerStatus,
        delegatedSigner.alreadyActive ? 'running' : 'pending',
        deployment.id
      ).run();

      if (delegatedSigner.alreadyActive) {
        deployment.status = 'running';
        deployment.deployedAt = new Date().toISOString();
      }
    }

    return { deployment, delegatedSigner };
  }

  async getDeployments(agentId: string): Promise<DeployedAgentConfig[]> {
    const result = await this.db.prepare(`
      SELECT * FROM agent_deployments WHERE agent_id = ? ORDER BY created_at DESC
    `).bind(agentId).all();

    return (result.results || []).map(row => this.rowToDeployment(row));
  }

  async getAllDeployments(): Promise<DeployedAgentConfig[]> {
    const result = await this.db.prepare(`
      SELECT * FROM agent_deployments ORDER BY created_at DESC LIMIT 100
    `).all();

    return (result.results || []).map(row => this.rowToDeployment(row));
  }

  async getDeployment(deploymentId: string): Promise<DeployedAgentConfig | null> {
    const result = await this.db.prepare(`
      SELECT * FROM agent_deployments WHERE id = ?
    `).bind(deploymentId).first();

    return result ? this.rowToDeployment(result) : null;
  }

  async updateDeploymentStatus(
    deploymentId: string,
    status: DeployedAgentConfig['status']
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === 'running') {
      updates.push('deployed_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(deploymentId);

    await this.db.prepare(`
      UPDATE agent_deployments SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();
  }

  async stopDeployment(deploymentId: string): Promise<void> {
    await this.updateDeploymentStatus(deploymentId, 'stopped');
  }

  // ═══════════════════════════════════════════════════
  // DELEGATED SIGNER OPERATIONS
  // ═══════════════════════════════════════════════════

  private async getOrCreateDelegatedSigner(
    walletAddress: string,
    agentPublicKey: string,
    walletSignerType: 'solana-keypair' | 'evm-passkey'
  ): Promise<DelegatedSignerResult | null> {
    if (!this.crossmintApiKey) {
      throw new Error('Crossmint API key not configured');
    }

    const signerLocator = `${walletSignerType}:${agentPublicKey}`;

    try {
      // 1. Check if delegated signer already exists
      const existingResponse = await fetch(
        `${this.crossmintBaseUrl}/wallets/${walletAddress}/signers/${signerLocator}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': this.crossmintApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        const parsed = this.parseDelegatedSignerResponse(existing, walletSignerType === 'evm-passkey');

        if (parsed.status === 'active' || parsed.status === 'success') {
          return {
            id: parsed.id,
            message: '',
            targetSignerLocator: parsed.targetSignerLocator,
            alreadyActive: true,
          };
        }

        if (parsed.status === 'awaiting-approval') {
          return {
            id: parsed.id,
            message: parsed.message,
            targetSignerLocator: parsed.targetSignerLocator,
            alreadyActive: false,
          };
        }
      }

      // 2. Create new delegated signer
      const createBody: Record<string, string> = { signer: signerLocator };
      if (walletSignerType === 'evm-passkey') {
        createBody.chain = 'base-sepolia'; // Default chain for EVM
      }

      const createResponse = await fetch(
        `${this.crossmintBaseUrl}/wallets/${walletAddress}/signers`,
        {
          method: 'POST',
          headers: {
            'X-API-KEY': this.crossmintApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createBody),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create delegated signer: ${errorText}`);
      }

      const created = await createResponse.json();
      const parsed = this.parseDelegatedSignerResponse(created, walletSignerType === 'evm-passkey');

      return {
        id: parsed.id,
        message: parsed.message,
        targetSignerLocator: parsed.targetSignerLocator,
        alreadyActive: false,
      };
    } catch (error) {
      console.error('Error in getOrCreateDelegatedSigner:', error);
      throw error;
    }
  }

  async submitSignatureApproval(
    walletAddress: string,
    signatureId: string,
    signerLocator: string,
    signature: unknown,
    metadata?: unknown
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.crossmintBaseUrl}/wallets/${walletAddress}/signatures/${signatureId}/approvals`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': this.crossmintApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvals: [{
            signer: signerLocator,
            metadata,
            signature,
          }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit signature approval');
    }

    return { success: true };
  }

  async submitTransactionApproval(
    walletAddress: string,
    transactionId: string,
    signerLocator: string,
    signature: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.crossmintBaseUrl}/wallets/${walletAddress}/transactions/${transactionId}/approvals`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': this.crossmintApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvals: [{
            signer: signerLocator,
            signature,
          }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit transaction approval');
    }

    return { success: true };
  }

  // ─────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────

  private parseDelegatedSignerResponse(
    response: unknown,
    isEVM: boolean
  ): {
    message: string;
    id: string;
    status: string;
    targetSignerLocator: string;
  } {
    const resp = response as Record<string, unknown>;
    const target = isEVM
      ? Object.values((resp?.chains as Record<string, unknown>) || {})[0]
      : resp?.transaction;

    const t = target as Record<string, unknown>;
    const approvals = t?.approvals as Record<string, unknown>;
    const pending = (approvals?.pending as unknown[]) || [];
    const firstPending = pending[0] as Record<string, unknown>;

    return {
      message: firstPending?.message as string || '',
      id: t?.id as string || '',
      status: t?.status as string || '',
      targetSignerLocator: firstPending?.signer as string || '',
    };
  }

  private rowToDeployment(row: Record<string, unknown>): DeployedAgentConfig {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as DeployedAgentConfig['status'],
      walletAddress: row.wallet_address as string | undefined,
      chain: row.chain as 'solana' | 'solana-devnet',
      publicKey: row.public_key as string | undefined,
      delegatedSignerId: row.delegated_signer_id as string | undefined,
      delegatedSignerStatus: row.delegated_signer_status as 'pending' | 'active' | 'rejected' | undefined,
      configuration: JSON.parse(row.configuration as string || '{}'),
      capabilities: JSON.parse(row.capabilities as string || '[]'),
      createdAt: row.created_at as string,
      deployedAt: row.deployed_at as string | undefined,
      lastActiveAt: row.last_active_at as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    };
  }

  private generateId(): string {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
