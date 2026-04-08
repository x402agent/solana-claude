import type { Message } from "./types";

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function extractAssistantText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.content === "string") {
    return record.content;
  }
  if (typeof record.text === "string") {
    return record.text;
  }
  if (Array.isArray(record.content)) {
    return record.content
      .flatMap((block) => {
        if (!block || typeof block !== "object") {
          return [];
        }
        const typedBlock = block as Record<string, unknown>;
        return typeof typedBlock.text === "string" ? [typedBlock.text] : [];
      })
      .join("");
  }

  return "";
}

export interface StreamChunk {
  type: "text" | "tool_use" | "tool_result" | "done" | "error";
  content?: string;
  tool?: {
    id: string;
    name: string;
    input?: Record<string, unknown>;
    result?: string;
    is_error?: boolean;
  };
  error?: string;
}

export interface StreamChatOptions {
  model: string;
  signal?: AbortSignal;
  apiUrl?: string;
  apiKey?: string;
  streamingEnabled?: boolean;
}

export async function* streamChat(
  messages: Pick<Message, "role" | "content">[],
  options: StreamChatOptions
): AsyncGenerator<StreamChunk> {
  const {
    model,
    signal,
    apiUrl = getApiUrl(),
    apiKey,
    streamingEnabled = true,
  } = options;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Target-Api-Url": trimTrailingSlash(apiUrl),
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ messages, model, stream: streamingEnabled }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    yield { type: "error", error: err };
    return;
  }

  if (!streamingEnabled) {
    try {
      const payload = (await response.json()) as unknown;
      const content = extractAssistantText(payload);
      if (content) {
        yield { type: "text", content };
      }
      yield { type: "done" };
      return;
    } catch {
      yield { type: "error", error: "Invalid non-streaming response" };
      return;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            yield chunk;
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
