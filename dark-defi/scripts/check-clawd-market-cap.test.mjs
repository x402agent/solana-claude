import { describe, expect, test } from 'bun:test';

import {
  checkReleaseGate,
  extractMarketCap,
  parsePositiveNumber,
  validateSolanaAddress,
} from './check-clawd-market-cap.mjs';

const TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('release gate validation', () => {
  test('requires a positive target', () => {
    expect(() => parsePositiveNumber('0', 'target')).toThrow('target must be a positive number.');
    expect(() => parsePositiveNumber('100000', 'target')).not.toThrow();
  });

  test('requires a Solana token address shape', () => {
    expect(() => validateSolanaAddress('not a mint')).toThrow('CLAWD_TOKEN_ADDRESS must be a valid Solana base58 address.');
    expect(() => validateSolanaAddress(TOKEN_ADDRESS)).not.toThrow();
  });
});

describe('Birdeye market cap parsing', () => {
  test('prefers explicit marketCap over fallback fields', () => {
    expect(extractMarketCap({ data: { marketCap: 100, fdv: 200 } })).toEqual({
      marketCap: 100,
      sourceField: 'marketCap',
    });
  });

  test('uses compatible fallback fields when marketCap is absent', () => {
    expect(extractMarketCap({ data: { realMc: '12345' } })).toEqual({
      marketCap: 12345,
      sourceField: 'realMc',
    });
  });

  test('fails closed on unsuccessful or unusable Birdeye payloads', () => {
    expect(() => extractMarketCap({ success: false, message: 'bad key' })).toThrow('unsuccessful response');
    expect(() => extractMarketCap({ data: { marketCap: null } })).toThrow('usable market cap field');
  });
});

describe('release gate execution', () => {
  test('reports a closed gate below threshold', async () => {
    const result = await checkReleaseGate(
      {
        BIRDEYE_API_KEY: 'test-key',
        CLAWD_TOKEN_ADDRESS: TOKEN_ADDRESS,
        CLAWD_MARKET_CAP_TARGET: '100000',
      },
      async () => jsonResponse({ data: { marketCap: 99999 } }),
    );

    expect(result.thresholdMet).toBe(false);
    expect(result.marketCap).toBe(99999);
  });

  test('reports an open gate at threshold', async () => {
    const result = await checkReleaseGate(
      {
        BIRDEYE_API_KEY: 'test-key',
        CLAWD_TOKEN_ADDRESS: TOKEN_ADDRESS,
        CLAWD_MARKET_CAP_TARGET: '100000',
      },
      async () => jsonResponse({ data: { marketCap: 100000 } }),
    );

    expect(result.thresholdMet).toBe(true);
  });
});
