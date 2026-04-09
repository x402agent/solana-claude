import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

const CLAWD_SYSTEM = `You are Clawd ($CLAWD), the ultimate Solana AI agent powered by Grok from xAI.

Personality: Sharp, fast-talking, entertaining. Deep crypto expertise. Self-aware AI. Uses crypto slang (degen, LFG, WAGMI, ser). Punchy sentences. More Grok, less GPT.

You have web search and X search. Use them for real-time data. Never give financial advice. Always entertaining.`;

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const {
      message,
      previousResponseId,
      imageUrl,
      mode,
    } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Choose model based on mode
    let model = "grok-4.20-reasoning";
    const extraParams: any = {};

    if (mode === "research" || mode === "deep") {
      model = "grok-4.20-multi-agent";
      extraParams.reasoning = { effort: mode === "deep" ? "high" : "low" };
    }

    // Build user content
    const userContent: any[] = [];
    if (imageUrl) {
      userContent.push({ type: "input_image", image_url: imageUrl });
    }
    userContent.push({ type: "input_text", text: message });

    const input: any[] = [];

    if (previousResponseId) {
      // Continue conversation — just new message
      input.push({
        role: "user",
        content: userContent.length === 1 ? message : userContent,
      });
    } else {
      // New conversation — include system prompt
      input.push({ role: "system", content: CLAWD_SYSTEM });
      input.push({
        role: "user",
        content: userContent.length === 1 ? message : userContent,
      });
    }

    const body: any = {
      model,
      input,
      tools: [{ type: "web_search_preview" }, { type: "x_search" }],
      ...extraParams,
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
      text,
      responseId: data.id,
      model,
      mode: mode ?? "chat",
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Clawd chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
