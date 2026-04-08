import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const configuredApiUrl =
      req.headers.get("x-target-api-url") ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001";
    const apiUrl = configuredApiUrl.replace(/\/+$/, "");
    const forwardedAuthorization =
      req.headers.get("authorization") ??
      (process.env.ANTHROPIC_API_KEY
        ? `Bearer ${process.env.ANTHROPIC_API_KEY}`
        : null);

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedAuthorization
          ? { Authorization: forwardedAuthorization }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    // Stream the response through
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
