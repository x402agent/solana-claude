import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { style, mood, customPrompt } = await req.json().catch(() => ({}));

    const prompt =
      customPrompt ??
      `A ${mood ?? "mischievous and confident"} AI agent character named Clawd, ${style ?? "pixel art retro cyberpunk"} style. Solana blockchain theme with purple and green neon colors, circuit board patterns, glowing eyes. The character radiates intelligence and chaotic energy. Built different. Powered by Grok. Clean dark background.`;

    const response = await fetch(`${XAI_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `xAI error: ${response.status}`, detail },
        { status: response.status }
      );
    }

    const data = await response.json();
    const image = data.data?.[0];

    return NextResponse.json({
      agent: "clawd",
      avatar: {
        base64: image?.b64_json ?? "",
        revisedPrompt: image?.revised_prompt ?? null,
      },
      prompt,
    });
  } catch (error) {
    console.error("Clawd avatar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
