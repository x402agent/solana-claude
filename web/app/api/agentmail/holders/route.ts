import { NextRequest, NextResponse } from "next/server";
import {
  buildWelcomeMessage,
  ensureSupportInbox,
  getClawdCommunicationsConfig,
  provisionHolderInbox,
  sendMessage,
} from "@/lib/agentmail";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelySolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const holderEmail = String(body?.holderEmail ?? "").trim();
    const walletAddress = String(body?.walletAddress ?? "").trim();
    const displayName = String(body?.displayName ?? "").trim();

    if (!isValidEmail(holderEmail)) {
      return NextResponse.json({ error: "A valid holder email is required." }, { status: 400 });
    }

    if (!isLikelySolanaAddress(walletAddress)) {
      return NextResponse.json({ error: "A valid Solana wallet address is required." }, { status: 400 });
    }

    const supportInbox = await ensureSupportInbox();
    const holderInbox = await provisionHolderInbox({ holderEmail, walletAddress, displayName });
    const welcome = buildWelcomeMessage({
      holderEmail,
      walletAddress,
      holderInboxId: holderInbox.inbox_id,
    });

    const welcomeMessage = await sendMessage(supportInbox.inbox_id, {
      to: holderEmail,
      subject: welcome.subject,
      text: welcome.text,
      html: welcome.html,
      replyTo: supportInbox.inbox_id,
      labels: ["solana-clawd", "holder", "welcome"],
    });

    return NextResponse.json({
      ok: true,
      holderInboxId: holderInbox.inbox_id,
      supportInboxId: supportInbox.inbox_id,
      welcomeMessage,
      communications: getClawdCommunicationsConfig(),
    });
  } catch (error) {
    console.error("AgentMail holder provisioning failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision holder inbox." },
      { status: 500 }
    );
  }
}
