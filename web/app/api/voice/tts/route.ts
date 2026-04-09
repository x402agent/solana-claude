import { NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { text, voice, model, speed } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "text exceeds 5000 character limit" }, { status: 400 });
    }

    // Use xAI audio speech endpoint (OpenAI-compatible)
    const response = await fetch(`${XAI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "grok-4.20-reasoning",
        input: text,
        voice: voice || "clawd",
        speed: speed ?? 1.0,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      // Fallback: use Grok to generate spoken-style text response
      // if native TTS is not available, return synthesized text
      const fallbackResponse = await fetch(`${XAI_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4.20-reasoning",
          input: [
            {
              role: "system",
              content:
                "You are Clawd, an AI agent on Solana. Convert the following text into a natural, expressive spoken format. Keep it concise and charismatic.",
            },
            { role: "user", content: text },
          ],
          store: false,
        }),
      });

      if (!fallbackResponse.ok) {
        const detail = await fallbackResponse.text();
        return NextResponse.json(
          { error: `xAI error: ${fallbackResponse.status}`, detail },
          { status: fallbackResponse.status }
        );
      }

      const data = await fallbackResponse.json();
      const spokenText =
        data.output
          ?.filter((o: any) => o.type === "message")
          .flatMap((o: any) => o.content)
          .filter((c: any) => c.type === "output_text")
          .map((c: any) => c.text)
          .join("") ?? text;

      return NextResponse.json(
        { text: spokenText, mode: "text-fallback" },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
