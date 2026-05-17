// ═══════════════════════════════════════════════════════════════
// API ROUTER - Route handling for all endpoints
// Includes: Agent, Wallet, Smart Wallet, and GOAT Tool routes
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  Env,
} from './index';
import type { AgentService } from './services/agent';
import type { CrossmintService } from './services/crossmint';
import type {
  DeploymentRequest,
  DeploymentService,
} from './services/deployment';
import {
  type AgentExecutionContext,
  AgentRuntimeService,
  type ChatMessage,
} from './services/runtime';

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Agent-API-Key, X-Agent-Session',
  };
}

function jsonResponse(data: unknown, status = 200, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

function errorResponse(message: string, status = 500, env: Env): Response {
  return jsonResponse({ success: false, error: message }, status, env);
}

// ─────────────────────────────────────────────────
// ROUTER CLASS
// ─────────────────────────────────────────────────

export class Router {
  private runtimeService: AgentRuntimeService;

  constructor(
    private env: Env,
    private agentService: AgentService,
    private crossmintService: CrossmintService,
    private deploymentService: DeploymentService
  ) {
    this.runtimeService = new AgentRuntimeService(env, env.DB);
  }

  // ═══════════════════════════════════════════════════
  // FACTORY ROUTES (v1 API)
  // ═══════════════════════════════════════════════════

  async handleFactoryRoutes(request: Request, path: string): Promise<Response> {
    const method = request.method;
    const route = path.replace('/api/v1/factory', '') || '/';

    // Protected routes (require auth)
    const agent = await this.authenticate(request);
    if (!agent) {
      return errorResponse('Authentication required', 401, this.env);
    }

    // Rate limit check
    const rateLimitResult = await this.agentService.checkRateLimit(agent.id);
    if (!rateLimitResult.allowed) {
      return jsonResponse({
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimitResult.remaining,
      }, 429, this.env);
    }

    await this.agentService.recordRequest(agent.id);

    // Factory route matching
    if (route === '/deploy' && method === 'POST') {
      return this.deployAgent(request, agent);
    }
    if (route === '/deployments' && method === 'GET') {
      return this.getDeployments(agent);
    }
    if (route.startsWith('/deployments/') && route.endsWith('/stop') && method === 'POST') {
      const deploymentId = route.replace('/deployments/', '').replace('/stop', '');
      return this.stopDeployment(deploymentId, agent);
    }
    if (route.startsWith('/deployments/') && method === 'GET') {
      const deploymentId = route.replace('/deployments/', '');
      return this.getDeployment(deploymentId, agent);
    }
    if (route === '/info' && method === 'GET') {
      return this.getFactoryInfo();
    }

    return errorResponse('Not Found', 404, this.env);
  }

  private getFactoryInfo(): Response {
    return jsonResponse({
      success: true,
      data: {
        service: 'Agent Factory API',
        version: '1.0.0',
        endpoints: {
          deploy: 'POST /api/v1/factory/deploy',
          deployments: 'GET /api/v1/factory/deployments',
          deployment: 'GET /api/v1/factory/deployments/:id',
          stop: 'POST /api/v1/factory/deployments/:id/stop',
        },
        requiredFields: {
          deploy: ['walletAddress', 'walletSignerType'],
        },
      },
    }, 200, this.env);
  }

  // ═══════════════════════════════════════════════════
  // AGENT ROUTES
  // ═══════════════════════════════════════════════════

  async handleAgentRoutes(request: Request, path: string): Promise<Response> {
    const method = request.method;
    const route = path.replace('/api/agents', '') || '/';

    // Public routes (no auth required)
    if (route === '/register' && method === 'POST') {
      return this.register(request);
    }
    if (route === '/login' && method === 'POST') {
      return this.login(request);
    }
    if (route === '/info' && method === 'GET') {
      return this.getInfo();
    }

    // Protected routes (require auth)
    const agent = await this.authenticate(request);
    if (!agent) {
      return errorResponse('Authentication required', 401, this.env);
    }

    // Rate limit check
    const rateLimitResult = await this.agentService.checkRateLimit(agent.id);
    if (!rateLimitResult.allowed) {
      return jsonResponse({
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimitResult.remaining,
      }, 429, this.env);
    }

    // Record this request
    await this.agentService.recordRequest(agent.id);

    // Route matching
    if (route === '/me' && method === 'GET') {
      return this.getMe(agent);
    }
    if (route === '/logout' && method === 'POST') {
      return this.logout(request);
    }
    if (route === '/wallet/create' && method === 'POST') {
      return this.createWallet(request, agent);
    }
    if (route === '/wallet' && method === 'GET') {
      return this.getWallet(agent);
    }
    if (route === '/wallet/fund' && method === 'POST') {
      return this.fundWallet(request, agent);
    }
    if (route === '/wallet/transfer' && method === 'POST') {
      return this.transfer(request, agent);
    }
    if (route === '/rate-limit' && method === 'GET') {
      return this.getRateLimit(agent);
    }
    if (route === '/api-key/regenerate' && method === 'POST') {
      return this.regenerateApiKey(agent);
    }

    // Deployment routes
    if (route === '/deploy' && method === 'POST') {
      return this.deployAgent(request, agent);
    }
    if (route === '/deployments' && method === 'GET') {
      return this.getDeployments(agent);
    }
    if (route.startsWith('/deployments/') && method === 'GET') {
      const deploymentId = route.replace('/deployments/', '');
      return this.getDeployment(deploymentId, agent);
    }
    if (route.startsWith('/deployments/') && route.endsWith('/stop') && method === 'POST') {
      const deploymentId = route.replace('/deployments/', '').replace('/stop', '');
      return this.stopDeployment(deploymentId, agent);
    }
    if (route === '/signature-approval' && method === 'POST') {
      return this.submitSignatureApproval(request, agent);
    }
    if (route === '/transaction-approval' && method === 'POST') {
      return this.submitTransactionApproval(request, agent);
    }

    // Chat and execution routes
    if (route === '/chat' && method === 'POST') {
      return this.chat(request, agent);
    }
    if (route === '/models' && method === 'GET') {
      return this.getModels();
    }
    if (route.match(/^\/deployments\/[^/]+\/chat$/) && method === 'POST') {
      const deploymentId = route.replace('/deployments/', '').replace('/chat', '');
      return this.chatWithDeployment(request, deploymentId, agent);
    }
    if (route.match(/^\/deployments\/[^/]+\/execute-tool$/) && method === 'POST') {
      const deploymentId = route.replace('/deployments/', '').replace('/execute-tool', '');
      return this.executeTool(request, deploymentId, agent);
    }

    return errorResponse('Not Found', 404, this.env);
  }

  // ═══════════════════════════════════════════════════
  // WALLET ROUTES (Direct Crossmint access)
  // ═══════════════════════════════════════════════════

  async handleWalletRoutes(request: Request, path: string): Promise<Response> {
    const method = request.method;
    const route = path.replace('/api/wallets', '') || '/';

    if (route === '/info' && method === 'GET') {
      return this.getCrossmintInfo();
    }

    return errorResponse('Not Found', 404, this.env);
  }

  // ═══════════════════════════════════════════════════
  // SMART WALLET ROUTES (Advanced Crossmint + GOAT)
  // ═══════════════════════════════════════════════════

  async handleSmartWalletRoutes(request: Request, path: string): Promise<Response> {
    const method = request.method;
    const route = path.replace('/api/smart-wallets', '') || '/';

    // Public routes
    if (route === '/info' && method === 'GET') {
      return this.getSmartWalletInfo();
    }
    if (route === '/tools' && method === 'GET') {
      return this.getGoatTools();
    }

    // Protected routes (require auth)
    const agent = await this.authenticate(request);
    if (!agent) {
      return errorResponse('Authentication required', 401, this.env);
    }

    // Rate limit check
    const rateLimitResult = await this.agentService.checkRateLimit(agent.id);
    if (!rateLimitResult.allowed) {
      return jsonResponse({
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimitResult.remaining,
      }, 429, this.env);
    }

    await this.agentService.recordRequest(agent.id);

    // Smart wallet creation routes
    if (route === '/create-smart' && method === 'POST') {
      return this.createSmartWallet(request, agent);
    }
    if (route === '/create-mpc' && method === 'POST') {
      return this.createMpcWallet(request, agent);
    }
    if (route === '/get-or-create' && method === 'POST') {
      return this.getOrCreateSmartWallet(request, agent);
    }

    // Wallet operations
    if (route.match(/^\/[^/]+\/balances$/) && method === 'GET') {
      const address = route.split('/')[1];
      return this.getSmartWalletBalances(address, agent);
    }
    if (route.match(/^\/[^/]+\/airdrop$/) && method === 'POST') {
      const address = route.split('/')[1];
      return this.airdropToSmartWallet(request, address, agent);
    }
    if (route.match(/^\/[^/]+\/transfer$/) && method === 'POST') {
      const address = route.split('/')[1];
      return this.smartWalletTransfer(request, address, agent);
    }

    // Delegated signer routes
    if (route.match(/^\/[^/]+\/signers$/) && method === 'POST') {
      const address = route.split('/')[1];
      return this.registerDelegatedSigner(request, address, agent);
    }
    if (route.match(/^\/[^/]+\/signers\/[^/]+\/approve$/) && method === 'POST') {
      const parts = route.split('/');
      const address = parts[1];
      const signerId = parts[3];
      return this.approveDelegatedSigner(request, address, signerId, agent);
    }

    // GOAT tool execution
    if (route === '/execute-tool' && method === 'POST') {
      return this.executeGoatTool(request, agent);
    }
    if (route.match(/^\/[^/]+\/execute-tool$/) && method === 'POST') {
      const address = route.split('/')[1];
      return this.executeGoatToolWithWallet(request, address, agent);
    }

    return errorResponse('Not Found', 404, this.env);
  }

  // ─────────────────────────────────────────────────
  // SMART WALLET ENDPOINTS
  // ─────────────────────────────────────────────────

  private getSmartWalletInfo(): Response {
    const tools = this.crossmintService.getAvailableGoatTools();

    return jsonResponse({
      success: true,
      data: {
        service: 'Smart Wallet API',
        version: '1.0.0',
        walletTypes: ['smart', 'mpc'],
        features: [
          'Solana Smart Wallets with admin signer',
          'MPC Wallets (custodial)',
          'Delegated signer support',
          'GOAT SDK tool integration',
          'Jupiter swap quotes',
          'CoinGecko price feeds',
          'Devnet airdrops',
        ],
        goatTools: tools.map(t => t.name),
        endpoints: {
          createSmart: 'POST /api/smart-wallets/create-smart',
          createMpc: 'POST /api/smart-wallets/create-mpc',
          getOrCreate: 'POST /api/smart-wallets/get-or-create',
          balances: 'GET /api/smart-wallets/:address/balances',
          airdrop: 'POST /api/smart-wallets/:address/airdrop',
          transfer: 'POST /api/smart-wallets/:address/transfer',
          registerSigner: 'POST /api/smart-wallets/:address/signers',
          approveSigner: 'POST /api/smart-wallets/:address/signers/:signerId/approve',
          executeTool: 'POST /api/smart-wallets/execute-tool',
          executeToolWithWallet: 'POST /api/smart-wallets/:address/execute-tool',
        },
      },
    }, 200, this.env);
  }

  private getGoatTools(): Response {
    const tools = this.crossmintService.getAvailableGoatTools();

    return jsonResponse({
      success: true,
      data: { tools },
    }, 200, this.env);
  }

  private async createSmartWallet(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.permissions.canCreateWallet) {
        return errorResponse('Agent does not have permission to create wallets', 403, this.env);
      }

      const body = await request.json() as {
        adminSignerAddress?: string;
        linkedUser?: string;
        chain?: 'solana' | 'solana-devnet';
      };

      const wallet = await this.crossmintService.createSmartWallet({
        adminSignerAddress: body.adminSignerAddress,
        linkedUser: body.linkedUser || agent.id,
        chain: body.chain || agent.chain,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'smart_wallet_create', {
        address: wallet.address,
        type: 'smart',
        chain: wallet.chain,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: { wallet },
      }, 201, this.env);
    } catch (error) {
      console.error('Create smart wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to create smart wallet',
        500,
        this.env
      );
    }
  }

  private async createMpcWallet(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.permissions.canCreateWallet) {
        return errorResponse('Agent does not have permission to create wallets', 403, this.env);
      }

      const body = await request.json() as {
        identifier?: string;
        alias?: string;
        chain?: 'solana' | 'solana-devnet';
      };

      const wallet = await this.crossmintService.createMpcWallet({
        identifier: body.identifier || agent.id,
        alias: body.alias,
        chain: body.chain || agent.chain,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'mpc_wallet_create', {
        address: wallet.address,
        type: 'mpc',
        chain: wallet.chain,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: { wallet },
      }, 201, this.env);
    } catch (error) {
      console.error('Create MPC wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to create MPC wallet',
        500,
        this.env
      );
    }
  }

  private async getOrCreateSmartWallet(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.permissions.canCreateWallet) {
        return errorResponse('Agent does not have permission to create wallets', 403, this.env);
      }

      const body = await request.json() as {
        adminSignerAddress?: string;
        linkedUser?: string;
        chain?: 'solana' | 'solana-devnet';
      };

      const wallet = await this.crossmintService.getOrCreateSmartWallet({
        adminSignerAddress: body.adminSignerAddress,
        linkedUser: body.linkedUser || agent.id,
        chain: body.chain || agent.chain,
      });

      return jsonResponse({
        success: true,
        data: { wallet },
      }, 200, this.env);
    } catch (error) {
      console.error('Get or create smart wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get or create wallet',
        500,
        this.env
      );
    }
  }

  private async getSmartWalletBalances(address: string, agent: Agent): Promise<Response> {
    try {
      const balance = await this.crossmintService.goatGetBalance({
        address,
        chain: agent.chain,
      });

      const usdcBalance = await this.crossmintService.goatGetBalance({
        address,
        token: 'usdc',
        chain: agent.chain,
      });

      return jsonResponse({
        success: true,
        data: {
          address,
          chain: agent.chain,
          balances: {
            sol: balance,
            usdc: usdcBalance,
          },
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Get smart wallet balances error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get balances',
        500,
        this.env
      );
    }
  }

  private async airdropToSmartWallet(
    request: Request,
    address: string,
    agent: Agent
  ): Promise<Response> {
    try {
      if (agent.chain !== 'solana-devnet') {
        return errorResponse('Airdrop only available on devnet', 400, this.env);
      }

      const body = await request.json() as { amount?: number };

      const result = await this.crossmintService.goatAirdropDevnet({
        address,
        amount: body.amount,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'airdrop', {
        address,
        amount: result.amount,
        signature: result.signature,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 200, this.env);
    } catch (error) {
      console.error('Airdrop error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to airdrop',
        500,
        this.env
      );
    }
  }

  private async smartWalletTransfer(
    request: Request,
    address: string,
    agent: Agent
  ): Promise<Response> {
    try {
      if (!agent.permissions.canTransfer) {
        return errorResponse('Agent does not have permission to transfer', 403, this.env);
      }

      const body = await request.json() as {
        toAddress: string;
        token: string;
        amount: string;
        signerType?: 'api-key' | 'delegated' | 'admin';
      };

      if (!body.toAddress || !body.token || !body.amount) {
        return errorResponse('toAddress, token, and amount are required', 400, this.env);
      }

      // Check transfer limit
      const amountNum = parseFloat(body.amount);
      if (amountNum > agent.permissions.maxTransferAmount) {
        return errorResponse(
          `Transfer amount exceeds limit of $${agent.permissions.maxTransferAmount}`,
          403,
          this.env
        );
      }

      const result = await this.crossmintService.goatTransfer({
        fromAddress: address,
        toAddress: body.toAddress,
        token: body.token,
        amount: body.amount,
        chain: agent.chain,
        signerType: body.signerType,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'smart_wallet_transfer', {
        from: address,
        to: body.toAddress,
        token: body.token,
        amount: body.amount,
        txId: result.id,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 200, this.env);
    } catch (error) {
      console.error('Smart wallet transfer error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Transfer failed',
        500,
        this.env
      );
    }
  }

  private async registerDelegatedSigner(
    request: Request,
    walletAddress: string,
    agent: Agent
  ): Promise<Response> {
    try {
      const body = await request.json() as {
        signerAddress: string;
        expiresAt?: string;
      };

      if (!body.signerAddress) {
        return errorResponse('signerAddress is required', 400, this.env);
      }

      const result = await this.crossmintService.registerDelegatedSigner({
        walletAddress,
        signerAddress: body.signerAddress,
        expiresAt: body.expiresAt,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'register_delegated_signer', {
        walletAddress,
        signerAddress: body.signerAddress,
        signerId: result.id,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 201, this.env);
    } catch (error) {
      console.error('Register delegated signer error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to register signer',
        500,
        this.env
      );
    }
  }

  private async approveDelegatedSigner(
    request: Request,
    walletAddress: string,
    signerId: string,
    agent: Agent
  ): Promise<Response> {
    try {
      const body = await request.json() as {
        signerLocator: string;
        signature: unknown;
        metadata?: Record<string, unknown>;
      };

      if (!body.signerLocator || !body.signature) {
        return errorResponse('signerLocator and signature are required', 400, this.env);
      }

      const result = await this.crossmintService.approveDelegatedSigner({
        walletAddress,
        signerId,
        signerLocator: body.signerLocator,
        signature: body.signature,
        metadata: body.metadata,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'approve_delegated_signer', {
        walletAddress,
        signerId,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 200, this.env);
    } catch (error) {
      console.error('Approve delegated signer error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to approve signer',
        500,
        this.env
      );
    }
  }

  private async executeGoatTool(request: Request, agent: Agent): Promise<Response> {
    try {
      const body = await request.json() as {
        tool: string;
        params: Record<string, unknown>;
      };

      if (!body.tool) {
        return errorResponse('tool is required', 400, this.env);
      }

      const result = await this.crossmintService.executeGoatTool(
        body.tool,
        body.params || {},
        agent.wallet_address || undefined
      );

      // Log activity
      await this.agentService.logActivity(agent.id, 'goat_tool_execute', {
        tool: body.tool,
        params: body.params,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: { tool: body.tool, result },
      }, 200, this.env);
    } catch (error) {
      console.error('Execute GOAT tool error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Tool execution failed',
        500,
        this.env
      );
    }
  }

  private async executeGoatToolWithWallet(
    request: Request,
    walletAddress: string,
    agent: Agent
  ): Promise<Response> {
    try {
      const body = await request.json() as {
        tool: string;
        params: Record<string, unknown>;
      };

      if (!body.tool) {
        return errorResponse('tool is required', 400, this.env);
      }

      const result = await this.crossmintService.executeGoatTool(
        body.tool,
        body.params || {},
        walletAddress
      );

      // Log activity
      await this.agentService.logActivity(agent.id, 'goat_tool_execute', {
        tool: body.tool,
        walletAddress,
        params: body.params,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: { tool: body.tool, walletAddress, result },
      }, 200, this.env);
    } catch (error) {
      console.error('Execute GOAT tool with wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Tool execution failed',
        500,
        this.env
      );
    }
  }

  // ─────────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────────

  private async authenticate(request: Request): Promise<Agent | null> {
    // Try API key first
    const apiKey = request.headers.get('X-Agent-API-Key');
    if (apiKey) {
      return this.agentService.validateApiKey(apiKey);
    }

    // Try session token
    const sessionToken = request.headers.get('X-Agent-Session');
    if (sessionToken) {
      return this.agentService.validateSession(sessionToken);
    }

    return null;
  }

  // ─────────────────────────────────────────────────
  // PUBLIC ENDPOINTS
  // ─────────────────────────────────────────────────

  private async register(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        name?: string;
        description?: string;
        chain?: 'solana' | 'solana-devnet';
        metadata?: Record<string, unknown>;
      };

      if (!body.name || body.name.length < 3 || body.name.length > 50) {
        return errorResponse('Agent name must be 3-50 characters', 400, this.env);
      }

      const result = await this.agentService.register({
        name: body.name,
        description: body.description,
        chain: body.chain || 'solana-devnet',
        metadata: body.metadata,
      });

      // Log activity
      await this.agentService.logActivity(result.agent.id, 'register', {
        name: body.name,
        chain: body.chain || 'solana-devnet',
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: {
          agent: {
            id: result.agent.id,
            name: result.agent.name,
            description: result.agent.description,
            chain: result.agent.chain,
            status: result.agent.status,
            createdAt: result.agent.created_at,
            permissions: result.agent.permissions,
            rateLimit: {
              requestsPerMinute: result.agent.requests_per_minute,
              requestsPerDay: result.agent.requests_per_day,
            },
          },
          apiKey: result.apiKey,
          message: 'Save your API key securely - it will not be shown again!',
        },
      }, 201, this.env);
    } catch (error) {
      console.error('Registration error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Registration failed',
        500,
        this.env
      );
    }
  }

  private async login(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { apiKey?: string };

      if (!body.apiKey) {
        return errorResponse('API key is required', 400, this.env);
      }

      const ipAddress = request.headers.get('CF-Connecting-IP');
      const userAgent = request.headers.get('User-Agent');

      const result = await this.agentService.login(body.apiKey, ipAddress, userAgent);

      if (!result) {
        return errorResponse('Invalid API key', 401, this.env);
      }

      // Log activity
      await this.agentService.logActivity(result.agent.id, 'login', {
        ip: ipAddress,
      }, ipAddress);

      return jsonResponse({
        success: true,
        data: {
          agent: {
            id: result.agent.id,
            name: result.agent.name,
            description: result.agent.description,
            walletAddress: result.agent.wallet_address,
            chain: result.agent.chain,
            status: result.agent.status,
            createdAt: result.agent.created_at,
            lastActiveAt: result.agent.last_active_at,
            permissions: result.agent.permissions,
            rateLimit: {
              requestsPerMinute: result.agent.requests_per_minute,
              requestsPerDay: result.agent.requests_per_day,
            },
          },
          sessionToken: result.sessionToken,
          expiresAt: result.expiresAt,
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Login error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Login failed',
        401,
        this.env
      );
    }
  }

  private getInfo(): Response {
    return jsonResponse({
      success: true,
      data: {
        service: 'AI Agent API',
        version: '1.0.0',
        environment: this.env.ENVIRONMENT,
        features: [
          'Agent registration with API keys',
          'Session-based authentication',
          'Crossmint wallet integration',
          'Rate limiting',
          'Activity logging',
        ],
        endpoints: {
          register: 'POST /api/agents/register',
          login: 'POST /api/agents/login',
          me: 'GET /api/agents/me',
          wallet: 'GET /api/agents/wallet',
          createWallet: 'POST /api/agents/wallet/create',
          fundWallet: 'POST /api/agents/wallet/fund',
          transfer: 'POST /api/agents/wallet/transfer',
          rateLimit: 'GET /api/agents/rate-limit',
          regenerateKey: 'POST /api/agents/api-key/regenerate',
        },
      },
    }, 200, this.env);
  }

  // ─────────────────────────────────────────────────
  // PROTECTED ENDPOINTS
  // ─────────────────────────────────────────────────

  private getMe(agent: Agent): Response {
    return jsonResponse({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        walletAddress: agent.wallet_address,
        chain: agent.chain,
        status: agent.status,
        createdAt: agent.created_at,
        lastActiveAt: agent.last_active_at,
        permissions: agent.permissions,
        rateLimit: {
          requestsPerMinute: agent.requests_per_minute,
          requestsPerDay: agent.requests_per_day,
        },
        metadata: agent.metadata,
      },
    }, 200, this.env);
  }

  private async logout(request: Request): Promise<Response> {
    const sessionToken = request.headers.get('X-Agent-Session');
    if (sessionToken) {
      await this.agentService.invalidateSession(sessionToken);
    }

    return jsonResponse({
      success: true,
      message: 'Logged out successfully',
    }, 200, this.env);
  }

  private async createWallet(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.permissions.canCreateWallet) {
        return errorResponse('Agent does not have permission to create wallets', 403, this.env);
      }

      if (agent.wallet_address) {
        return jsonResponse({
          success: false,
          error: 'Agent already has a wallet',
          walletAddress: agent.wallet_address,
        }, 400, this.env);
      }

      const body = await request.json() as { alias?: string };

      const wallet = await this.crossmintService.createWallet({
        identifier: agent.id,
        chain: agent.chain,
        alias: body.alias || agent.name.toLowerCase().replace(/\s+/g, '-'),
      });

      // Update agent with wallet address
      await this.agentService.updateWallet(agent.id, wallet.address);

      // Log activity
      await this.agentService.logActivity(agent.id, 'wallet_create', {
        address: wallet.address,
        chain: agent.chain,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: {
          wallet,
          message: 'Wallet created successfully',
        },
      }, 201, this.env);
    } catch (error) {
      console.error('Create wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to create wallet',
        500,
        this.env
      );
    }
  }

  private async getWallet(agent: Agent): Promise<Response> {
    try {
      if (!agent.wallet_address) {
        return errorResponse('Agent does not have a wallet', 404, this.env);
      }

      // Use wallet address for lookup (Crossmint doesn't support locator lookup for MPC wallets)
      const wallet = await this.crossmintService.getWalletByAddress(agent.wallet_address);
      const balances = await this.crossmintService.getBalancesByAddress(agent.wallet_address, agent.chain);

      return jsonResponse({
        success: true,
        data: { wallet, balances },
      }, 200, this.env);
    } catch (error) {
      console.error('Get wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get wallet',
        500,
        this.env
      );
    }
  }

  private async fundWallet(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.wallet_address) {
        return errorResponse('Agent does not have a wallet', 404, this.env);
      }

      if (agent.chain !== 'solana-devnet') {
        return errorResponse('Funding is only available on devnet', 400, this.env);
      }

      const body = await request.json() as { amount?: number };
      const amount = body.amount || 10;

      const result = await this.crossmintService.fundWallet(agent.id, amount);

      // Log activity
      await this.agentService.logActivity(agent.id, 'fund', {
        amount,
        chain: agent.chain,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 200, this.env);
    } catch (error) {
      console.error('Fund wallet error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fund wallet',
        500,
        this.env
      );
    }
  }

  private async transfer(request: Request, agent: Agent): Promise<Response> {
    try {
      if (!agent.wallet_address) {
        return errorResponse('Agent does not have a wallet', 404, this.env);
      }

      if (!agent.permissions.canTransfer) {
        return errorResponse('Agent does not have permission to transfer', 403, this.env);
      }

      const body = await request.json() as {
        toAddress?: string;
        token?: string;
        amount?: string;
      };

      if (!body.toAddress || !body.token || !body.amount) {
        return errorResponse('toAddress, token, and amount are required', 400, this.env);
      }

      // Check transfer limit
      const amountNum = parseFloat(body.amount);
      if (amountNum > agent.permissions.maxTransferAmount) {
        return errorResponse(
          `Transfer amount exceeds limit of $${agent.permissions.maxTransferAmount}`,
          403,
          this.env
        );
      }

      const result = await this.crossmintService.transfer({
        fromIdentifier: agent.id,
        toAddress: body.toAddress,
        token: body.token,
        amount: body.amount,
        chain: agent.chain,
      });

      // Log activity
      await this.agentService.logActivity(agent.id, 'transfer', {
        to: body.toAddress,
        token: body.token,
        amount: body.amount,
        txId: result.id,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: result,
      }, 200, this.env);
    } catch (error) {
      console.error('Transfer error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Transfer failed',
        500,
        this.env
      );
    }
  }

  private async getRateLimit(agent: Agent): Promise<Response> {
    const rateLimitResult = await this.agentService.checkRateLimit(agent.id);

    return jsonResponse({
      success: true,
      data: {
        limits: {
          requestsPerMinute: agent.requests_per_minute,
          requestsPerDay: agent.requests_per_day,
        },
        remaining: rateLimitResult.remaining,
      },
    }, 200, this.env);
  }

  private async regenerateApiKey(agent: Agent): Promise<Response> {
    try {
      const newApiKey = await this.agentService.regenerateApiKey(agent.id);

      // Log activity
      await this.agentService.logActivity(agent.id, 'api_key_regenerate', {}, null);

      return jsonResponse({
        success: true,
        data: {
          apiKey: newApiKey,
          message: 'API key regenerated. Save it securely!',
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Regenerate API key error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to regenerate API key',
        500,
        this.env
      );
    }
  }

  // ─────────────────────────────────────────────────
  // CROSSMINT INFO
  // ─────────────────────────────────────────────────

  private getCrossmintInfo(): Response {
    const isConfigured = !!this.env.CROSSMINT_SERVERSIDE_API_KEY;
    const environment = this.env.CROSSMINT_SERVERSIDE_API_KEY?.startsWith('sk_staging_')
      ? 'staging'
      : 'production';

    return jsonResponse({
      success: true,
      data: {
        configured: isConfigured,
        environment,
        hasClientKey: !!this.env.CROSSMINT_CLIENTSIDE_API_KEY,
      },
    }, 200, this.env);
  }

  // ═══════════════════════════════════════════════════
  // DEPLOYMENT ENDPOINTS
  // ═══════════════════════════════════════════════════

  private async deployAgent(request: Request, agent: Agent): Promise<Response> {
    try {
      const body = await request.json() as DeploymentRequest;

      if (!body.walletAddress || !body.walletSignerType) {
        return errorResponse('walletAddress and walletSignerType are required', 400, this.env);
      }

      const result = await this.deploymentService.deployAgent({
        ...body,
        agentId: agent.id,
      }, agent);

      // Log activity
      await this.agentService.logActivity(agent.id, 'deploy', {
        deploymentId: result.deployment.id,
        walletAddress: body.walletAddress,
      }, request.headers.get('CF-Connecting-IP'));

      return jsonResponse({
        success: true,
        data: {
          deployment: result.deployment,
          delegatedSignerMessage: result.delegatedSigner?.message,
          delegatedSignerId: result.delegatedSigner?.id,
          targetSignerLocator: result.delegatedSigner?.targetSignerLocator,
          delegatedSignerAlreadyActive: result.delegatedSigner?.alreadyActive || false,
        },
      }, 201, this.env);
    } catch (error) {
      console.error('Deploy agent error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Deployment failed',
        500,
        this.env
      );
    }
  }

  private async getDeployments(agent: Agent): Promise<Response> {
    try {
      const deployments = await this.deploymentService.getDeployments(agent.id);

      return jsonResponse({
        success: true,
        data: { deployments },
      }, 200, this.env);
    } catch (error) {
      console.error('Get deployments error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get deployments',
        500,
        this.env
      );
    }
  }

  private async getDeployment(deploymentId: string, agent: Agent): Promise<Response> {
    try {
      const deployment = await this.deploymentService.getDeployment(deploymentId);

      if (!deployment) {
        return errorResponse('Deployment not found', 404, this.env);
      }

      if (deployment.agentId !== agent.id) {
        return errorResponse('Unauthorized', 403, this.env);
      }

      return jsonResponse({
        success: true,
        data: { deployment },
      }, 200, this.env);
    } catch (error) {
      console.error('Get deployment error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get deployment',
        500,
        this.env
      );
    }
  }

  private async stopDeployment(deploymentId: string, agent: Agent): Promise<Response> {
    try {
      const deployment = await this.deploymentService.getDeployment(deploymentId);

      if (!deployment) {
        return errorResponse('Deployment not found', 404, this.env);
      }

      if (deployment.agentId !== agent.id) {
        return errorResponse('Unauthorized', 403, this.env);
      }

      await this.deploymentService.stopDeployment(deploymentId);

      // Log activity
      await this.agentService.logActivity(agent.id, 'stop_deployment', {
        deploymentId,
      }, null);

      return jsonResponse({
        success: true,
        message: 'Deployment stopped',
      }, 200, this.env);
    } catch (error) {
      console.error('Stop deployment error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to stop deployment',
        500,
        this.env
      );
    }
  }

  private async submitSignatureApproval(request: Request, agent: Agent): Promise<Response> {
    try {
      const body = await request.json() as {
        walletAddress: string;
        signatureId: string;
        signerLocator: string;
        signature: unknown;
        metadata?: unknown;
      };

      if (!body.walletAddress || !body.signatureId || !body.signerLocator || !body.signature) {
        return errorResponse('Missing required fields', 400, this.env);
      }

      await this.deploymentService.submitSignatureApproval(
        body.walletAddress,
        body.signatureId,
        body.signerLocator,
        body.signature,
        body.metadata
      );

      // Update deployment status if exists
      const deployments = await this.deploymentService.getDeployments(agent.id);
      for (const dep of deployments) {
        if (dep.delegatedSignerId === body.signatureId && dep.status === 'pending') {
          await this.deploymentService.updateDeploymentStatus(dep.id, 'running');
        }
      }

      return jsonResponse({
        success: true,
        message: 'Signature approval submitted',
      }, 200, this.env);
    } catch (error) {
      console.error('Signature approval error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to submit signature approval',
        500,
        this.env
      );
    }
  }

  private async submitTransactionApproval(request: Request, agent: Agent): Promise<Response> {
    try {
      const body = await request.json() as {
        walletAddress: string;
        transactionId: string;
        signerLocator: string;
        signature: string;
      };

      if (!body.walletAddress || !body.transactionId || !body.signerLocator || !body.signature) {
        return errorResponse('Missing required fields', 400, this.env);
      }

      await this.deploymentService.submitTransactionApproval(
        body.walletAddress,
        body.transactionId,
        body.signerLocator,
        body.signature
      );

      // Update deployment status if exists
      const deployments = await this.deploymentService.getDeployments(agent.id);
      for (const dep of deployments) {
        if (dep.delegatedSignerId === body.transactionId && dep.status === 'pending') {
          await this.deploymentService.updateDeploymentStatus(dep.id, 'running');
        }
      }

      return jsonResponse({
        success: true,
        message: 'Transaction approval submitted',
      }, 200, this.env);
    } catch (error) {
      console.error('Transaction approval error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to submit transaction approval',
        500,
        this.env
      );
    }
  }

  // ═══════════════════════════════════════════════════
  // CHAT & EXECUTION ENDPOINTS
  // ═══════════════════════════════════════════════════

  private getModels(): Response {
    const models = this.runtimeService.getAvailableModels();
    return jsonResponse({
      success: true,
      data: { models },
    }, 200, this.env);
  }

  private async chat(request: Request, agent: Agent): Promise<Response> {
    try {
      const body = await request.json() as {
        messages: ChatMessage[];
        model?: string;
        temperature?: number;
        maxTokens?: number;
        tools?: boolean;
        stream?: boolean;
      };

      if (!body.messages || !Array.isArray(body.messages)) {
        return errorResponse('messages array is required', 400, this.env);
      }

      // Use agent's default configuration
      const context: AgentExecutionContext = {
        agentId: agent.id,
        deploymentId: 'direct-chat',
        walletAddress: agent.wallet_address || undefined,
        chain: agent.chain,
        configuration: {
          model: body.model || 'gpt-4',
          maxTokens: body.maxTokens || 4096,
          temperature: body.temperature || 0.7,
        },
        capabilities: ['chat', 'analyze'],
      };

      const result = await this.runtimeService.chat(context, body.messages, {
        tools: body.tools,
        stream: body.stream,
      });

      if (!result.success) {
        return errorResponse(result.error || 'Chat failed', 500, this.env);
      }

      return jsonResponse({
        success: true,
        data: {
          response: result.response,
          toolCalls: result.toolCalls,
          tokensUsed: result.tokensUsed,
          executionTimeMs: result.executionTimeMs,
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Chat error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Chat failed',
        500,
        this.env
      );
    }
  }

  private async chatWithDeployment(
    request: Request,
    deploymentId: string,
    agent: Agent
  ): Promise<Response> {
    try {
      const deployment = await this.deploymentService.getDeployment(deploymentId);

      if (!deployment) {
        return errorResponse('Deployment not found', 404, this.env);
      }

      if (deployment.agentId !== agent.id) {
        return errorResponse('Unauthorized', 403, this.env);
      }

      if (deployment.status !== 'running') {
        return errorResponse('Deployment is not running', 400, this.env);
      }

      const body = await request.json() as {
        messages: ChatMessage[];
        tools?: boolean;
        stream?: boolean;
        responseFormat?: { type: 'json_object' | 'text' };
      };

      if (!body.messages || !Array.isArray(body.messages)) {
        return errorResponse('messages array is required', 400, this.env);
      }

      const context: AgentExecutionContext = {
        agentId: agent.id,
        deploymentId: deployment.id,
        walletAddress: deployment.walletAddress,
        chain: deployment.chain,
        configuration: deployment.configuration,
        capabilities: deployment.capabilities,
      };

      const result = await this.runtimeService.chat(context, body.messages, {
        tools: body.tools,
        stream: body.stream,
        responseFormat: body.responseFormat,
      });

      if (!result.success) {
        return errorResponse(result.error || 'Chat failed', 500, this.env);
      }

      // Log activity
      await this.agentService.logActivity(agent.id, 'chat', {
        deploymentId,
        tokensUsed: result.tokensUsed,
      }, null);

      return jsonResponse({
        success: true,
        data: {
          response: result.response,
          toolCalls: result.toolCalls,
          tokensUsed: result.tokensUsed,
          executionTimeMs: result.executionTimeMs,
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Chat with deployment error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Chat failed',
        500,
        this.env
      );
    }
  }

  private async executeTool(
    request: Request,
    deploymentId: string,
    agent: Agent
  ): Promise<Response> {
    try {
      const deployment = await this.deploymentService.getDeployment(deploymentId);

      if (!deployment) {
        return errorResponse('Deployment not found', 404, this.env);
      }

      if (deployment.agentId !== agent.id) {
        return errorResponse('Unauthorized', 403, this.env);
      }

      if (deployment.status !== 'running') {
        return errorResponse('Deployment is not running', 400, this.env);
      }

      const body = await request.json() as {
        toolCall: {
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        };
      };

      if (!body.toolCall) {
        return errorResponse('toolCall is required', 400, this.env);
      }

      const context: AgentExecutionContext = {
        agentId: agent.id,
        deploymentId: deployment.id,
        walletAddress: deployment.walletAddress,
        chain: deployment.chain,
        configuration: deployment.configuration,
        capabilities: deployment.capabilities,
      };

      const result = await this.runtimeService.executeTool(context, body.toolCall);

      // Log activity
      await this.agentService.logActivity(agent.id, 'execute_tool', {
        deploymentId,
        tool: body.toolCall.function.name,
      }, null);

      return jsonResponse({
        success: true,
        data: {
          result: result.result,
          error: result.error,
        },
      }, 200, this.env);
    } catch (error) {
      console.error('Execute tool error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Tool execution failed',
        500,
        this.env
      );
    }
  }
}
