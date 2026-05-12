import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeChatMessages } from '../src/privacy/trustboost.js';
import type { ChatMessage, ClawdRouterConfig } from '../src/types.js';

const originalFetch = globalThis.fetch;

const baseConfig: ClawdRouterConfig = {
  port: 8402,
  profile: 'auto',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  network: 'solana-mainnet',
  maxPerRequest: 0.1,
  maxPerSession: 5,
  walletPath: '/tmp/clawdrouter-wallet.json',
  excludedModels: [],
  debug: false,
  upstreamUrl: 'https://example.com',
  clawdTokenMint: 'mint',
  heliusApiKey: '',
  holderThresholds: {
    whale: 1_000_000,
    diamond: 100_000,
    holder: 1_000,
  },
  openRouterApiKey: '',
  openRouterSiteTitle: 'ClawdRouter',
  openRouterSiteUrl: 'https://github.com/x402agent/solana-clawd',
  openRouterCategories: ['cli-agent'],
  openRouterEnabled: false,
  x402PayTo: '',
  x402Price: '10000',
  x402Description: 'ClawdRouter access',
  trustBoostEnabled: true,
  trustBoostEndpoint: 'https://trustboost.example/sanitize',
  trustBoostTxHash: 'TRIAL',
  trustBoostWalletAddress: 'test-wallet',
  trustBoostTimeoutMs: 1000,
  trustBoostFailOpen: true,
  trustBoostMinTextLength: 1,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('TrustBoost sanitization', () => {
  it('sanitizes only user messages and preserves non-text parts', async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;
      return new Response(JSON.stringify({
        request_id: `req_${callCount}`,
        data: {
          sanitized_content: callCount === 1 ? 'Contact me at [REDACTED]' : 'Call me at [REDACTED]',
          safety_score: 0.6,
          risk_category: 'PRIVATE',
          entities: [{ type: 'email' }],
          usage_metrics: { quota_remaining: 50 - callCount },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const messages: ChatMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Contact me at alice@example.com' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Call me at 555-123-4567' },
          { type: 'image_url', image_url: { url: 'https://example.com/cat.png' } },
        ],
      },
    ];

    const result = await sanitizeChatMessages(messages, baseConfig, 'wallet-123');

    assert.equal(result.applied, true);
    assert.equal(result.modified, true);
    assert.equal(result.messages[0].content, 'System prompt');
    assert.equal(result.messages[1].content, 'Contact me at [REDACTED]');
    assert.deepEqual(result.messages[2].content, [
      { type: 'text', text: 'Call me at [REDACTED]' },
      { type: 'image_url', image_url: { url: 'https://example.com/cat.png' } },
    ]);
    assert.equal(result.metadata.length, 2);
  });

  it('fails open when TrustBoost is unavailable', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as typeof fetch;

    const result = await sanitizeChatMessages(
      [{ role: 'user', content: 'alice@example.com' }],
      baseConfig,
    );

    assert.equal(result.applied, false);
    assert.equal(result.modified, false);
    assert.equal(result.messages[0].content, 'alice@example.com');
  });
});
