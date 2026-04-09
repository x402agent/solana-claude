import { NextRequest, NextResponse } from "next/server";
import {
  ensureSupportInbox,
  getClawdCommunicationsConfig,
  isAllowedHolderInboxId,
  listMessages,
  provisionHolderInbox,
  sendMessage,
} from "@/lib/agentmail";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelySolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const inboxId = request.nextUrl.searchParams.get("inboxId")?.trim() ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

    if (!isAllowedHolderInboxId(inboxId)) {
      return NextResponse.json({ error: "Only holder inboxes can be queried." }, { status: 400 });
    }

    const messages = await listMessages(inboxId, Math.max(1, Math.min(20, limit || 10)));
    return NextResponse.json(messages);
  } catch (error) {
    console.error("AgentMail list failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load holder messages." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const holderEmail = String(body?.holderEmail ?? "").trim();
    const walletAddress = String(body?.walletAddress ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const displayName = String(body?.displayName ?? "").trim();
    const providedInboxId = String(body?.holderInboxId ?? "").trim();

    if (!isValidEmail(holderEmail)) {
      return NextResponse.json({ error: "A valid holder email is required." }, { status: 400 });
    }

    if (!isLikelySolanaAddress(walletAddress)) {
      return NextResponse.json({ error: "A valid Solana wallet address is required." }, { status: 400 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    }

    const supportInbox = await ensureSupportInbox();
    const holderInbox =
      providedInboxId && isAllowedHolderInboxId(providedInboxId)
        ? { inbox_id: providedInboxId }
        : await provisionHolderInbox({ holderEmail, walletAddress, displayName });

    const outbound = await sendMessage(holderInbox.inbox_id, {
      to: supportInbox.inbox_id,
      subject: `[Holder ${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}] ${subject}`,
      text: [
        message,
        "",
        `Holder email: ${holderEmail}`,
        `Wallet: ${walletAddress}`,
        `Call me: ${getClawdCommunicationsConfig().agentNumber}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
          <p>${message.replace(/\n/g, "<br/>")}</p>
          <hr/>
          <p><strong>Holder email:</strong> ${holderEmail}<br/>
          <strong>Wallet:</strong> ${walletAddress}</p>
        </div>
      `,
      replyTo: holderEmail,
      labels: ["solana-clawd", "holder", "website"],
    });

    return NextResponse.json({
      ok: true,
      holderInboxId: holderInbox.inbox_id,
      supportInboxId: supportInbox.inbox_id,
      outbound,
    });
  } catch (error) {
    console.error("AgentMail send failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send holder message." },
      { status: 500 }
    );
  }
}
