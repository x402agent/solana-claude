import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const {
      query,
      system,
      agentCount,
      tools,
      previousResponseId,
    } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const agents = agentCount === 16 ? 16 : 4;
    const effort = agents === 16 ? "high" : "low";

    const input: any[] = [];
    if (system) {
      input.push({ role: "system", content: system });
    }
    input.push({ role: "user", content: query });

    // Built-in tools
    const builtinTools: any[] = [];
    const enabledTools = tools ?? ["web_search", "x_search"];
    if (enabledTools.includes("web_search")) {
      builtinTools.push({ type: "web_search_preview" });
    }
    if (enabledTools.includes("x_search")) {
      builtinTools.push({ type: "x_search" });
    }
    if (enabledTools.includes("code_execution")) {
      builtinTools.push({ type: "code_interpreter" });
    }

    const body: any = {
      model: "grok-4.20-multi-agent",
      input,
      reasoning: { effort },
      ...(builtinTools.length > 0 ? { tools: builtinTools } : {}),
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
      text,
      responseId: data.id,
      model: "grok-4.20-multi-agent",
      agentCount: agents,
      usage: data.usage ?? null,
    });
  } catch (error) {
    console.error("Grok research error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
