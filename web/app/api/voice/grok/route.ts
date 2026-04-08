import { NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";

export async function GET() {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Get an ephemeral token for secure browser-side WebSocket auth
    const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `xAI token error: ${res.status}`, detail },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      provider: "grok",
      clientSecret: data.client_secret?.value ?? data.value ?? data.token,
      expiresAt: data.client_secret?.expires_at ?? data.expires_at,
    });
  } catch (error) {
    console.error("Grok agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
