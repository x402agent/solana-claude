import { type NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * POST /api/grok/tools
 *
 * Function calling / tool use endpoint.
 * Send a prompt with function definitions, get back either text
 * or function calls that need execution.
 */
export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const {
      message,
      system,
      functions,
      model,
      previousResponseId,
      toolResults,
    } = await req.json();

    // Submitting tool results back
    if (toolResults && previousResponseId) {
      const input = toolResults.map((r: any) => ({
        type: "function_call_output",
        call_id: r.callId,
        output: typeof r.output === "string" ? r.output : JSON.stringify(r.output),
      }));

      const response = await fetch(`${XAI_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "grok-4.20-reasoning",
          previous_response_id: previousResponseId,
          input,
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
      return NextResponse.json(parseToolResponse(data));
    }

    // Initial function call request
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const input: any[] = [];
    if (system) {
      input.push({ role: "system", content: system });
    }
    input.push({ role: "user", content: message });

    const tools = (functions ?? []).map((fn: any) => ({
      type: "function",
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    }));

    // Also add built-in tools
    tools.push({ type: "web_search_preview" });
    tools.push({ type: "x_search" });

    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "grok-4.20-reasoning",
        input,
        tools,
        ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
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
    return NextResponse.json(parseToolResponse(data));
  } catch (error) {
    console.error("Grok tools error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function parseToolResponse(response: any) {
  const functionCalls: any[] = [];
  let text = "";

  for (const output of response.output ?? []) {
    if (output.type === "function_call") {
      let args: any = {};
      try {
        args = JSON.parse(output.arguments ?? "{}");
      } catch {
        args = {};
      }
      functionCalls.push({
        name: output.name,
        args,
        callId: output.call_id ?? output.id ?? "",
      });
    } else if (output.type === "message") {
      for (const content of output.content ?? []) {
        if (content.type === "output_text") {
          text += content.text;
        }
      }
    }
  }

  return {
    text,
    functionCalls,
    responseId: response.id,
    status: functionCalls.length > 0 ? "requires_action" : "done",
    usage: response.usage ?? null,
  };
}
