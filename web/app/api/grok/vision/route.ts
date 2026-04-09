import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { imageUrl, imageBase64, prompt, system } = await req.json();

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "imageUrl or imageBase64 is required" },
        { status: 400 }
      );
    }

    const imgSrc = imageUrl || `data:image/jpeg;base64,${imageBase64}`;

    const input: any[] = [];
    if (system) {
      input.push({ role: "system", content: system });
    }
    input.push({
      role: "user",
      content: [
        { type: "input_image", image_url: imgSrc },
        { type: "input_text", text: prompt || "What's in this image?" },
      ],
    });

    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-reasoning",
        input,
        store: false,
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
    const text =
      data.output
        ?.filter((o: any) => o.type === "message")
        .flatMap((o: any) => o.content)
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join("") ?? "";

    return NextResponse.json({
      text,
      responseId: data.id,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Grok vision error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
