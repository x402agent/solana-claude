# OpenRouter App Attribution & Listing Guide

This guide explains how Solana Clawd and ClawdRouter integrate with OpenRouter's App Attribution system for visibility in public rankings and analytics.

## Overview

OpenRouter's [App Attribution](https://openrouter.ai/docs/features/app-attribution) feature lets apps appear in public rankings and detailed analytics when they include attribution headers in API requests.

**Benefits:**
- **Public App Rankings** — Your app appears on openrouter.ai/rankings
- **Model Apps Tabs** — Featured on individual model pages
- **Detailed Analytics** — Track your model's usage, token consumption, and trends
- **Professional Visibility** — Showcase your app to the OpenRouter developer community

## Attribution Headers

Solana Clawd sends these headers to OpenRouter:

| Header | Purpose | Example |
|--------|---------|---------|
| `HTTP-Referer` | Primary identifier (URL of your app) | `https://github.com/x402agent/solana-clawd` |
| `X-OpenRouter-Title` | Display name in rankings | `ClawdRouter` or `Solana Clawd` |
| `X-OpenRouter-Categories` | Marketplace categories (max 2) | `cli-agent,cloud-agent` |
| `X-Title` | Backwards-compatible alias | `ClawdRouter` |

## How It Works

### 1. ClawdRouter (Local Proxy)

The local proxy at `clawdrouter/src/upstream/openrouter.ts` sends all OpenRouter requests with proper attribution headers:

```typescript
const headers: Record<string, string> = {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': siteUrl ?? 'https://github.com/x402agent/solana-clawd',
  'X-OpenRouter-Title': siteTitle ?? 'ClawdRouter — Solana Agent LLM Router',
  'X-Title': siteTitle ?? 'ClawdRouter — Solana Agent LLM Router',
};

if (categories && categories.length > 0) {
  headers['X-OpenRouter-Categories'] = categories.slice(0, 2).join(',');
}
```

### 2. Web App (Next.js API Routes)

The Next.js web app at `web/app/api/solana-clawd/chat/route.ts` also includes attribution:

```typescript
const response = await fetch(OPENROUTER_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-OpenRouter-Title": "Solana Clawd",
    "X-Title": "Solana Clawd",
    "X-OpenRouter-Categories": "cli-agent,cloud-agent",
  },
  body: JSON.stringify(openRouterRequest),
});
```

## Configuration

### Environment Variables

Set these in your `.env` or environment:

```bash
# OpenRouter API key
OPENROUTER_API_KEY=sk-or-v1-...

# App Attribution (ClawdRouter)
CLAWDROUTER_OPENROUTER_SITE_URL=https://github.com/x402agent/solana-clawd
CLAWDROUTER_OPENROUTER_SITE_TITLE=ClawdRouter
CLAWDROUTER_OPENROUTER_CATEGORIES=cli-agent,cloud-agent

# Web App attribution (Next.js)
OPENROUTER_SITE_URL=https://github.com/x402agent/solana-clawd
OPENROUTER_SITE_TITLE=Solana Clawd
OPENROUTER_CATEGORIES=cli-agent,cloud-agent
```

### Available Categories

Choose up to 2 categories from this list:

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

**Recommended for Solana Clawd:**
- `cli-agent` — CLI tool for Solana operations
- `cloud-agent` — AI agent for blockchain tasks

## Where Your App Appears

After attribution headers are active, your app will appear at:

1. **App Rankings** — openrouter.ai/rankings
   - Daily, weekly, monthly leaderboards
   - Total token consumption metrics

2. **Model Apps Tabs** — Individual model pages (e.g., GPT-4o)
   - Top apps using that specific model
   - Weekly rankings

3. **Analytics Dashboard** — openrouter.ai/apps?url=<your-app-url>
   - Model usage over time charts
   - Token consumption breakdown
   - Historical usage patterns

## Verification

To verify your attribution is working:

1. Check OpenRouter's rankings page after making API requests
2. Visit `https://openrouter.ai/apps?url=<your-site-url>` for analytics
3. Review the response headers from OpenRouter API calls

## Localhost Development

For localhost development, the HTTP-Referer header may not be useful. OpenRouter requires a title header for localhost URLs to be tracked:

```typescript
// Required for localhost
'X-OpenRouter-Title': 'My App Name',
```

ClawdRouter defaults to `https://github.com/x402agent/solana-clawd` for production use.

## Privacy Considerations

- Only **public apps** (those sending attribution headers) are included in rankings
- Attribution headers don't expose sensitive request information
- You control what metadata is shared via the headers you send

## Related Documentation

- [OpenRouter App Attribution](https://openrouter.ai/docs/features/app-attribution)
- [OpenRouter API Reference](https://openrouter.ai/docs)
- [Solana Clawd Architecture](../architecture.md)
- [ClawdRouter README](../clawdrouter/README.md)
