/**
 * src/telegram/twitter.ts
 *
 * Twitter/X API v2 integration — post tweets, reply, like, retweet, search,
 * and auto-tweet daemon controllable from Telegram.
 *
 * Uses OAuth 1.0a (CONSUMER_KEY + ACCESS_TOKEN) for write operations.
 * Uses Bearer token for read-only endpoints.
 * Zero external dependencies — raw crypto + fetch.
 */

import crypto from "node:crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

const CONSUMER_KEY = process.env.CONSUMER_KEY ?? "";
const CONSUMER_SECRET = process.env.SECRET_KEY ?? "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? "";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";
const BEARER_TOKEN = process.env.BEARER_TOKEN ?? "";

const API_BASE = "https://api.twitter.com";

// ─── OAuth 1.0a Signature (for POST tweets, like, retweet) ──────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function oauthHeader(method: string, url: string, extraParams?: Record<string, string>): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...(extraParams ?? {}) };
  const signature = generateOAuthSignature(method, url, allParams, CONSUMER_SECRET, ACCESS_TOKEN_SECRET);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");
  return `OAuth ${headerParts}`;
}

function ensureKeys(): void {
  if (!CONSUMER_KEY || !CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    throw new Error("Twitter OAuth keys not configured (CONSUMER_KEY, SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET)");
  }
}

// ─── Twitter API v2 Calls ───────────────────────────────────────────────────

/** Post a tweet */
export async function postTweet(text: string, replyToId?: string): Promise<{ id: string; text: string }> {
  ensureKeys();
  const url = `${API_BASE}/2/tweets`;
  const body: Record<string, unknown> = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tweet failed (${res.status}): ${err}`);
  }
  const data = (await res.json()) as { data: { id: string; text: string } };
  return data.data;
}

/** Delete a tweet */
export async function deleteTweet(tweetId: string): Promise<boolean> {
  ensureKeys();
  const url = `${API_BASE}/2/tweets/${tweetId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: oauthHeader("DELETE", url) },
  });
  if (!res.ok) throw new Error(`Delete tweet failed (${res.status})`);
  const data = (await res.json()) as { data: { deleted: boolean } };
  return data.data.deleted;
}

/** Like a tweet */
export async function likeTweet(tweetId: string): Promise<boolean> {
  ensureKeys();
  // Need user ID — extract from ACCESS_TOKEN (first part before -)
  const userId = ACCESS_TOKEN.split("-")[0];
  const url = `${API_BASE}/2/users/${userId}/likes`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  if (!res.ok) throw new Error(`Like failed (${res.status})`);
  return true;
}

/** Retweet */
export async function retweet(tweetId: string): Promise<boolean> {
  ensureKeys();
  const userId = ACCESS_TOKEN.split("-")[0];
  const url = `${API_BASE}/2/users/${userId}/retweets`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  if (!res.ok) throw new Error(`Retweet failed (${res.status})`);
  return true;
}

/** Search recent tweets (bearer token — read-only) */
export async function searchTweets(query: string, maxResults = 10): Promise<Array<{
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}>> {
  if (!BEARER_TOKEN) throw new Error("BEARER_TOKEN not configured");
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,author_id,public_metrics",
  });
  const res = await fetch(`${API_BASE}/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Twitter search failed (${res.status})`);
  const data = (await res.json()) as { data?: Array<{ id: string; text: string; author_id?: string; created_at?: string }> };
  return data.data ?? [];
}

/** Get user timeline */
export async function getUserTweets(userId?: string, maxResults = 5): Promise<Array<{
  id: string;
  text: string;
  created_at?: string;
}>> {
  if (!BEARER_TOKEN) throw new Error("BEARER_TOKEN not configured");
  const uid = userId ?? ACCESS_TOKEN.split("-")[0];
  const params = new URLSearchParams({
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,public_metrics",
  });
  const res = await fetch(`${API_BASE}/2/users/${uid}/tweets?${params}`, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Get tweets failed (${res.status})`);
  const data = (await res.json()) as { data?: Array<{ id: string; text: string; created_at?: string }> };
  return data.data ?? [];
}

// ─── Auto-Tweet Daemon ──────────────────────────────────────────────────────

export interface AutoTweetConfig {
  enabled: boolean;
  intervalMs: number;
  topics: string[];
  style: string;
  maxPerDay: number;
}

let autoTweetTimer: ReturnType<typeof setInterval> | null = null;
let autoTweetCount = 0;
let autoTweetLastReset = Date.now();
let autoTweetConfig: AutoTweetConfig = {
  enabled: false,
  intervalMs: 30 * 60 * 1000, // 30 min default
  topics: ["Solana", "crypto alpha", "DeFi"],
  style: "crypto degen with alpha insights, concise and punchy, use relevant emojis",
  maxPerDay: 24,
};
const autoTweetLog: Array<{ id: string; text: string; time: string }> = [];

/** Generate tweet content using xAI Grok + X search for context */
async function generateTweetContent(): Promise<string> {
  const { grokChat, xSearch } = await import("./xai.js");

  // Get fresh context from X
  const topic = autoTweetConfig.topics[Math.floor(Math.random() * autoTweetConfig.topics.length)];
  let context = "";
  try {
    const search = await xSearch(`${topic} latest alpha`);
    context = search.text.slice(0, 800);
  } catch {
    // X search optional — generate without context
  }

  const prompt = [
    `Generate a single tweet (max 280 chars) about ${topic}.`,
    autoTweetConfig.style ? `Style: ${autoTweetConfig.style}` : "",
    context ? `Current context from X:\n${context}` : "",
    "Return ONLY the tweet text, no quotes, no explanation.",
  ].filter(Boolean).join("\n");

  const tweet = await grokChat(prompt, "You are a Solana crypto thought leader. Write engaging tweets that get likes and retweets. Never use hashtags excessively. Be authentic.");
  // Trim to 280 chars
  return tweet.replace(/^["']|["']$/g, "").slice(0, 280);
}

export function startAutoTweet(
  onTweet: (tweet: { id: string; text: string }) => void,
  onError: (err: Error) => void,
  config?: Partial<AutoTweetConfig>,
): void {
  if (config) Object.assign(autoTweetConfig, config);
  autoTweetConfig.enabled = true;

  if (autoTweetTimer) clearInterval(autoTweetTimer);

  const tick = async () => {
    // Reset daily counter
    if (Date.now() - autoTweetLastReset > 24 * 60 * 60 * 1000) {
      autoTweetCount = 0;
      autoTweetLastReset = Date.now();
    }
    if (autoTweetCount >= autoTweetConfig.maxPerDay) return;

    try {
      const text = await generateTweetContent();
      const result = await postTweet(text);
      autoTweetCount++;
      autoTweetLog.push({ id: result.id, text: result.text, time: new Date().toISOString() });
      if (autoTweetLog.length > 50) autoTweetLog.shift();
      onTweet(result);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // First tweet after 10 seconds, then on interval
  setTimeout(tick, 10_000);
  autoTweetTimer = setInterval(tick, autoTweetConfig.intervalMs);
}

export function stopAutoTweet(): void {
  autoTweetConfig.enabled = false;
  if (autoTweetTimer) {
    clearInterval(autoTweetTimer);
    autoTweetTimer = null;
  }
}

export function getAutoTweetStatus(): {
  enabled: boolean;
  config: AutoTweetConfig;
  todayCount: number;
  recentTweets: Array<{ id: string; text: string; time: string }>;
} {
  return {
    enabled: autoTweetConfig.enabled,
    config: autoTweetConfig,
    todayCount: autoTweetCount,
    recentTweets: autoTweetLog.slice(-5),
  };
}

export function updateAutoTweetConfig(updates: Partial<AutoTweetConfig>): void {
  Object.assign(autoTweetConfig, updates);
  if (autoTweetConfig.enabled && autoTweetTimer) {
    // Restart with new interval
    clearInterval(autoTweetTimer);
    autoTweetTimer = setInterval(async () => {
      // Reuse tick logic — will be called by startAutoTweet
    }, autoTweetConfig.intervalMs);
  }
}
