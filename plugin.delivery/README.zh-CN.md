<div align="center">

# 🔌 Plugin Delivery

**AI Function Call Plugins & Tools for solana-clawd**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/x402agent/solana-clawd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@solana-clawd/plugin-sdk)](https://www.npmjs.com/package/@solana-clawd/plugin-sdk)

**Live:** [`plugin.delivery`](https://plugin.delivery)

[📚 Docs](#documentation) • [🚀 Quick Start](#quick-start) • [📦 Templates](#plugin-templates) • [🎨 Plugin Types](#plugin-types) • [🔧 Development](#development)

</div>

---

## What Is Plugin Delivery?

The **official plugin marketplace and SDK** for solana-clawd — a crypto/DeFi-focused AI assistant platform.

| Feature | Description |
|---------|-------------|
| 📋 **Plugin Index** | JSON registry of AI-discoverable plugins |
| ⚡ **Gateway Service** | Secure proxy routing function calls to plugin APIs |
| 🛠️ **SDK** | TypeScript SDK for building custom plugins |
| 🎨 **Templates** | 6 starter templates for different plugin types |
| 🌍 **i18n** | 18 languages supported out of the box |

### How It Works

```
User: "What's the price of ETH?"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  solana-clawd discovers plugin from plugin.delivery index   │
│  AI generates function call: getPrice(coin: "ethereum") │
│  Gateway routes request to CoinGecko API                │
│  Response rendered in chat (JSON, Markdown, or UI)      │
└─────────────────────────────────────────────────────────┘
         │
         ▼
AI: "ETH is currently trading at $3,450..."
```

---

## Plugin Types

solana-clawd supports **4 distinct plugin types**, each optimized for different use cases:

| Type | Rendering | Best For | Complexity |
|------|-----------|----------|------------|
| **Default** | Server-rendered JSON → AI formats | Data APIs, lookups | ⭐ Simple |
| **Markdown** | Pre-formatted rich text | Documentation, reports | ⭐ Simple |
| **Standalone** | Full React/HTML app in iframe | Interactive dashboards | ⭐⭐⭐ Advanced |
| **OpenAPI** | Auto-generated from spec | Existing APIs | ⭐⭐ Medium |

### Default Plugins

Returns JSON data that the AI formats into natural language.

```json
{
  "ui": {
    "mode": "default"
  }
}
```

**Use when:** You have an API that returns structured data and want the AI to explain results conversationally.

### Markdown Plugins

Returns pre-formatted Markdown that displays directly in chat.

```json
{
  "ui": {
    "mode": "markdown"
  }
}
```

**Use when:** You want full control over formatting — tables, code blocks, headers, etc.

### Standalone Plugins (Artifacts)

Embeds a full React/HTML application in an iframe within the chat.

```json
{
  "ui": {
    "mode": "standalone",
    "url": "https://your-plugin.com/ui",
    "height": 400
  }
}
```

**Use when:** You need rich interactivity — charts, forms, dashboards, embedded apps.

> 💡 **Standalone plugins are solana-clawd's superpower** — they enable experiences beyond what ChatGPT plugins can do.

### OpenAPI Plugins

Auto-generated from an OpenAPI 3.x specification. No custom code needed.

```json
{
  "openapi": "https://your-api.com/openapi.json"
}
```

**Use when:** You already have an OpenAPI spec for your API.

---

## Artifacts, Embeds & Interactive UI

### What Are Artifacts?

Artifacts are **rich interactive content** that plugins can render directly in chat. Unlike plain text responses, artifacts can include:

- 📊 **Charts & Visualizations** (Chart.js, Recharts, D3)
- 📝 **Interactive Forms** (Input fields, buttons, selectors)
- 🎮 **Mini Applications** (Games, calculators, tools)
- 📄 **Rich Documents** (Formatted reports, tables)

### HTML Artifacts

Render raw HTML directly:

```typescript
// In your plugin API response
return {
  type: 'html',
  content: `
    <div style="padding: 20px;">
      <h2>Price Alert</h2>
      <p>ETH crossed $3,500!</p>
    </div>
  `
};
```

### React Artifacts

Render React components (standalone plugins):

```tsx
// ui/page.tsx
export default function PriceChart({ data }) {
  return (
    <div className="p-4">
      <LineChart data={data}>
        <Line dataKey="price" stroke="#22c55e" />
      </LineChart>
    </div>
  );
}
```

### iframe Embeds

Embed external content:

```json
{
  "ui": {
    "mode": "standalone",
    "url": "https://tradingview.com/chart/?symbol=BTCUSD",
    "height": 500
  }
}
```

### Function Calls from UI

Standalone plugins can trigger additional function calls:

```typescript
import { SolanaClawdOS } from '@solana-clawd/plugin-sdk/client';

// Trigger a new function call from your UI
SolanaClawdOS.triggerFunctionCall({
  name: 'getTokenDetails',
  arguments: { token: 'ETH' }
});
```

---

## Plugin Templates

Get started fast with our official templates:

| Template | Type | Description | Use Case |
|----------|------|-------------|----------|
| [**basic**](./templates/basic) | Default | Standard plugin with API endpoint | Simple data lookups |
| [**default**](./templates/default) | Default | Plugin with settings UI | Configurable plugins |
| [**markdown**](./templates/markdown) | Markdown | Rich text output | Formatted reports |
| [**openapi**](./templates/openapi) | OpenAPI | Auto-generated from spec | Existing APIs |
| [**settings**](./templates/settings) | Default | Plugin with user preferences | Personalized tools |
| [**standalone**](./templates/standalone) | Standalone | Full React application | Interactive dashboards |

### Using a Template

```bash
# Clone template to new directory
cp -r templates/standalone my-plugin
cd my-plugin

# Install dependencies
bun install

# Start development
bun dev
```

### Template Structure

```
templates/standalone/
├── public/
│   └── manifest.json    # Plugin manifest
├── src/
│   ├── api/            # API endpoints
│   │   └── index.ts    # Main handler
│   └── ui/             # React UI (standalone only)
│       └── page.tsx    # UI component
├── package.json
└── README.md
```

---

## Quick Start

### 1. Install the SDK

```bash
bun add @solana-clawd/plugin-sdk
# or
npm install @solana-clawd/plugin-sdk
```

### 2. Create manifest.json

```json
{
  "$schema": "https://plugin.delivery/schema.json",
  "identifier": "my-crypto-plugin",
  "api": [
    {
      "name": "getPrice",
      "description": "Get cryptocurrency price",
      "url": "https://my-plugin.vercel.app/api/price",
      "parameters": {
        "type": "object",
        "properties": {
          "coin": {
            "type": "string",
            "description": "Coin ID (e.g., bitcoin, ethereum)"
          }
        },
        "required": ["coin"]
      }
    }
  ],
  "meta": {
    "title": "My Crypto Plugin",
    "description": "Get real-time crypto prices",
    "avatar": "🪙",
    "tags": ["crypto", "prices"]
  }
}
```

### 3. Create API Handler

```typescript
// api/price.ts
export default async function handler(req: Request) {
  const { coin } = await req.json();
  
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`
  );
  const data = await res.json();
  
  return Response.json({
    coin,
    price: data[coin]?.usd,
    timestamp: new Date().toISOString()
  });
}
```

### 4. Deploy & Register

```bash
# Deploy to Vercel
vercel --prod

# Add to plugin index (submit PR or use Plugin Store)
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [📖 Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT_GUIDE.md) | Complete development walkthrough |
| [📋 Plugin Manifest Reference](./docs/PLUGIN_MANIFEST.md) | Full manifest.json specification |
| [🎨 Plugin Types Guide](./docs/PLUGIN_TYPES.md) | Default, Markdown, Standalone explained |
| [🔌 SDK API Reference](./docs/SDK_API_REFERENCE.md) | Client SDK documentation |
| [🌐 OpenAPI Integration](./docs/OPENAPI_INTEGRATION.md) | Using OpenAPI specs |
| [💬 Communication Guide](./docs/COMMUNICATION_GUIDE.md) | Plugin ↔ Host messaging |
| [🎭 Artifacts Guide](./docs/ARTIFACTS_GUIDE.md) | Rich UI components |
| [⚡ Complete Guide](./docs/SOLANA_CLAWD_PLUGIN_COMPLETE_GUIDE.md) | Everything in one doc |

---

## Available Plugins

### Production

| Plugin | Description | Type | API |
|--------|-------------|------|-----|
| 🪙 **[CoinGecko Crypto](./src/coingecko.json)** | Prices, trends, market data for 1M+ tokens | OpenAPI | Free |

### Coming Soon

| Plugin | Description | Status |
|--------|-------------|--------|
| 📊 **DexScreener** | DEX pairs, volume, liquidity | In Development |
| 📈 **DefiLlama** | Protocol TVL, yields | Planned |
| 💼 **Portfolio Tracker** | Multi-chain wallet aggregation | Planned |
| ⛓️ **Chain Explorer** | Transaction lookup, gas prices | Planned |

---

## Development

### Prerequisites

- **Bun** 1.0+ (recommended) or Node.js 18+
- **Git**

### Setup

```bash
# Clone
git clone https://github.com/x402agent/solana-clawd
cd plugins

# Install
bun install

# Dev server
bun dev
```

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start local dev server |
| `bun build` | Build plugin index |
| `bun test` | Run tests |
| `bun lint` | Lint code |
| `bun format` | Format JSON files |

### Project Structure

```
plugins/
├── packages/
│   ├── sdk/              # @solana-clawd/plugin-sdk
│   └── gateway/          # @solana-clawd/chat-plugins-gateway
├── templates/            # Starter templates
│   ├── basic/
│   ├── default/
│   ├── markdown/
│   ├── openapi/
│   ├── settings/
│   └── standalone/
├── public/               # Static files (auto-generated)
│   ├── index.json        # Plugin registry
│   └── openai/           # OpenAPI manifests
├── src/                  # Plugin definitions
├── locales/              # i18n translations
├── docs/                 # Documentation
└── api/                  # Serverless functions
```

---

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@solana-clawd/plugin-sdk` | Plugin SDK for building solana-clawd plugins | [![npm](https://img.shields.io/npm/v/@solana-clawd/plugin-sdk)](https://www.npmjs.com/package/@solana-clawd/plugin-sdk) |
| `@solana-clawd/chat-plugins-gateway` | Gateway service for routing plugin calls | [![npm](https://img.shields.io/npm/v/@solana-clawd/chat-plugins-gateway)](https://www.npmjs.com/package/@solana-clawd/chat-plugins-gateway) |

### SDK Usage

```typescript
import { 
  pluginManifestSchema,
  createPluginResponse,
  PluginError 
} from '@solana-clawd/plugin-sdk';

// Client-side (in standalone UI)
import { SolanaClawdOS } from '@solana-clawd/plugin-sdk/client';
```

---

## Gateway

The Plugin Gateway securely routes function calls from solana-clawd to plugin APIs:

```
solana-clawd → Gateway → Plugin API
              │
              ├── Auth injection
              ├── Rate limiting
              ├── Request logging
              └── Response transform
```

### Self-Hosting

```bash
# Clone gateway
cd packages/gateway

# Deploy
vercel --prod

# Set in solana-clawd
PLUGINS_GATEWAY_URL=https://your-gateway.vercel.app
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md).

### Submit a Plugin

1. **Option A:** Open a [Plugin Submission](https://github.com/x402agent/solana-clawd/issues/new?template=plugin_submission.md) issue
2. **Option B:** Submit a PR adding your plugin to `src/`

### Requirements

- ✅ Valid manifest with working endpoints
- ✅ Tested in solana-clawd
- ✅ No API key required (or documented)
- ✅ en-US locale at minimum

---

## Links

| Resource | URL |
|----------|-----|
| 🌐 **Plugin Index** | [plugin.delivery](https://plugin.delivery) |
| 📦 **SDK on npm** | [@solana-clawd/plugin-sdk](https://www.npmjs.com/package/@solana-clawd/plugin-sdk) |
| 🐙 **GitHub** | [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd) |
| 🐦 **Twitter/X** | [@nichxbt](https://x.com/nichxbt) |

---

## License

MIT © [solana-clawd](https://solanaos.net)

---

<div align="center">

**[🔌 plugin.delivery](https://plugin.delivery)** — AI Function Calls for the Crypto Era

Built with ❤️ by [nich](https://x.com/nichxbt)

</div>

