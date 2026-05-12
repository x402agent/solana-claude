import type { ChatMessage, ClawdRouterConfig, ContentPart } from '../types.js';

export interface ClawdRouterTrustBoostMetadata {
  requestId?: string;
  safetyScore?: number;
  riskCategory?: string;
  entityCount?: number;
  quotaRemaining?: number;
}

export interface ClawdRouterSanitizedMessages {
  messages: ChatMessage[];
  applied: boolean;
  modified: boolean;
  metadata: ClawdRouterTrustBoostMetadata[];
}

type TrustBoostApiResponse = {
  request_id?: string;
  data?: {
    sanitized_content?: string;
    sanitized_text?: string;
    safety_score?: number;
    risk_category?: string;
    entities?: Array<{ type: string }>;
    usage_metrics?: {
      quota_remaining?: number;
    };
  };
};

function buildWalletAddress(config: ClawdRouterConfig, walletAddress?: string): string {
  return walletAddress || config.trustBoostWalletAddress || 'clawdrouter';
}

async function sanitizeText(
  text: string,
  config: ClawdRouterConfig,
  walletAddress?: string,
): Promise<{ text: string; applied: boolean; modified: boolean; metadata?: ClawdRouterTrustBoostMetadata }> {
  if (!config.trustBoostEnabled) {
    return { text, applied: false, modified: false };
  }

  if (text.trim().length < config.trustBoostMinTextLength) {
    return { text, applied: false, modified: false };
  }

  try {
    const response = await fetch(config.trustBoostEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_hash: config.trustBoostTxHash,
        wallet_address: buildWalletAddress(config, walletAddress),
        text,
      }),
      signal: AbortSignal.timeout(config.trustBoostTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`TrustBoost error: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as TrustBoostApiResponse;
    const sanitized = payload.data?.sanitized_content ?? payload.data?.sanitized_text;
    if (typeof sanitized !== 'string') {
      throw new Error('TrustBoost response missing sanitized content');
    }

    return {
      text: sanitized,
      applied: true,
      modified: sanitized !== text,
      metadata: {
        requestId: payload.request_id,
        safetyScore: payload.data?.safety_score,
        riskCategory: payload.data?.risk_category,
        entityCount: payload.data?.entities?.length ?? 0,
        quotaRemaining: payload.data?.usage_metrics?.quota_remaining,
      },
    };
  } catch (error) {
    if (!config.trustBoostFailOpen) {
      throw error;
    }
    return { text, applied: false, modified: false };
  }
}

async function sanitizeContentParts(
  parts: ContentPart[],
  config: ClawdRouterConfig,
  walletAddress?: string,
): Promise<{ parts: ContentPart[]; applied: boolean; modified: boolean; metadata: ClawdRouterTrustBoostMetadata[] }> {
  const nextParts: ContentPart[] = [];
  const metadata: ClawdRouterTrustBoostMetadata[] = [];
  let applied = false;
  let modified = false;

  for (const part of parts) {
    if (part.type !== 'text' || typeof part.text !== 'string') {
      nextParts.push(part);
      continue;
    }

    const result = await sanitizeText(part.text, config, walletAddress);
    applied = applied || result.applied;
    modified = modified || result.modified;
    if (result.metadata) metadata.push(result.metadata);
    nextParts.push(result.text === part.text ? part : { ...part, text: result.text });
  }

  return { parts: nextParts, applied, modified, metadata };
}

export async function sanitizeChatMessages(
  messages: ChatMessage[],
  config: ClawdRouterConfig,
  walletAddress?: string,
): Promise<ClawdRouterSanitizedMessages> {
  if (!config.trustBoostEnabled) {
    return { messages, applied: false, modified: false, metadata: [] };
  }

  const nextMessages: ChatMessage[] = [];
  const metadata: ClawdRouterTrustBoostMetadata[] = [];
  let applied = false;
  let modified = false;

  for (const message of messages) {
    if (message.role !== 'user') {
      nextMessages.push(message);
      continue;
    }

    if (typeof message.content === 'string') {
      const result = await sanitizeText(message.content, config, walletAddress);
      applied = applied || result.applied;
      modified = modified || result.modified;
      if (result.metadata) metadata.push(result.metadata);
      nextMessages.push(result.text === message.content ? message : { ...message, content: result.text });
      continue;
    }

    const result = await sanitizeContentParts(message.content, config, walletAddress);
    applied = applied || result.applied;
    modified = modified || result.modified;
    metadata.push(...result.metadata);
    nextMessages.push(result.modified ? { ...message, content: result.parts } : message);
  }

  return {
    messages: nextMessages,
    applied,
    modified,
    metadata,
  };
}
