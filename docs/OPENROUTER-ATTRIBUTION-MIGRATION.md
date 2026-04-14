# OpenRouter App Attribution — Infrastructure Migration Guide

This guide covers how to implement OpenRouter App Attribution across all integration points in the Solana Clawd infrastructure.

## Overview

OpenRouter's [App Attribution](https://openrouter.ai/docs/features/app-attribution) system allows apps to be featured in public rankings and analytics. This requires sending specific HTTP headers with every OpenRouter API request.

## Attribution Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `HTTP-Referer` | Primary identifier (your app's URL) | `https://github.com/x402agent/solana-clawd` |
| `X-OpenRouter-Title` | Display name in rankings | `Solana Clawd` |
| `X-OpenRouter-Categories` | Marketplace categories (max 2) | `cli-agent,cloud-agent` |
| `X-Title` | Backwards-compatible alias | `Solana Clawd` |

## Files Requiring Updates

### Already Updated ✅

The following files have been updated with proper attribution headers:

1. **`clawdrouter/src/upstream/openrouter.ts`** — Central OpenRouter proxy
2. **`clawdrouter/src/types.ts`** — Config interface with new fields
3. **`clawdrouter/src/proxy/server.ts`** — Passes attribution config to upstream
4. **`clawdrouter/src/index.ts`** — Loads env vars for attribution
5. **`web/app/api/solana-clawd/chat/route.ts`** — Next.js API route

### Requiring Updates 🔧

The following files still need attribution headers added:

1. **`src/engine/query-engine.ts`** — Direct OpenRouter API calls
2. **`web/lib/solana-clawd-server.ts`** — OpenRouter API key getter (no calls here, but for reference)

---

## Step 1: Update src/engine/query-engine.ts

The QueryEngine makes direct OpenRouter API calls and needs attribution headers.

### Current Code (line ~340)

```typescript
function providerBaseUrl(provider: LLMProvider): string {
  switch (provider) {
    case "openrouter": return "https://openrouter.ai/api/v1";
    // ...
  }
}
```

### Required Changes

Add attribution headers to the OpenRouter fetch calls. Look for the `callProvider` function or wherever `fetch` is called with `provider === "openrouter"`.

### Implementation

```typescript
// Add to query-engine.ts imports or at top of file
const OPENROUTER_ATTRIBUTION_HEADERS = {
  "X-OpenRouter-Title": process.env["OPENROUTER_SITE_TITLE"] ?? "Solana Clawd",
  "X-Title": process.env["OPENROUTER_SITE_TITLE"] ?? "Solana Clawd",
  "X-OpenRouter-Categories": process.env["OPENROUTER_CATEGORIES"] ?? "cli-agent,cloud-agent",
  "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "https://github.com/x402agent/solana-clawd",
};

// In your fetch call for OpenRouter:
const response = await fetch(`${providerBaseUrl("openrouter")}/chat/completions`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...OPENROUTER_ATTRIBUTION_HEADERS,
  },
  body: JSON.stringify(requestBody),
});
```

### Find the exact location

```bash
grep -n "openrouter\|fetch.*provider" src/engine/query-engine.ts | head -20
```

---

## Step 2: Update .env Configuration

Ensure your `.env` file contains the attribution variables:

```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-...

# OpenRouter App Attribution
OPENROUTER_SITE_URL=https://github.com/x402agent/solana-clawd
OPENROUTER_SITE_TITLE=Solana Clawd
OPENROUTER_CATEGORIES=cli-agent,cloud-agent
```

### For ClawdRouter (separate CLI)

```bash
# ClawdRouter OpenRouter Attribution
CLAWDROUTER_OPENROUTER_SITE_URL=https://github.com/x402agent/solana-clawd
CLAWDROUTER_OPENROUTER_SITE_TITLE=ClawdRouter
CLAWDROUTER_OPENROUTER_CATEGORIES=cli-agent,cloud-agent
```

---

## Step 3: Verify All Integration Points

### Check for any missed OpenRouter calls

```bash
# Search entire codebase for OpenRouter API calls
grep -rn "openrouter.ai" --include="*.ts" --include="*.tsx" --include="*.js" /path/to/solana-claude

# Check for any direct fetch calls to openrouter
grep -rn "fetch.*openrouter\|openrouter.*fetch" --include="*.ts" /path/to/solana-claude
```

### Known Integration Points

| Component | File | Status |
|-----------|------|--------|
| ClawdRouter Proxy | `clawdrouter/src/upstream/openrouter.ts` | ✅ Updated |
| ClawdRouter Server | `clawdrouter/src/proxy/server.ts` | ✅ Updated |
| Web API Route | `web/app/api/solana-clawd/chat/route.ts` | ✅ Updated |
| Query Engine | `src/engine/query-engine.ts` | 🔧 Needs Update |
| Model Catalog | `src/shared/model-catalog.ts` | Reference only |
| Web Server Utils | `web/lib/solana-clawd-server.ts` | Reference only |

---

## Step 4: Build and Test

### Build ClawdRouter

```bash
cd clawdrouter
npm run build
```

### Test the Query Engine

After updating `query-engine.ts`:

```bash
cd /path/to/solana-claude
npm run typecheck
```

### Verify Headers are Sent

Add debug logging to confirm headers are being sent:

```typescript
// Temporary debug in your OpenRouter fetch call
console.log("OpenRouter Headers:", JSON.stringify(OPENROUTER_ATTRIBUTION_HEADERS, null, 2));
```

---

## Step 5: Deploy

### Rebuild affected packages

```bash
# Rebuild clawdrouter
cd clawdrouter && npm run build

# Rebuild main app
cd /path/to/solana-claude && npm run build

# Redeploy MCP server if using
cd MCP && npm run build
```

### Deploy to environments

1. **Local Development**: Update `.env.local` or `.env`
2. **Fly.io**: `fly secrets set` for production
3. **Netlify**: Set environment variables in dashboard
4. **Docker**: Update Dockerfile or docker-compose.yml

---

## Available Categories

Choose up to 2 categories from:

**Coding:**
- `cli-agent` — Terminal-based coding assistants
- `ide-extension` — Editor/IDE integrations
- `cloud-agent` — Cloud-hosted coding agents
- `programming-app` — Programming apps
- `native-app-builder` — Mobile/desktop app builders

**Creative:**
- `creative-writing` — Creative writing tools
- `video-gen` — Video generation apps
- `image-gen` — Image generation apps

**Productivity:**
- `writing-assistant` — AI-powered writing tools
- `general-chat` — General chat apps
- `personal-agent` — Personal AI agents

**Entertainment:**
- `roleplay` — Roleplay and character-based chat
- `game` — Gaming and interactive entertainment

### Recommended for Solana Clawd

- `cli-agent` — CLI tool for Solana operations
- `cloud-agent` — Cloud-hosted blockchain agent

---

## Verification

After deployment, verify attribution is working:

1. **Check Rankings**: Visit [openrouter.ai/rankings](https://openrouter.ai/rankings)
2. **Analytics**: Visit `https://openrouter.ai/apps?url=<your-site-url>`
3. **Model Pages**: Check individual model pages for your app in the "Apps" tab

---

## Troubleshooting

### Headers Not Appearing

1. Verify env vars are set correctly
2. Check browser network tab for outgoing requests
3. Ensure API calls are going to `openrouter.ai` not a proxy

### Attribution Not Tracking

1. Localhost URLs require a title header (already configured)
2. Wait 24-48 hours for initial tracking
3. Ensure API requests are being made (attribution only tracks active usage)

### Category Not Accepted

- Categories must be lowercase, hyphen-separated
- Maximum 2 categories per request
- Unrecognized categories are silently ignored

---

## Related Documentation

- [OpenRouter App Attribution Docs](https://openrouter.ai/docs/features/app-attribution)
- [OpenRouter Rankings](https://openrouter.ai/rankings)
- [Solana Clawd Architecture](../architecture.md)
- [ClawdRouter README](../clawdrouter/README.md)
- [App Listing Guide](./OPENROUTER-APP-LISTING.md)
