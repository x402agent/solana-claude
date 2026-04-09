import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { message, system, model, previousResponseId, stream } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const input: any[] = [];
    if (system) {
      input.push({ role: "system", content: system });
    }
    input.push({ role: "user", content: message });

    const body: any = {
      model: model || "grok-4.20-reasoning",
      input,
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    };

    if (stream) {
      body.stream = true;

      const response = await fetch(`${XAI_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text();
        return NextResponse.json(
          { error: `xAI error: ${response.status}`, detail },
          { status: response.status }
        );
      }

      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
      model: data.model,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Grok chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
