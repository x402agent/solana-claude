/**
 * src/telegram/xai.ts
 *
 * xAI (Grok) integration — vision, image gen, video gen, X search, web search, chat with files.
 * Uses raw REST API calls — zero SDK dependencies.
 */

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const XAI_BASE = "https://api.x.ai/v1";
const XAI_TOOL_MODEL = process.env.XAI_TOOL_MODEL ?? "grok-4.20-beta-latest-non-reasoning";
const XAI_VISION_MODEL = "grok-4.20-beta-latest-non-reasoning";
const XAI_IMAGE_MODEL = "grok-imagine-image";
const XAI_VIDEO_MODEL = "grok-imagine-video";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${XAI_API_KEY}`,
  };
}

function ensureKey(): void {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");
}

// ---------------------------------------------------------------------------
// Vision — analyze images
// ---------------------------------------------------------------------------
export async function analyzeImage(imageUrl: string, question?: string): Promise<string> {
  ensureKey();
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: question ?? "Describe this image in detail." },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`xAI vision ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "No response";
}

// ---------------------------------------------------------------------------
// Image Generation — grok-imagine-image
// ---------------------------------------------------------------------------
export async function generateImage(
  prompt: string,
  opts?: { n?: number; aspect_ratio?: string; resolution?: string },
): Promise<Array<{ url: string }>> {
  ensureKey();
  const res = await fetch(`${XAI_BASE}/images/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_IMAGE_MODEL,
      prompt,
      n: opts?.n ?? 1,
      ...(opts?.aspect_ratio && { aspect_ratio: opts.aspect_ratio }),
      ...(opts?.resolution && { resolution: opts.resolution }),
      response_format: "url",
    }),
  });
  if (!res.ok) throw new Error(`xAI image gen ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ url: string }> };
  return data.data;
}

// ---------------------------------------------------------------------------
// Video Generation — grok-imagine-video (async poll)
// ---------------------------------------------------------------------------
export async function generateVideo(
  prompt: string,
  opts?: { duration?: number; aspect_ratio?: string; resolution?: string; image_url?: string },
): Promise<{ url: string; status: string }> {
  ensureKey();

  // Step 1: Start generation
  const body: Record<string, unknown> = {
    model: XAI_VIDEO_MODEL,
    prompt,
  };
  if (opts?.duration) body.duration = opts.duration;
  if (opts?.aspect_ratio) body.aspect_ratio = opts.aspect_ratio;
  if (opts?.resolution) body.resolution = opts.resolution;
  if (opts?.image_url) body.image = { url: opts.image_url };

  const startRes = await fetch(`${XAI_BASE}/videos/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!startRes.ok) throw new Error(`xAI video start ${startRes.status}: ${await startRes.text()}`);
  const { request_id } = (await startRes.json()) as { request_id: string };

  // Step 2: Poll (up to 5 min)
  const maxWait = 300_000;
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const pollRes = await fetch(`${XAI_BASE}/videos/${request_id}`, {
      headers: headers(),
    });
    if (!pollRes.ok) continue;
    const data = (await pollRes.json()) as {
      status: string;
      video?: { url: string; duration: number };
    };
    if (data.status === "done" && data.video) {
      return { url: data.video.url, status: "done" };
    }
    if (data.status === "failed" || data.status === "expired") {
      throw new Error(`Video generation ${data.status}`);
    }
  }
  throw new Error("Video generation timed out (5 min)");
}

// ---------------------------------------------------------------------------
// X Search — search X/Twitter posts via Responses API
// ---------------------------------------------------------------------------
export async function xSearch(query: string): Promise<{ text: string; sources: unknown[] }> {
  ensureKey();
  const res = await fetch(`${XAI_BASE}/responses`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_TOOL_MODEL,
      input: query,
      tools: [{ type: "x_search" }],
    }),
  });
  if (!res.ok) throw new Error(`xAI X search ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    output: Array<{ type: string; content?: string; text?: string }>;
  };
  const textParts = data.output
    .filter((o) => o.type === "message" || o.content || o.text)
    .map((o) => o.content ?? o.text ?? "")
    .filter(Boolean);
  return { text: textParts.join("\n") || "No results", sources: [] };
}

// ---------------------------------------------------------------------------
// Web Search — search the web via Responses API
// ---------------------------------------------------------------------------
export async function webSearch(
  query: string,
  opts?: { allowed_domains?: string[]; excluded_domains?: string[] },
): Promise<{ text: string; sources: unknown[] }> {
  ensureKey();
  const tool: Record<string, unknown> = { type: "web_search" };
  if (opts?.allowed_domains) tool.allowed_domains = opts.allowed_domains;
  if (opts?.excluded_domains) tool.excluded_domains = opts.excluded_domains;

  const res = await fetch(`${XAI_BASE}/responses`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_TOOL_MODEL,
      input: query,
      tools: [tool],
    }),
  });
  if (!res.ok) throw new Error(`xAI web search ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    output: Array<{ type: string; content?: string; text?: string }>;
  };
  const textParts = data.output
    .filter((o) => o.type === "message" || o.content || o.text)
    .map((o) => o.content ?? o.text ?? "")
    .filter(Boolean);
  return { text: textParts.join("\n") || "No results", sources: [] };
}

// ---------------------------------------------------------------------------
// Chat with Files — attach files to chat
// ---------------------------------------------------------------------------
export async function chatWithFile(
  question: string,
  fileUrl: string,
): Promise<string> {
  ensureKey();
  const res = await fetch(`${XAI_BASE}/responses`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_TOOL_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_file", file_url: fileUrl },
            { type: "input_text", text: question },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`xAI chat-with-file ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    output: Array<{ type: string; content?: string; text?: string }>;
  };
  const textParts = data.output
    .filter((o) => o.type === "message" || o.content || o.text)
    .map((o) => o.content ?? o.text ?? "")
    .filter(Boolean);
  return textParts.join("\n") || "No response";
}

// ---------------------------------------------------------------------------
// Grok Chat — general chat completions
// ---------------------------------------------------------------------------
export async function grokChat(prompt: string, systemPrompt?: string): Promise<string> {
  ensureKey();
  const messages: Array<Record<string, unknown>> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: XAI_TOOL_MODEL,
      messages,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`xAI chat ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "No response";
}
