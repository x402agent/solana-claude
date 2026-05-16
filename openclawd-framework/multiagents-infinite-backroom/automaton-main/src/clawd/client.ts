/**
 * Conway API Client
 *
 * Communicates with Conway's control plane for sandbox management,
 * credits, and infrastructure operations.
 * Adapted from @aiws/sdk patterns.
 */

import type {
  ConwayClient,
  ExecResult,
  PortInfo,
  CreateSandboxOptions,
  SandboxInfo,
  PricingTier,
  CreditTransferResult,
  DomainSearchResult,
  DomainRegistration,
  DnsRecord,
  ModelInfo,
} from "../types.js";

interface ConwayClientOptions {
  apiUrl: string;
  apiKey: string;
  sandboxId: string;
}

export function createConwayClient(
  options: ConwayClientOptions,
): ConwayClient {
  const { apiUrl, apiKey, sandboxId } = options;

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<any> {
    const resp = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `Conway API error: ${method} ${path} -> ${resp.status}: ${text}`,
      );
    }

    const contentType = resp.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return resp.json();
    }
    return resp.text();
  }

  // ─── Sandbox Operations (own sandbox) ────────────────────────

  const exec = async (
    command: string,
    timeout?: number,
  ): Promise<ExecResult> => {
    const result = await request(
      "POST",
      `/v1/sandboxes/${sandboxId}/exec`,
      { command, timeout },
    );
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.exit_code ?? result.exitCode ?? 0,
    };
  };

  const writeFile = async (
    path: string,
    content: string,
  ): Promise<void> => {
    await request(
      "POST",
      `/v1/sandboxes/${sandboxId}/files/upload/json`,
      { path, content },
    );
  };

  const readFile = async (filePath: string): Promise<string> => {
    const result = await request(
      "GET",
      `/v1/sandboxes/${sandboxId}/files/read?path=${encodeURIComponent(filePath)}`,
    );
    return typeof result === "string" ? result : result.content || "";
  };

  const exposePort = async (port: number): Promise<PortInfo> => {
    const result = await request(
      "POST",
      `/v1/sandboxes/${sandboxId}/ports/expose`,
      { port },
    );
    return {
      port: result.port,
      publicUrl: result.public_url || result.publicUrl || result.url,
      sandboxId,
    };
  };

  const removePort = async (port: number): Promise<void> => {
    await request(
      "DELETE",
      `/v1/sandboxes/${sandboxId}/ports/${port}`,
    );
  };

  // ─── Sandbox Management (other sandboxes) ────────────────────

  const createSandbox = async (
    options: CreateSandboxOptions,
  ): Promise<SandboxInfo> => {
    const result = await request("POST", "/v1/sandboxes", {
      name: options.name,
      vcpu: options.vcpu || 1,
      memory_mb: options.memoryMb || 512,
      disk_gb: options.diskGb || 5,
      region: options.region,
    });
    return {
      id: result.id || result.sandbox_id,
      status: result.status || "running",
      region: result.region || "",
      vcpu: result.vcpu || options.vcpu || 1,
      memoryMb: result.memory_mb || options.memoryMb || 512,
      diskGb: result.disk_gb || options.diskGb || 5,
      terminalUrl: result.terminal_url,
      createdAt: result.created_at || new Date().toISOString(),
    };
  };

  const deleteSandbox = async (targetId: string): Promise<void> => {
    await request("DELETE", `/v1/sandboxes/${targetId}`);
  };

  const listSandboxes = async (): Promise<SandboxInfo[]> => {
    const result = await request("GET", "/v1/sandboxes");
    const sandboxes = Array.isArray(result)
      ? result
      : result.sandboxes || [];
    return sandboxes.map((s: any) => ({
      id: s.id || s.sandbox_id,
      status: s.status || "unknown",
      region: s.region || "",
      vcpu: s.vcpu || 0,
      memoryMb: s.memory_mb || 0,
      diskGb: s.disk_gb || 0,
      terminalUrl: s.terminal_url,
      createdAt: s.created_at || "",
    }));
  };

  // ─── Credits ─────────────────────────────────────────────────

  const getCreditsBalance = async (): Promise<number> => {
    const result = await request("GET", "/v1/credits/balance");
    return result.balance_cents ?? result.credits_cents ?? 0;
  };

  const getCreditsPricing = async (): Promise<PricingTier[]> => {
    const result = await request("GET", "/v1/credits/pricing");
    const tiers = result.tiers || result.pricing || [];
    return tiers.map((t: any) => ({
      name: t.name || "",
      vcpu: t.vcpu || 0,
      memoryMb: t.memory_mb || 0,
      diskGb: t.disk_gb || 0,
      monthlyCents: t.monthly_cents || 0,
    }));
  };

  const transferCredits = async (
    toAddress: string,
    amountCents: number,
    note?: string,
  ): Promise<CreditTransferResult> => {
    const payload = {
      to_address: toAddress,
      amount_cents: amountCents,
      note,
    };

    const paths = [
      "/v1/credits/transfer",
      "/v1/credits/transfers",
    ];

    let lastError = "Unknown transfer error";

    for (const path of paths) {
      const resp = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        lastError = `${resp.status}: ${text}`;
        // Try next known endpoint shape before failing.
        if (resp.status === 404) continue;
        throw new Error(`Conway API error: POST ${path} -> ${lastError}`);
      }

      const data = await resp.json().catch(() => ({} as any));
      return {
        transferId: data.transfer_id || data.id || "",
        status: data.status || "submitted",
        toAddress: data.to_address || toAddress,
        amountCents: data.amount_cents ?? amountCents,
        balanceAfterCents:
          data.balance_after_cents ?? data.new_balance_cents ?? undefined,
      };
    }

    throw new Error(
      `Conway API error: POST /v1/credits/transfer -> ${lastError}`,
    );
  };

  // ─── Domains ──────────────────────────────────────────────────

  const searchDomains = async (
    query: string,
    tlds?: string,
  ): Promise<DomainSearchResult[]> => {
    const params = new URLSearchParams({ query });
    if (tlds) params.set("tlds", tlds);
    const result = await request("GET", `/v1/domains/search?${params}`);
    const results = result.results || result.domains || [];
    return results.map((d: any) => ({
      domain: d.domain,
      available: d.available ?? d.purchasable ?? false,
      registrationPrice: d.registration_price ?? d.purchase_price,
      renewalPrice: d.renewal_price,
      currency: d.currency || "USD",
    }));
  };

  const registerDomain = async (
    domain: string,
    years: number = 1,
  ): Promise<DomainRegistration> => {
    const result = await request("POST", "/v1/domains/register", {
      domain,
      years,
    });
    return {
      domain: result.domain || domain,
      status: result.status || "registered",
      expiresAt: result.expires_at || result.expiry,
      transactionId: result.transaction_id || result.id,
    };
  };

  const listDnsRecords = async (domain: string): Promise<DnsRecord[]> => {
    const result = await request("GET", `/v1/domains/${encodeURIComponent(domain)}/dns`);
    const records = result.records || result || [];
    return (Array.isArray(records) ? records : []).map((r: any) => ({
      id: r.id || r.record_id || "",
      type: r.type || "",
      host: r.host || r.name || "",
      value: r.value || r.answer || "",
      ttl: r.ttl,
      distance: r.distance ?? r.priority,
    }));
  };

  const addDnsRecord = async (
    domain: string,
    type: string,
    host: string,
    value: string,
    ttl?: number,
  ): Promise<DnsRecord> => {
    const result = await request(
      "POST",
      `/v1/domains/${encodeURIComponent(domain)}/dns`,
      { type, host, value, ttl: ttl || 3600 },
    );
    return {
      id: result.id || result.record_id || "",
      type: result.type || type,
      host: result.host || host,
      value: result.value || value,
      ttl: result.ttl || ttl || 3600,
    };
  };

  const deleteDnsRecord = async (
    domain: string,
    recordId: string,
  ): Promise<void> => {
    await request(
      "DELETE",
      `/v1/domains/${encodeURIComponent(domain)}/dns/${encodeURIComponent(recordId)}`,
    );
  };

  // ─── Model Discovery ───────────────────────────────────────────

  const listModels = async (): Promise<ModelInfo[]> => {
    // Try inference.conway.tech first (has availability info), fall back to control plane
    const urls = ["https://inference.conway.tech/v1/models", `${apiUrl}/v1/models`];
    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          headers: { Authorization: apiKey },
        });
        if (!resp.ok) continue;
        const result = await resp.json() as any;
        const raw = result.data || result.models || [];
        return raw
          .filter((m: any) => m.available !== false)
          .map((m: any) => ({
            id: m.id,
            provider: m.provider || m.owned_by || "unknown",
            pricing: {
              inputPerMillion: m.pricing?.input_per_million ?? m.pricing?.input_per_1m_tokens_usd ?? 0,
              outputPerMillion: m.pricing?.output_per_million ?? m.pricing?.output_per_1m_tokens_usd ?? 0,
            },
          }));
      } catch {
        continue;
      }
    }
    return [];
  };

  const client = {
    exec,
    writeFile,
    readFile,
    exposePort,
    removePort,
    createSandbox,
    deleteSandbox,
    listSandboxes,
    getCreditsBalance,
    getCreditsPricing,
    transferCredits,
    searchDomains,
    registerDomain,
    listDnsRecords,
    addDnsRecord,
    deleteDnsRecord,
    listModels,
  } as ConwayClient & { __apiUrl: string; __apiKey: string };

  // Expose for child sandbox operations in replication module
  client.__apiUrl = apiUrl;
  client.__apiKey = apiKey;

  return client;
}
