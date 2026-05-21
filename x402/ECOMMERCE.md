# Solana Clawd x402 Commerce

Solana Clawd now has a small x402 commerce layer for selling Google-agent access and preparing the catalog for Google Merchant Center.

The integration is split deliberately:

| Layer | Path | Purpose |
| --- | --- | --- |
| Worker shop | `worker/src/commerce.ts` | Publishes the catalog, returns x402 checkout challenges, settles Solana USDC, and emits order receipts. |
| SDK helpers | `sdk/src/commerce.ts` | Builds quotes, product inputs, and Merchant API request specs for apps or operators. |
| Merchant API | `merchantapi.googleapis.com` | Receives product data through `datasources/v1` and `products/v1` after you provide OAuth at runtime. |

## Storefront Endpoints

Mounted under the gateway at `/commerce`:

| Route | Method | Description |
| --- | --- | --- |
| `/commerce/catalog` | `GET` | Returns the Google-agent product catalog and checkout route metadata. |
| `/commerce/products/:id` | `GET` | Returns one product plus its Merchant API `productInput` preview. |
| `/commerce/checkout` | `POST` | Creates an x402 quote. Without payment, returns `402 Payment Required`; with `Payment-Signature`, settles and returns an order. |
| `/commerce/merchant/products` | `GET` | Returns local Merchant API `productInput` previews for the whole catalog. |
| `/commerce/merchant/sync-plan` | `POST` | Returns executable Merchant API request specs for datasource creation and product insertion. |

Example checkout body:

```json
{
  "buyerWallet": "PAYER_WALLET_BASE58",
  "items": [
    { "productId": "google-adk-gateway-seat", "quantity": 1 },
    { "productId": "merchant-center-sync-agent", "quantity": 1 }
  ],
  "metadata": {
    "source": "x402.wtf/gateway"
  }
}
```

First response is a standard x402 payment challenge:

```http
402 Payment Required
Payment-Required: <base64-json challenge>
```

Retry the same request with:

```http
Payment-Signature: <base64 signed Solana transaction>
X-Payment-Challenge: <original Payment-Required header value>
```

The order response includes the Solana signature, payer, line items, entitlements, and optional `x-clawd-receipt-cid` if Pinata receipt pinning succeeds.

## Merchant API Sync

The current implementation defaults to Merchant API `v1` paths:

```text
POST https://merchantapi.googleapis.com/datasources/v1/accounts/{ACCOUNT_ID}/dataSources
POST https://merchantapi.googleapis.com/products/v1/accounts/{ACCOUNT_ID}/productInputs:insert?dataSource=accounts/{ACCOUNT_ID}/dataSources/{DATASOURCE_ID}
GET  https://merchantapi.googleapis.com/products/v1/accounts/{ACCOUNT_ID}/products/{PRODUCT_ID}
```

The request specs intentionally contain:

```http
Authorization: Bearer ${ACCESS_TOKEN}
```

Do not commit a real Google OAuth access token. Execute the specs only from a trusted operator process or admin UI after authentication.

Example sync-plan request:

```json
{
  "accountId": "123456789",
  "dataSourceName": "accounts/123456789/dataSources/987654321",
  "productBaseUrl": "https://x402.wtf/gateway",
  "imageBaseUrl": "https://x402.wtf/assets/agents",
  "countryCode": "US",
  "contentLanguage": "en",
  "feedLabel": "US"
}
```

If you do not have a datasource yet, omit `dataSourceName` and keep `includeDataSourceCreate` enabled. The plan will include the datasource creation request first.

## Catalog

Current SKUs:

| Product ID | Price | Agent route |
| --- | ---: | --- |
| `google-adk-gateway-seat` | `$4.02` | `/agents/google-adk-gateway/run` |
| `merchant-center-sync-agent` | `$14.02` | `/agents/merchant-center-sync/run` |
| `clawd-perps-risk-agent` | `$9.42` | `/agents/clawd-perps-risk/run` |
| `automaton-runtime-agent` | `$40.20` | `/agents/automaton-runtime/run` |
| `x402-agent-store-bundle` | `$140.20` | `/agents/x402-agent-store-bundle/run` |

Prices are represented as USD micros and map 1:1 onto USDC base units because USDC has 6 decimals.

## Environment

Optional Worker vars:

| Variable | Purpose |
| --- | --- |
| `COMMERCE_PRODUCT_BASE_URL` | Public product landing page, default `https://x402.wtf/gateway`. |
| `COMMERCE_IMAGE_BASE_URL` | Public base URL for product images, expected as `{base}/{productId}.png`. |
| `GOOGLE_MERCHANT_ACCOUNT_ID` | Optional default account id for sync plans. |
| `GOOGLE_MERCHANT_DATASOURCE_NAME` | Optional default datasource name for sync plans. |

Never store Google OAuth access tokens, service account private keys, wallet keypairs, or Merchant Center credentials in Worker vars committed to git.

## Policy Notes

Google Merchant Center listings are subject to Google Shopping and free listing policies. The code can generate product data for agent-service SKUs, but operators still need to verify eligibility, landing pages, images, business settings, shipping/return settings where applicable, and account approval status in Merchant Center.

The current Google docs state that Merchant API v1beta was discontinued on February 28, 2026, so this integration uses stable `v1` request paths by default.
