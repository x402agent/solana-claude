import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * POST /api/grok/web-search
 *
 * Web search powered by Grok with built-in web_search_preview tool.
 * Real-time information retrieval with AI-powered synthesis.
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { query, system } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const response = await fetch(`${XAI_BASE_URL}/responses`, {
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
              system ??
              "You are a research assistant. Search the web for the most current, accurate information. Cite your sources. Be concise and factual.",
          },
          { role: "user", content: query },
        ],
        tools: [{ type: "web_search_preview" }],
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
      query,
      result: text,
      responseId: data.id,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Web search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
