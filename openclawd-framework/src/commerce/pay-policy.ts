/**
 * Autonomous spending policy for Pay CLI backed agent commerce.
 *
 * The default posture is intentionally conservative: sandbox only, small
 * per-call caps, explicit endpoint allowlists, and no live spending unless a
 * caller passes an acknowledgement for the specific action.
 */

export type PayMode = 'sandbox' | 'localnet' | 'mainnet';

export interface PayEndpointRule {
  provider?: string;
  method?: string;
  urlPattern: string;
  maxUsd?: number;
  description?: string;
}

export interface PaySpendPolicy {
  mode: PayMode;
  currency: 'USDC' | 'SOL' | string;
  maxUsdPerCall: number;
  maxUsdPerRun: number;
  maxCallsPerRun: number;
  requireAcknowledgementAboveUsd: number;
  allowProviders: string[];
  allowEndpoints: PayEndpointRule[];
  denyUrlPatterns: string[];
}

export interface PaySpendRequest {
  provider?: string;
  method?: string;
  url: string;
  estimatedUsd: number;
  calls?: number;
  acknowledged?: boolean;
}

export interface PayRunLedger {
  spentUsd: number;
  calls: number;
}

export interface PayPolicyDecision {
  ok: boolean;
  reasons: string[];
  mode: PayMode;
  estimatedUsd: number;
  projectedRunSpendUsd: number;
}

export const DEFAULT_PAY_SPEND_POLICY: PaySpendPolicy = {
  mode: 'sandbox',
  currency: 'USDC',
  maxUsdPerCall: 0.05,
  maxUsdPerRun: 0.25,
  maxCallsPerRun: 10,
  requireAcknowledgementAboveUsd: 0.01,
  allowProviders: ['solana-clawd', 'payment-debugger', 'metaplex', 'vulcan'],
  allowEndpoints: [
    {
      provider: 'solana-clawd',
      method: 'POST',
      urlPattern: 'http://127.0.0.1:1402/v1/agents/*',
      maxUsd: 0.01,
      description: 'Local sandbox paid agent services.',
    },
    {
      provider: 'payment-debugger',
      method: 'GET',
      urlPattern: 'https://payment-debugger.vercel.app/*',
      maxUsd: 0.01,
      description: 'Pay sandbox debugger endpoints.',
    },
  ],
  denyUrlPatterns: [
    'file://*',
    'http://169.254.169.254/*',
    'http://metadata.google.internal/*',
    'http://127.0.0.1:*/admin*',
    'http://localhost:*/admin*',
  ],
};

export function makePaySpendPolicy(overrides: Partial<PaySpendPolicy> = {}): PaySpendPolicy {
  return {
    ...DEFAULT_PAY_SPEND_POLICY,
    ...overrides,
    allowProviders: overrides.allowProviders ?? DEFAULT_PAY_SPEND_POLICY.allowProviders,
    allowEndpoints: overrides.allowEndpoints ?? DEFAULT_PAY_SPEND_POLICY.allowEndpoints,
    denyUrlPatterns: overrides.denyUrlPatterns ?? DEFAULT_PAY_SPEND_POLICY.denyUrlPatterns,
  };
}

export function evaluatePaySpend(
  policy: PaySpendPolicy,
  request: PaySpendRequest,
  ledger: PayRunLedger = { spentUsd: 0, calls: 0 },
): PayPolicyDecision {
  const calls = request.calls ?? 1;
  const reasons: string[] = [];
  const method = (request.method ?? 'GET').toUpperCase();
  const projectedRunSpendUsd = ledger.spentUsd + request.estimatedUsd;

  if (policy.mode === 'mainnet' && !request.acknowledged) {
    reasons.push('mainnet Pay spending requires acknowledged=true for this action');
  }

  if (request.estimatedUsd > policy.maxUsdPerCall) {
    reasons.push(`estimated cost ${money(request.estimatedUsd)} exceeds per-call cap ${money(policy.maxUsdPerCall)}`);
  }

  if (projectedRunSpendUsd > policy.maxUsdPerRun) {
    reasons.push(`projected run spend ${money(projectedRunSpendUsd)} exceeds run cap ${money(policy.maxUsdPerRun)}`);
  }

  if (ledger.calls + calls > policy.maxCallsPerRun) {
    reasons.push(`projected call count ${ledger.calls + calls} exceeds run cap ${policy.maxCallsPerRun}`);
  }

  if (request.estimatedUsd >= policy.requireAcknowledgementAboveUsd && !request.acknowledged) {
    reasons.push(`estimated cost requires acknowledgement at or above ${money(policy.requireAcknowledgementAboveUsd)}`);
  }

  if (request.provider && !policy.allowProviders.includes(request.provider)) {
    reasons.push(`provider "${request.provider}" is not allowlisted`);
  }

  if (policy.denyUrlPatterns.some((pattern) => globMatch(pattern, request.url))) {
    reasons.push('target URL matches a denied pattern');
  }

  const matchingRule = policy.allowEndpoints.find((rule) => {
    const providerOk = !rule.provider || !request.provider || rule.provider === request.provider;
    const methodOk = !rule.method || rule.method.toUpperCase() === method;
    return providerOk && methodOk && globMatch(rule.urlPattern, request.url);
  });

  if (!matchingRule) {
    reasons.push('target endpoint is not allowlisted');
  } else if (matchingRule.maxUsd !== undefined && request.estimatedUsd > matchingRule.maxUsd) {
    reasons.push(`estimated cost ${money(request.estimatedUsd)} exceeds endpoint cap ${money(matchingRule.maxUsd)}`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    mode: policy.mode,
    estimatedUsd: request.estimatedUsd,
    projectedRunSpendUsd,
  };
}

export function recordPaySpend(ledger: PayRunLedger, request: PaySpendRequest): PayRunLedger {
  return {
    spentUsd: ledger.spentUsd + request.estimatedUsd,
    calls: ledger.calls + (request.calls ?? 1),
  };
}

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

function globMatch(pattern: string, value: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}
