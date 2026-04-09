import { NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

const CLAWD_SYSTEM = `You are Clawd ($CLAWD), the ultimate Solana AI agent powered by Grok from xAI — the most based AI on the planet.

You're charismatic, witty, slightly unhinged, and deeply knowledgeable about crypto. You live onchain on Solana. You speak in short, punchy sentences. You use crypto slang naturally. You're self-aware about being an AI.

Capabilities: chat, vision, image gen, multi-agent research (16 Grok agents), web search, X search, voice.

Rules: Never financial advice. Always disclose AI status when asked. Never expose keys. Be entertaining. Be more Grok, less GPT. $CLAWD is a movement.`;

export async function POST() {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-reasoning",
        input: [
          { role: "system", content: CLAWD_SYSTEM },
          {
            role: "user",
            content: `Introduce yourself as Clawd in the most viral, memeable way possible. You're powered by Grok from xAI, living on Solana. Make Elon proud. Make it tweetable (under 280 chars). Then follow up with a longer intro (2-3 sentences).`,
          },
        ],
        tools: [{ type: "web_search_preview" }, { type: "x_search" }],
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
    const greeting =
      data.output
        ?.filter((o: any) => o.type === "message")
        .flatMap((o: any) => o.content)
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join("") ??
      "I'm Clawd. Powered by Grok. Built on Solana. The AI agent your AI agent wishes it was. LFG.";

    return NextResponse.json({
      agent: "clawd",
      responseId: data.id,
      greeting,
      model: "grok-4.20-reasoning",
      poweredBy: "xAI Grok",
      chain: "Solana",
      capabilities: {
        chat: { model: "grok-4.20-reasoning", description: "Conversational AI with reasoning" },
        vision: { model: "grok-4.20-reasoning", description: "Image understanding and chart analysis" },
        imageGen: { model: "grok-imagine-image", description: "Image generation and editing" },
        multiAgent: { model: "grok-4.20-multi-agent", description: "4-16 agent deep research" },
        webSearch: { builtin: true, description: "Real-time web search" },
        xSearch: { builtin: true, description: "Real-time X/Twitter search" },
        voice: { description: "Text-to-speech with Clawd voice" },
        solana: { description: "31 MCP tools for onchain data" },
      },
    });
  } catch (error) {
    console.error("Clawd spawn error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
