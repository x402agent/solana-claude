export interface TrustBoostConfig {
  enabled: boolean;
  endpoint: string;
  txHash: string;
  walletAddress?: string;
  timeoutMs: number;
  failOpen: boolean;
  minTextLength: number;
}

export interface TrustBoostEntity {
  type: string;
  category?: string;
  redacted_text?: string;
}

export interface TrustBoostMetadata {
  requestId?: string;
  safetyScore?: number;
  riskCategory?: string;
  entitiesRemoved?: boolean;
  entityCount?: number;
  quotaRemaining?: number;
  redactionSource?: string;
}

export interface TrustBoostSanitizationResult {
  text: string;
  applied: boolean;
  modified: boolean;
  metadata?: TrustBoostMetadata;
  error?: string;
}

export interface TrustBoostMessage {
  role: string;
  content: string;
}

export interface TrustBoostMessageResult<TMessage> {
  messages: TMessage[];
  applied: boolean;
  modified: boolean;
  metadata: TrustBoostMetadata[];
}

type TrustBoostApiResponse = {
  request_id?: string;
  data?: {
    sanitized_content?: string;
    sanitized_text?: string;
    safety_score?: number;
    risk_category?: string;
    entities_removed?: boolean;
    entities?: TrustBoostEntity[];
    redaction_source?: string;
    usage_metrics?: {
      quota_remaining?: number;
    };
  };
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "true";
}

export function loadTrustBoostConfig(env: NodeJS.ProcessEnv = process.env): TrustBoostConfig {
  const explicitlyEnabled = env.TRUSTBOOST_SANITIZER_ENABLED;
  const txHash = env.TRUSTBOOST_TX_HASH?.trim() || "TRIAL";

  return {
    enabled: parseBoolean(explicitlyEnabled, explicitlyEnabled == null && !!env.TRUSTBOOST_TX_HASH),
    endpoint: env.TRUSTBOOST_SANITIZER_ENDPOINT?.trim() || "https://trustboost-api.onrender.com/sanitize",
    txHash,
    walletAddress: env.TRUSTBOOST_WALLET_ADDRESS?.trim() || undefined,
    timeoutMs: Number(env.TRUSTBOOST_TIMEOUT_MS ?? 2500),
    failOpen: parseBoolean(env.TRUSTBOOST_FAIL_OPEN, true),
    minTextLength: Number(env.TRUSTBOOST_MIN_TEXT_LENGTH ?? 8),
  };
}

function buildPassthroughResult(text: string, error?: string): TrustBoostSanitizationResult {
  return {
    text,
    applied: false,
    modified: false,
    error,
  };
}

export async function sanitizeTextWithTrustBoost(
  text: string,
  config: TrustBoostConfig = loadTrustBoostConfig(),
  walletAddress?: string,
): Promise<TrustBoostSanitizationResult> {
  const normalized = typeof text === "string" ? text : String(text ?? "");
  if (!config.enabled) return buildPassthroughResult(normalized);
  if (normalized.trim().length < config.minTextLength) return buildPassthroughResult(normalized);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_hash: config.txHash,
        wallet_address: walletAddress || config.walletAddress || "solana-clawd",
        text: normalized,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`TrustBoost error: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as TrustBoostApiResponse;
    const sanitizedText = payload.data?.sanitized_content ?? payload.data?.sanitized_text;
    if (typeof sanitizedText !== "string") {
      throw new Error("TrustBoost response missing sanitized content");
    }

    return {
      text: sanitizedText,
      applied: true,
      modified: sanitizedText !== normalized,
      metadata: {
        requestId: payload.request_id,
        safetyScore: payload.data?.safety_score,
        riskCategory: payload.data?.risk_category,
        entitiesRemoved: payload.data?.entities_removed,
        entityCount: payload.data?.entities?.length ?? 0,
        quotaRemaining: payload.data?.usage_metrics?.quota_remaining,
        redactionSource: payload.data?.redaction_source,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!config.failOpen) {
      throw error;
    }
    return buildPassthroughResult(normalized, message);
  }
}

export async function sanitizeMessagesWithTrustBoost<TMessage extends TrustBoostMessage>(
  messages: TMessage[],
  config: TrustBoostConfig = loadTrustBoostConfig(),
  walletAddress?: string,
): Promise<TrustBoostMessageResult<TMessage>> {
  if (!config.enabled) {
    return { messages, applied: false, modified: false, metadata: [] };
  }

  const nextMessages = [...messages];
  const metadata: TrustBoostMetadata[] = [];
  let applied = false;
  let modified = false;

  for (let index = 0; index < nextMessages.length; index += 1) {
    const message = nextMessages[index];
    if (message.role !== "user") continue;

    const result = await sanitizeTextWithTrustBoost(message.content, config, walletAddress);
    applied = applied || result.applied;
    modified = modified || result.modified;
    if (result.metadata) metadata.push(result.metadata);
    if (result.text !== message.content) {
      nextMessages[index] = {
        ...message,
        content: result.text,
      };
    }
  }

  return {
    messages: nextMessages,
    applied,
    modified,
    metadata,
  };
}
