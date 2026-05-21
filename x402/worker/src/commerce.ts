/**
 * x402 commerce routes for the Google-agent storefront.
 *
 * The checkout endpoint returns a normal x402 challenge, settles Solana USDC,
 * and emits a receipt. The Merchant API endpoint returns executable request
 * specs, but never stores or requires Google OAuth credentials.
 */

import { Hono } from "hono";

import type { Env, SolanaPaymentRequirement } from "./types";
import { pinJson } from "./ipfs/pinata";
import { advertiseProtocols } from "./protocols/negotiate";
import {
  buildSolanaChallenge,
  handlePayment,
  paymentResponseHeader,
  type PaymentResult,
} from "./protocols/x402";
import { decodeChallenge, encodeChallenge } from "./solana/x402";

const MERCHANT_API_BASE_URL = "https://merchantapi.googleapis.com";
const DEFAULT_PRODUCT_BASE_URL = "https://x402.wtf/gateway";

type MerchantHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface CommerceProduct {
  id: string;
  offerId: string;
  title: string;
  description: string;
  brand: string;
  amountMicros: string;
  category: string;
  tags: string[];
  route: string;
  framework: "Google ADK" | "A2A" | "Clawd";
  destinations: string[];
}

interface CheckoutRequest {
  items?: Array<{
    productId: string;
    quantity?: number;
  }>;
  buyerWallet?: string;
  metadata?: Record<string, unknown>;
}

interface CommerceLineItem {
  productId: string;
  offerId: string;
  title: string;
  quantity: number;
  unitAmountMicros: string;
  totalAmountMicros: string;
}

interface CommerceQuote {
  id: string;
  createdAt: string;
  expiresAt: string;
  lineItems: CommerceLineItem[];
  totalMicros: string;
  currencyCode: "USD";
  settlement: {
    network: "solana-mainnet" | "solana-devnet";
    asset: "USDC";
    mint: string;
    decimals: 6;
    amountBaseUnits: string;
  };
}

interface MerchantProductInput {
  offerId: string;
  contentLanguage: string;
  feedLabel: string;
  productAttributes: Record<string, unknown>;
}

interface MerchantApiRequestSpec {
  description: string;
  method: MerchantHttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

interface MerchantSyncRequest {
  accountId?: string;
  dataSourceName?: string;
  dataSourceId?: string;
  displayName?: string;
  countryCode?: string;
  contentLanguage?: string;
  feedLabel?: string;
  productBaseUrl?: string;
  imageBaseUrl?: string;
  includeDataSourceCreate?: boolean;
}

const GOOGLE_AGENT_PRODUCTS: readonly CommerceProduct[] = [
  {
    id: "google-adk-gateway-seat",
    offerId: "google-adk-gateway-seat",
    title: "Google ADK Gateway Seat",
    description:
      "Seat-based access to the Clawd Google ADK agent entrypoint, governed destination registry, and x402 payment gateway runbook.",
    brand: "Solana Clawd",
    amountMicros: "4020000",
    category: "Software > Computer Software",
    tags: ["google-adk", "agent-gateway", "x402"],
    route: "/agents/google-adk-gateway/run",
    framework: "Google ADK",
    destinations: [
      "https://x402.wtf/api/orchestrator",
      "https://x402.wtf/api/agents",
      "https://x402.wtf/agents/registry",
    ],
  },
  {
    id: "merchant-center-sync-agent",
    offerId: "merchant-center-sync-agent",
    title: "Merchant Center Sync Agent",
    description:
      "Google Merchant API planning agent that converts Clawd store SKUs into datasource and productInputs request specs.",
    brand: "Solana Clawd",
    amountMicros: "14020000",
    category: "Software > Computer Software",
    tags: ["merchant-api", "products-v1", "commerce"],
    route: "/agents/merchant-center-sync/run",
    framework: "Google ADK",
    destinations: [
      "https://x402.wtf/api/orchestrator",
      "https://x402.wtf/api/agents",
    ],
  },
  {
    id: "clawd-perps-risk-agent",
    offerId: "clawd-perps-risk-agent",
    title: "Clawd Perps Risk Agent",
    description:
      "Paid risk and open-interest agent for Clawd Perps, Phoenix market context, and paper-trade execution planning.",
    brand: "Solana Clawd",
    amountMicros: "9420000",
    category: "Software > Computer Software",
    tags: ["perps", "phoenix", "risk"],
    route: "/agents/clawd-perps-risk/run",
    framework: "Clawd",
    destinations: [
      "https://x402.wtf/api/perps/v1",
      "https://x402.wtf/api/phoenix/markets",
    ],
  },
  {
    id: "automaton-runtime-agent",
    offerId: "automaton-runtime-agent",
    title: "Automaton Runtime Agent",
    description:
      "Runtime bootstrap package for the Solana Clawd automaton, including scripts, checks, and operator-facing launch guidance.",
    brand: "Solana Clawd",
    amountMicros: "40200000",
    category: "Software > Computer Software",
    tags: ["automaton", "runtime", "operator"],
    route: "/agents/automaton-runtime/run",
    framework: "Clawd",
    destinations: [
      "https://x402.wtf/api/clawd",
      "https://x402.wtf/api/imperial",
    ],
  },
  {
    id: "x402-agent-store-bundle",
    offerId: "x402-agent-store-bundle",
    title: "x402 Agent Store Bundle",
    description:
      "Complete x402 commerce bundle for Google agents: ADK gateway access, Merchant API sync planning, perps risk, and automaton runtime packaging.",
    brand: "Solana Clawd",
    amountMicros: "140200000",
    category: "Software > Computer Software",
    tags: ["bundle", "google-agents", "solana-payments"],
    route: "/agents/x402-agent-store-bundle/run",
    framework: "A2A",
    destinations: [
      "https://x402.wtf/api/router/v1/chat/completions",
      "https://x402.wtf/api/x402/agent/chat",
      "https://x402.wtf/agents/registry",
    ],
  },
];

export const commerce = new Hono<{ Bindings: Env }>();

commerce.get("/", (c) => c.json(buildCatalog(c.req.url, c.env)));
commerce.get("/catalog", (c) => c.json(buildCatalog(c.req.url, c.env)));

commerce.get("/products/:id", (c) => {
  const product = productById(c.req.param("id"));
  if (!product) return c.json({ error: "commerce product not found" }, 404);
  return c.json({
    product,
    merchantProductInput: buildMerchantProductInput(product, merchantDefaults(c.req.url, c.env)),
  });
});

commerce.get("/merchant/products", (c) => {
  const defaults = merchantDefaults(c.req.url, c.env);
  return c.json({
    productInputs: GOOGLE_AGENT_PRODUCTS.map((product) =>
      buildMerchantProductInput(product, defaults),
    ),
    notes: merchantNotes(Boolean(defaults.imageBaseUrl)),
  });
});

commerce.post("/merchant/sync-plan", async (c) => {
  const body = await readJson<MerchantSyncRequest>(c);
  if (!body.ok) return c.json({ error: body.error }, 400);

  const defaults = merchantDefaults(c.req.url, c.env);
  const accountId = body.value.accountId ?? c.env.GOOGLE_MERCHANT_ACCOUNT_ID;
  if (!accountId) {
    return c.json(
      {
        error: "missing accountId",
        hint: "Pass accountId in the JSON body or set GOOGLE_MERCHANT_ACCOUNT_ID.",
      },
      400,
    );
  }

  return c.json(
    buildMerchantSyncPlan({
      ...defaults,
      ...body.value,
      accountId,
      dataSourceName:
        body.value.dataSourceName ?? c.env.GOOGLE_MERCHANT_DATASOURCE_NAME,
    }),
  );
});

commerce.post("/checkout", async (c) => {
  const body = await readJson<CheckoutRequest>(c);
  if (!body.ok) return c.json({ error: body.error }, 400);

  let quote: CommerceQuote;
  try {
    quote = buildQuote(c.req.url, c.env, body.value);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 422);
  }

  const paymentSig = c.req.header("payment-signature") ?? c.req.header("x-payment");
  const resource = new URL(c.req.url).pathname;
  let challenge: SolanaPaymentRequirement;
  const submittedChallenge = c.req.header("x-payment-challenge");
  if (paymentSig && submittedChallenge) {
    try {
      challenge = decodeChallenge(submittedChallenge);
      validateCheckoutChallenge(challenge, resource, quote, c.env);
    } catch (e) {
      return c.json(
        { error: `invalid payment challenge: ${e instanceof Error ? e.message : String(e)}` },
        400,
      );
    }
  } else {
    challenge = await buildCheckoutChallenge(c.env, resource, quote);
  }

  if (!paymentSig) return paymentRequired(quote, challenge);

  const expectedPayer = body.value.buyerWallet ?? c.req.header("x-payer") ?? undefined;
  let payment: PaymentResult;
  try {
    payment = await handlePayment(c.env, paymentSig, challenge, expectedPayer);
  } catch (e) {
    return c.json({ error: `payment failed: ${e instanceof Error ? e.message : String(e)}` }, 402);
  }

  const order = buildOrder(quote, payment, body.value.metadata);
  let receiptCid: string | null = null;
  try {
    receiptCid = await pinJson(c.env, order, `commerce-order-${order.id}`);
  } catch (e) {
    console.log(`commerce receipt pin failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const headers = paymentResponseHeader(payment, c.env.NETWORK);
  if (receiptCid) headers["x-clawd-receipt-cid"] = receiptCid;
  return c.json({ order, receiptCid }, 201, headers);
});

async function buildCheckoutChallenge(
  env: Env,
  resource: string,
  quote: CommerceQuote,
): Promise<SolanaPaymentRequirement> {
  return buildSolanaChallenge(
    env,
    resource,
    `Solana Clawd x402 commerce checkout ${quote.id}`,
    env.TREASURY_OWNER,
    env.USDC_MINT,
    BigInt(quote.totalMicros),
    6,
    `clawd-commerce:${quote.id}`,
  );
}

function validateCheckoutChallenge(
  challenge: SolanaPaymentRequirement,
  resource: string,
  quote: CommerceQuote,
  env: Env,
): void {
  if (challenge.resource !== resource) {
    throw new Error(`resource mismatch: got ${challenge.resource} want ${resource}`);
  }
  if (challenge.payTo !== env.TREASURY_OWNER) throw new Error("recipient mismatch");
  if (challenge.asset !== env.USDC_MINT) throw new Error("asset mismatch");
  if (challenge.maxAmountRequired !== quote.totalMicros) throw new Error("amount mismatch");
  if (challenge.extra.decimals !== 6) throw new Error("decimals mismatch");
}

function buildCatalog(url: string, env: Env): Record<string, unknown> {
  const origin = new URL(url).origin;
  return {
    name: "Solana Clawd x402 Agent Store",
    description:
      "Pay-per-action Google agents and Clawd operator packages settled through Solana USDC x402.",
    currencyCode: "USD",
    settlement: {
      network: env.NETWORK,
      asset: "USDC",
      mint: env.USDC_MINT,
      decimals: 6,
    },
    routes: {
      catalog: `${origin}/commerce/catalog`,
      checkout: `${origin}/commerce/checkout`,
      merchantSyncPlan: `${origin}/commerce/merchant/sync-plan`,
    },
    products: GOOGLE_AGENT_PRODUCTS.map((product) => ({
      ...product,
      price: {
        amountMicros: product.amountMicros,
        currencyCode: "USD",
        display: formatUsd(product.amountMicros),
      },
    })),
  };
}

function buildQuote(url: string, env: Env, request: CheckoutRequest): CommerceQuote {
  if (!request.items?.length) throw new Error("checkout requires at least one item");

  const createdAtMs = Date.now();
  const lineItems = request.items.map((item) => {
    const product = productById(item.productId);
    if (!product) throw new Error(`unknown commerce product: ${item.productId}`);
    const quantity = normalizeQuantity(item.quantity ?? 1);
    const totalAmountMicros = BigInt(product.amountMicros) * BigInt(quantity);
    return {
      productId: product.id,
      offerId: product.offerId,
      title: product.title,
      quantity,
      unitAmountMicros: product.amountMicros,
      totalAmountMicros: totalAmountMicros.toString(),
    };
  });

  const totalMicros = lineItems.reduce((sum, item) => sum + BigInt(item.totalAmountMicros), 0n);
  const quoteId = `clawdshop_${createdAtMs.toString(36)}_${randomId()}`;
  return {
    id: quoteId,
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + 10 * 60 * 1000).toISOString(),
    lineItems,
    totalMicros: totalMicros.toString(),
    currencyCode: "USD",
    settlement: {
      network: env.NETWORK,
      asset: "USDC",
      mint: env.USDC_MINT,
      decimals: 6,
      amountBaseUnits: totalMicros.toString(),
    },
  };
}

function paymentRequired(quote: CommerceQuote, challenge: SolanaPaymentRequirement): Response {
  const headers = new Headers({
    "content-type": "application/json",
    "payment-required": encodeChallenge(challenge),
  });
  for (const [key, value] of Object.entries(advertiseProtocols())) headers.set(key, value);
  return new Response(
    JSON.stringify({
      x402Version: 1,
      error: "Payment Required",
      quote,
      accepts: [challenge],
    }),
    { status: 402, headers },
  );
}

function buildOrder(
  quote: CommerceQuote,
  payment: PaymentResult,
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    id: `order_${quote.id}`,
    status: "PAID",
    quote,
    payment: {
      protocol: "x402",
      network: quote.settlement.network,
      signature: payment.signature,
      payer: payment.payer,
      amount: payment.amount.toString(),
      asset: payment.asset,
    },
    entitlements: quote.lineItems.map((item) => {
      const product = productById(item.productId);
      return {
        productId: item.productId,
        offerId: item.offerId,
        quantity: item.quantity,
        agentRoute: product?.route,
        destinations: product?.destinations ?? [],
      };
    }),
    metadata: metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

function buildMerchantSyncPlan(input: Required<Pick<MerchantSyncRequest, "accountId">> & MerchantSyncRequest) {
  const accountId = normalizeMerchantAccountId(input.accountId);
  const countryCode = input.countryCode ?? "US";
  const contentLanguage = input.contentLanguage ?? "en";
  const feedLabel = input.feedLabel ?? countryCode;
  const dataSourceName = resolveDataSourceName(accountId, input);
  const productInputs = GOOGLE_AGENT_PRODUCTS.map((product) =>
    buildMerchantProductInput(product, {
      ...input,
      countryCode,
      contentLanguage,
      feedLabel,
    }),
  );
  const requests: MerchantApiRequestSpec[] = [];

  if (input.includeDataSourceCreate !== false) {
    requests.push({
      description: "Create the primary API product data source for the x402 agent store.",
      method: "POST",
      url: merchantUrl(`/datasources/v1/accounts/${accountId}/dataSources`),
      headers: jsonAuthHeaders(),
      body: {
        displayName: input.displayName ?? "Solana Clawd x402 Agent Store",
        primaryProductDataSource: {
          countries: [countryCode],
        },
      },
    });
  }

  for (const productInput of productInputs) {
    const url = new URL(merchantUrl(`/products/v1/accounts/${accountId}/productInputs:insert`));
    url.searchParams.set("dataSource", dataSourceName);
    requests.push({
      description: `Insert or replace ${productInput.offerId} in Merchant Center.`,
      method: "POST",
      url: url.toString(),
      headers: jsonAuthHeaders(),
      body: productInput,
    });
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
    notes: merchantNotes(Boolean(input.imageBaseUrl)),
  };
}

function buildMerchantProductInput(
  product: CommerceProduct,
  input: Pick<
    MerchantSyncRequest,
    "countryCode" | "contentLanguage" | "feedLabel" | "productBaseUrl" | "imageBaseUrl"
  >,
): MerchantProductInput {
  const countryCode = input.countryCode ?? "US";
  const contentLanguage = input.contentLanguage ?? "en";
  const feedLabel = input.feedLabel ?? countryCode;
  const productUrl = new URL(input.productBaseUrl ?? DEFAULT_PRODUCT_BASE_URL);
  productUrl.searchParams.set("product", product.id);

  const imageLink = input.imageBaseUrl
    ? `${trimTrailingSlash(input.imageBaseUrl)}/${encodeURIComponent(product.id)}.png`
    : undefined;

  return {
    offerId: product.offerId,
    contentLanguage,
    feedLabel,
    productAttributes: compactRecord({
      title: product.title,
      description: product.description,
      link: productUrl.toString(),
      imageLink,
      availability: "IN_STOCK",
      condition: "NEW",
      brand: product.brand,
      googleProductCategory: product.category,
      productTypes: ["Agent commerce", "Google agents", "Solana payments"],
      customLabel0: "x402",
      customLabel1: product.framework,
      customLabel2: product.tags.join(","),
      price: {
        amountMicros: product.amountMicros,
        currencyCode: "USD",
      },
    }),
  };
}

function merchantDefaults(url: string, env: Env): MerchantSyncRequest {
  return {
    productBaseUrl: env.COMMERCE_PRODUCT_BASE_URL ?? DEFAULT_PRODUCT_BASE_URL,
    imageBaseUrl: env.COMMERCE_IMAGE_BASE_URL,
    countryCode: "US",
    contentLanguage: "en",
    feedLabel: "US",
    dataSourceName: env.GOOGLE_MERCHANT_DATASOURCE_NAME,
  };
}

function merchantNotes(hasImageBaseUrl: boolean): string[] {
  return [
    "Merchant API execution requires a Merchant Center account, Google Cloud project, authentication, and developer registration.",
    "Requests intentionally use Authorization: Bearer ${ACCESS_TOKEN}; pass the live OAuth token only at execution time.",
    hasImageBaseUrl
      ? "Product image links were generated from imageBaseUrl."
      : "Set imageBaseUrl to include public product images before publishing productInputs.",
    "Review Google Merchant Center and Shopping listing policies before publishing agent-service products.",
  ];
}

function productById(id: string): CommerceProduct | undefined {
  return GOOGLE_AGENT_PRODUCTS.find((product) => product.id === id);
}

function resolveDataSourceName(
  accountId: string,
  input: Pick<MerchantSyncRequest, "dataSourceName" | "dataSourceId">,
): string {
  if (input.dataSourceName) return input.dataSourceName;
  if (input.dataSourceId) return `accounts/${accountId}/dataSources/${input.dataSourceId}`;
  return `accounts/${accountId}/dataSources/{DATASOURCE_ID}`;
}

function normalizeMerchantAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, "").split("/")[0];
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

function formatUsd(amountMicros: string): string {
  const dollars = Number(amountMicros) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

async function readJson<T>(
  c: import("hono").Context<{ Bindings: Env }>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: (await c.req.json()) as T };
  } catch {
    return { ok: false, error: "invalid JSON body" };
  }
}
