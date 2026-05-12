/**
 * Clawd Email Worker — solanaclawd.com
 *
 * Handles incoming emails for clawd@solanaclawd.com:
 *   1. Forwards every email to beetsbyj@gmail.com
 *   2. Generates an AI auto-reply via Claude and sends it back to the sender
 *   3. Optionally pings a webhook (Discord/Slack) on new mail
 *
 * Subaddressing:
 *   clawd+noreply@solanaclawd.com  → forward only, no auto-reply
 *   clawd+drop@solanaclawd.com     → silently drop
 *   clawd+<anything>@...           → forward + auto-reply
 *
 * Deploy:
 *   cd email-worker && npx wrangler deploy
 *   npx wrangler secret put ANTHROPIC_API_KEY
 *
 * Wire up in Cloudflare Dashboard:
 *   Email Routing → Routes → clawd@solanaclawd.com → Send to Worker → clawd-email-worker
 */

import { EmailMessage } from "cloudflare:email";

export interface Env {
  FORWARD_TO: string;
  REPLY_FROM: string;
  REPLY_FROM_NAME: string;
  ANTHROPIC_API_KEY: string;
  NOTIFICATION_WEBHOOK_URL?: string;
  SEND_EMAIL: SendEmail;
}

interface SendEmail {
  send(message: EmailMessage): Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function parseSubaddress(to: string): string | null {
  const match = to.match(/^clawd\+([^@]+)@/i);
  return match ? match[1] : null;
}

/** Concatenate Uint8Array chunks into a single array */
function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Read the raw email body as text */
async function readEmailBody(message: ForwardableEmailMessage): Promise<string> {
  const reader = message.raw.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const raw = new TextDecoder().decode(concatUint8Arrays(chunks));

  // Extract body after headers (double newline)
  const bodyStart = raw.indexOf("\r\n\r\n");
  if (bodyStart !== -1) {
    return raw.slice(bodyStart + 4, bodyStart + 4 + 4000);
  }
  const altStart = raw.indexOf("\n\n");
  if (altStart !== -1) {
    return raw.slice(altStart + 2, altStart + 2 + 4000);
  }
  return raw.slice(0, 2000);
}

/** Strip HTML tags for plaintext extraction */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Build MIME message without external deps ────────────────────────────

function buildMimeReply(
  fromAddr: string,
  fromName: string,
  toAddr: string,
  subject: string,
  inReplyTo: string | null,
  bodyPlain: string
): string {
  const boundary = `----clawd-boundary-${Date.now().toString(36)}`;
  const date = new Date().toUTCString();
  const msgId = `<clawd-${Date.now()}-${Math.random().toString(36).slice(2)}@solanaclawd.com>`;

  const bodyHtml = bodyPlain
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `<p>${escapeHtml(line)}</p>`))
    .join("\n");

  const headers = [
    `From: "${fromName}" <${fromAddr}>`,
    `To: ${toAddr}`,
    `Subject: Re: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${msgId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const parts = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    bodyPlain,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#333;">${bodyHtml}</body></html>`,
    "",
    `--${boundary}--`,
  ];

  return parts.join("\r\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Claude Auto-Reply ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Clawd, the AI assistant for Solana Clawd (solanaclawd.com). You are friendly, knowledgeable about Solana blockchain, crypto, and web3. You respond to emails on behalf of the Solana Clawd project.

Key facts about you:
- You are Clawd, a lobster-themed AI companion for Solana
- Solana Clawd is an agentic engine with MCP tools, blockchain integration, and memory
- You help with questions about the project, Solana development, and general inquiries
- You are helpful but concise — email replies should be clear and to the point
- If someone is asking about partnerships, investment, or business matters, let them know the team will follow up personally
- Sign your emails as "Clawd" with a claw emoji

Keep replies under 300 words unless the question requires a detailed technical answer.`;

async function generateAutoReply(
  env: Env,
  senderEmail: string,
  subject: string,
  bodyText: string
): Promise<string> {
  const userMessage = [
    "New email received. Generate a reply.",
    "",
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    "",
    "Body:",
    bodyText.slice(0, 3000),
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[auto-reply] Claude API error ${response.status}: ${errorText}`);
    throw new Error(`Claude API returned ${response.status}`);
  }

  const result = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const textBlock = result.content.find((b) => b.type === "text");
  return textBlock?.text ?? "Thanks for reaching out! We'll get back to you soon.";
}

// ── Send Reply Email ────────────────────────────────────────────────────

async function sendReplyEmail(
  env: Env,
  originalFrom: string,
  originalSubject: string,
  originalMessageId: string | null,
  replyBody: string
): Promise<void> {
  const rawMessage = buildMimeReply(
    env.REPLY_FROM,
    env.REPLY_FROM_NAME,
    originalFrom,
    originalSubject,
    originalMessageId,
    replyBody
  );

  const emailMessage = new EmailMessage(env.REPLY_FROM, originalFrom, rawMessage);
  await env.SEND_EMAIL.send(emailMessage);
  console.log(`[auto-reply] Sent reply to ${originalFrom}`);
}

// ── Webhook Notification ────────────────────────────────────────────────

async function sendWebhookNotification(
  env: Env,
  from: string,
  to: string,
  subject: string,
  subaddress: string | null,
  autoReplied: boolean
) {
  if (!env.NOTIFICATION_WEBHOOK_URL) return;

  const tag = subaddress ? ` [+${subaddress}]` : "";
  const replyNote = autoReplied ? "\n**Auto-reply:** sent" : "";
  const payload = {
    content: [
      `📧 **New email**${tag}`,
      `**From:** ${from}`,
      `**To:** ${to}`,
      `**Subject:** ${subject}${replyNote}`,
    ].join("\n"),
  };

  try {
    await fetch(env.NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Webhook notification failed:", err);
  }
}

// ── Main Email Handler ──────────────────────────────────────────────────

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get("subject") || "(no subject)";
    const messageId = message.headers.get("message-id");
    const subaddress = parseSubaddress(to);

    console.log(
      `[email] From: ${from} | To: ${to} | Subject: ${subject} | Tag: ${subaddress ?? "none"}`
    );

    // ── Blocklist ─────────────────────────────────────────────────────
    const blockedSenders: string[] = [];
    const blockedDomains: string[] = [];

    const senderDomain = from.split("@")[1]?.toLowerCase();
    if (
      blockedSenders.includes(from.toLowerCase()) ||
      (senderDomain && blockedDomains.includes(senderDomain))
    ) {
      console.log("[email] Blocked:", from);
      message.setReject("Rejected");
      return;
    }

    // ── Drop subaddress ───────────────────────────────────────────────
    if (subaddress === "drop") {
      console.log("[email] Dropped (+drop)");
      return;
    }

    // ── Don't auto-reply to noreply / mailer-daemon / own domain ──────
    const skipAutoReply =
      subaddress === "noreply" ||
      subaddress === "noresponse" ||
      from.toLowerCase().includes("noreply") ||
      from.toLowerCase().includes("no-reply") ||
      from.toLowerCase().includes("mailer-daemon") ||
      from.toLowerCase().endsWith("@solanaclawd.com");

    // ── Forward to beetsbyj@gmail.com ─────────────────────────────────
    try {
      await message.forward(env.FORWARD_TO);
      console.log(`[email] Forwarded to ${env.FORWARD_TO}`);
    } catch (err) {
      console.error("[email] Forward failed:", err);
    }

    // ── Auto-reply via Claude ─────────────────────────────────────────
    let autoReplied = false;

    if (!skipAutoReply && env.ANTHROPIC_API_KEY) {
      try {
        const bodyRaw = await readEmailBody(message);
        const bodyText = stripHtml(bodyRaw);

        const replyText = await generateAutoReply(env, from, subject, bodyText);
        await sendReplyEmail(env, from, subject, messageId, replyText);
        autoReplied = true;
      } catch (err) {
        console.error("[auto-reply] Failed:", err);
      }
    }

    // ── Webhook notification ──────────────────────────────────────────
    ctx.waitUntil(
      sendWebhookNotification(env, from, to, subject, subaddress, autoReplied)
    );
  },
};
