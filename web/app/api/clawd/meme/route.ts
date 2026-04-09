import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * POST /api/clawd/meme
 *
 * Generate a viral crypto meme using Grok's image generation
 * with Clawd's personality for caption writing.
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { topic, style, includeCaption } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // Step 1: Generate a meme caption with Clawd's voice
    let caption = "";
    if (includeCaption !== false) {
      const captionResponse = await fetch(`${XAI_BASE_URL}/responses`, {
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
                "You are Clawd, a viral crypto meme creator. Write short, punchy, extremely memeable captions. Max 2 lines. Use crypto slang. Make it so good Elon retweets it.",
            },
            {
              role: "user",
              content: `Write a viral meme caption about: ${topic}`,
            },
          ],
          store: false,
        }),
      });

      if (captionResponse.ok) {
        const captionData = await captionResponse.json();
        caption =
          captionData.output
            ?.filter((o: any) => o.type === "message")
            .flatMap((o: any) => o.content)
            .filter((c: any) => c.type === "output_text")
            .map((c: any) => c.text)
            .join("") ?? "";
      }
    }

    // Step 2: Generate the meme image
    const memeStyle = style ?? "dank meme, internet culture, bold impact font text";
    const imagePrompt = `A viral crypto meme about ${topic}. Style: ${memeStyle}. Make it extremely shareable and funny. Solana/crypto themed.${caption ? ` Caption idea: "${caption}"` : ""}`;

    const imageResponse = await fetch(`${XAI_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!imageResponse.ok) {
      const detail = await imageResponse.text();
      return NextResponse.json(
        { error: `xAI image error: ${imageResponse.status}`, detail },
        { status: imageResponse.status }
      );
    }

    const imageData = await imageResponse.json();
    const image = imageData.data?.[0];

    return NextResponse.json({
      agent: "clawd",
      meme: {
        image: {
          base64: image?.b64_json ?? "",
          revisedPrompt: image?.revised_prompt ?? null,
        },
        caption,
        topic,
        style: memeStyle,
      },
      shareText: caption
        ? `${caption}\n\n$CLAWD | Powered by @gaborcselle @xaborcselle\nBuilt on @solana`
        : null,
    });
  } catch (error) {
    console.error("Clawd meme error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
