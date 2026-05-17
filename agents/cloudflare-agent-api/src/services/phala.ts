// ═══════════════════════════════════════════════════════════════
// PHALA CLOUD SERVICE - TEE Deployment for AI Agents
// Deploy AI agents to Phala Cloud's Trusted Execution Environment
// ═══════════════════════════════════════════════════════════════

import type { Env } from '../index';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface DeployedAgent {
  id: string;
  name: string;
  status: 'deploying' | 'running' | 'stopped' | 'error';
  appId: string;
  instanceId?: string;
  deploymentUrl?: string;
  dashboardUrl?: string;
  logsUrl?: string;
  publicKey?: string;
  configuration: {
    vcpu: number;
    memory: number;
    diskSize: number;
  };
  createdAt: string;
  uptime?: string;
}

export interface DeployOptions {
  name: string;
  agentId: string;
  vcpu?: number;
  memory?: number;
  diskSize?: number;
  envVars?: Array<{ key: string; value: string }>;
}

interface CvmConfig {
  teepod_id: number;
  name: string;
  image: string;
  vcpu: number;
  memory: number;
  disk_size: number;
  compose_manifest: {
    docker_compose_file: string;
    docker_config: {
      url: string;
      username: string;
      password: string;
    };
    features: string[];
    kms_enabled: boolean;
    manifest_version: number;
    name: string;
    public_logs: boolean;
    public_sysinfo: boolean;
    tproxy_enabled: boolean;
  };
  listed: boolean;
  encrypted_env?: string;
  app_env_encrypt_pubkey?: string;
  app_id_salt?: string;
}

interface PhalaUserInfo {
  id: string;
  username: string;
}

interface CvmResponse {
  hosted: {
    id: string;
    name: string;
    status: string;
    uptime: string;
    app_url: string;
    app_id: string;
    instance_id: string;
    configuration: {
      memory: number;
      disk_size: number;
      vcpu: number;
    };
  };
  node: {
    name: string;
  };
  status: string;
  dapp_dashboard_url: string;
  syslog_endpoint: string;
}

interface CvmNetworkResponse {
  is_online?: boolean;
  public_urls?: Array<{ app?: string }>;
}

interface PhalaAuthResponse {
  username?: string;
}

interface PhalaUserSearchResponse {
  users?: Array<{ id?: string }>;
}

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────

const CLOUD_API_URL = 'https://cloud-api.phala.network';
const CLOUD_URL = 'https://cloud.phala.network';

// Docker compose template for Solana AI Agent
const AGENT_COMPOSE_TEMPLATE = `
version: '3.8'
services:
  agent:
    image: ghcr.io/clawdos/solana-ai-agent:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - AGENT_NAME=\${AGENT_NAME}
      - AGENT_ID=\${AGENT_ID}
      - CROSSMINT_API_KEY=\${CROSSMINT_API_KEY}
      - SOLANA_RPC_URL=\${SOLANA_RPC_URL}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

// ─────────────────────────────────────────────────
// PHALA CLOUD SERVICE
// ─────────────────────────────────────────────────

export class PhalaService {
  private apiKey: string;
  private headers: Record<string, string>;

  constructor(private env: Env) {
    this.apiKey = env.PHALA_CLOUD_API_KEY || env.PHALA_API_KEY || '';
    this.headers = {
      'User-Agent': 'clawdos-agent-api/1.0.0',
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ═══════════════════════════════════════════════════
  // DEPLOYMENT
  // ═══════════════════════════════════════════════════

  async deployAgent(options: DeployOptions): Promise<DeployedAgent> {
    if (!this.isConfigured()) {
      throw new Error('Phala Cloud API key not configured');
    }

    console.log(`Deploying agent: ${options.name}`);

    // Create VM configuration
    const vmConfig = this.createVmConfig(options);

    // Get public key for encryption
    const pubkey = await this.getPubkeyFromCvm(vmConfig);
    if (!pubkey) {
      throw new Error('Failed to get pubkey from CVM');
    }

    // Encrypt environment variables
    const envVars = options.envVars || [];
    envVars.push(
      { key: 'AGENT_NAME', value: options.name },
      { key: 'AGENT_ID', value: options.agentId },
      { key: 'CROSSMINT_API_KEY', value: this.env.CROSSMINT_SERVERSIDE_API_KEY || '' },
      { key: 'SOLANA_RPC_URL', value: this.env.SOLANA_RPC_URL || '' },
      { key: 'OPENAI_API_KEY', value: this.env.OPENAI_API_KEY || '' }
    );

    const encryptedEnv = await this.encryptSecrets(envVars, pubkey.app_env_encrypt_pubkey);

    // Create CVM
    const response = await this.createCvm({
      ...vmConfig,
      encrypted_env: encryptedEnv,
      app_env_encrypt_pubkey: pubkey.app_env_encrypt_pubkey,
      app_id_salt: pubkey.app_id_salt,
    });

    if (!response) {
      throw new Error('Failed to create CVM');
    }

    console.log(`Agent deployed with App ID: ${response.app_id}`);

    return {
      id: options.agentId,
      name: options.name,
      status: 'deploying',
      appId: response.app_id,
      dashboardUrl: `${CLOUD_URL}/dashboard/cvms/app_${response.app_id}`,
      configuration: {
        vcpu: options.vcpu || 1,
        memory: options.memory || 2048,
        diskSize: options.diskSize || 20,
      },
      createdAt: new Date().toISOString(),
    };
  }

  async getDeployedAgents(): Promise<DeployedAgent[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const userInfo = await this.getUserInfo();
      if (!userInfo) {
        return [];
      }

      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms?user_id=${userInfo.id}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to get CVMs: ${response.status}`);
      }

      const cvms: CvmResponse[] = await response.json();

      return cvms.map(cvm => ({
        id: cvm.hosted.app_id,
        name: cvm.hosted.name,
        status: cvm.status as DeployedAgent['status'],
        appId: cvm.hosted.app_id,
        instanceId: cvm.hosted.instance_id,
        deploymentUrl: cvm.hosted.app_url,
        dashboardUrl: cvm.dapp_dashboard_url,
        logsUrl: cvm.syslog_endpoint,
        configuration: {
          vcpu: cvm.hosted.configuration.vcpu,
          memory: cvm.hosted.configuration.memory,
          diskSize: cvm.hosted.configuration.disk_size,
        },
        createdAt: new Date().toISOString(),
        uptime: cvm.hosted.uptime,
      }));
    } catch (error) {
      console.error('Error getting deployed agents:', error);
      return [];
    }
  }

  async getAgentStatus(appId: string): Promise<{ status: string; url?: string } | null> {
    try {
      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms/app_${appId}/network`,
        { headers: this.headers }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as CvmNetworkResponse;
      return {
        status: data.is_online ? 'running' : 'offline',
        url: data.public_urls?.[0]?.app,
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      return null;
    }
  }

  async stopAgent(appId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms/app_${appId}/stop`,
        {
          method: 'POST',
          headers: this.headers,
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error stopping agent:', error);
      return false;
    }
  }

  async startAgent(appId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms/app_${appId}/start`,
        {
          method: 'POST',
          headers: this.headers,
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error starting agent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────

  private createVmConfig(options: DeployOptions): CvmConfig {
    return {
      teepod_id: 2,
      name: options.name,
      image: 'dstack-dev-0.3.4',
      vcpu: options.vcpu || 1,
      memory: options.memory || 2048,
      disk_size: options.diskSize || 20,
      compose_manifest: {
        docker_compose_file: AGENT_COMPOSE_TEMPLATE,
        docker_config: {
          url: '',
          username: '',
          password: '',
        },
        features: ['kms', 'tproxy-net'],
        kms_enabled: true,
        manifest_version: 2,
        name: options.name,
        public_logs: true,
        public_sysinfo: true,
        tproxy_enabled: true,
      },
      listed: false,
    };
  }

  private async getPubkeyFromCvm(vmConfig: CvmConfig): Promise<{ app_env_encrypt_pubkey: string; app_id_salt: string } | null> {
    try {
      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms/pubkey/from_cvm_configuration`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(vmConfig),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting pubkey from CVM:', error);
      return null;
    }
  }

  private async createCvm(vmConfig: CvmConfig): Promise<{ app_id: string } | null> {
    try {
      const response = await fetch(
        `${CLOUD_API_URL}/api/v1/cvms/from_cvm_configuration`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(vmConfig),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating CVM:', error);
      return null;
    }
  }

  private async getUserInfo(): Promise<PhalaUserInfo | null> {
    try {
      const authResponse = await fetch(`${CLOUD_API_URL}/api/v1/auth/me`, {
        headers: this.headers,
      });

      if (!authResponse.ok) {
        return null;
      }

      const authData = await authResponse.json() as PhalaAuthResponse;
      const username = authData.username;
      if (!username) {
        return null;
      }

      const userResponse = await fetch(
        `${CLOUD_API_URL}/api/v1/users/search?q=${username}`,
        { headers: this.headers }
      );

      if (!userResponse.ok) {
        return null;
      }

      const userData = await userResponse.json() as PhalaUserSearchResponse;
      const userId = userData.users?.[0]?.id;
      if (!userId) {
        return null;
      }
      return {
        id: userId,
        username,
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  private async encryptSecrets(
    secrets: Array<{ key: string; value: string }>,
    pubkey: string
  ): Promise<string> {
    // For now, return a simple JSON string
    // In production, this would use x25519 encryption
    const envsJson = JSON.stringify({ env: secrets });

    // TODO: Implement proper x25519 encryption
    // For now, we'll use a placeholder that works with the API
    return Array.from(new TextEncoder().encode(envsJson))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
