import { NextRequest, NextResponse } from "next/server";
import {
  getClawdCommunicationsConfig,
  replyToMessage,
  verifyAgentMailWebhook,
} from "@/lib/agentmail";

type ReceivedEvent = {
  event_type?: string;
  message?: {
    inbox_id?: string;
    message_id?: string;
    from?: string;
    subject?: string;
    extracted_text?: string;
    text?: string;
  };
};

function inboxFromConfig() {
  return getClawdCommunicationsConfig().supportInboxId;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  if (!verifyAgentMailWebhook(request.headers, raw)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(raw) as ReceivedEvent;

    if (
      payload.event_type === "message.received" &&
      payload.message?.inbox_id === inboxFromConfig() &&
      payload.message.message_id
    ) {
      const subject = payload.message.subject ?? "your message";
      const sender = payload.message.from ?? "holder";
      const body = [
        `GM. $CLAWD received ${subject}.`,
        ``,
        `A Solana finance agent will review the thread, preserve the context in the vault, and continue by email or voice.`,
        `If you want to switch channels immediately, call ${getClawdCommunicationsConfig().agentNumber} or use /voice on solanaclawd.com.`,
        ``,
        `Original sender: ${sender}`,
      ].join("\n");

      await replyToMessage(inboxFromConfig(), payload.message.message_id, {
        text: body,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
          <p>GM. <strong>$CLAWD</strong> received <strong>${subject}</strong>.</p>
          <p>A Solana finance agent will review the thread, preserve the context in the vault, and continue by email or voice.</p>
          <p>If you want to switch channels immediately, call <strong>${getClawdCommunicationsConfig().agentNumber}</strong> or use <strong>/voice</strong> on solanaclawd.com.</p>
          <p><strong>Original sender:</strong> ${sender}</p>
        </div>`,
        labels: ["solana-clawd", "acknowledged"],
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("AgentMail webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
