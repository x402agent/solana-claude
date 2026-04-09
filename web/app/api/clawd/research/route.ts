import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * POST /api/clawd/research
 *
 * Clawd's deep research mode — deploys 16 Grok agents with
 * web search + X search for comprehensive Solana intelligence.
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { query, depth, previousResponseId } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const agentCount = depth === "quick" ? 4 : 16;
    const effort = agentCount === 16 ? "high" : "low";

    const input: any[] = [
      {
        role: "system",
        content: `You are Clawd's research squad — ${agentCount} Grok agents working together for deep Solana intelligence.

Research methodology:
1. Search the web for official sources, docs, analytics dashboards
2. Search X/Twitter for real-time sentiment, alpha, and insider signals
3. Cross-reference findings across multiple sources
4. Identify consensus vs conflicting signals
5. Synthesize into actionable intelligence

Output format:
## Executive Summary
- 3-5 bullet points of key findings

## Detailed Analysis
- Organized by topic/theme
- Each finding with source citation and confidence level

## Market Implications
- Price impact assessment
- Risk factors
- Opportunities

## Alpha Signals
- What's not priced in yet
- Emerging narratives
- Smart money movements

## Recommendation
- Clawd's take (entertaining but data-driven)`,
      },
      { role: "user", content: query },
    ];

    const body: any = {
      model: "grok-4.20-multi-agent",
      input,
      reasoning: { effort },
      tools: [{ type: "web_search_preview" }, { type: "x_search" }],
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    };

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
      agent: "clawd",
      mode: "research",
      depth: depth ?? "deep",
      agentCount,
      text,
      responseId: data.id,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Clawd research error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
