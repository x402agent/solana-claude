#!/usr/bin/env node

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const REQUEST_TIMEOUT_MS = 15000;
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function writeOutput(values, outputPath = process.env.GITHUB_OUTPUT) {
  if (!outputPath) return;
  fs.appendFileSync(
    outputPath,
    Object.entries(values)
      .map(([key, value]) => `${key}=${String(value).replaceAll('\n', ' ')}`)
      .join('\n') + '\n',
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parsePositiveNumber(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
}

export function validateSolanaAddress(address) {
  if (!address || !SOLANA_ADDRESS_PATTERN.test(address)) {
    throw new Error('CLAWD_TOKEN_ADDRESS must be a valid Solana base58 address.');
  }
}

export function extractMarketCap(payload) {
  if (payload?.success === false) {
    throw new Error(`Birdeye returned an unsuccessful response: ${payload?.message || 'unknown error'}`);
  }

  const data = payload?.data || {};
  const fields = ['marketCap', 'mc', 'realMc', 'fdv'];
  for (const field of fields) {
    const value = Number(data[field]);
    if (Number.isFinite(value) && value > 0) {
      return { marketCap: value, sourceField: field };
    }
  }

  throw new Error(`Birdeye response did not include a usable market cap field. Available fields: ${Object.keys(data).join(', ') || 'none'}`);
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES, fetchImpl = fetch) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      if (response.ok) {
        return response;
      }
      console.warn(`Attempt ${i + 1} failed: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (i < retries - 1) {
      console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`Failed after ${retries} attempts`);
}

export async function checkReleaseGate(env = process.env, fetchImpl = fetch) {
  const birdeyeApiKey = env.BIRDEYE_API_KEY;
  const tokenAddress = env.CLAWD_TOKEN_ADDRESS;
  const target = parsePositiveNumber(env.CLAWD_MARKET_CAP_TARGET || 100000, 'CLAWD_MARKET_CAP_TARGET');

  if (!birdeyeApiKey) {
    throw new Error('BIRDEYE_API_KEY is required.');
  }

  validateSolanaAddress(tokenAddress);

  const url = new URL('https://public-api.birdeye.so/defi/token_overview');
  url.searchParams.set('address', tokenAddress);

  console.log(`Fetching market cap for token: ${tokenAddress}`);

  const response = await fetchWithRetry(url, {
    headers: {
      'X-API-KEY': birdeyeApiKey,
      'x-chain': 'solana',
      accept: 'application/json',
    },
  }, MAX_RETRIES, fetchImpl);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Failed to parse Birdeye response as JSON.');
  }

  const { marketCap, sourceField } = extractMarketCap(payload);
  const thresholdMet = marketCap >= target;

  return {
    thresholdMet,
    marketCap,
    target,
    tokenAddress,
    sourceField,
  };
}

export async function main(env = process.env, fetchImpl = fetch) {
  const result = await checkReleaseGate(env, fetchImpl);

  writeOutput({
    threshold_met: result.thresholdMet ? 'true' : 'false',
    market_cap: result.marketCap,
    target: result.target,
    token_address: result.tokenAddress,
    market_cap_field: result.sourceField,
  }, env.GITHUB_OUTPUT);

  console.log(`$CLAWD market cap: $${result.marketCap.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
  console.log(`market cap field: ${result.sourceField}`);
  console.log(`release target: $${result.target.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
  console.log(`threshold met: ${result.thresholdMet ? 'yes' : 'no'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
