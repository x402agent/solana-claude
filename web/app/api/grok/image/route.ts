import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { prompt, n, size, sourceImageBase64 } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Image editing mode (source image provided)
    if (sourceImageBase64) {
      const response = await fetch(`${XAI_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-imagine-image",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_image",
                  image_url: `data:image/png;base64,${sourceImageBase64}`,
                },
                { type: "input_text", text: prompt },
              ],
            },
          ],
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
      const imageOutput = data.output
        ?.flatMap((o: any) => o.content ?? [])
        .find((c: any) => c.type === "image");

      return NextResponse.json({
        images: [{ base64: imageOutput?.image ?? "" }],
        responseId: data.id,
        mode: "edit",
      });
    }

    // Image generation mode
    const response = await fetch(`${XAI_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt,
        n: Math.min(n ?? 1, 4),
        size: size || "1024x1024",
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
    const images = data.data.map((img: any) => ({
      base64: img.b64_json ?? "",
      revisedPrompt: img.revised_prompt ?? null,
    }));

    return NextResponse.json({
      images,
      mode: "generate",
    });
  } catch (error) {
    console.error("Grok image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
