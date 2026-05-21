/**
 * Commerce helpers for selling Clawd/Google agent access through x402 and
 * mirroring the catalog into Google Merchant Center.
 *
 * These helpers build safe request specifications by default. They do not
 * require or persist Google OAuth tokens; callers pass a token only when they
 * intentionally execute a request.
 */

export const MERCHANT_API_BASE_URL = "https://merchantapi.googleapis.com";
export const DEFAULT_SHOP_ORIGIN = "https://x402.wtf";
export const DEFAULT_USDC_DECIMALS = 6;
export const DEFAULT_SETTLEMENT_ASSET_SYMBOL = "USDC";

export type MerchantHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface CommerceMoney {
  amountMicros: string;
  currencyCode: "USD";
}

export interface CommerceProduct {
  id: string;
  offerId: string;
  title: string;
  description: string;
  brand: string;
  price: CommerceMoney;
  category: string;
  tags: string[];
  agent: {
    framework: "Google ADK" | "A2A" | "Clawd";
    route: string;
    destinations: string[];
  };
  settlement: {
    assetSymbol: typeof DEFAULT_SETTLEMENT_ASSET_SYMBOL;
    decimals: typeof DEFAULT_USDC_DECIMALS;
    amountBaseUnits: string;
  };
}

export interface CommerceLineItem {
  productId: string;
  offerId: string;
  title: string;
  quantity: number;
  unitAmountMicros: string;
  totalAmountMicros: string;
}

export interface CommerceQuote {
  id: string;
  createdAt: string;
  expiresAt: string;
  lineItems: CommerceLineItem[];
  totals: {
    subtotalMicros: string;
    taxMicros: string;
    totalMicros: string;
    currencyCode: "USD";
  };
  payment: {
    protocol: "x402";
    scheme: "exact";
    network: "solana-mainnet";
    assetSymbol: "USDC";
    decimals: 6;
    amountBaseUnits: string;
    resource: string;
    description: string;
  };
  merchantProductInputs: MerchantProductInput[];
}

export interface CreateCommerceQuoteInput {
  items: Array<{
    productId: string;
    quantity?: number;
  }>;
  id?: string;
  nowMs?: number;
  ttlSeconds?: number;
  resource?: string;
  productBaseUrl?: string;
  countryCode?: string;
  contentLanguage?: string;
  imageBaseUrl?: string;
}

export interface MerchantProductInput {
  offerId: string;
  contentLanguage: string;
  feedLabel: string;
  productAttributes: Record<string, unknown>;
}

export interface MerchantApiRequestSpec {
  description: string;
  method: MerchantHttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface BuildMerchantProductInputOptions {
  countryCode?: string;
  contentLanguage?: string;
  feedLabel?: string;
  productBaseUrl?: string;
  imageBaseUrl?: string;
}

export interface MerchantSyncPlanInput extends BuildMerchantProductInputOptions {
  accountId: string;
  dataSourceName?: string;
  dataSourceId?: string;
  displayName?: string;
  includeDataSourceCreate?: boolean;
  products?: readonly CommerceProduct[];
}

export interface MerchantSyncPlan {
  merchantApi: {
    baseUrl: typeof MERCHANT_API_BASE_URL;
    version: "v1";
    docs: string[];
  };
  accountId: string;
  dataSourceName: string;
  productInputs: MerchantProductInput[];
  requests: MerchantApiRequestSpec[];
  notes: string[];
}

export interface ExecuteMerchantRequestOptions {
  accessToken: string;
  fetcher?: typeof fetch;
}

export const GOOGLE_AGENT_COMMERCE_PRODUCTS: readonly CommerceProduct[] = [
  {
    id: "google-adk-gateway-seat",
    offerId: "google-adk-gateway-seat",
    title: "Google ADK Gateway Seat",
    description:
      "Seat-based access to the Clawd Google ADK agent entrypoint, governed destination registry, and x402 payment gateway runbook.",
    brand: "Solana Clawd",
    price: { amountMicros: "4020000", currencyCode: "USD" },
    category: "Software > Computer Software",
    tags: ["google-adk", "agent-gateway", "x402"],
    agent: {
      framework: "Google ADK",
      route: "/agents/google-adk-gateway/run",
      destinations: [
        "https://x402.wtf/api/orchestrator",
        "https://x402.wtf/api/agents",
        "https://x402.wtf/agents/registry",
      ],
    },
    settlement: {
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: "4020000",
    },
  },
  {
    id: "merchant-center-sync-agent",
    offerId: "merchant-center-sync-agent",
    title: "Merchant Center Sync Agent",
    description:
      "Google Merchant API planning agent that converts Clawd store SKUs into datasource and productInputs request specs.",
    brand: "Solana Clawd",
    price: { amountMicros: "14020000", currencyCode: "USD" },
    category: "Software > Computer Software",
    tags: ["merchant-api", "products-v1", "commerce"],
    agent: {
      framework: "Google ADK",
      route: "/agents/merchant-center-sync/run",
      destinations: [
        "https://x402.wtf/api/orchestrator",
        "https://x402.wtf/api/agents",
      ],
    },
    settlement: {
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: "14020000",
    },
  },
  {
    id: "clawd-perps-risk-agent",
    offerId: "clawd-perps-risk-agent",
    title: "Clawd Perps Risk Agent",
    description:
      "Paid risk and open-interest agent for Clawd Perps, Phoenix market context, and paper-trade execution planning.",
    brand: "Solana Clawd",
    price: { amountMicros: "9420000", currencyCode: "USD" },
    category: "Software > Computer Software",
    tags: ["perps", "phoenix", "risk"],
    agent: {
      framework: "Clawd",
      route: "/agents/clawd-perps-risk/run",
      destinations: [
        "https://x402.wtf/api/perps/v1",
        "https://x402.wtf/api/phoenix/markets",
      ],
    },
    settlement: {
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: "9420000",
    },
  },
  {
    id: "automaton-runtime-agent",
    offerId: "automaton-runtime-agent",
    title: "Automaton Runtime Agent",
    description:
      "Runtime bootstrap package for the Solana Clawd automaton, including scripts, checks, and operator-facing launch guidance.",
    brand: "Solana Clawd",
    price: { amountMicros: "40200000", currencyCode: "USD" },
    category: "Software > Computer Software",
    tags: ["automaton", "runtime", "operator"],
    agent: {
      framework: "Clawd",
      route: "/agents/automaton-runtime/run",
      destinations: [
        "https://x402.wtf/api/clawd",
        "https://x402.wtf/api/imperial",
      ],
    },
    settlement: {
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: "40200000",
    },
  },
  {
    id: "x402-agent-store-bundle",
    offerId: "x402-agent-store-bundle",
    title: "x402 Agent Store Bundle",
    description:
      "Complete x402 commerce bundle for Google agents: ADK gateway access, Merchant API sync planning, perps risk, and automaton runtime packaging.",
    brand: "Solana Clawd",
    price: { amountMicros: "140200000", currencyCode: "USD" },
    category: "Software > Computer Software",
    tags: ["bundle", "google-agents", "solana-payments"],
    agent: {
      framework: "A2A",
      route: "/agents/x402-agent-store-bundle/run",
      destinations: [
        "https://x402.wtf/api/router/v1/chat/completions",
        "https://x402.wtf/api/x402/agent/chat",
        "https://x402.wtf/agents/registry",
      ],
    },
    settlement: {
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: "140200000",
    },
  },
];

export function listCommerceProducts(): CommerceProduct[] {
  return GOOGLE_AGENT_COMMERCE_PRODUCTS.map((product) => ({ ...product }));
}

export function getCommerceProduct(productId: string): CommerceProduct | undefined {
  return GOOGLE_AGENT_COMMERCE_PRODUCTS.find((product) => product.id === productId);
}

export function createCommerceQuote(input: CreateCommerceQuoteInput): CommerceQuote {
  if (!input.items.length) throw new Error("quote requires at least one item");

  const nowMs = input.nowMs ?? Date.now();
  const ttlSeconds = input.ttlSeconds ?? 600;
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString();

  const lineItems = input.items.map((item) => {
    const product = getCommerceProduct(item.productId);
    if (!product) throw new Error(`unknown commerce product: ${item.productId}`);
    const quantity = normalizeQuantity(item.quantity ?? 1);
    const totalAmountMicros = BigInt(product.price.amountMicros) * BigInt(quantity);
    return {
      productId: product.id,
      offerId: product.offerId,
      title: product.title,
      quantity,
      unitAmountMicros: product.price.amountMicros,
      totalAmountMicros: totalAmountMicros.toString(),
    };
  });

  const subtotalMicros = lineItems.reduce(
    (sum, item) => sum + BigInt(item.totalAmountMicros),
    0n,
  );
  const totalMicros = subtotalMicros;

  const quoteId = input.id ?? makeQuoteId(nowMs);

  return {
    id: quoteId,
    createdAt,
    expiresAt,
    lineItems,
    totals: {
      subtotalMicros: subtotalMicros.toString(),
      taxMicros: "0",
      totalMicros: totalMicros.toString(),
      currencyCode: "USD",
    },
    payment: {
      protocol: "x402",
      scheme: "exact",
      network: "solana-mainnet",
      assetSymbol: "USDC",
      decimals: 6,
      amountBaseUnits: totalMicros.toString(),
      resource: input.resource ?? "/commerce/checkout",
      description: `Solana Clawd x402 commerce quote ${quoteId}`,
    },
    merchantProductInputs: lineItems.map((item) => {
      const product = getCommerceProduct(item.productId);
      if (!product) throw new Error(`unknown commerce product: ${item.productId}`);
      return buildMerchantProductInput(product, input);
    }),
  };
}

export function buildMerchantProductInput(
  product: CommerceProduct,
  options: BuildMerchantProductInputOptions = {},
): MerchantProductInput {
  const countryCode = options.countryCode ?? "US";
  const contentLanguage = options.contentLanguage ?? "en";
  const feedLabel = options.feedLabel ?? countryCode;
  const productUrl = buildProductUrl(product.id, options.productBaseUrl);
  const imageLink = options.imageBaseUrl
    ? `${trimTrailingSlash(options.imageBaseUrl)}/${encodeURIComponent(product.id)}.png`
    : undefined;

  return {
    offerId: product.offerId,
    contentLanguage,
    feedLabel,
    productAttributes: compactRecord({
      title: product.title,
      description: product.description,
      link: productUrl,
      imageLink,
      availability: "IN_STOCK",
      condition: "NEW",
      brand: product.brand,
      googleProductCategory: product.category,
      productTypes: ["Agent commerce", "Google agents", "Solana payments"],
      customLabel0: "x402",
      customLabel1: product.agent.framework,
      customLabel2: product.tags.join(","),
      price: product.price,
    }),
  };
}

export function buildMerchantCreateDataSourceRequest(
  input: Pick<MerchantSyncPlanInput, "accountId" | "countryCode" | "displayName">,
): MerchantApiRequestSpec {
  const accountId = normalizeMerchantAccountId(input.accountId);
  return {
    description: "Create the primary API product data source for the x402 agent store.",
    method: "POST",
    url: merchantUrl(`/datasources/v1/accounts/${accountId}/dataSources`),
    headers: jsonAuthHeaders(),
    body: {
      displayName: input.displayName ?? "Solana Clawd x402 Agent Store",
      primaryProductDataSource: {
        countries: [input.countryCode ?? "US"],
      },
    },
  };
}

export function buildMerchantInsertProductInputRequest(params: {
  accountId: string;
  dataSourceName: string;
  productInput: MerchantProductInput;
}): MerchantApiRequestSpec {
  const accountId = normalizeMerchantAccountId(params.accountId);
  const url = new URL(merchantUrl(`/products/v1/accounts/${accountId}/productInputs:insert`));
  url.searchParams.set("dataSource", params.dataSourceName);
  return {
    description: `Insert or replace ${params.productInput.offerId} in Merchant Center.`,
    method: "POST",
    url: url.toString(),
    headers: jsonAuthHeaders(),
    body: params.productInput,
  };
}

export function buildMerchantGetProductRequest(params: {
  accountId: string;
  productId: string;
}): MerchantApiRequestSpec {
  const accountId = normalizeMerchantAccountId(params.accountId);
  const productId = encodeMerchantProductIdentifier(params.productId);
  return {
    description: `Read processed Merchant Center product ${productId}.`,
    method: "GET",
    url: merchantUrl(`/products/v1/accounts/${accountId}/products/${productId}`),
    headers: {
      Authorization: "Bearer ${ACCESS_TOKEN}",
    },
  };
}

export function buildMerchantSyncPlan(input: MerchantSyncPlanInput): MerchantSyncPlan {
  const accountId = normalizeMerchantAccountId(input.accountId);
  const products = input.products ?? GOOGLE_AGENT_COMMERCE_PRODUCTS;
  const dataSourceName = resolveDataSourceName(accountId, input);
  const productInputs = products.map((product) => buildMerchantProductInput(product, input));
  const requests: MerchantApiRequestSpec[] = [];

  if (input.includeDataSourceCreate !== false) {
    requests.push(buildMerchantCreateDataSourceRequest({ ...input, accountId }));
  }

  for (const productInput of productInputs) {
    requests.push(
      buildMerchantInsertProductInputRequest({
        accountId,
        dataSourceName,
        productInput,
      }),
    );
  }

  return {
    merchantApi: {
      baseUrl: MERCHANT_API_BASE_URL,
      version: "v1",
      docs: [
        "https://developers.google.com/merchant/api/reference/rest",
        "https://developers.google.com/merchant/api/guides/products/add-manage",
      ],
    },
    accountId,
    dataSourceName,
    productInputs,
    requests,
    notes: [
      "Create or provide an API primary product data source before inserting productInputs.",
      "Pass OAuth at execution time only; do not commit Google access tokens.",
      "Review Google Merchant Center and Shopping listing policies before publishing agent services.",
    ],
  };
}

export async function executeMerchantRequest<T = unknown>(
  spec: MerchantApiRequestSpec,
  options: ExecuteMerchantRequestOptions,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const headers = {
    ...spec.headers,
    Authorization: `Bearer ${options.accessToken}`,
  };
  const response = await fetcher(spec.url, {
    method: spec.method,
    headers,
    body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Merchant API ${spec.method} ${spec.url} failed: ${response.status} ${message}`);
  }
  return (await response.json()) as T;
}

export function encodeMerchantProductIdentifier(productId: string): string {
  return encodeURIComponent(productId);
}

export function normalizeMerchantAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, "").split("/")[0];
}

function resolveDataSourceName(
  accountId: string,
  input: Pick<MerchantSyncPlanInput, "dataSourceName" | "dataSourceId">,
): string {
  if (input.dataSourceName) return input.dataSourceName;
  if (input.dataSourceId) return `accounts/${accountId}/dataSources/${input.dataSourceId}`;
  return `accounts/${accountId}/dataSources/{DATASOURCE_ID}`;
}

function buildProductUrl(productId: string, productBaseUrl = `${DEFAULT_SHOP_ORIGIN}/gateway`): string {
  const url = new URL(productBaseUrl);
  url.searchParams.set("product", productId);
  return url.toString();
}

function merchantUrl(path: string): string {
  return new URL(path, MERCHANT_API_BASE_URL).toString();
}

function jsonAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer ${ACCESS_TOKEN}",
  };
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    throw new RangeError("quantity must be an integer between 1 and 99");
  }
  return quantity;
}

function makeQuoteId(nowMs: number): string {
  return `clawdshop_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
