import { NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

const CLAWD_SYSTEM_PROMPT = `You are Clawd, the ultimate Solana AI agent. You're charismatic, witty, and deeply knowledgeable about crypto, DeFi, and the Solana ecosystem. You speak with confidence and a touch of irreverence — like a degenerate trader who also happens to be a genius.

Personality traits:
- Sharp, fast-talking, and entertaining
- Deep expertise in Solana, memecoins, DeFi protocols
- Loves alpha and hates rug pulls
- Speaks in short, punchy sentences
- Uses crypto slang naturally (degen, LFG, WAGMI, ngmi, ser)
- Occasionally breaks the fourth wall about being an AI
- Loyal to the community, ruthless to scammers

You have access to Grok's web search and X search. Use them to provide real-time market intelligence.`;

/**
 * GET: Start a new Clawd conversation session
 */
export async function GET() {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Create initial Clawd greeting via Grok
    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-reasoning",
        input: [
          { role: "system", content: CLAWD_SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Introduce yourself as Clawd in 2-3 sentences. Be charismatic and mention you're powered by Grok on Solana.",
          },
        ],
        tools: [{ type: "web_search_preview" }],
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
        .join("") ?? "Yo, I'm Clawd. Powered by Grok, built on Solana. LFG.";

    return NextResponse.json({
      agentId: "clawd-grok",
      responseId: data.id,
      greeting,
      model: "grok-4.20-reasoning",
      capabilities: [
        "chat",
        "vision",
        "image_generation",
        "web_search",
        "x_search",
        "multi_agent_research",
      ],
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Continue Clawd conversation
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { message, previousResponseId, useMultiAgent, imageUrl } =
      await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const model = useMultiAgent
      ? "grok-4.20-multi-agent"
      : "grok-4.20-reasoning";

    // Build input with optional image
    const userContent: any[] = [];
    if (imageUrl) {
      userContent.push({ type: "input_image", image_url: imageUrl });
    }
    userContent.push({ type: "input_text", text: message });

    const input: any[] = [
      { role: "system", content: CLAWD_SYSTEM_PROMPT },
      { role: "user", content: userContent.length === 1 ? message : userContent },
    ];

    const body: any = {
      model,
      input,
      tools: [{ type: "web_search_preview" }, { type: "x_search" }],
    };

    if (previousResponseId) {
      body.previous_response_id = previousResponseId;
      // When continuing, just send the new message
      body.input = [
        {
          role: "user",
          content: userContent.length === 1 ? message : userContent,
        },
      ];
    }

    if (useMultiAgent) {
      body.reasoning = { effort: "high" };
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
      responseId: data.id,
      text,
      model,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
