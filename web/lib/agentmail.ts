import { createHmac, timingSafeEqual } from "node:crypto";

const AGENTMAIL_BASE_URL = process.env.AGENTMAIL_BASE_URL ?? "https://api.agentmail.to";
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY ?? "";
const AGENTMAIL_DOMAIN = process.env.AGENTMAIL_DOMAIN ?? "agentmail.to";
const CLAWD_SUPPORT_INBOX_ID =
  process.env.AGENTMAIL_CLAWD_INBOX_ID ?? `clawd@${AGENTMAIL_DOMAIN}`;
const CLAWD_AGENT_NUMBER =
  process.env.NEXT_PUBLIC_CLAWD_AGENT_NUMBER ?? process.env.AGENT_NUMBER ?? "+19094135567";
const CLAWD_VOICE_AGENT_ID =
  process.env.ELEVEN_LABS_AGENT_ID ??
  process.env.ELEVENLABS_AGENT_ID ??
  "agent_1601knpw2ax7ejb80fdxx118n7qn";

export type AgentMailInbox = {
  inbox_id: string;
  display_name?: string | null;
  client_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AgentMailMessage = {
  inbox_id: string;
  thread_id: string;
  message_id: string;
  from?: string;
  to?: string[];
  subject?: string;
  text?: string;
  html?: string;
  extracted_text?: string;
  extracted_html?: string;
  labels?: string[];
  created_at?: string;
  timestamp?: string;
};

type AgentMailMessageList = {
  count?: number;
  page_token?: string | null;
  messages?: AgentMailMessage[];
};

function requireAgentMailKey() {
  if (!AGENTMAIL_API_KEY.trim()) {
    throw new Error("AGENTMAIL_API_KEY is not configured");
  }
}

async function agentmailRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  requireAgentMailKey();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${AGENTMAIL_API_KEY}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${AGENTMAIL_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AgentMail ${response.status}: ${detail || "request failed"}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function sanitizeSegment(input: string, fallback: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return normalized || fallback;
}

function buildHolderUsername(walletAddress: string, holderEmail: string) {
  const walletPart = sanitizeSegment(walletAddress.slice(0, 10), "wallet");
  const emailPart = sanitizeSegment(holderEmail.split("@")[0] ?? "holder", "holder");
  return `holder-${walletPart}-${emailPart}`.slice(0, 40);
}

export function getClawdCommunicationsConfig() {
  return {
    supportInboxId: CLAWD_SUPPORT_INBOX_ID,
    agentNumber: CLAWD_AGENT_NUMBER,
    voiceAgentId: CLAWD_VOICE_AGENT_ID,
    voicePath: "/voice",
  };
}

export async function getInbox(inboxId: string) {
  return agentmailRequest<AgentMailInbox>(`/v0/inboxes/${encodeURIComponent(inboxId)}`);
}

export async function createInbox(params: {
  username: string;
  domain?: string;
  displayName?: string;
  clientId?: string;
}) {
  return agentmailRequest<AgentMailInbox>("/v0/inboxes", {
    method: "POST",
    body: JSON.stringify({
      username: params.username,
      domain: params.domain ?? AGENTMAIL_DOMAIN,
      display_name: params.displayName,
      client_id: params.clientId,
    }),
  });
}

export async function ensureSupportInbox() {
  try {
    return await getInbox(CLAWD_SUPPORT_INBOX_ID);
  } catch {
    const username = CLAWD_SUPPORT_INBOX_ID.split("@")[0] ?? "clawd";
    return createInbox({
      username,
      displayName: "$CLAWD Solana Agent Desk",
      clientId: "solana-clawd-support-v1",
    });
  }
}

export async function provisionHolderInbox(params: {
  holderEmail: string;
  walletAddress: string;
  displayName?: string;
}) {
  const username = buildHolderUsername(params.walletAddress, params.holderEmail);
  const clientId = `solana-clawd-holder-${sanitizeSegment(params.walletAddress, "wallet")}`;
  const displayName =
    params.displayName?.trim() || `$CLAWD Holder ${params.walletAddress.slice(0, 4)}…${params.walletAddress.slice(-4)}`;

  try {
    return await getInbox(`${username}@${AGENTMAIL_DOMAIN}`);
  } catch {
    return createInbox({
      username,
      displayName,
      clientId,
    });
  }
}

export async function sendMessage(
  inboxId: string,
  payload: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    replyTo?: string | string[];
    labels?: string[];
  }
) {
  return agentmailRequest<{ message_id: string; thread_id: string }>(
    `/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: "POST",
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        reply_to: payload.replyTo,
        labels: payload.labels,
      }),
    }
  );
}

export async function replyToMessage(
  inboxId: string,
  messageId: string,
  payload: {
    text: string;
    html?: string;
    labels?: string[];
    replyAll?: boolean;
  }
) {
  return agentmailRequest<{ message_id: string; thread_id: string }>(
    `/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/reply`,
    {
      method: "POST",
      body: JSON.stringify({
        text: payload.text,
        html: payload.html,
        labels: payload.labels,
        reply_all: payload.replyAll ?? false,
      }),
    }
  );
}

export async function listMessages(inboxId: string, limit = 10) {
  const query = new URLSearchParams({ limit: String(limit) });
  return agentmailRequest<AgentMailMessageList>(
    `/v0/inboxes/${encodeURIComponent(inboxId)}/messages?${query.toString()}`
  );
}

export function isAllowedHolderInboxId(inboxId: string) {
  return /^holder-[a-z0-9-]+@agentmail\.to$/i.test(inboxId);
}

export function buildWelcomeMessage(params: {
  holderEmail: string;
  walletAddress: string;
  holderInboxId: string;
}) {
  const support = getClawdCommunicationsConfig();
  const subject = `Welcome to $CLAWD Comms`;
  const text = [
    `GM from $CLAWD.`,
    ``,
    `Your holder inbox is ready: ${params.holderInboxId}`,
    `Email the agent: ${support.supportInboxId}`,
    `Call the agent: ${support.agentNumber}`,
    `Live voice console: ${support.voicePath}`,
    ``,
    `Wallet reference: ${params.walletAddress}`,
    `Human email: ${params.holderEmail}`,
    ``,
    `You can use this channel for Solana token research, wallet intelligence, OODA trading context, and autonomous finance workflows with permission-gated execution.`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#050816;color:#e5f7ef;padding:24px;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(16,185,129,.2);border-radius:18px;background:#0b1220;padding:24px;">
        <p style="margin:0 0 12px;color:#86efac;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">$CLAWD holder communications</p>
        <h1 style="margin:0 0 18px;font-size:28px;color:#fff;">Your Solana agent desk is live</h1>
        <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1;">Clawd can now coordinate by email or voice for Solana research, wallet intelligence, dSolana-style strategy tracking, and autonomous-but-permission-gated trade workflows.</p>
        <div style="display:grid;gap:12px;margin:18px 0;">
          <div style="padding:14px 16px;border-radius:14px;background:#111827;border:1px solid rgba(148,163,184,.14);"><strong>Holder inbox</strong><br/>${params.holderInboxId}</div>
          <div style="padding:14px 16px;border-radius:14px;background:#111827;border:1px solid rgba(148,163,184,.14);"><strong>Email Clawd</strong><br/>${support.supportInboxId}</div>
          <div style="padding:14px 16px;border-radius:14px;background:#111827;border:1px solid rgba(148,163,184,.14);"><strong>Call Clawd</strong><br/>${support.agentNumber}</div>
        </div>
        <p style="margin:0;color:#94a3b8;line-height:1.6;">Wallet reference: ${params.walletAddress}<br/>Human email: ${params.holderEmail}</p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

function safeTimingCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function computeSvixSignature(secret: string, payload: string, messageId: string, timestamp: string) {
  const stripped = secret.includes("_") ? secret.split("_").slice(1).join("_") : secret;
  const signed = `${messageId}.${timestamp}.${payload}`;
  const candidates = [stripped];

  try {
    candidates.push(Buffer.from(stripped, "base64").toString("binary"));
  } catch {
    // noop
  }

  return candidates.map((candidate) =>
    createHmac("sha256", candidate).update(signed).digest("base64")
  );
}

export function verifyAgentMailWebhook(headers: Headers, payload: string) {
  const secret = process.env.AGENTMAIL_WEBHOOK_SECRET ?? "";
  if (!secret) return true;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const skew = Math.abs(Date.now() - Number(svixTimestamp) * 1000);
  if (!Number.isFinite(skew) || skew > 5 * 60 * 1000) return false;

  const expected = computeSvixSignature(secret, payload, svixId, svixTimestamp);
  const provided = svixSignature
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(","))
    .filter(([version, value]) => version === "v1" && Boolean(value))
    .map(([, value]) => value as string);

  return provided.some((value) => expected.some((candidate) => safeTimingCompare(value, candidate)));
}
