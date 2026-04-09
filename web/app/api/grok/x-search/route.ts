import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * POST /api/grok/x-search
 *
 * Dedicated X/Twitter search endpoint powered by Grok.
 * Uses grok-4.20-reasoning with x_search built-in tool
 * for real-time sentiment analysis, alpha detection, and
 * narrative tracking from X/Twitter.
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { query, mode, limit } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const systemPrompts: Record<string, string> = {
      sentiment: `You are a crypto sentiment analyst. Search X/Twitter for posts about the given topic. Analyze the overall sentiment (bullish/bearish/neutral), identify key influencers talking about it, and surface the most viral/impactful posts. Return structured analysis with sentiment score (-100 to +100), key quotes, and trend direction.`,
      alpha: `You are a crypto alpha hunter. Search X/Twitter for early signals, insider hints, whale alerts, and breaking news about the given topic. Focus on posts from known CT (crypto Twitter) accounts, developers, and protocol teams. Flag anything that could move price in the next 1-24 hours.`,
      narrative: `You are a narrative tracker. Search X/Twitter for emerging narratives, memes, and cultural trends around the given topic. Identify what's gaining mindshare, what's fading, and what could go viral next. Focus on the Solana ecosystem.`,
      default: `You are Clawd, analyzing X/Twitter for the latest on this topic. Search for the most relevant, recent, and impactful posts. Summarize what X is saying, who's saying it, and what it means for the market.`,
    };

    const system = systemPrompts[mode ?? "default"] ?? systemPrompts.default;

    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-reasoning",
        input: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Search X/Twitter for: "${query}"${limit ? `. Focus on the top ${limit} most relevant results.` : ""}`,
          },
        ],
        tools: [{ type: "x_search" }],
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
      mode: mode ?? "default",
      analysis: text,
      responseId: data.id,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("X search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
