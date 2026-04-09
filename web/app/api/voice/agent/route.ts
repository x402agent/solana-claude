import { NextResponse } from "next/server";

const AGENT_ID =
  process.env.ELEVEN_LABS_AGENT_ID ??
  process.env.ELEVENLABS_AGENT_ID ??
  "agent_1601knpw2ax7ejb80fdxx118n7qn";
const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? "";

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
  }

  try {
    // Get a signed conversation URL for the agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs error: ${response.status}`, detail },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ agentId: AGENT_ID, signedUrl: data.signed_url });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
