/**
 * Safe dry-run example for autonomous Pay spending.
 *
 * Run:
 *   node --import tsx/esm examples/agent-commerce.ts
 */

import { PayAutonomyClient } from '../src/commerce/pay-client.js';

const client = new PayAutonomyClient({
  mode: 'sandbox',
  maxUsdPerCall: 0.01,
  maxUsdPerRun: 0.05,
  allowProviders: ['solana-clawd'],
  allowEndpoints: [
    {
      provider: 'solana-clawd',
      method: 'POST',
      urlPattern: 'http://127.0.0.1:1402/v1/agents/*/decide',
      maxUsd: 0.005,
    },
  ],
});

const result = await client.call({
  provider: 'solana-clawd',
  method: 'POST',
  url: 'http://127.0.0.1:1402/v1/agents/demo/decide',
  estimatedUsd: 0.005,
  acknowledged: false,
  dryRun: true,
  body: {
    goal: 'Find a paid market-data endpoint under policy and produce a trade preflight report.',
    mode: 'sandbox',
  },
});

console.log(JSON.stringify(result, null, 2));
